const { GObject, St } = imports.gi

const Mainloop = imports.mainloop

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { FlatList } = Me.imports.components.flatList.flatList
const { StockCard } = Me.imports.components.cards.stockCard
const { SearchBar } = Me.imports.components.searchBar.searchBar
const { setTimeout, clearTimeout } = Me.imports.helpers.components
const { removeCache, executeSequentially } = Me.imports.helpers.data

const {
  SettingsHandler,
  STOCKS_SYMBOL_PAIRS,
  STOCKS_USE_PROVIDER_INSTRUMENT_NAMES
} = Me.imports.helpers.settings

const { Translations } = Me.imports.helpers.translations

const FinanceService = Me.imports.services.financeService

const SETTING_KEYS_TO_REFRESH = [
  STOCKS_SYMBOL_PAIRS,
  STOCKS_USE_PROVIDER_INSTRUMENT_NAMES
]

var StockOverviewScreen = GObject.registerClass({
  GTypeName: 'StockExtension_StockOverviewScreen'
}, class StockOverviewScreen extends St.BoxLayout {
  _init (mainEventHandler) {
    super._init({
      style_class: 'screen stock-overview-screen',
      vertical: true
    })

    this._mainEventHandler = mainEventHandler

    this._isRendering = false
    this._showLoadingInfoTimeoutId = null
    this._autoRefreshTimeoutId = null

    this._settings = new SettingsHandler()

    this._searchBar = new SearchBar({ mainEventHandler: this._mainEventHandler })
    this._list = new FlatList()

    this.add_child(this._searchBar)
    this.add_child(this._list)

    this.connect('destroy', this._onDestroy.bind(this))

    this._searchBar.connect('refresh', () => {
      removeCache('summary_')
      this._loadData()
    })

    this._searchBar.connect('text-change', (sender, searchText) => this._filter_results(searchText))

    this._settingsChangedId = this._settings.connect('changed', (value, key) => {
      if (SETTING_KEYS_TO_REFRESH.includes(key)) {
        this._loadData()
      }
    })

    this._list.connect('clicked-item', (sender, item) => this._mainEventHandler.emit('show-screen', {
      screen: 'stock-details',
      additionalData: {
        item: item.cardItem
      }
    }))

    this._loadData()

    this._registerTimeout()
  }

  _filter_results (searchText) {
    const listItems = this._list.items

    listItems.forEach(item => {
      const data = item.cardItem

      if (!searchText) {
        item.visible = true
        return
      }

      const searchContent = `${data.FullName} ${data.ExchangeName} ${data.Symbol}`.toUpperCase()

      item.visible = searchContent.includes(searchText.toUpperCase())
    })
  }

  _registerTimeout () {
    this._autoRefreshTimeoutId = Mainloop.timeout_add_seconds(this._settings.ticker_interval || 10, () => {
      this._loadData()

      return true
    })
  }

  async _loadData () {
    if (this._showLoadingInfoTimeoutId || this._isRendering) {
      log('📊 Overview: Already rendering, skipping...')
      return
    }

    if (!this._settings.symbol_pairs) {
      log('📊 Overview: No symbols configured')
      this._list.show_error_info(Translations.NO_SYMBOLS_CONFIGURED_ERROR)
      return
    }

    log(`📊 Overview: Starting to load ${this._settings.symbol_pairs.length} stocks`)
    this._isRendering = true

    // Extract symbols for batch fetching
    const symbols = this._settings.symbol_pairs.map(symbolData => symbolData.symbol)
    log(`📊 Overview: Attempting batch fetch for symbols: ${symbols.join(', ')}`)
    
    let quoteSummaries = []
    
    // Try batch fetching first
    const batchResult = await FinanceService.getBatchQuotes({
      symbols: symbols,
      provider: this._settings.symbol_pairs[0]?.provider || 'yahoo'
    })
    
    if (batchResult) {
      log(`📊 Overview: Batch fetch successful for ${Object.keys(batchResult).length} symbols`)
      
      // Transform batch results to quote summaries
      quoteSummaries = this._settings.symbol_pairs.map(symbolData => {
        const batchData = batchResult[symbolData.symbol]
        
        if (batchData && !batchData.error) {
          // Transform to expected QuoteSummary format with all fields
          return {
            Name: symbolData.name,
            FullName: symbolData.name || batchData.longName || batchData.shortName,
            Symbol: symbolData.symbol,
            Provider: symbolData.provider,
            Timestamp: batchData.regularMarketTime ? batchData.regularMarketTime * 1000 : null,
            Change: batchData.regularMarketChange,
            ChangePercent: batchData.regularMarketChangePercent ? batchData.regularMarketChangePercent * 100 : null,
            PreviousClose: batchData.regularMarketPreviousClose,
            Close: batchData.regularMarketPrice,
            Open: batchData.regularMarketOpen,
            Low: batchData.regularMarketDayLow,
            High: batchData.regularMarketDayHigh,
            Volume: batchData.regularMarketVolume,
            CurrencySymbol: batchData.currencySymbol,
            ExchangeName: batchData.exchangeName,
            MarketState: batchData.marketState,
            PreMarketPrice: batchData.preMarketPrice,
            PreMarketChange: batchData.preMarketChange,
            PreMarketChangePercent: batchData.preMarketChangePercent ? batchData.preMarketChangePercent * 100 : null,
            PreMarketTimestamp: batchData.preMarketTime ? batchData.preMarketTime * 1000 : null,
            PostMarketPrice: batchData.postMarketPrice,
            PostMarketChange: batchData.postMarketChange,
            PostMarketChangePercent: batchData.postMarketChangePercent ? batchData.postMarketChangePercent * 100 : null,
            PostMarketTimestamp: batchData.postMarketTime ? batchData.postMarketTime * 1000 : null,
            Error: null
          }
        } else {
          log(`⚠️ Overview: No batch data for ${symbolData.symbol}, will need fallback`)
          return null
        }
      })
      
      // Check if we have any failed symbols that need individual fetching
      const failedIndices = []
      quoteSummaries.forEach((summary, index) => {
        if (!summary) {
          failedIndices.push(index)
        }
      })
      
      if (failedIndices.length > 0) {
        log(`📊 Overview: Falling back to individual fetch for ${failedIndices.length} symbols`)
        
        for (const index of failedIndices) {
          const symbolData = this._settings.symbol_pairs[index]
          try {
            const individualSummary = await FinanceService.getQuoteSummary({
              ...symbolData,
              fallbackName: symbolData.name
            })
            quoteSummaries[index] = individualSummary
          } catch (error) {
            log(`❌ Overview: Failed to fetch ${symbolData.symbol}: ${error.message}`)
            quoteSummaries[index] = null
          }
        }
      }
    } else {
      log('📊 Overview: Batch fetch failed, falling back to sequential loading')
      // Fallback to sequential loading
      const quoteTasks = this._settings.symbol_pairs.map(symbolData => () => FinanceService.getQuoteSummary({
        ...symbolData,
        fallbackName: symbolData.name
      }))
      
      quoteSummaries = await executeSequentially(quoteTasks)
    }
    
    log(`📊 Overview: Final result: ${quoteSummaries.filter(s => s).length} valid summaries`)

    this._showLoadingInfoTimeoutId = clearTimeout(this._showLoadingInfoTimeoutId)

    log('📊 Overview: Clearing existing list items')
    this._list.clear_list_items()

    log('📊 Overview: Adding new items to list')
    let addedCount = 0
    quoteSummaries.forEach((quoteSummary, index) => {
      if (quoteSummary && quoteSummary.Symbol) {
        log(`📊 Overview: Adding item ${index + 1}: ${quoteSummary.Symbol}`)
        this._list.addItem(new StockCard(quoteSummary))
        addedCount++
      } else {
        log(`⚠️ Overview: Skipping item ${index + 1}: no valid data`)
      }
    })
    log(`📊 Overview: Added ${addedCount} out of ${quoteSummaries.length} items`)

    log('📊 Overview: Applying search filter')
    this._filter_results(this._searchBar.search_text())

    log('📊 Overview: Data loading complete')
    this._isRendering = false
  }

  _onDestroy () {
    if (this._showLoadingInfoTimeoutId) {
      clearTimeout(this._showLoadingInfoTimeoutId)
    }

    if (this._autoRefreshTimeoutId) {
      Mainloop.source_remove(this._autoRefreshTimeoutId)
    }

    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId)
    }
  }
})
