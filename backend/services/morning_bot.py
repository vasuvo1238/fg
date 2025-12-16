"""
Morning Trading Bot - Pre-Market Intelligence System
Generates comprehensive pre-market reports for traders
"""

import yfinance as yf
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

# Market indices and futures symbols
FUTURES_SYMBOLS = {
    "ES=F": "S&P 500 Futures",
    "NQ=F": "Nasdaq Futures", 
    "YM=F": "Dow Futures",
    "RTY=F": "Russell 2000 Futures",
    "GC=F": "Gold Futures",
    "CL=F": "Crude Oil Futures",
    "^VIX": "VIX (Volatility)"
}

GLOBAL_INDICES = {
    # Asia
    "^N225": "Nikkei 225 (Japan)",
    "^HSI": "Hang Seng (Hong Kong)",
    "000001.SS": "Shanghai Composite",
    "^KS11": "KOSPI (Korea)",
    "^AXJO": "ASX 200 (Australia)",
    # Europe
    "^FTSE": "FTSE 100 (UK)",
    "^GDAXI": "DAX (Germany)",
    "^FCHI": "CAC 40 (France)",
    "^STOXX50E": "Euro Stoxx 50"
}

CRYPTO_SYMBOLS = {
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "SOL-USD": "Solana",
    "BNB-USD": "Binance Coin",
    "XRP-USD": "Ripple"
}

SECTOR_ETFS = {
    "XLK": "Technology",
    "XLF": "Financials",
    "XLV": "Healthcare",
    "XLE": "Energy",
    "XLI": "Industrials",
    "XLY": "Consumer Discretionary",
    "XLP": "Consumer Staples",
    "XLU": "Utilities",
    "XLRE": "Real Estate",
    "XLB": "Materials",
    "XLC": "Communications"
}


def get_futures_data() -> Dict[str, Any]:
    """Get pre-market futures data"""
    futures_data = {}
    
    for symbol, name in FUTURES_SYMBOLS.items():
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="2d")
            
            if len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2]
                change = current - prev_close
                change_pct = (change / prev_close) * 100
            else:
                current = info.get('regularMarketPrice', 0)
                prev_close = info.get('regularMarketPreviousClose', current)
                change = current - prev_close
                change_pct = (change / prev_close) * 100 if prev_close else 0
            
            futures_data[symbol] = {
                "name": name,
                "price": round(current, 2),
                "change": round(change, 2),
                "change_percent": round(change_pct, 2),
                "signal": "bullish" if change_pct > 0.3 else "bearish" if change_pct < -0.3 else "neutral"
            }
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
            futures_data[symbol] = {"name": name, "error": str(e)}
    
    return futures_data


def get_global_markets() -> Dict[str, Any]:
    """Get global market indices performance"""
    global_data = {"asia": {}, "europe": {}}
    
    asia_symbols = ["^N225", "^HSI", "000001.SS", "^KS11", "^AXJO"]
    europe_symbols = ["^FTSE", "^GDAXI", "^FCHI", "^STOXX50E"]
    
    for symbol, name in GLOBAL_INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            
            if len(hist) >= 1:
                current = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[0] if len(hist) == 1 else hist['Close'].iloc[-2]
                change_pct = ((current - prev_close) / prev_close) * 100
                
                region = "asia" if symbol in asia_symbols else "europe"
                global_data[region][symbol] = {
                    "name": name,
                    "price": round(current, 2),
                    "change_percent": round(change_pct, 2),
                    "status": "open" if ticker.info.get('marketState') == 'REGULAR' else "closed"
                }
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
    
    return global_data


def get_crypto_data() -> Dict[str, Any]:
    """Get cryptocurrency data (24/7)"""
    crypto_data = {}
    
    for symbol, name in CRYPTO_SYMBOLS.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            
            if len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2]
                change_pct = ((current - prev_close) / prev_close) * 100
                
                crypto_data[symbol] = {
                    "name": name,
                    "price": round(current, 2),
                    "change_24h": round(change_pct, 2),
                    "signal": "bullish" if change_pct > 3 else "bearish" if change_pct < -3 else "neutral"
                }
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
    
    return crypto_data


