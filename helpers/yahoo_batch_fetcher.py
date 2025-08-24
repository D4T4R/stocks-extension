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

def get_batch_quotes(symbols):
    """Get batch quotes for multiple symbols"""
    try:
        # Create a single Ticker object with all symbols
        ticker = Ticker(symbols)
        price_data = ticker.price
        
        if price_data is None:
            return {"error": "No price data received from Yahoo"}
        
        result = {}
        
        # Process each symbol's data
        for symbol in symbols:
            symbol_data = price_data.get(symbol)
            
            if symbol_data and isinstance(symbol_data, dict):
                # Extract the data in the format expected by the extension
                result[symbol] = {
                    "regularMarketPrice": symbol_data.get("regularMarketPrice"),
                    "regularMarketChange": symbol_data.get("regularMarketChange"),
                    "regularMarketChangePercent": symbol_data.get("regularMarketChangePercent"),
                    "regularMarketPreviousClose": symbol_data.get("regularMarketPreviousClose"),
                    "regularMarketOpen": symbol_data.get("regularMarketOpen"),
                    "regularMarketDayHigh": symbol_data.get("regularMarketDayHigh"),
                    "regularMarketDayLow": symbol_data.get("regularMarketDayLow"),
                    "regularMarketVolume": symbol_data.get("regularMarketVolume"),
                    "regularMarketTime": convert_time_to_timestamp(symbol_data.get("regularMarketTime")),
                    "longName": symbol_data.get("longName") or symbol_data.get("shortName"),
                    "shortName": symbol_data.get("shortName"),
                    "currencySymbol": symbol_data.get("currency") or "$",
                    "exchangeName": symbol_data.get("exchange") or symbol_data.get("fullExchangeName"),
                    "marketState": symbol_data.get("marketState"),
                    "preMarketPrice": symbol_data.get("preMarketPrice"),
                    "preMarketChange": symbol_data.get("preMarketChange"),
                    "preMarketChangePercent": symbol_data.get("preMarketChangePercent"),
                    "preMarketTime": symbol_data.get("preMarketTime"),
                    "postMarketPrice": symbol_data.get("postMarketPrice"),
                    "postMarketChange": symbol_data.get("postMarketChange"),
                    "postMarketChangePercent": symbol_data.get("postMarketChangePercent"),
                    "postMarketTime": symbol_data.get("postMarketTime")
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
