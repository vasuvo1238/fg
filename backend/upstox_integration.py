"""
Upstox API Integration for Indian Stock Market Data
Provides real-time quotes, historical data, and portfolio information for NSE/BSE stocks
"""

import os
import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Upstox API Configuration
UPSTOX_API_KEY = os.environ.get("UPSTOX_API_KEY")
UPSTOX_API_SECRET = os.environ.get("UPSTOX_API_SECRET")
UPSTOX_REDIRECT_URI = os.environ.get("UPSTOX_REDIRECT_URI")

# API Base URLs
UPSTOX_AUTH_URL = "https://api.upstox.com/v2/login/authorization/dialog"
UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token"
UPSTOX_API_BASE = "https://api.upstox.com/v2"

# Instrument key mapping for popular Indian stocks
SYMBOL_TO_INSTRUMENT = {
    "RELIANCE": "NSE_EQ|INE002A01018",
    "TCS": "NSE_EQ|INE467B01029",
    "HDFCBANK": "NSE_EQ|INE040A01034",
    "INFY": "NSE_EQ|INE009A01021",
    "ICICIBANK": "NSE_EQ|INE090A01021",
    "HINDUNILVR": "NSE_EQ|INE030A01027",
    "ITC": "NSE_EQ|INE154A01025",
    "SBIN": "NSE_EQ|INE062A01020",
    "BHARTIARTL": "NSE_EQ|INE397D01024",
    "KOTAKBANK": "NSE_EQ|INE237A01028",
    "LT": "NSE_EQ|INE018A01030",
    "ASIANPAINT": "NSE_EQ|INE021A01026",
    "MARUTI": "NSE_EQ|INE585B01010",
    "TITAN": "NSE_EQ|INE280A01028",
    "WIPRO": "NSE_EQ|INE075A01022",
    "ULTRACEMCO": "NSE_EQ|INE481G01011",
    "SUNPHARMA": "NSE_EQ|INE044A01036",
    "AXISBANK": "NSE_EQ|INE238A01034",
    "BAJFINANCE": "NSE_EQ|INE296A01024",
    "HCLTECH": "NSE_EQ|INE860A01027"
}


def get_instrument_key(symbol: str) -> Optional[str]:
    """Convert stock symbol to Upstox instrument key format."""
    symbol_upper = symbol.upper()
    
    # Check direct mapping
    if symbol_upper in SYMBOL_TO_INSTRUMENT:
        return SYMBOL_TO_INSTRUMENT[symbol_upper]
    
    # Fallback: construct NSE equity format
    return f"NSE_EQ|{symbol_upper}"


