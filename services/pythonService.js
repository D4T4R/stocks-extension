const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { createQuoteSummaryFromYahooData } = Me.imports.services.dto.quoteSummary

const GLib = imports.gi.GLib
const Gio = imports.gi.Gio

// Service that uses Python script with yahooquery for better reliability
var getQuoteSummary = async ({ symbol }) => {
  const scriptPath = Me.path + '/helpers/yahoo_fetcher.py'
  
  return new Promise((resolve) => {
    try {
      // Try multiple Python interpreters to find the one with yahooquery
      const pythonPaths = [
        '/usr/bin/python3.10',  // Working Python 3.10 with yahooquery
        '/usr/bin/python3',
        '/usr/bin/python',
        'python3.10',
        'python3',
        'python',
        '/home/aniketdatar/bin/python3',
        '/home/aniketdatar/bin/python'
      ]
      
      let tried = 0
      
      const tryNextPython = () => {
        if (tried >= pythonPaths.length) {
          // If all Python interpreters fail, return error
          const params = {
            symbol,
            quoteData: null,
            error: `All Python interpreters failed for ${symbol}`
          }
          resolve(createQuoteSummaryFromYahooData(params))
          return
        }
        
        const pythonPath = pythonPaths[tried]
        tried++
        
        log(`🐍 Trying Python at: ${pythonPath} for ${symbol}`)
        
        const proc = new Gio.Subprocess({
          argv: [pythonPath, scriptPath, symbol],
          flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        })
        
        try {
          proc.init(null)
          
          proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
              const [, stdout, stderr] = proc.communicate_utf8_finish(res)
              
              if (proc.get_successful()) {
                const data = JSON.parse(stdout)
                
                if (data.error) {
                  if (data.error.includes('yahooquery not available')) {
                    // Try next Python interpreter
                    tryNextPython()
                    return
                  }
                  
                  // Other error, return it
                  const params = {
                    symbol,
                    quoteData: null,
                    error: data.error
                  }
                  resolve(createQuoteSummaryFromYahooData(params))
                  return
                }
                
                // Success! Transform the data to match Yahoo Finance API format
                const params = {
                  symbol,
                  quoteData: {
                    quoteSummary: {
                      result: [{
                        price: {
                          regularMarketPrice: data.regularMarketPrice,
                          regularMarketChange: data.regularMarketChange,
                          regularMarketChangePercent: data.regularMarketChangePercent ? data.regularMarketChangePercent / 100 : null,
                          regularMarketPreviousClose: data.regularMarketPreviousClose,
                          regularMarketOpen: data.regularMarketOpen,
                          regularMarketDayHigh: data.regularMarketDayHigh,
                          regularMarketDayLow: data.regularMarketDayLow,
                          regularMarketVolume: data.regularMarketVolume,
                          longName: data.longName || data.shortName,
                          currencySymbol: data.currencySymbol || '$'
                        }
                      }]
                    }
                  }
                }
                
                log(`✅ Successfully fetched ${symbol} using Python yahooquery`)
                resolve(createQuoteSummaryFromYahooData(params))
              } else {
                log(`❌ Python script failed for ${symbol}: ${stderr}`)
                tryNextPython()
              }
            } catch (e) {
              log(`❌ Failed to parse Python output for ${symbol}: ${e.message}`)
              tryNextPython()
            }
          })
        } catch (e) {
          log(`❌ Failed to start Python process: ${e.message}`)
          tryNextPython()
        }
      }
      
      tryNextPython()
      
    } catch (error) {
      const params = {
        symbol,
        quoteData: null,
        error: `Python service failed: ${error.message}`
      }
      resolve(createQuoteSummaryFromYahooData(params))
    }
  })
}

