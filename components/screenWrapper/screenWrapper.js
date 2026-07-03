const { GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const { StockOverviewScreen } = Me.imports.components.screens.stockOverviewScreen.stockOverviewScreen
const { StockNewsListScreen } = Me.imports.components.screens.stockNewsListScreen.stockNewsListScreen
const { StockDetailsScreen } = Me.imports.components.screens.stockDetailsScreen.stockDetailsScreen

var ScreenWrapper = GObject.registerClass({
      GTypeName: 'StockExtension_ScreenWrapper'
    },
    class ScreenWrapper extends St.Widget {
      _init (mainEventHandler) {
        super._init({
          style_class: 'screen-wrapper'
        })

        this._mainEventHandler = mainEventHandler
        this._cachedOverviewScreen = null

        this._showScreenConnectId = this._mainEventHandler.connect('show-screen', (sender, { screen, additionalData }) => this.showScreen(screen, additionalData))

        this.connect('destroy', this._onDestroy.bind(this))

        this.showScreen()
      }

      showScreen (screenName, additionalData) {
        log(`🔄 ScreenWrapper: Showing screen '${screenName || 'overview'}'`)
        let screen
        let isReusingCachedOverview = false

        switch (screenName) {
          case 'stock-details':
            screen = new StockDetailsScreen({ quoteSummary: additionalData.item, mainEventHandler: this._mainEventHandler })
            break

          case 'stock-news-list':
            screen = new StockNewsListScreen({ quoteSummary: additionalData.item, mainEventHandler: this._mainEventHandler })
            break

          case 'overview':
          default:
            if (!this._cachedOverviewScreen) {
              log('📚 Creating NEW cached overview screen')
              this._cachedOverviewScreen = new StockOverviewScreen(this._mainEventHandler)
              screen = this._cachedOverviewScreen
            } else {
              log('📚 Reusing CACHED overview screen (preserving data)')
              screen = this._cachedOverviewScreen
              isReusingCachedOverview = true
              
              // If the cached overview screen is already displayed, do nothing
              if (this.get_children().includes(this._cachedOverviewScreen)) {
                log('📚 Cached overview screen already displayed, no action needed')
                return
              }
            }
            break
        }

        // Clear existing children and add the screen.
        // The cached overview screen must only be detached (not destroyed),
        // otherwise re-adding it later fails and the popup stays blank.
        this.get_children().forEach(child => {
          if (child === this._cachedOverviewScreen) {
            this.remove_child(child)
          } else {
            child.destroy()
          }
        })
        this.add_actor(screen)
        
        if (isReusingCachedOverview) {
          log('🔄 ScreenWrapper: Restored cached overview with preserved data')
        } else {
          log('🔄 ScreenWrapper: Added new screen')
        }
      }

      _onDestroy () {
        if (this._showScreenConnectId) {
          this._mainEventHandler.disconnect(this._showScreenConnectId)
        }

        // The cached overview screen may currently be detached (another screen
        // is shown) and would leak unless destroyed explicitly.
        if (this._cachedOverviewScreen && !this._cachedOverviewScreen.get_parent()) {
          this._cachedOverviewScreen.destroy()
        }
        this._cachedOverviewScreen = null
      }
    }
)