def get_sector_performance() -> Dict[str, Any]:
    """Get sector ETF performance"""
    sector_data = {}
    
    for symbol, name in SECTOR_ETFS.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            
            if len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2]
                change_pct = ((current - prev_close) / prev_close) * 100
                
                # 5-day momentum
                if len(hist) >= 5:
                    five_day_change = ((current - hist['Close'].iloc[0]) / hist['Close'].iloc[0]) * 100
                else:
                    five_day_change = change_pct
                
                sector_data[symbol] = {
                    "name": name,
                    "price": round(current, 2),
                    "change_1d": round(change_pct, 2),
                    "change_5d": round(five_day_change, 2),
                    "momentum": "strong" if five_day_change > 2 else "weak" if five_day_change < -2 else "neutral"
                }
        except Exception as e:
            logger.error(f"Error fetching sector {symbol}: {e}")
    
    # Sort by 1-day performance
    sector_data = dict(sorted(sector_data.items(), key=lambda x: x[1].get('change_1d', 0), reverse=True))
    
    return sector_data


def get_gap_scanners(min_gap_percent: float = 2.0, limit: int = 20) -> Dict[str, List]:
    """Scan for stocks gapping up or down in pre-market"""
    
    # Popular stocks to scan for gaps
    scan_universe = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "CRM",
        "ORCL", "ADBE", "INTC", "CSCO", "IBM", "QCOM", "TXN", "AVGO", "MU", "AMAT",
        "JPM", "BAC", "WFC", "GS", "MS", "C", "AXP", "V", "MA", "PYPL",
        "JNJ", "UNH", "PFE", "MRK", "ABBV", "LLY", "BMY", "TMO", "DHR", "ABT",
        "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "HAL",
        "BA", "CAT", "DE", "UPS", "FDX", "LMT", "RTX", "GE", "HON", "MMM",
        "DIS", "CMCSA", "NFLX", "T", "VZ", "TMUS", "CHTR", "PARA", "WBD", "FOX",
        "NKE", "SBUX", "MCD", "HD", "LOW", "TGT", "WMT", "COST", "TJX", "ROST",
        "KO", "PEP", "PG", "CL", "KMB", "GIS", "K", "HSY", "MDLZ", "KHC"
    ]
    
    gappers_up = []
    gappers_down = []
    
    for symbol in scan_universe:
        try:
            ticker = yf.Ticker(symbol)
            
            # Get previous close and current pre-market/regular price
            info = ticker.info
            prev_close = info.get('regularMarketPreviousClose', 0)
            current_price = info.get('preMarketPrice') or info.get('regularMarketPrice', 0)
            
            if prev_close and current_price:
                gap_percent = ((current_price - prev_close) / prev_close) * 100
                
                stock_data = {
                    "symbol": symbol,
                    "name": info.get('shortName', symbol),
                    "prev_close": round(prev_close, 2),
                    "current": round(current_price, 2),
                    "gap_percent": round(gap_percent, 2),
                    "volume": info.get('regularMarketVolume', 0),
                    "avg_volume": info.get('averageVolume', 0)
                }
                
                if gap_percent >= min_gap_percent:
                    gappers_up.append(stock_data)
                elif gap_percent <= -min_gap_percent:
                    gappers_down.append(stock_data)
                    
        except Exception as e:
            continue
    
    # Sort by gap percentage
    gappers_up = sorted(gappers_up, key=lambda x: x['gap_percent'], reverse=True)[:limit]
    gappers_down = sorted(gappers_down, key=lambda x: x['gap_percent'])[:limit]
    
    return {
        "gappers_up": gappers_up,
        "gappers_down": gappers_down,
        "scan_time": datetime.now(timezone.utc).isoformat()
    }


def get_economic_calendar() -> List[Dict]:
    """Get today's economic events"""
    # Note: In production, use a proper economic calendar API
    # This is a placeholder structure
    
    today = datetime.now(timezone.utc).date()
    
    # Common recurring events (simplified)
    economic_events = []
    
    # Check day of week for common events
    weekday = today.weekday()
    
    if weekday == 0:  # Monday
        economic_events.append({
            "time": "10:00 AM ET",
            "event": "Consumer Credit",
            "importance": "medium",
            "forecast": None
        })
    elif weekday == 1:  # Tuesday
        economic_events.append({
            "time": "10:00 AM ET", 
            "event": "JOLTS Job Openings",
            "importance": "high",
            "forecast": None
        })
    elif weekday == 2:  # Wednesday
        economic_events.append({
            "time": "2:00 PM ET",
            "event": "Fed Beige Book",
            "importance": "medium",
            "forecast": None
        })
        economic_events.append({
            "time": "10:30 AM ET",
            "event": "EIA Crude Oil Inventories",
            "importance": "medium",
            "forecast": None
        })
    elif weekday == 3:  # Thursday
        economic_events.append({
            "time": "8:30 AM ET",
            "event": "Initial Jobless Claims",
            "importance": "high",
            "forecast": None
        })
    elif weekday == 4:  # Friday
        if today.day <= 7:  # First Friday
            economic_events.append({
                "time": "8:30 AM ET",
                "event": "Non-Farm Payrolls",
                "importance": "critical",
                "forecast": None
            })
            economic_events.append({
                "time": "8:30 AM ET",
                "event": "Unemployment Rate",
                "importance": "critical",
                "forecast": None
            })
    
    return economic_events


