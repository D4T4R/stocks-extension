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
    import pandas as pd
except ImportError as e:
    print(json.dumps({"error": f"yahooquery not available: {str(e)}", "python_path": sys.executable, "sys_path": sys.path[:5]}))
    sys.exit(1)

def get_historical_data(symbol, period='1d', interval='1m'):
    """Get historical data for a single symbol"""
    try:
        ticker = Ticker(symbol, retry=1, timeout=12)
        history = ticker.history(period=period, interval=interval)
        
        if history is None or history.empty:
            return {"error": f"No historical data found for {symbol}"}
        
        # Reset index to get date as a column
        history = history.reset_index()
        
        # The extension's chart component expects series data as [timestamp, value] pairs
        chart_data = []
        timestamps = []
        volume_data = []

        for _, row in history.iterrows():
            # Convert timestamp to milliseconds since epoch (row['date'] may be a
            # datetime, a plain date (daily intervals) or a string depending on interval)
            try:
                timestamp = int(pd.Timestamp(row['date']).timestamp() * 1000)
            except Exception:
                continue
            close_price = round(float(row['close']), 2) if not pd.isna(row['close']) else None
            volume = int(row['volume']) if 'volume' in row and not pd.isna(row['volume']) else None

            chart_data.append([timestamp, close_price])
            timestamps.append(timestamp)
            volume_data.append([timestamp, volume])
        
        # Get market start and end times (approximate)
        market_start = timestamps[0] if timestamps else 0
        market_end = timestamps[-1] if timestamps else 0
        
        return {
            "symbol": symbol,
            "Data": chart_data,
            "MarketStart": market_start,
            "MarketEnd": market_end,
            "VolumeData": volume_data,
            "period": period,
            "interval": interval
        }
        
    except Exception as e:
        return {"error": f"Failed to fetch historical data for {symbol}: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: yahoo_historical_fetcher.py <SYMBOL> [period] [interval]"}))
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    period = sys.argv[2] if len(sys.argv) > 2 else '1d'
    interval = sys.argv[3] if len(sys.argv) > 3 else '1m'
    
    result = get_historical_data(symbol, period, interval)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
