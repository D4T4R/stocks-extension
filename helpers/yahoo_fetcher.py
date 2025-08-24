#!/usr/bin/env python3

import sys
import json
import os
import time

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
    import pandas as pd
except ImportError as e:
    print(json.dumps({"error": f"yahooquery not available: {str(e)}", "python_path": sys.executable, "sys_path": sys.path[:5]}))
    sys.exit(1)

def get_quote(symbol):
    """Get quote data for a single symbol"""
    try:
        ticker = Ticker(symbol)
        price_data = ticker.price
        
        if symbol not in price_data:
            return {"error": f"No data found for {symbol}"}
            
        info = price_data[symbol]
        
        if isinstance(info, dict) and 'regularMarketPrice' in info:
            return {
                "symbol": symbol,
                "regularMarketPrice": info.get("regularMarketPrice"),
                "regularMarketChange": info.get("regularMarketChange"),
                "regularMarketChangePercent": info.get("regularMarketChangePercent"),
                "regularMarketPreviousClose": info.get("regularMarketPreviousClose"),
                "regularMarketOpen": info.get("regularMarketOpen"),
                "regularMarketDayHigh": info.get("regularMarketDayHigh"),
                "regularMarketDayLow": info.get("regularMarketDayLow"),
                "regularMarketVolume": info.get("regularMarketVolume"),
                "longName": info.get("longName"),
                "shortName": info.get("shortName"),
                "currencySymbol": info.get("currency", "$")
            }
        else:
            return {"error": f"Invalid data format for {symbol}"}
            
    except Exception as e:
        return {"error": f"Failed to fetch {symbol}: {str(e)}"}

def get_historical_data(symbol, period='1mo', interval='1d'):
    """Get historical data for a single symbol"""
    try:
        ticker = Ticker(symbol)
        history = ticker.history(period=period, interval=interval)
        
        if history is None or history.empty:
            return {"error": f"No historical data found for {symbol}"}
        
        # Reset index to get date as a column
        history = history.reset_index()
        
        # Convert to list of dictionaries
        chart_data = []
        for _, row in history.iterrows():
            chart_data.append({
                "date": row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date']),
                "open": round(float(row['open']), 2) if not pd.isna(row['open']) else 0,
                "high": round(float(row['high']), 2) if not pd.isna(row['high']) else 0,
                "low": round(float(row['low']), 2) if not pd.isna(row['low']) else 0,
                "close": round(float(row['close']), 2) if not pd.isna(row['close']) else 0,
                "volume": int(row['volume']) if not pd.isna(row['volume']) else 0
            })
        
        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": chart_data
        }
        
    except Exception as e:
        return {"error": f"Failed to fetch historical data for {symbol}: {str(e)}"}

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: yahoo_fetcher.py <SYMBOL>"}))
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    result = get_quote(symbol)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
