const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { fetch } = Me.imports.helpers.fetchImpersonate
const { SettingsHandler } = Me.imports.helpers.settings
const { createQuoteSummaryFromYahooData } = Me.imports.services.dto.quoteSummary
const { createQuoteHistoricalFromYahooData } = Me.imports.services.dto.quoteHistorical
const { createNewsListFromYahooData } = Me.imports.services.dto.newsList
const { INTERVAL_MAPPINGS } = Me.imports.services.meta.yahoo

const COOKIE_URL = 'https://fc.yahoo.com/'
const CRUMB_URL = 'https://query2.finance.yahoo.com/v1/test/getcrumb'

const API_ENDPOINT = 'https://query2.finance.yahoo.com'
const API_VERSION_SUMMARY = 'v10/finance'
const API_VERSION_CHART = 'v8/finance'
const RSS_NEWS_ENDPOINT = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s={SYMBOL}&region=US&lang=en-US'

const defaultQueryParameters = {
  formatted: 'false',
  lang: 'en-US',
  region: 'US',
  crumb: '',
}

// const createQuoteSummaryFromYahooData = createQuoteHistoricalFromYahooData


const ensurePrerequisites = async () => {
  const settings = new SettingsHandler()

  if ((settings?.yahoo_meta?.expiration || 0) > Date.now()) {
    return settings.yahoo_meta
  }

  const cookieResponse = await fetch({
    url: COOKIE_URL
  })

  const cookie = cookieResponse.headers.get('set-cookie')

  const crumbResponse = await fetch({
    url: CRUMB_URL,
    cookies: [cookie]
  })

  const newMetaData = {
    cookie,
    crumb: await crumbResponse.text(),
    expiration: Date.now() + (360 * 24 * 60 * 60 * 1000)
  }

  settings.yahoo_meta = newMetaData

  return newMetaData
}

// Import required GI modules for subprocess
const GLib = imports.gi.GLib
const Gio = imports.gi.Gio

var getQuoteSummary = async ({ symbol }) => {
  // First try Python script with yahooquery (primary method now)
  try {
    log(`🐍 Trying Python yahooquery for ${symbol}`)
    const scriptPath = ExtensionUtils.getCurrentExtension().path + '/helpers/yahoo_fetcher.py'
    
    const result = await new Promise((resolve, reject) => {
      const proc = new Gio.Subprocess({
        argv: ['/usr/bin/python3.10', scriptPath, symbol],
        flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
      })
      
      proc.init(null)
      
      proc.communicate_utf8_async(null, null, (proc, res) => {
        try {
          const [, stdout, stderr] = proc.communicate_utf8_finish(res)
          
          if (proc.get_successful()) {
            const data = JSON.parse(stdout)
            
            if (data.error) {
              reject(new Error(data.error))
            } else {
              // Transform data to Yahoo Finance API format
              const params = {
                symbol,
                quoteData: {
                  quoteSummary: {
                    result: [{
                      price: {
                        regularMarketPrice: data.regularMarketPrice,
                        regularMarketChange: data.regularMarketChange,
                        regularMarketChangePercent: data.regularMarketChangePercent / 100,
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
              
              resolve(createQuoteSummaryFromYahooData(params))
            }
          } else {
            reject(new Error(`Python script failed: ${stderr}`))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    log(`✅ Python yahooquery success for ${symbol}`)
    return result
    
  } catch (pythonError) {
    log(`❌ Python yahooquery failed for ${symbol}: ${pythonError.message}`)
    
    // Only try Yahoo API fallback if Python completely fails (not for rate limit issues)
    // Return error immediately to avoid hitting Yahoo's rate limited endpoints
    const params = {
      symbol,
      quoteData: null,
      error: `Unable to fetch data: ${pythonError.message}`
    }
    
    return createQuoteSummaryFromYahooData(params)
  }
}

var getHistoricalQuotes = async ({ symbol, range = '1mo', includeTimestamps = true }) => {
  const yahooMeta = await ensurePrerequisites()

  const queryParameters = {
    ...defaultQueryParameters,
    crumb: yahooMeta.crumb,
    range,
    includePrePost: false,
    interval: INTERVAL_MAPPINGS[range],
    includeTimestamps: includeTimestamps ? 'true' : 'false'
  }

  const url = `${API_ENDPOINT}/${API_VERSION_CHART}/chart/${symbol}`
  const response = await fetch({ url, queryParameters, cookies: [yahooMeta.cookie] })

  if (response.ok) {
    return createQuoteHistoricalFromYahooData(response.json())
  } else {
    return createQuoteHistoricalFromYahooData(null, `${response.statusText} - ${response.text()}`)
  }
}

var getNewsList = async ({ symbol }) => {
  const yahooMeta = await ensurePrerequisites()

  const queryParameters = {
    crumb: yahooMeta.crumb,
  }

  const url = RSS_NEWS_ENDPOINT.replace('{SYMBOL}', symbol)

  const response = await fetch({ url, queryParameters, cookies: [yahooMeta.cookie] })

  if (response.ok) {
    return createNewsListFromYahooData(response.text())
  } else {
    return createNewsListFromYahooData(null, `${response.statusText} - ${response.text()}`)
  }
}