var getHistoricalQuotes = async ({ symbol, range = '1mo', includeTimestamps = true }) => {
  const scriptPath = Me.path + '/helpers/yahoo_historical_fetcher.py'
  
  // Convert range to period and interval for yahooquery
  let period = '1d'
  let interval = '1m'
  
  switch (range) {
    case 'INTRADAY':
      period = '1d'
      interval = '1m'
      break
    case 'ONE_DAY':
      period = '1d'
      interval = '5m'
      break
    case 'FIVE_DAY':
      period = '5d'
      interval = '15m'
      break
    case 'ONE_MONTH':
      period = '1mo'
      interval = '1d'
      break
    case 'THREE_MONTH':
      period = '3mo'
      interval = '1d'
      break
    case 'SIX_MONTH':
      period = '6mo'
      interval = '1d'
      break
    case 'ONE_YEAR':
      period = '1y'
      interval = '1wk'
      break
    case 'TWO_YEAR':
      period = '2y'
      interval = '1wk'
      break
    case 'FIVE_YEAR':
      period = '5y'
      interval = '1mo'
      break
    case 'TEN_YEAR':
      period = '10y'
      interval = '1mo'
      break
    case 'YTD':
      period = 'ytd'
      interval = '1d'
      break
    case 'MAX':
      period = 'max'
      interval = '1mo'
      break
  }
  
  return new Promise((resolve) => {
    try {
      const pythonPaths = [
        '/usr/bin/python3.10',  // Working Python 3.10 with yahooquery
        '/usr/bin/python3',
        '/usr/bin/python',
        'python3.10',
        'python3',
        'python'
      ]
      
      let tried = 0
      
      const tryNextPython = () => {
        if (tried >= pythonPaths.length) {
          resolve({ symbol, error: `Failed to fetch historical data for ${symbol}` })
          return
        }
        
        const pythonPath = pythonPaths[tried]
        tried++
        
        log(`📊 Trying Python historical data: ${pythonPath} for ${symbol} (${period}, ${interval})`)
        
        const proc = new Gio.Subprocess({
          argv: [pythonPath, scriptPath, symbol, period, interval],
          flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        })
        
        try {
          proc.init(null)
          
          proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
              const [, stdout, stderr] = proc.communicate_utf8_finish(res)
              
              if (proc.get_successful()) {
                const data = JSON.parse(stdout)
                
                if (data.error) {
                  if (data.error.includes('yahooquery not available')) {
                    tryNextPython()
                    return
                  }
                  
                  log(`❌ Python historical data error: ${data.error}`)
                  resolve({ symbol, error: data.error })
                  return
                }
                
                log(`✅ Python historical data success for ${symbol}: ${data.Data?.length || 0} points`)
                resolve(data)
              } else {
                log(`❌ Python historical script failed for ${symbol}: ${stderr}`)
                tryNextPython()
              }
            } catch (e) {
              log(`❌ Failed to parse Python historical output for ${symbol}: ${e.message}`)
              tryNextPython()
            }
          })
        } catch (e) {
          log(`❌ Failed to start Python historical process: ${e.message}`)
          tryNextPython()
        }
      }
      
      tryNextPython()
      
    } catch (error) {
      resolve({ symbol, error: `Python historical service failed: ${error.message}` })
    }
  })
}

var getBatchQuotes = async (symbols) => {
  const scriptPath = Me.path + '/helpers/yahoo_batch_fetcher.py'
  
  return new Promise((resolve) => {
    try {
      const pythonPaths = [
        '/usr/bin/python3.10',  // Working Python 3.10 with yahooquery
        '/usr/bin/python3',
        '/usr/bin/python',
        'python3.10',
        'python3',
        'python'
      ]
      
      let tried = 0
      
      const tryNextPython = () => {
        if (tried >= pythonPaths.length) {
          // If all Python interpreters fail, fallback to individual calls
          log('❌ Batch fetching failed, falling back to individual calls')
          resolve(null)
          return
        }
        
        const pythonPath = pythonPaths[tried]
        tried++
        
        log(`🐍 Trying batch Python fetch: ${pythonPath} for ${symbols.length} symbols`)
        
        const proc = new Gio.Subprocess({
          argv: [pythonPath, scriptPath, ...symbols],
          flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        })
        
        try {
          proc.init(null)
          
          proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
              const [, stdout, stderr] = proc.communicate_utf8_finish(res)
              
              if (proc.get_successful()) {
                const data = JSON.parse(stdout)
                
                if (data.error) {
                  if (data.error.includes('yahooquery not available')) {
                    tryNextPython()
                    return
                  }
                  
                  log(`❌ Python batch error: ${data.error}`)
                  resolve(null)
                  return
                }
                
                log(`✅ Batch Python success: ${Object.keys(data).length} symbols fetched`)
                resolve(data)
              } else {
                log(`❌ Python batch script failed: ${stderr}`)
                tryNextPython()
              }
            } catch (e) {
              log(`❌ Failed to parse Python batch output: ${e.message}`)
              tryNextPython()
            }
          })
        } catch (e) {
          log(`❌ Failed to start Python batch process: ${e.message}`)
          tryNextPython()
        }
      }
      
      tryNextPython()
      
    } catch (error) {
      resolve(null)
    }
  })
}

var getNewsList = async ({ symbol }) => {
  return {
    symbol,
    error: 'News not available via Python service'
  }
}
