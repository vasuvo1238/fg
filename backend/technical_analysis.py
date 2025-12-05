"""
Technical Analysis Module
- TA-Lib Integration (150+ indicators)
- VIX (Volatility Index) tracking
- Earnings Calendar
"""

import talib
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def get_technical_indicators(symbol: str, period: str = "6mo") -> Dict:
    """
    Calculate all major technical indicators for a symbol
    
    Args:
        symbol: Stock ticker
        period: Historical period (1mo, 3mo, 6mo, 1y, 2y, 5y)
    
    Returns:
        Dictionary with all indicators
    """
    try:
        # Fetch historical data
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        
        if df.empty:
            return {"error": f"No data available for {symbol}"}
        
        close = df['Close'].values.astype(np.float64)
        high = df['High'].values.astype(np.float64)
        low = df['Low'].values.astype(np.float64)
        volume = df['Volume'].values.astype(np.float64)
        
        # Get current price
        current_price = float(close[-1])
        
        # === TREND INDICATORS ===
        
        # Moving Averages
        sma_20 = talib.SMA(close, timeperiod=20)
        sma_50 = talib.SMA(close, timeperiod=50)
        sma_200 = talib.SMA(close, timeperiod=200)
        ema_12 = talib.EMA(close, timeperiod=12)
        ema_26 = talib.EMA(close, timeperiod=26)
        
        # MACD
        macd, macd_signal, macd_hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
        
        # ADX (Trend Strength)
        adx = talib.ADX(high, low, close, timeperiod=14)
        
        # === MOMENTUM INDICATORS ===
        
        # RSI
        rsi = talib.RSI(close, timeperiod=14)
        
        # Stochastic
        slowk, slowd = talib.STOCH(high, low, close, fastk_period=14, slowk_period=3, slowd_period=3)
        
        # CCI (Commodity Channel Index)
        cci = talib.CCI(high, low, close, timeperiod=14)
        
        # Williams %R
        willr = talib.WILLR(high, low, close, timeperiod=14)
        
        # === VOLATILITY INDICATORS ===
        
        # Bollinger Bands
        bb_upper, bb_middle, bb_lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)
        
        # ATR (Average True Range)
        atr = talib.ATR(high, low, close, timeperiod=14)
        
        # === VOLUME INDICATORS ===
        
        # OBV (On-Balance Volume)
        obv = talib.OBV(close, volume)
        
        # AD (Accumulation/Distribution)
        ad = talib.AD(high, low, close, volume)
        
        # === GENERATE SIGNALS ===
        
        signals = []
        
        # RSI signals
        current_rsi = float(rsi[-1]) if not np.isnan(rsi[-1]) else 50
        if current_rsi < 30:
            signals.append({"indicator": "RSI", "signal": "BUY", "strength": "Strong", "reason": f"RSI oversold at {current_rsi:.1f}"})
        elif current_rsi > 70:
            signals.append({"indicator": "RSI", "signal": "SELL", "strength": "Strong", "reason": f"RSI overbought at {current_rsi:.1f}"})
        
        # MACD crossover
        if not np.isnan(macd[-1]) and not np.isnan(macd_signal[-1]):
            if macd[-2] < macd_signal[-2] and macd[-1] > macd_signal[-1]:
                signals.append({"indicator": "MACD", "signal": "BUY", "strength": "Medium", "reason": "Bullish crossover"})
            elif macd[-2] > macd_signal[-2] and macd[-1] < macd_signal[-1]:
                signals.append({"indicator": "MACD", "signal": "SELL", "strength": "Medium", "reason": "Bearish crossover"})
        
        # Moving Average signals
        if not np.isnan(sma_20[-1]) and not np.isnan(sma_50[-1]):
            if sma_20[-2] < sma_50[-2] and sma_20[-1] > sma_50[-1]:
                signals.append({"indicator": "MA", "signal": "BUY", "strength": "Strong", "reason": "Golden Cross (SMA20 > SMA50)"})
            elif sma_20[-2] > sma_50[-2] and sma_20[-1] < sma_50[-1]:
                signals.append({"indicator": "MA", "signal": "SELL", "strength": "Strong", "reason": "Death Cross (SMA20 < SMA50)"})
        
        # Bollinger Bands
        if not np.isnan(bb_lower[-1]) and not np.isnan(bb_upper[-1]):
            if close[-1] < bb_lower[-1]:
                signals.append({"indicator": "BB", "signal": "BUY", "strength": "Medium", "reason": "Price below lower band"})
            elif close[-1] > bb_upper[-1]:
                signals.append({"indicator": "BB", "signal": "SELL", "strength": "Medium", "reason": "Price above upper band"})
        
        # Overall sentiment
        buy_signals = sum(1 for s in signals if s["signal"] == "BUY")
        sell_signals = sum(1 for s in signals if s["signal"] == "SELL")
        
        if buy_signals > sell_signals:
            overall_signal = "BULLISH"
        elif sell_signals > buy_signals:
            overall_signal = "BEARISH"
        else:
            overall_signal = "NEUTRAL"
        
        return {
            "symbol": symbol.upper(),
            "current_price": current_price,
            "timestamp": datetime.now().isoformat(),
            "trend_indicators": {
                "sma_20": float(sma_20[-1]) if not np.isnan(sma_20[-1]) else None,
                "sma_50": float(sma_50[-1]) if not np.isnan(sma_50[-1]) else None,
                "sma_200": float(sma_200[-1]) if not np.isnan(sma_200[-1]) else None,
                "ema_12": float(ema_12[-1]) if not np.isnan(ema_12[-1]) else None,
                "ema_26": float(ema_26[-1]) if not np.isnan(ema_26[-1]) else None,
                "macd": float(macd[-1]) if not np.isnan(macd[-1]) else None,
                "macd_signal": float(macd_signal[-1]) if not np.isnan(macd_signal[-1]) else None,
                "macd_histogram": float(macd_hist[-1]) if not np.isnan(macd_hist[-1]) else None,
                "adx": float(adx[-1]) if not np.isnan(adx[-1]) else None
            },
            "momentum_indicators": {
                "rsi": current_rsi,
                "stochastic_k": float(slowk[-1]) if not np.isnan(slowk[-1]) else None,
                "stochastic_d": float(slowd[-1]) if not np.isnan(slowd[-1]) else None,
                "cci": float(cci[-1]) if not np.isnan(cci[-1]) else None,
                "williams_r": float(willr[-1]) if not np.isnan(willr[-1]) else None
            },
            "volatility_indicators": {
                "bb_upper": float(bb_upper[-1]) if not np.isnan(bb_upper[-1]) else None,
                "bb_middle": float(bb_middle[-1]) if not np.isnan(bb_middle[-1]) else None,
                "bb_lower": float(bb_lower[-1]) if not np.isnan(bb_lower[-1]) else None,
                "atr": float(atr[-1]) if not np.isnan(atr[-1]) else None
            },
            "volume_indicators": {
                "obv": float(obv[-1]) if not np.isnan(obv[-1]) else None,
                "ad": float(ad[-1]) if not np.isnan(ad[-1]) else None
            },
            "signals": signals,
            "overall_signal": overall_signal,
            "signal_summary": {
                "buy_signals": buy_signals,
                "sell_signals": sell_signals,
                "neutral_signals": len(signals) - buy_signals - sell_signals
            }
        }
        
    except Exception as e:
        logger.error(f"Technical analysis error for {symbol}: {str(e)}")
        return {"error": str(e)}


