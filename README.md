# 📈 Stocks Extension for GNOME Shell

A powerful and efficient GNOME Shell extension that provides real-time stock market data with fast batch loading, historical charts, and comprehensive market information.

## ✨ Features

### 🚀 **High Performance**
- **Batch Loading**: Fetches all stocks in a single API call (~4 seconds for 14 stocks)
- **Smart Caching**: Reduces API calls and improves responsiveness
- **Rate Limit Handling**: Automatic fallback mechanisms to prevent API blocking

### 📊 **Comprehensive Data**
- **Real-time Quotes**: Current prices, changes, and percentages
- **Market Information**: Exchange names, currency symbols, trading volumes
- **Extended Hours**: Pre-market and post-market data when available
- **Historical Charts**: Interactive charts with multiple time ranges
- **Market Status**: Live market state indicators

### 📰 **News & Updates**
- **Stock News**: Latest news for individual stocks
- **RSS Fallback**: Reliable news delivery through multiple sources
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
- News feed integration

## 🛠️ Installation

### Prerequisites
- GNOME Shell 3.36+ or 40+
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
   - Or log out and back in (Wayland)

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
- **BatchFetcher** (`yahoo_batch_fetcher.py`): Python script for efficient bulk data retrieval
- **PythonService** (`pythonService.js`): JavaScript interface to Python backend
- **FinanceService** (`financeService.js`): Unified API with fallback mechanisms

#### UI Components
- **ScreenWrapper** (`screenWrapper.js`): Navigation and screen management
- **StockOverviewScreen** (`stockOverviewScreen.js`): Main dashboard with stock grid
- **StockDetailsScreen** (`stockDetailsScreen.js`): Individual stock details and charts
- **StockCard** (`stockCard.js`): Individual stock display component

#### Services
- **Yahoo Finance**: Primary data source via yahooquery
- **RSS Feeds**: Fallback for news and basic data
- **Caching Layer**: Smart caching with TTL

### Data Flow
```
User Interface → FinanceService → PythonService → yahooquery → Yahoo Finance API
                      ↓ (fallback)
                 RSS Service → RSS Feeds
```

## 🚀 Performance Optimizations

### Batch Processing
- **Before**: Sequential API calls (20+ seconds for 14 stocks)
- **After**: Single batch call (~4 seconds for 14 stocks)
- **Improvement**: 80% faster loading times

### Smart Caching
- Quote data: 30 seconds TTL
- Historical data: 5 minutes TTL  
- News data: 15 minutes TTL
- Automatic cache invalidation

### Rate Limit Management
- Batch requests to minimize API calls
- Automatic backoff on rate limits
- RSS fallback for news and basic data
- Request queuing and throttling

## 🔧 Development

### Project Structure
```
stocks@infinicode.de/
├── components/
│   ├── cards/                  # UI card components
│   ├── screens/                # Main screen views
│   ├── buttons/                # Interactive elements
│   └── charts/                 # Chart components
├── services/                   # Data services
│   ├── dto/                    # Data transfer objects
│   └── meta/                   # Service metadata
├── helpers/                    # Utility functions
│   ├── yahoo_batch_fetcher.py  # Python batch fetcher
│   └── yahoo_historical_fetcher.py # Historical data
├── settings/                   # Configuration
└── translations/               # Internationalization
```

### Adding New Features
1. **New Data Sources**: Implement in `services/`
2. **UI Components**: Add to appropriate `components/` subdirectory
3. **Configuration**: Update settings schema
4. **Translations**: Add to translations files

### Testing
```bash
# Test Python components
python3 helpers/yahoo_batch_fetcher.py AAPL GOOGL TSLA

# Test historical data
python3 helpers/yahoo_historical_fetcher.py AAPL 1d 5m

# Monitor extension logs
journalctl -f | grep stocks
```

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
```bash
# Check if extension is enabled
gnome-extensions list --enabled | grep stocks

# Check for errors
journalctl -f | grep stocks
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
- Extension automatically handles rate limits
- Uses batch fetching to minimize requests
- Falls back to RSS feeds when needed
- Check logs for fallback usage

#### Performance Issues
- Reduce number of tracked stocks
- Increase refresh intervals
- Clear cache: restart GNOME Shell

### Debug Mode
Enable detailed logging:
```bash
# Watch real-time logs
journalctl -f | grep -E "(📊|📈|🚀|❌)"
```

## 📊 API Usage & Limits

### Data Sources
- **Primary**: Yahoo Finance via yahooquery
- **Fallback**: RSS feeds for basic data
- **Rate Limits**: Handled automatically with backoffs

### Supported Data
- Real-time quotes (15-20 minute delay for most exchanges)
- Historical data (intraday, daily, weekly, monthly)
- Corporate actions and dividends
- Market status and trading hours
- Basic news feeds

## 🤝 Contributing

### Bug Reports
Please include:
- GNOME Shell version
- Extension version
- Error logs from `journalctl`
- Steps to reproduce

### Feature Requests
- Use GitHub issues
- Provide use case and mockups if applicable
- Consider performance implications

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
- **GNOME Shell**: Platform and UI framework
- **Contributors**: Community feedback and improvements

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README and code comments
- **Logs**: Use `journalctl -f | grep stocks` for debugging

---

**Made with ❤️ for the GNOME community**

*Last updated: January 2025*
