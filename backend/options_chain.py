"""
Options Chain Data Module
- Fetch real-time options prices (Bid/Ask/LTP)
- Implied Volatility per strike
- Open Interest and Volume
- Greeks per strike
"""

import yfinance as yf
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def get_available_expiries(symbol: str) -> List[str]:
    """Get all available expiration dates for a symbol"""
    try:
        ticker = yf.Ticker(symbol)
        expiries = ticker.options
        return list(expiries)
    except Exception as e:
        logger.error(f"Error fetching expiries for {symbol}: {str(e)}")
        return []


def get_options_chain(symbol: str, expiry_date: Optional[str] = None) -> Dict:
    """
    Fetch complete options chain data
    
    Returns:
        Dictionary with calls and puts data including:
        - Strike
        - Last Price (LTP)
        - Bid
        - Ask
        - Volume
        - Open Interest
        - Implied Volatility
        - In The Money
        - Greeks (if available)
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Get available expiration dates
        expiries = ticker.options
        if not expiries:
            return {"error": f"No options data available for {symbol}"}
        
        # Use provided expiry or nearest expiry
        if expiry_date and expiry_date in expiries:
            selected_expiry = expiry_date
        else:
            selected_expiry = expiries[0]  # Nearest expiry
        
        # Get options chain for the expiry
        opt_chain = ticker.option_chain(selected_expiry)
        
        # Get current stock price
        info = ticker.info
        current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        
        # Process calls
        calls_df = opt_chain.calls
        calls = process_options_data(calls_df, current_price, "call")
        
        # Process puts
        puts_df = opt_chain.puts
        puts = process_options_data(puts_df, current_price, "put")
        
        return {
            "symbol": symbol.upper(),
            "current_price": float(current_price) if current_price else None,
            "expiry_date": selected_expiry,
            "available_expiries": expiries,
            "calls": calls,
            "puts": puts,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching options chain for {symbol}: {str(e)}")
        return {"error": str(e)}


def process_options_data(df: pd.DataFrame, current_price: float, option_type: str) -> List[Dict]:
    """Process options dataframe into list of dictionaries"""
    if df is None or df.empty:
        return []
    
    options = []
    for _, row in df.iterrows():
        strike = float(row.get('strike', 0))
        
        # Determine if ITM
        if option_type == "call":
            itm = strike < current_price if current_price else False
        else:  # put
            itm = strike > current_price if current_price else False
        
        # Calculate moneyness
        if current_price:
            moneyness = ((strike - current_price) / current_price) * 100
        else:
            moneyness = 0
        
        option_data = {
            "strike": strike,
            "last_price": float(row.get('lastPrice', 0)),
            "bid": float(row.get('bid', 0)),
            "ask": float(row.get('ask', 0)),
            "volume": int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0,
            "open_interest": int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0,
            "implied_volatility": float(row.get('impliedVolatility', 0)) if pd.notna(row.get('impliedVolatility')) else 0,
            "in_the_money": itm,
            "moneyness": float(moneyness),
            "contract_symbol": str(row.get('contractSymbol', '')),
            "last_trade_date": str(row.get('lastTradeDate', '')),
            "change": float(row.get('change', 0)) if pd.notna(row.get('change')) else 0,
            "percent_change": float(row.get('percentChange', 0)) if pd.notna(row.get('percentChange')) else 0
        }
        
        options.append(option_data)
    
    return options


def get_atm_options(symbol: str, expiry_date: Optional[str] = None, num_strikes: int = 5) -> Dict:
    """
    Get At-The-Money (ATM) options and nearby strikes
    
    Args:
        symbol: Stock symbol
        expiry_date: Specific expiry date (optional)
        num_strikes: Number of strikes above and below ATM to include
    
    Returns:
        Dictionary with ATM and nearby options
    """
    try:
        chain_data = get_options_chain(symbol, expiry_date)
        
        if "error" in chain_data:
            return chain_data
        
        current_price = chain_data["current_price"]
        if not current_price:
            return {"error": "Could not determine current price"}
        
        calls = chain_data["calls"]
        puts = chain_data["puts"]
        
        # Find ATM strike (closest to current price)
        strikes = sorted(set([c["strike"] for c in calls]))
        atm_strike = min(strikes, key=lambda x: abs(x - current_price))
        atm_index = strikes.index(atm_strike)
        
        # Get nearby strikes
        start_idx = max(0, atm_index - num_strikes)
        end_idx = min(len(strikes), atm_index + num_strikes + 1)
        selected_strikes = strikes[start_idx:end_idx]
        
        # Filter calls and puts
        filtered_calls = [c for c in calls if c["strike"] in selected_strikes]
        filtered_puts = [p for p in puts if p["strike"] in selected_strikes]
        
        return {
            "symbol": chain_data["symbol"],
            "current_price": current_price,
            "atm_strike": atm_strike,
            "expiry_date": chain_data["expiry_date"],
            "calls": filtered_calls,
            "puts": filtered_puts,
            "timestamp": chain_data["timestamp"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching ATM options for {symbol}: {str(e)}")
        return {"error": str(e)}


def calculate_bid_ask_spread(bid: float, ask: float) -> Dict:
    """Calculate bid-ask spread metrics"""
    if bid <= 0 or ask <= 0:
        return {
            "spread_dollar": 0,
            "spread_percent": 0,
            "mid_price": 0
        }
    
    spread = ask - bid
    mid = (bid + ask) / 2
    spread_pct = (spread / mid) * 100 if mid > 0 else 0
    
    return {
        "spread_dollar": float(spread),
        "spread_percent": float(spread_pct),
        "mid_price": float(mid)
    }


def get_options_summary(symbol: str, expiry_date: Optional[str] = None) -> Dict:
    """
    Get summary statistics for options chain
    """
    try:
        chain_data = get_options_chain(symbol, expiry_date)
        
        if "error" in chain_data:
            return chain_data
        
        calls = chain_data["calls"]
        puts = chain_data["puts"]
        
        # Calculate summaries
        total_call_volume = sum(c["volume"] for c in calls)
        total_put_volume = sum(p["volume"] for p in puts)
        total_call_oi = sum(c["open_interest"] for c in calls)
        total_put_oi = sum(p["open_interest"] for p in puts)
        
        # Put/Call ratio
        pcr_volume = total_put_volume / total_call_volume if total_call_volume > 0 else 0
        pcr_oi = total_put_oi / total_call_oi if total_call_oi > 0 else 0
        
        # Average IV
        call_ivs = [c["implied_volatility"] for c in calls if c["implied_volatility"] > 0]
        put_ivs = [p["implied_volatility"] for p in puts if p["implied_volatility"] > 0]
        avg_call_iv = sum(call_ivs) / len(call_ivs) if call_ivs else 0
        avg_put_iv = sum(put_ivs) / len(put_ivs) if put_ivs else 0
        
        # Most active strikes
        most_active_call = max(calls, key=lambda x: x["volume"]) if calls else None
        most_active_put = max(puts, key=lambda x: x["volume"]) if puts else None
        
        return {
            "symbol": chain_data["symbol"],
            "current_price": chain_data["current_price"],
            "expiry_date": chain_data["expiry_date"],
            "summary": {
                "total_call_volume": total_call_volume,
                "total_put_volume": total_put_volume,
                "total_call_oi": total_call_oi,
                "total_put_oi": total_put_oi,
                "pcr_volume": float(pcr_volume),
                "pcr_oi": float(pcr_oi),
                "avg_call_iv": float(avg_call_iv),
                "avg_put_iv": float(avg_put_iv),
                "most_active_call_strike": most_active_call["strike"] if most_active_call else None,
                "most_active_put_strike": most_active_put["strike"] if most_active_put else None
            },
            "timestamp": chain_data["timestamp"]
        }
        
    except Exception as e:
        logger.error(f"Error calculating options summary for {symbol}: {str(e)}")
        return {"error": str(e)}