def get_earnings_calendar() -> Dict[str, List]:
    """Get today's earnings releases"""
    today = datetime.now(timezone.utc).date()
    
    # Note: In production, use earnings calendar API
    # This fetches from yfinance which may have limited data
    
    earnings_today = {
        "before_market": [],
        "after_market": [],
        "date": today.isoformat()
    }
    
    # Check a list of major companies for earnings
    major_stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "BAC", "WFC"]
    
    for symbol in major_stocks:
        try:
            ticker = yf.Ticker(symbol)
            calendar = ticker.calendar
            
            if calendar is not None and not calendar.empty:
                # Check if earnings are today
                if 'Earnings Date' in calendar.index:
                    earnings_date = calendar.loc['Earnings Date'][0]
                    if hasattr(earnings_date, 'date') and earnings_date.date() == today:
                        earnings_today["before_market"].append({
                            "symbol": symbol,
                            "name": ticker.info.get('shortName', symbol),
                            "eps_estimate": calendar.loc.get('Earnings Estimate', [None])[0],
                            "revenue_estimate": calendar.loc.get('Revenue Estimate', [None])[0]
                        })
        except Exception as e:
            continue
    
    return earnings_today


def calculate_market_sentiment(futures: Dict, global_markets: Dict, vix: float) -> Dict:
    """Calculate overall market sentiment"""
    
    # Futures sentiment
    futures_scores = []
    for symbol, data in futures.items():
        if 'change_percent' in data:
            futures_scores.append(data['change_percent'])
    
    avg_futures = sum(futures_scores) / len(futures_scores) if futures_scores else 0
    
    # VIX interpretation
    if vix < 15:
        vix_sentiment = "low_fear"
        vix_signal = "bullish"
    elif vix < 20:
        vix_sentiment = "moderate"
        vix_signal = "neutral"
    elif vix < 30:
        vix_sentiment = "elevated"
        vix_signal = "cautious"
    else:
        vix_sentiment = "high_fear"
        vix_signal = "bearish"
    
    # Overall sentiment
    if avg_futures > 0.5 and vix < 20:
        overall = "bullish"
        confidence = "high"
    elif avg_futures > 0 and vix < 25:
        overall = "slightly_bullish"
        confidence = "medium"
    elif avg_futures < -0.5 and vix > 20:
        overall = "bearish"
        confidence = "high"
    elif avg_futures < 0:
        overall = "slightly_bearish"
        confidence = "medium"
    else:
        overall = "neutral"
        confidence = "low"
    
    return {
        "overall": overall,
        "confidence": confidence,
        "futures_avg_change": round(avg_futures, 2),
        "vix_level": vix,
        "vix_sentiment": vix_sentiment,
        "vix_signal": vix_signal,
        "recommendation": get_sentiment_recommendation(overall, vix_sentiment)
    }


def get_sentiment_recommendation(sentiment: str, vix_sentiment: str) -> str:
    """Generate trading recommendation based on sentiment"""
    
    recommendations = {
        ("bullish", "low_fear"): "Market conditions favor long positions. Consider buying dips in strong sectors.",
        ("bullish", "moderate"): "Cautiously optimistic. Scale into positions with defined risk.",
        ("slightly_bullish", "low_fear"): "Mildly positive outlook. Focus on quality names with momentum.",
        ("slightly_bullish", "moderate"): "Mixed signals. Be selective with entries, use tight stops.",
        ("neutral", "moderate"): "Choppy conditions expected. Range-bound strategies may work best.",
        ("neutral", "elevated"): "Uncertainty high. Reduce position sizes, wait for clarity.",
        ("slightly_bearish", "moderate"): "Defensive posture advised. Consider hedging long positions.",
        ("slightly_bearish", "elevated"): "Risk-off mode. Preserve capital, focus on high-quality defensive stocks.",
        ("bearish", "elevated"): "High risk environment. Consider cash or inverse positions.",
        ("bearish", "high_fear"): "Extreme caution. Panic selling may create opportunities for patient buyers."
    }
    
    return recommendations.get((sentiment, vix_sentiment), "Monitor conditions closely before trading.")


