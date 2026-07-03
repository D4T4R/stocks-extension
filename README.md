# 📈 Stocks Extension for GNOME Shell

A powerful and efficient GNOME Shell extension that provides real-time stock market data with fast batch loading, historical charts, inline expandable news, and comprehensive market information.

OG extension : [github.com/cinatic/stocks-extension](https://github.com/cinatic/stocks-extension). Credits - [Cinatic](https://github.com/cinatic/)

## 🆕 What's New (July 2026)

### Features
- **Inline expandable news**: Clicking a news item no longer opens the browser. It expands an inline snippet of the article right in the popup, with a **"Read more ↗"** link at the bottom of each expanded item that opens the full article in your browser.
- **Working news feeds**: Yahoo Finance RSS feeds are dead (404). News now comes from **Bing News RSS** (real snippets + direct article links) with Google News RSS as fallback.
- **True single-request batch loading**: The batch fetcher now uses Yahoo's `/v7/finance/quote` endpoint (one HTTP request for *all* symbols) instead of one `quoteSummary` request per symbol. Cold-start load of 23 symbols dropped from **~3.5 minutes to ~2 seconds**.
- **Instant details screen**: Opening a ticker's details reuses the quote summary already fetched by the overview instead of re-fetching it (previously added ~23 s per navigation). Navigation between screens is now smooth thanks to shared caching.

### Bug Fixes
- **Blank details page**: The chart component received malformed series data and threw during repaint, which broke allocation of the entire popup. Historical data is now emitted as proper `[timestamp_ms, value]` pairs, and all chart drawing is wrapped in defensive try/catch so a repaint error can never blank the popup again.
- **Blank main page after pressing Back**: The cached overview screen was being destroyed on screen switches; it's now detached with `remove_child` and reused.
- **Chart time ranges**: All ranges (`1d`, `5d`, `1mo`, `6mo`, `ytd`, `1y`, `5y`, `max`) now map to the correct Yahoo period/interval — previously every range silently showed 1-day data.
- **Wrong change percentages**: `/v7/finance/quote` returns percents in percent units (1.23 = 1.23 %); these are now normalized to the fractions the extension expects.
- **Rate-limit storms**: On a total batch failure (almost always Yahoo 429 rate limiting), the extension no longer falls back to fetching every symbol individually — which fired 20+ extra requests into the same rate limit and stalled the popup for minutes. It now shows *"Yahoo is rate limiting, retrying shortly …"* and retries the single batch request on the next refresh cycle. All Python `Ticker()` calls use `retry=1, timeout=12` to fail fast instead of stalling in retry backoff.
- **Single-item RSS channels**: News feeds with exactly one item are now parsed correctly.

## ✨ Features

### 🚀 **High Performance**
- **Batch Loading**: Fetches all stocks in a single `/v7/finance/quote` API call (~2 seconds for 23 stocks)
- **Smart Caching**: Overview batch results populate the quote-summary cache, so the panel ticker and details screen reuse them instead of spawning their own fetches
- **Rate Limit Handling**: Fail-fast requests, no per-symbol fallback storms, automatic retry on the next refresh cycle

### 📊 **Comprehensive Data**
- **Real-time Quotes**: Current prices, changes, and percentages
- **Market Information**: Exchange names, currency symbols, trading volumes
- **Extended Hours**: Pre-market and post-market data when available
- **Historical Charts**: Interactive charts with multiple time ranges (1d → max), with volume bars and crosshair
- **Market Status**: Live market state indicators

### 📰 **News & Updates**
- **Inline Snippets**: Click a news item to expand its summary in place — no browser round-trip
- **Read More Links**: Each expanded item has a "Read more ↗" link that opens the full article
- **Reliable Sources**: Bing News RSS (snippets + direct links) with Google News RSS fallback
- **Auto-refresh**: Configurable update intervals

### 🎨 **User Interface**
- **Clean Design**: Intuitive card-based layout
- **Search & Filter**: Quick stock lookup and filtering
- **Responsive Layout**: Optimized for different screen sizes
- **Color Coding**: Visual indicators for gains/losses

## 📷 Screenshots

### Overview Screen
- Grid view of all configured stocks
- Real-time prices and changes
- Exchange and timestamp information
- Volume and market status

### Details Screen
- Individual stock information
- OHLC (Open, High, Low, Close) data
- Historical price charts
- Multiple time range options
- Expandable news feed

## 🛠️ Installation

### Prerequisites
- GNOME Shell 3.36+ or 40+ (developed and tested on 42.9 / X11; the codebase uses the legacy GJS import style — `imports.gi`, `Me.imports.*` — required by Shell ≤ 44)
- Python 3.8+ with `yahooquery` library
- Internet connection for market data

### Install Dependencies
```bash
# Install yahooquery for enhanced data fetching
pip3 install yahooquery pandas

# Or install in user directory
pip3 install --user yahooquery pandas
```

### Extension Installation
1. **From Source** (Development):
   ```bash
   git clone <repository-url>
   cp -r stocks@infinicode.de ~/.local/share/gnome-shell/extensions/
   ```

2. **Enable Extension**:
   ```bash
   gnome-extensions enable stocks@infinicode.de
   ```

3. **Restart GNOME Shell**:
   - Press `Alt + F2`, type `r`, press Enter (X11)
   - From a terminal (X11): `kill $(pidof gnome-shell)` — the shell respawns automatically
   - Or log out and back in (Wayland)

   > Note: GJS caches JavaScript modules, so a shell restart is required after changing any `.js` file. The Python helper scripts reload immediately (they run as subprocesses).

## ⚙️ Configuration

### Adding Stocks
1. Open extension preferences
2. Add stock symbols (e.g., `AAPL`, `GOOGL`, `^NSEI`)
3. Configure custom names if desired
4. Set refresh intervals

### Supported Markets
- **US Markets**: NASDAQ, NYSE, AMEX
- **Indian Markets**: NSE, BSE
- **Global Indices**: S&P 500, Dow Jones, NIFTY
- **Cryptocurrencies**: Bitcoin, Ethereum, etc.
- **Commodities**: Oil, Gold, Silver

### Symbol Examples
```
AAPL           # Apple Inc.
GOOGL          # Alphabet Inc.
TSLA           # Tesla Inc.
^NSEI          # NIFTY 50 Index
^NSEBANK       # NIFTY Bank Index
BTC-USD        # Bitcoin
HDFCBANK.NS    # HDFC Bank (NSE)
ITC.NS         # ITC Limited (NSE)
```

## 🏗️ Architecture

### Core Components

#### Data Layer
- **BatchFetcher** (`helpers/yahoo_batch_fetcher.py`): Single `/v7/finance/quote` request for all symbols via `yahooquery`'s `Ticker.quotes`
- **HistoricalFetcher** (`helpers/yahoo_historical_fetcher.py`): Chart series as `[timestamp_ms, value]` pairs with volume data
- **PythonService** (`services/pythonService.js`): JavaScript interface to the Python backend (Gio.Subprocess)
- **FinanceService** (`services/financeService.js`): Unified API with caching

#### UI Components
- **ScreenWrapper** (`screenWrapper.js`): Navigation and screen management; keeps the overview screen alive across navigation
- **StockOverviewScreen** (`stockOverviewScreen.js`): Main dashboard with stock grid
- **StockDetailsScreen** (`stockDetailsScreen.js`): OHLC data, charts, and news
- **NewsCard** (`newsCard.js`): Collapsible news items with inline snippet and "Read more" link
- **Chart** (`chart.js`): Cairo-drawn price chart with volume bars and crosshair, hardened against repaint exceptions

#### Services
- **Yahoo Finance**: Quote and historical data via yahooquery
- **Bing News RSS**: Primary news source (Google News RSS fallback)
- **Caching Layer**: In-memory caching with TTL (`helpers/data.js`)

### Data Flow
```
User Interface → FinanceService → PythonService → yahooquery → Yahoo Finance API
News Screen   → RssService     → Bing News RSS (fallback: Google News RSS)
```

## 🚀 Performance Optimizations

### Batch Processing
- **Before**: One `quoteSummary` request per symbol (~3.5 minutes for 23 stocks under rate limiting)
- **After**: Single `/v7/finance/quote` call (~2 seconds for 23 stocks)
- All `Ticker()` calls use `retry=1, timeout=12` to fail fast instead of stalling in retry backoff

### Smart Caching
- Quote summaries: 5 minutes TTL, shared between overview, panel ticker, and details screen
- News data: 15 minutes TTL
- Overview batch results pre-populate the summary cache, so opening a ticker's details is instant
- Manual refresh buttons bypass the cache

### Rate Limit Management
- One batch request per refresh cycle — never a per-symbol fetch storm
- On total batch failure, shows a notice and retries on the next refresh cycle
- Yahoo rate-limits by IP; keeping request volume low is the only reliable mitigation

## 🔧 Development

### Project Structure
```
stocks@infinicode.de/
├── components/
│   ├── cards/                  # Stock & news card components
│   ├── screens/                # Overview, details, news list screens
│   ├── buttons/                # Interactive elements
│   ├── chart/                  # Cairo chart component
│   └── screenWrapper/          # Screen navigation & caching
├── services/                   # Data services
│   ├── dto/                    # Data transfer objects
│   └── meta/                   # Service metadata
├── helpers/                    # Utility functions
│   ├── yahoo_batch_fetcher.py      # Python batch quote fetcher
│   ├── yahoo_historical_fetcher.py # Historical chart data
│   └── data.js                     # In-memory cache
├── schemas/                    # GSettings schema
└── po/                         # Internationalization
```

### Adding New Features
1. **New Data Sources**: Implement in `services/`
2. **UI Components**: Add to appropriate `components/` subdirectory
3. **Configuration**: Update settings schema
4. **Translations**: Add to `po/` files

> The JavaScript must stay in the **legacy GJS format** (`const { GObject } = imports.gi`, `var` exports, `Me.imports.*`). ES module `import` declarations throw *"import declarations may only appear at top level of a module"* on GNOME Shell ≤ 44.

### Testing
```bash
# Test batch quotes (one request for all symbols)
python3 helpers/yahoo_batch_fetcher.py AAPL GOOGL TSLA

# Test historical data
python3 helpers/yahoo_historical_fetcher.py AAPL 1d 5m

# Monitor extension logs (the extension logs with emoji prefixes)
journalctl --user -f | grep -E "(📊|📈|🐍|📰|✅|❌|🔄|📚)"
```

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
```bash
# Check if extension is enabled
gnome-extensions list --enabled | grep stocks

# Check for errors
journalctl --user -f | grep stocks
```

#### No Data Loading
1. Verify internet connection
2. Check yahooquery installation:
   ```bash
   python3 -c "import yahooquery; print('OK')"
   ```
3. Test API directly:
   ```bash
   cd ~/.local/share/gnome-shell/extensions/stocks@infinicode.de
   python3 helpers/yahoo_batch_fetcher.py AAPL
   ```

#### Rate Limiting (429 Errors)
- Yahoo rate-limits by IP; heavy request volume from any tool on your machine counts against it
- The extension shows *"Yahoo is rate limiting, retrying shortly …"* and retries automatically on the next refresh cycle
- Limits typically clear within a few minutes once request volume drops

#### Blank Popup / Blank Details Page
- Fixed in this fork — chart repaint errors are caught and logged (`📈 Chart: draw failed: …`) instead of breaking popup allocation
- If it still happens, check `journalctl --user -f` for the logged error and file an issue

#### Performance Issues
- Reduce number of tracked stocks
- Increase refresh intervals
- Clear cache: restart GNOME Shell (X11: `kill $(pidof gnome-shell)`)

### Debug Mode
Enable detailed logging:
```bash
# Watch real-time logs
journalctl --user -f | grep -E "(📊|📈|🐍|📰|✅|❌|🔄|📚)"
```

## 📊 API Usage & Limits

### Data Sources
- **Quotes**: Yahoo `/v7/finance/quote` via yahooquery (one batch request per refresh)
- **Charts**: Yahoo historical data via yahooquery
- **News**: Bing News RSS (primary), Google News RSS (fallback) — Yahoo's finance RSS feeds are discontinued
- **Rate Limits**: Yahoo 429s by IP; handled with fail-fast requests and refresh-cycle retries

### Supported Data
- Real-time quotes (15-20 minute delay for most exchanges)
- Historical data (intraday, daily, weekly, monthly)
- Pre/post-market prices and timestamps
- Market status and trading hours
- News with snippets and direct article links

## 🤝 Contributing

### Bug Reports
Please include:
- GNOME Shell version
- Extension version
- Error logs from `journalctl --user`
- Steps to reproduce

### Feature Requests
- Use GitHub issues
- Provide use case and mockups if applicable
- Consider performance implications (especially extra Yahoo requests)

### Development Setup
```bash
# Clone repository
git clone <repo-url>

# Install development dependencies
pip3 install yahooquery pandas

# Enable development mode
ln -s $(pwd)/stocks@infinicode.de ~/.local/share/gnome-shell/extensions/

# Enable extension
gnome-extensions enable stocks@infinicode.de
```

## 📄 License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Yahoo Finance**: Data provider
- **yahooquery**: Python library for Yahoo Finance API
- **Bing News / Google News**: RSS news sources
- **GNOME Shell**: Platform and UI framework
- **Contributors**: Community feedback and improvements

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README and code comments
- **Logs**: Use `journalctl --user -f | grep stocks` for debugging

---

**Made with ❤️ for the GNOME community**

*Last updated: July 2026*