def get_vix_data() -> Dict:
    """
    Get VIX (Volatility Index) data and interpretation
    VIX measures market fear/volatility expectations
    """
    try:
        vix = yf.Ticker("^VIX")
        vix_history = vix.history(period="1mo")
        
        if vix_history.empty:
            return {"error": "Could not fetch VIX data"}
        
        current_vix = float(vix_history['Close'].iloc[-1])
        prev_vix = float(vix_history['Close'].iloc[-2])
        change = current_vix - prev_vix
        change_pct = (change / prev_vix) * 100
        
        # VIX interpretation
        if current_vix < 12:
            interpretation = "Very Low Volatility - Market Complacency"
            sentiment = "COMPLACENT"
        elif current_vix < 20:
            interpretation = "Low Volatility - Normal Market Conditions"
            sentiment = "CALM"
        elif current_vix < 30:
            interpretation = "Elevated Volatility - Increased Uncertainty"
            sentiment = "UNCERTAIN"
        elif current_vix < 40:
            interpretation = "High Volatility - Market Fear"
            sentiment = "FEARFUL"
        else:
            interpretation = "Extreme Volatility - Market Panic"
            sentiment = "PANIC"
        
        # Calculate statistics
        vix_values = vix_history['Close'].values
        vix_mean = float(np.mean(vix_values))
        vix_std = float(np.std(vix_values))
        vix_max = float(np.max(vix_values))
        vix_min = float(np.min(vix_values))
        
        # Historical data for chart
        historical = []
        num_points = min(30, len(vix_history))
        for i in range(num_points):
            idx = len(vix_history) - num_points + i
            historical.append({
                "date": vix_history.index[idx].strftime("%Y-%m-%d"),
                "value": float(vix_history['Close'].iloc[idx])
            })
        
        return {
            "current_vix": current_vix,
            "previous_vix": prev_vix,
            "change": change,
            "change_percent": change_pct,
            "interpretation": interpretation,
            "sentiment": sentiment,
            "statistics": {
                "30_day_mean": vix_mean,
                "30_day_std": vix_std,
                "30_day_max": vix_max,
                "30_day_min": vix_min
            },
            "historical_data": historical,
            "timestamp": datetime.now().isoformat(),
            "recommendation": "Consider protective strategies" if current_vix > 25 else "Normal market conditions"
        }
        
    except Exception as e:
        logger.error(f"VIX data error: {str(e)}")
        return {"error": str(e)}


