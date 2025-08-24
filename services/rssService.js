const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { fetch } = Me.imports.helpers.fetchImpersonate
const { createQuoteSummaryFromYahooData } = Me.imports.services.dto.quoteSummary

// Simple RSS feed-based fallback service for when Yahoo's API is rate limited
var getQuoteSummary = async ({ symbol }) => {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US&count=1`
  
  try {
    const response = await fetch({ url })
    
    if (!response.ok) {
      throw new Error(`RSS feed failed: ${response.statusText}`)
    }
    
    const rssText = await response.text()
    
    // Extract basic information from RSS feed
    const titleMatch = rssText.match(/<title>([^<]+)<\/title>/i)
    const symbolMatch = rssText.match(/([A-Z]{1,5})\s*\(([^)]+)\)/i)
    
    let extractedSymbol = symbol
    let price = null
    let change = null
    let changePercent = null
    
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1]
      // Try to extract price info from title
      const priceMatch = title.match(/(\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)\s*([+-]?\d+\.?\d*)%\)/)
      if (priceMatch) {
        price = parseFloat(priceMatch[1])
        change = parseFloat(priceMatch[2])
        changePercent = parseFloat(priceMatch[3])
      }
    }
    
    // Create a simple quote object that matches what the DTO expects
    const params = {
      symbol: extractedSymbol,
      quoteData: {
        quoteSummary: {
          result: [{
            price: {
              regularMarketPrice: price,
              regularMarketChange: change,
              regularMarketChangePercent: changePercent ? changePercent / 100 : null,
              currencySymbol: '$', // Assume USD for simplicity
              longName: symbolMatch && symbolMatch[2] ? symbolMatch[2] : extractedSymbol
            }
          }]
        }
      }
    }
    
    return createQuoteSummaryFromYahooData(params)
    
  } catch (error) {
    log(`⚠️ RSS fallback failed for ${symbol}: ${error.message}`)
    
    // Return a minimal object with error
    const params = {
      symbol,
      quoteData: null,
      error: `RSS fallback failed: ${error.message}`
    }
    
    return createQuoteSummaryFromYahooData(params)
  }
}

var getHistoricalQuotes = async ({ symbol, range = '1mo', includeTimestamps = true }) => {
  // RSS doesn't provide historical data, return empty
  return {
    symbol,
    error: 'Historical data not available via RSS'
  }
}

var getNewsList = async ({ symbol }) => {
  // This could work with RSS, but let's keep it simple for now
  return {
    symbol,
    error: 'News not available via RSS fallback'
  }
}