async def generate_morning_report(user_id: str = None, include_portfolio: bool = True) -> Dict:
    """Generate comprehensive morning trading report"""
    
    report_time = datetime.now(timezone.utc)
    
    # Gather all data
    futures = get_futures_data()
    global_markets = get_global_markets()
    crypto = get_crypto_data()
    sectors = get_sector_performance()
    gaps = get_gap_scanners(min_gap_percent=2.0, limit=10)
    economic = get_economic_calendar()
    earnings = get_earnings_calendar()
    
    # Get VIX for sentiment
    vix_value = futures.get("^VIX", {}).get("price", 20)
    sentiment = calculate_market_sentiment(futures, global_markets, vix_value)
    
    report = {
        "report_id": f"morning_{report_time.strftime('%Y%m%d_%H%M')}",
        "generated_at": report_time.isoformat(),
        "market_date": report_time.strftime("%A, %B %d, %Y"),
        
        "executive_summary": {
            "sentiment": sentiment,
            "key_levels": {
                "sp500_futures": futures.get("ES=F", {}).get("price"),
                "nasdaq_futures": futures.get("NQ=F", {}).get("price"),
                "vix": vix_value
            },
            "top_gapper_up": gaps["gappers_up"][0] if gaps["gappers_up"] else None,
            "top_gapper_down": gaps["gappers_down"][0] if gaps["gappers_down"] else None,
        },
        
        "futures": futures,
        "global_markets": global_markets,
        "crypto": crypto,
        "sectors": sectors,
        "gap_scanners": gaps,
        "economic_calendar": economic,
        "earnings_calendar": earnings,
        
        "ai_insights": None  # Will be populated by AI
    }
    
    return report


def format_report_text(report: Dict) -> str:
    """Format report as readable text"""
    
    lines = []
    lines.append("=" * 60)
    lines.append(f"🌅 MORNING TRADING REPORT - {report['market_date']}")
    lines.append("=" * 60)
    lines.append("")
    
    # Executive Summary
    sentiment = report["executive_summary"]["sentiment"]
    lines.append("📊 MARKET SENTIMENT")
    lines.append(f"   Overall: {sentiment['overall'].upper()} ({sentiment['confidence']} confidence)")
    lines.append(f"   VIX: {sentiment['vix_level']} ({sentiment['vix_sentiment']})")
    lines.append(f"   💡 {sentiment['recommendation']}")
    lines.append("")
    
    # Futures
    lines.append("📈 PRE-MARKET FUTURES")
    for symbol, data in report["futures"].items():
        if "price" in data:
            emoji = "🟢" if data.get("change_percent", 0) > 0 else "🔴"
            lines.append(f"   {emoji} {data['name']}: ${data['price']} ({data['change_percent']:+.2f}%)")
    lines.append("")
    
    # Top Movers
    lines.append("🚀 TOP GAPPERS")
    if report["gap_scanners"]["gappers_up"]:
        lines.append("   UP:")
        for g in report["gap_scanners"]["gappers_up"][:5]:
            lines.append(f"      🟢 {g['symbol']}: +{g['gap_percent']:.1f}%")
    if report["gap_scanners"]["gappers_down"]:
        lines.append("   DOWN:")
        for g in report["gap_scanners"]["gappers_down"][:5]:
            lines.append(f"      🔴 {g['symbol']}: {g['gap_percent']:.1f}%")
    lines.append("")
    
    # Sectors
    lines.append("🏢 SECTOR HEAT MAP")
    for symbol, data in list(report["sectors"].items())[:5]:
        emoji = "🟢" if data["change_1d"] > 0 else "🔴"
        lines.append(f"   {emoji} {data['name']}: {data['change_1d']:+.2f}%")
    lines.append("")
    
    # Economic Calendar
    if report["economic_calendar"]:
        lines.append("📅 TODAY'S ECONOMIC EVENTS")
        for event in report["economic_calendar"]:
            imp = "⚠️" if event["importance"] == "critical" else "📌" if event["importance"] == "high" else "📍"
            lines.append(f"   {imp} {event['time']}: {event['event']}")
        lines.append("")
    
    # Crypto
    lines.append("₿ CRYPTO MARKETS (24H)")
    for symbol, data in report["crypto"].items():
        emoji = "🟢" if data.get("change_24h", 0) > 0 else "🔴"
        lines.append(f"   {emoji} {data['name']}: ${data['price']:,.2f} ({data['change_24h']:+.2f}%)")
    lines.append("")
    
    lines.append("=" * 60)
    lines.append(f"Generated at {report['generated_at']}")
    lines.append("=" * 60)
    
    return "\n".join(lines)