def get_authorization_url() -> str:
    """Generate Upstox OAuth authorization URL."""
    params = {
        "response_type": "code",
        "client_id": UPSTOX_API_KEY,
        "redirect_uri": UPSTOX_REDIRECT_URI,
        "state": "upstox_auth_state"
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{UPSTOX_AUTH_URL}?{query_string}"


async def exchange_code_for_token(auth_code: str) -> Dict:
    """Exchange authorization code for access token."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                UPSTOX_TOKEN_URL,
                data={
                    "code": auth_code,
                    "client_id": UPSTOX_API_KEY,
                    "client_secret": UPSTOX_API_SECRET,
                    "redirect_uri": UPSTOX_REDIRECT_URI,
                    "grant_type": "authorization_code"
                },
                headers={"Accept": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                return {"error": "Token exchange failed"}
            
            return response.json()
    except Exception as e:
        logger.exception(f"Error exchanging token: {e}")
        return {"error": str(e)}


async def get_market_quote(symbol: str, access_token: str) -> Dict:
    """
    Fetch real-time market quote for a stock.
    
    Args:
        symbol: Stock symbol (e.g., "RELIANCE")
        access_token: Upstox access token
        
    Returns:
        Dictionary with last_price, open, high, low, close, volume
    """
    instrument_key = get_instrument_key(symbol)
    
    if not instrument_key:
        return {"error": f"Invalid symbol: {symbol}"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{UPSTOX_API_BASE}/market-quote/ltp",
                params={"instrument_key": instrument_key},
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"Quote API error for {symbol}: {response.text}")
                return {"error": f"Failed to fetch quote for {symbol}"}
            
            data = response.json().get("data", {})
            
            # Get OHLC data as well
            ohlc_response = await client.get(
                f"{UPSTOX_API_BASE}/market-quote/ohlc",
                params={"instrument_key": instrument_key},
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                timeout=10.0
            )
            
            ohlc_data = {}
            if ohlc_response.status_code == 200:
                ohlc_data = ohlc_response.json().get("data", {}).get(instrument_key, {}).get("ohlc", {})
            
            return {
                "symbol": symbol,
                "instrument_key": instrument_key,
                "last_price": data.get(instrument_key, {}).get("last_price", 0),
                "open": ohlc_data.get("open", 0),
                "high": ohlc_data.get("high", 0),
                "low": ohlc_data.get("low", 0),
                "close": ohlc_data.get("close", 0),
                "volume": data.get(instrument_key, {}).get("volume", 0),
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.exception(f"Error fetching quote for {symbol}: {e}")
        return {"error": str(e)}


async def get_historical_candles(
    symbol: str,
    access_token: str,
    interval: str = "1day",
    from_date: str = None,
    to_date: str = None
) -> Dict:
    """
    Fetch historical OHLC candle data.
    
    Args:
        symbol: Stock symbol
        access_token: Upstox access token
        interval: Candle interval (1minute, 30minute, day, week, month)
        from_date: Start date (YYYY-MM-DD)
        to_date: End date (YYYY-MM-DD)
        
    Returns:
        Dictionary with candles array
    """
    instrument_key = get_instrument_key(symbol)
    
    if not instrument_key:
        return {"error": f"Invalid symbol: {symbol}"}
    
    # Default dates if not provided
    if not to_date:
        to_date = datetime.now().strftime("%Y-%m-%d")
    if not from_date:
        from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{UPSTOX_API_BASE}/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}"
            
            response = await client.get(
                url,
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                timeout=15.0
            )
            
            if response.status_code != 200:
                logger.error(f"Historical data error for {symbol}: {response.text}")
                return {"error": f"Failed to fetch historical data for {symbol}"}
            
            result = response.json()
            candles_raw = result.get("data", {}).get("candles", [])
            
            # Format candles
            candles = [
                {
                    "timestamp": candle[0],
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "volume": candle[5] if len(candle) > 5 else 0
                }
                for candle in candles_raw
            ]
            
            return {
                "symbol": symbol,
                "interval": interval,
                "from_date": from_date,
                "to_date": to_date,
                "candles": candles
            }
            
    except Exception as e:
        logger.exception(f"Error fetching historical data for {symbol}: {e}")
        return {"error": str(e)}


async def get_portfolio_holdings(access_token: str) -> Dict:
    """
    Fetch user's portfolio holdings.
    
    Args:
        access_token: Upstox access token
        
    Returns:
        Dictionary with holdings array
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{UPSTOX_API_BASE}/portfolio/long-term-holdings",
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"Portfolio API error: {response.text}")
                return {"error": "Failed to fetch portfolio"}
            
            result = response.json()
            holdings_raw = result.get("data", [])
            
            # Format holdings
            holdings = [
                {
                    "trading_symbol": h.get("trading_symbol"),
                    "quantity": h.get("quantity", 0),
                    "average_price": h.get("average_price", 0),
                    "last_price": h.get("last_price", 0),
                    "pnl": h.get("pnl", 0),
                    "day_change": h.get("day_change", 0),
                    "day_change_percentage": h.get("day_change_percentage", 0)
                }
                for h in holdings_raw
            ]
            
            # Calculate total
            total_value = sum(h["quantity"] * h["last_price"] for h in holdings)
            total_pnl = sum(h["pnl"] for h in holdings)
            total_pnl_percentage = (total_pnl / total_value * 100) if total_value > 0 else 0
            
            return {
                "holdings": holdings,
                "summary": {
                    "total_value": round(total_value, 2),
                    "total_pnl": round(total_pnl, 2),
                    "total_pnl_percentage": round(total_pnl_percentage, 2),
                    "holdings_count": len(holdings)
                },
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.exception(f"Error fetching portfolio: {e}")
        return {"error": str(e)}


def get_popular_indian_stocks() -> List[Dict]:
    """Return list of popular Indian stocks for quick access."""
    return [
        {"symbol": "RELIANCE", "name": "Reliance Industries Ltd"},
        {"symbol": "TCS", "name": "Tata Consultancy Services Ltd"},
        {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd"},
        {"symbol": "INFY", "name": "Infosys Ltd"},
        {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd"},
        {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd"},
        {"symbol": "ITC", "name": "ITC Ltd"},
        {"symbol": "SBIN", "name": "State Bank of India"},
        {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd"},
        {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd"},
        {"symbol": "LT", "name": "Larsen & Toubro Ltd"},
        {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd"},
        {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd"},
        {"symbol": "TITAN", "name": "Titan Company Ltd"},
        {"symbol": "WIPRO", "name": "Wipro Ltd"}
    ]
