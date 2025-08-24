#!/usr/bin/env python3.10

import sys
import json

# Add the correct Python path
sys.path.insert(0, '/home/aniketdatar/.local/lib/python3.10/site-packages')

try:
    from yahooquery import Ticker
    
    # Test with multiple popular stocks
    symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA']
    
    for symbol in symbols:
        try:
            ticker = Ticker(symbol)
            price_data = ticker.price
            
            if symbol in price_data:
                info = price_data[symbol]
                print(f"{symbol}: ${info.get('regularMarketPrice', 'N/A')} ({info.get('longName', 'N/A')})")
        except Exception as e:
            print(f"Error for {symbol}: {e}")
            
except ImportError as e:
    print(f"Import error: {e}")
except Exception as e:
    print(f"General error: {e}")
