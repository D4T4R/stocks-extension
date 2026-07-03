const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { cacheOrDefault, cacheOrDefaultWithRateLimit } = Me.imports.helpers.data
const { SettingsHandler } = Me.imports.helpers.settings

const { FINANCE_PROVIDER } = Me.imports.services.meta.generic

const yahooService = Me.imports.services.yahooService
let pythonService
try {
  pythonService = Me.imports.services.pythonService
  log('✅ Python service imported successfully')
} catch (e) {
  log(`⚠️ Failed to import Python service: ${e.message}`)
  pythonService = yahooService // Fallback to original Yahoo service
}
const eastMoneyService = Me.imports.services.eastMoneyService
const rssService = Me.imports.services.rssService

const services = {
  [FINANCE_PROVIDER.YAHOO]: pythonService || yahooService, // Use Python service primarily, fallback to Yahoo
  [FINANCE_PROVIDER.EAST_MONEY]: eastMoneyService
}

var getQuoteSummary = async ({ symbol, provider, fallbackName }) => {
  const settings = new SettingsHandler()

  // Cache summaries (5 min) — the panel ticker requests them on every
  // rotation and uncached calls quickly run into Yahoo 429 rate limits
  return cacheOrDefault(`summary_${provider}_${symbol}`, async () => {
    const service = services[provider]

    if (!service) {
      return new QuoteSummary(symbol, provider, fallbackName, 'Invalid Provider')
    }

    let summary = {}

    if (symbol) {
      try {
        log(`🔍 Fetching ${symbol} using service: ${provider}`)
        summary = await service.getQuoteSummary({ symbol })
        log(`📦 Got summary for ${symbol}: ${summary ? 'success' : 'null'}`)
        
        // If Yahoo failed due to rate limiting, try RSS fallback
        if (summary.Error && provider === FINANCE_PROVIDER.YAHOO && summary.Error.includes('429')) {
          log(`🔄 Trying RSS fallback for ${symbol} due to Yahoo rate limit`)
          summary = await rssService.getQuoteSummary({ symbol })
        }
      } catch (error) {
        if (provider === FINANCE_PROVIDER.YAHOO && error.message.includes('429')) {
          log(`🔄 Trying RSS fallback for ${symbol} due to Yahoo error: ${error.message}`)
          summary = await rssService.getQuoteSummary({ symbol })
        } else {
          throw error
        }
      }
    }

    if (!summary.Symbol) {
      summary.Symbol = symbol
    }

    if (!summary.FullName || !settings.use_provider_instrument_names) {
      summary.FullName = fallbackName
    }

    return summary
  })
}

var getHistoricalQuotes = async ({ symbol, provider, range = '1y', includeTimestamps = true }) => {
  return cacheOrDefault(`chart_${symbol}_${provider}_${range}`, () => {
    const service = services[provider]

    if (symbol && service) {
      return service.getHistoricalQuotes({ symbol, range, includeTimestamps })
    }
  })
}

var getBatchQuotes = async ({ symbols, provider }) => {
  const service = services[provider]

  if (!service || !service.getBatchQuotes || !symbols || symbols.length === 0) {
    return null
  }

  try {
    log(`🚀 Starting batch fetch for ${symbols.length} symbols using ${provider}`)
    const batchResult = await service.getBatchQuotes(symbols)
    log(`🚀 Batch fetch completed: ${batchResult ? Object.keys(batchResult).length : 0} results`)
    return batchResult
  } catch (error) {
    log(`❌ Batch fetch failed: ${error.message}`)
    return null
  }
}

var getNewsList = async ({ symbol, provider }) => {
  return cacheOrDefault(`news_${provider}_${symbol}`, async () => {
    const service = services[provider]

    if (symbol && service) {
      try {
        const result = await service.getNewsList({ symbol })
        
        // If the service returns an error or no items, try RSS fallback
        if (result.error || !result.Items || result.Items.length === 0) {
          log(`📰 News: Primary service failed for ${symbol}, trying RSS fallback`)
          return await rssService.getNewsList({ symbol })
        }
        
        return result
      } catch (error) {
        log(`📰 News: Error from primary service for ${symbol}, trying RSS fallback: ${error.message}`)
        return await rssService.getNewsList({ symbol })
      }
    }
    
    return { Items: [], error: 'No service available' }
  }, 15 * 60 * 1000)
}
