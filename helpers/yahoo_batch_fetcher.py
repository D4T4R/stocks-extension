#!/usr/bin/env python3

import sys
import json
import os

# Add common Python paths where yahooquery might be installed
sys.path.extend([
    '/home/aniketdatar/.local/lib/python3.10/site-packages',  # Primary location based on pip output
    '/usr/local/lib/python3.10/site-packages',
    '/home/aniketdatar/.local/lib/python3.9/site-packages',
    '/usr/lib/python3/dist-packages',
    '/home/aniketdatar/lib/python3.9/site-packages'
])

# Also try to activate the portfolio tracker environment
portfolio_venv = '/home/aniketdatar/portfolio-tracker/backend/venv/bin/activate_this.py'
if os.path.exists(portfolio_venv):
    try:
        exec(open(portfolio_venv).read(), {'__file__': portfolio_venv})
    except:
        pass

try:
    from yahooquery import Ticker
    from datetime import datetime
except ImportError as e:
    print(json.dumps({"error": f"yahooquery not available: {str(e)}", "python_path": sys.executable, "sys_path": sys.path[:5]}))
    sys.exit(1)

def convert_time_to_timestamp(time_value):
    """Convert Yahoo time format to Unix timestamp"""
    if time_value is None:
        return None
    
    # If it's already a number (timestamp), return it
    if isinstance(time_value, (int, float)):
        return int(time_value)
    
    # If it's a string, try to parse it
    if isinstance(time_value, str):
        try:
            # Try parsing common Yahoo datetime formats
            dt = datetime.strptime(time_value, "%Y-%m-%d %H:%M:%S")
            return int(dt.timestamp())
        except ValueError:
            try:
                # Try another format
                dt = datetime.fromisoformat(time_value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except:
                return None
    
    return None

def as_fraction(value):
    """/v7/finance/quote returns percents in percent units (1.23 = 1.23 %),
    the extension expects fractions (0.0123) like the quoteSummary module"""
    if isinstance(value, (int, float)):
        return value / 100
    return None


def get_batch_quotes(symbols):
    """Get batch quotes for multiple symbols"""
    try:
        # fail fast instead of stalling for 20+ seconds in retry backoff
        ticker = Ticker(symbols, retry=1, timeout=12)

        # 'quotes' hits /v7/finance/quote ONCE for all symbols, unlike
        # 'price' which requests /v10/finance/quoteSummary per symbol
        # and quickly runs into 429 rate limits
        quotes = ticker.quotes

        if not quotes:
            return {"error": "No quote data received from Yahoo"}

        if isinstance(quotes, str):
            return {"error": quotes}

        # yahooquery returns a dict keyed by symbol ({'TSLA': {...}, ...});
        # the inner dicts carry no 'symbol' field. Lists appear on some
        # yahooquery versions, single quotes may come back as a flat dict.
        by_symbol = {}
        if isinstance(quotes, dict):
            if "symbol" in quotes:
                by_symbol[quotes["symbol"]] = quotes
            else:
                for key, value in quotes.items():
                    if isinstance(value, dict):
                        by_symbol[value.get("symbol", key)] = value
        elif isinstance(quotes, list):
            for q in quotes:
                if isinstance(q, dict):
                    by_symbol[q.get("symbol")] = q

        if not by_symbol:
            # nothing parseable at all — treat as a total failure so the
            # extension retries the batch instead of fetching individually
            return {"error": "No parseable quote data received from Yahoo"}

        result = {}

        for symbol in symbols:
            q = by_symbol.get(symbol)

            if q:
                result[symbol] = {
                    "regularMarketPrice": q.get("regularMarketPrice"),
                    "regularMarketChange": q.get("regularMarketChange"),
                    "regularMarketChangePercent": as_fraction(q.get("regularMarketChangePercent")),
                    "regularMarketPreviousClose": q.get("regularMarketPreviousClose"),
                    "regularMarketOpen": q.get("regularMarketOpen"),
                    "regularMarketDayHigh": q.get("regularMarketDayHigh"),
                    "regularMarketDayLow": q.get("regularMarketDayLow"),
                    "regularMarketVolume": q.get("regularMarketVolume"),
                    "regularMarketTime": convert_time_to_timestamp(q.get("regularMarketTime")),
                    "longName": q.get("longName") or q.get("shortName"),
                    "shortName": q.get("shortName"),
                    "currencySymbol": q.get("currency") or "$",
                    "exchangeName": q.get("fullExchangeName") or q.get("exchange"),
                    "marketState": q.get("marketState"),
                    "preMarketPrice": q.get("preMarketPrice"),
                    "preMarketChange": q.get("preMarketChange"),
                    "preMarketChangePercent": as_fraction(q.get("preMarketChangePercent")),
                    "preMarketTime": convert_time_to_timestamp(q.get("preMarketTime")),
                    "postMarketPrice": q.get("postMarketPrice"),
                    "postMarketChange": q.get("postMarketChange"),
                    "postMarketChangePercent": as_fraction(q.get("postMarketChangePercent")),
                    "postMarketTime": convert_time_to_timestamp(q.get("postMarketTime"))
                }
            else:
                # If individual symbol fails, add error entry
                result[symbol] = {"error": f"No data available for {symbol}"}

        return result

    except Exception as e:
        return {"error": f"Failed to fetch batch quotes: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: yahoo_batch_fetcher.py <SYMBOL1> [SYMBOL2] [SYMBOL3] ..."}))
        sys.exit(1)
    
    symbols = [symbol.upper() for symbol in sys.argv[1:]]
    
    result = get_batch_quotes(symbols)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
