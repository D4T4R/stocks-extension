const ByteArray = imports.byteArray
const { GLib } = imports.gi

let CACHE = {}
const CACHE_TIME = 5 * 60 * 1000 // 5 minutes cache to reduce Yahoo API calls
const RATE_LIMIT_CACHE = {}
const MIN_REQUEST_DELAY = 1000 // Minimum 1 second between requests
let lastRequestTime = 0

var isNullOrUndefined = value => typeof value === 'undefined' || value === null
var isNullOrEmpty = value => isNullOrUndefined(value) || value.length === 0
var fallbackIfNaN = (value, fallback = '--') => typeof value === 'undefined' || value === null || isNaN(value) ? fallback : value

var closest = (array, target) => array.reduce((prev, curr) => Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev)

var decodeBase64JsonOrDefault = (encodedJson, defaultValue) => {
  try {
    const value = JSON.parse(ByteArray.toString(GLib.base64_decode(encodedJson)))

    if (!value) {
      return defaultValue
    }

    return value
  } catch (e) {
    log(`failed to decode base64 json ${e}`)
    return defaultValue
  }
}

var clearCache = () => {
  CACHE = {}
  log('🗑️ Cache cleared')
}

var removeCache = (keyToDelete, startsWith = true) => {
  let keys = [keyToDelete]

  if (startsWith) {
    keys = Object.keys(CACHE).filter(key => key.startsWith(keyToDelete))
  }

  keys.forEach(key => delete CACHE[key])
}

var cacheOrDefault = async (cacheKey, evaluator, cacheDuration = CACHE_TIME) => {
  const [timestamp, data] = CACHE[cacheKey] || []

  if (timestamp && data && timestamp + cacheDuration >= Date.now()) {
    return data
  }

  const freshData = await evaluator()

  CACHE[cacheKey] = [Date.now(), freshData]

  return freshData
}

var getStockColorStyleClass = change => {
  let quoteColorStyleClass = 'quote-neutral'

  if (change) {
    if (change > 0.00) {
      quoteColorStyleClass = 'quote-positive'
    } else if (change < 0.00) {
      quoteColorStyleClass = 'quote-negative'
    }
  }

  return quoteColorStyleClass
}

var getComplementaryColor = (hex, bw = true) => {
  const padZero = (str, len) => {
    len = len || 2
    var zeros = new Array(len).join('0')
    return (zeros + str).slice(-len)
  }

  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.')
  }
  var r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16)
  if (bw) {
    // http://stackoverflow.com/a/3943023/112731
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186
        ? '#000000'
        : '#FFFFFF'
  }
  // invert color components
  r = (255 - r).toString(16)
  g = (255 - g).toString(16)
  b = (255 - b).toString(16)
  // pad each with zeros and return
  return '#' + padZero(r) + padZero(g) + padZero(b)
}

var moveDecimal = (value, decimalPlaces) => {
  if (!value) {
    return value
  }

  return value / Math.pow(10, decimalPlaces)
}

var roundOrDefault = (number, defaultValue = '--') => isNullOrUndefined(number) ? defaultValue : (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2)

// Rate limiting functions to prevent Yahoo Finance 429 errors
var waitForRateLimit = () => {
  return new Promise(resolve => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    
    if (timeSinceLastRequest >= MIN_REQUEST_DELAY) {
      lastRequestTime = now
      resolve()
    } else {
      const waitTime = MIN_REQUEST_DELAY - timeSinceLastRequest
      setTimeout(() => {
        lastRequestTime = Date.now()
        resolve()
      }, waitTime)
    }
  })
}

var cacheOrDefaultWithRateLimit = async (cacheKey, evaluator, cacheDuration = CACHE_TIME) => {
  const [timestamp, data] = CACHE[cacheKey] || []

  if (timestamp && data && timestamp + cacheDuration >= Date.now()) {
    return data
  }

  // Wait for rate limit before making request
  await waitForRateLimit()
  
  try {
    const freshData = await evaluator()
    CACHE[cacheKey] = [Date.now(), freshData]
    return freshData
  } catch (error) {
    // If we get a rate limit error, extend cache time and return stale data if available
    if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
      log(`⚠️ Rate limited, using cached data for ${cacheKey}`)
      if (data) {
        // Extend cache for another 5 minutes to avoid hitting rate limit
        CACHE[cacheKey] = [Date.now(), data]
        return data
      }
    }
    throw error
  }
}

// Sequential execution to avoid overwhelming Yahoo's servers
var executeSequentially = async (tasks) => {
  const results = []
  for (let i = 0; i < tasks.length; i++) {
    try {
      const result = await tasks[i]()
      results.push(result)
      
      // Add delay between requests to avoid rate limiting
      // Skip delay after the last task
      if (i < tasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Increased to 2 seconds
      }
    } catch (error) {
      log(`⚠️ Task failed: ${error.message}`)
      results.push(null)
    }
  }
  return results
}