def get_earnings_calendar(symbol: str) -> Dict:
    """
    Get earnings calendar data for a symbol
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Get calendar data
        calendar = ticker.calendar
        info = ticker.info
        
        # Initialize result
        result = {
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Try to extract from calendar if available
        if calendar is not None and isinstance(calendar, pd.DataFrame) and not calendar.empty:
            # Extract earnings date
            if 'Earnings Date' in calendar.index:
                earnings_date = calendar.loc['Earnings Date'].values[0]
                result["next_earnings_date"] = str(earnings_date)
            
            # Extract EPS estimates
            if 'EPS Estimate' in calendar.index:
                result["eps_estimate"] = float(calendar.loc['EPS Estimate'].values[0])
            
            if 'Revenue Estimate' in calendar.index:
                result["revenue_estimate"] = float(calendar.loc['Revenue Estimate'].values[0])
        elif calendar is not None and isinstance(calendar, dict):
            # Calendar might be a dict in newer yfinance versions
            if 'Earnings Date' in calendar:
                result["next_earnings_date"] = str(calendar['Earnings Date'])
            if 'EPS Estimate' in calendar:
                result["eps_estimate"] = float(calendar['EPS Estimate'])
            if 'Revenue Estimate' in calendar:
                result["revenue_estimate"] = float(calendar['Revenue Estimate'])
        else:
            # Fallback to info
            earnings_date = info.get('earningsDate')
            if earnings_date:
                # earnings_date might be a list
                if isinstance(earnings_date, list) and len(earnings_date) > 0:
                    result["next_earnings_date"] = str(earnings_date[0])
                else:
                    result["next_earnings_date"] = str(earnings_date)
        
        # If we got no earnings date, return error
        if "next_earnings_date" not in result:
            return {"error": f"No earnings data available for {symbol}"}
        
        return result
        
    except Exception as e:
        logger.error(f"Earnings calendar error for {symbol}: {str(e)}")
        return {"error": str(e)}


def get_market_overview() -> Dict:
    """
    Get overall market overview with major indices
    """
    try:
        indices = {
            "SPY": "S&P 500",
            "QQQ": "NASDAQ",
            "DIA": "Dow Jones",
            "IWM": "Russell 2000",
            "^VIX": "VIX"
        }
        
        overview = {}
        
        for symbol, name in indices.items():
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d")
                
                if not hist.empty:
                    current = float(hist['Close'].iloc[-1])
                    prev = float(hist['Close'].iloc[-2])
                    change = current - prev
                    change_pct = (change / prev) * 100
                    
                    overview[symbol] = {
                        "name": name,
                        "price": current,
                        "change": change,
                        "change_percent": change_pct
                    }
            except:
                continue
        
        return {
            "indices": overview,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Market overview error: {str(e)}")
        return {"error": str(e)}
