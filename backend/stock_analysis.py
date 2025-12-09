"""
Stock analysis module with technical indicators and statistical predictions
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import timedelta
from sklearn.linear_model import LinearRegression
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


def get_stock_info(symbol: str) -> Dict:
    """Get current stock information"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "symbol": symbol.upper(),
            "name": info.get("longName", symbol),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "previous_close": info.get("previousClose"),
            "open": info.get("open") or info.get("regularMarketOpen"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "volume": info.get("volume"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "dividend_yield": info.get("dividendYield"),
            "52_week_high": info.get("fiftyTwoWeekHigh"),
            "52_week_low": info.get("fiftyTwoWeekLow"),
            "sector": info.get("sector"),
            "industry": info.get("industry")
        }
    except Exception as e:
        logger.error(f"Error fetching stock info for {symbol}: {str(e)}")
        raise



def get_analyst_recommendations(symbol: str) -> Dict:
    """Get analyst target prices and recommendations"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get recommendation data
        current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        target_high = info.get("targetHighPrice")
        target_low = info.get("targetLowPrice")
        target_mean = info.get("targetMeanPrice")
        target_median = info.get("targetMedianPrice")
        
        # Get recommendation counts
        recommendation_key = info.get("recommendationKey", "hold")
        
        # Try to get detailed recommendations
        try:
            recommendations = ticker.recommendations
            if recommendations is not None and not recommendations.empty:
                # Get recent recommendations (last 3 months)
                recent_recs = recommendations.tail(10) if len(recommendations) >= 10 else recommendations
                
                # Count recommendations
                rec_counts = {
                    "strongBuy": 0,
                    "buy": 0,
                    "hold": 0,
                    "sell": 0,
                    "strongSell": 0
                }
                
                for _, row in recent_recs.iterrows():
                    grade = str(row.get('To Grade', '')).lower()
                    if 'strong buy' in grade or 'outperform' in grade:
                        rec_counts["strongBuy"] += 1
                    elif 'buy' in grade or 'overweight' in grade:
                        rec_counts["buy"] += 1
                    elif 'sell' in grade or 'underweight' in grade:
                        rec_counts["sell"] += 1
                    elif 'strong sell' in grade:
                        rec_counts["strongSell"] += 1
                    else:
                        rec_counts["hold"] += 1
                
                # Get upgrade/downgrade trend
                upgrades = sum(1 for _, row in recent_recs.iterrows() 
                              if 'buy' in str(row.get('To Grade', '')).lower() 
                              and 'hold' in str(row.get('From Grade', '')).lower())
                downgrades = sum(1 for _, row in recent_recs.iterrows() 
                                if 'sell' in str(row.get('To Grade', '')).lower() 
                                or ('hold' in str(row.get('To Grade', '')).lower() 
                                    and 'buy' in str(row.get('From Grade', '')).lower()))
            else:
                # Fallback to info data
                rec_counts = {
                    "strongBuy": info.get("recommendationStrong Buy", 0) or 0,
                    "buy": info.get("recommendationBuy", 0) or 0,
                    "hold": info.get("recommendationHold", 0) or 0,
                    "sell": info.get("recommendationSell", 0) or 0,
                    "strongSell": info.get("recommendationStrong Sell", 0) or 0
                }
                upgrades = 0
                downgrades = 0
        except:
            # Fallback if recommendations unavailable
            rec_counts = {
                "strongBuy": 0,
                "buy": 0,
                "hold": 0,
                "sell": 0,
                "strongSell": 0
            }
            upgrades = 0
            downgrades = 0
        
        # Calculate upside/downside
        upside_to_mean = None
        upside_to_high = None
        downside_to_low = None
        
        if current_price and target_mean:
            upside_to_mean = ((target_mean - current_price) / current_price) * 100
        if current_price and target_high:
            upside_to_high = ((target_high - current_price) / current_price) * 100
        if current_price and target_low:
            downside_to_low = ((target_low - current_price) / current_price) * 100
        
        # Determine consensus
        total_recs = sum(rec_counts.values())
        if total_recs > 0:
            buy_pct = (rec_counts["strongBuy"] + rec_counts["buy"]) / total_recs * 100
            if buy_pct >= 60:
                consensus = "Strong Buy"
            elif buy_pct >= 40:
                consensus = "Buy"
            elif rec_counts["sell"] + rec_counts["strongSell"] > rec_counts["buy"] + rec_counts["strongBuy"]:
                consensus = "Sell"
            else:
                consensus = "Hold"
        else:
            consensus = recommendation_key.title()
        
        # Get number of analysts
        num_analysts = info.get("numberOfAnalystOpinions", 0)
        
        return {
            "symbol": symbol.upper(),
            "current_price": current_price,
            "target_prices": {
                "high": target_high,
                "mean": target_mean,
                "median": target_median,
                "low": target_low
            },
            "upside_downside": {
                "upside_to_mean_percent": upside_to_mean,
                "upside_to_high_percent": upside_to_high,
                "downside_to_low_percent": downside_to_low
            },
            "recommendations": rec_counts,
            "consensus": consensus,
            "recommendation_trend": {
                "recent_upgrades": upgrades,
                "recent_downgrades": downgrades,
                "net_trend": upgrades - downgrades
            },
            "number_of_analysts": num_analysts,
            "has_data": bool(target_mean or total_recs > 0)
        }
    except Exception as e:
        logger.error(f"Error fetching analyst recommendations for {symbol}: {str(e)}")
        return {
            "symbol": symbol.upper(),
            "error": str(e),
            "has_data": False
        }


def get_historical_data(symbol: str, period: str = "1y") -> pd.DataFrame:
    """Get historical stock data"""
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        return df
    except Exception as e:
        logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
        raise


def calculate_technical_indicators(df: pd.DataFrame) -> Dict:
    """Calculate technical indicators"""
    try:
        # Moving Averages
        df['MA_20'] = df['Close'].rolling(window=20).mean()
        df['MA_50'] = df['Close'].rolling(window=50).mean()
        df['MA_200'] = df['Close'].rolling(window=200).mean()
        
        # RSI (Relative Strength Index)
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD (Moving Average Convergence Divergence)
        exp1 = df['Close'].ewm(span=12, adjust=False).mean()
        exp2 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp1 - exp2
        df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()
        
        # Bollinger Bands
        df['BB_Middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_Upper'] = df['BB_Middle'] + (bb_std * 2)
        df['BB_Lower'] = df['BB_Middle'] - (bb_std * 2)
        
        # Volatility (30-day standard deviation)
        df['Volatility'] = df['Close'].pct_change().rolling(window=30).std() * np.sqrt(252) * 100
        
        latest = df.iloc[-1]
        
        return {
            "moving_averages": {
                "ma_20": float(latest['MA_20']) if not pd.isna(latest['MA_20']) else None,
                "ma_50": float(latest['MA_50']) if not pd.isna(latest['MA_50']) else None,
                "ma_200": float(latest['MA_200']) if not pd.isna(latest['MA_200']) else None
            },
            "rsi": float(latest['RSI']) if not pd.isna(latest['RSI']) else None,
            "macd": {
                "macd": float(latest['MACD']) if not pd.isna(latest['MACD']) else None,
                "signal": float(latest['Signal_Line']) if not pd.isna(latest['Signal_Line']) else None
            },
            "bollinger_bands": {
                "upper": float(latest['BB_Upper']) if not pd.isna(latest['BB_Upper']) else None,
                "middle": float(latest['BB_Middle']) if not pd.isna(latest['BB_Middle']) else None,
                "lower": float(latest['BB_Lower']) if not pd.isna(latest['BB_Lower']) else None
            },
            "volatility": float(latest['Volatility']) if not pd.isna(latest['Volatility']) else None,
            "current_price": float(latest['Close'])
        }
    except Exception as e:
        logger.error(f"Error calculating technical indicators: {str(e)}")
        raise


def statistical_prediction(df: pd.DataFrame, days_ahead: int = 30) -> Dict:
    """Predict future prices using linear regression"""
    try:
        # Prepare data
        df = df.reset_index()
        df['Days'] = (df['Date'] - df['Date'].min()).dt.days
        
        X = df[['Days']].values
        y = df['Close'].values
        
        # Train model
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict future
        last_day = df['Days'].iloc[-1]
        future_days = np.array([[last_day + i] for i in range(1, days_ahead + 1)])
        predictions = model.predict(future_days)
        
        # Calculate confidence metrics
        historical_volatility = df['Close'].pct_change().std()
        r_squared = model.score(X, y)
        
        # Generate prediction dates
        last_date = df['Date'].iloc[-1]
        prediction_dates = [(last_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, days_ahead + 1)]
        
        return {
            "predictions": [
                {"date": date, "price": float(price)}
                for date, price in zip(prediction_dates, predictions)
            ],
            "trend": "bullish" if predictions[-1] > df['Close'].iloc[-1] else "bearish",
            "confidence": float(r_squared * 100),  # R-squared as confidence percentage
            "volatility": float(historical_volatility * 100),
            "current_price": float(df['Close'].iloc[-1]),
            "predicted_price_end": float(predictions[-1]),
            "price_change_percent": float(((predictions[-1] - df['Close'].iloc[-1]) / df['Close'].iloc[-1]) * 100)
        }
    except Exception as e:
        logger.error(f"Error in statistical prediction: {str(e)}")
        raise


def generate_trading_signals(indicators: Dict, current_price: float) -> Dict:
    """Generate trading signals based on technical indicators"""
    signals = []
    
    # RSI signals
    rsi = indicators.get("rsi")
    if rsi:
        if rsi < 30:
            signals.append({"type": "buy", "indicator": "RSI", "reason": f"Oversold (RSI: {rsi:.1f})"})
        elif rsi > 70:
            signals.append({"type": "sell", "indicator": "RSI", "reason": f"Overbought (RSI: {rsi:.1f})"})
    
    # Moving Average signals
    ma = indicators.get("moving_averages", {})
    if ma.get("ma_50") and ma.get("ma_200"):
        if ma["ma_50"] > ma["ma_200"]:
            signals.append({"type": "buy", "indicator": "MA Cross", "reason": "Golden Cross (MA50 > MA200)"})
        elif ma["ma_50"] < ma["ma_200"]:
            signals.append({"type": "sell", "indicator": "MA Cross", "reason": "Death Cross (MA50 < MA200)"})
    
    # MACD signals
    macd = indicators.get("macd", {})
    if macd.get("macd") and macd.get("signal"):
        if macd["macd"] > macd["signal"]:
            signals.append({"type": "buy", "indicator": "MACD", "reason": "MACD above signal line"})
        else:
            signals.append({"type": "sell", "indicator": "MACD", "reason": "MACD below signal line"})
    
    # Bollinger Bands signals
    bb = indicators.get("bollinger_bands", {})
    if bb.get("upper") and bb.get("lower"):
        if current_price <= bb["lower"]:
            signals.append({"type": "buy", "indicator": "Bollinger Bands", "reason": "Price at lower band"})
        elif current_price >= bb["upper"]:
            signals.append({"type": "sell", "indicator": "Bollinger Bands", "reason": "Price at upper band"})
    
    # Determine overall signal
    buy_signals = sum(1 for s in signals if s["type"] == "buy")
    sell_signals = sum(1 for s in signals if s["type"] == "sell")
    
    if buy_signals > sell_signals:
        overall = "BUY"
    elif sell_signals > buy_signals:
        overall = "SELL"
    else:
        overall = "HOLD"
    
    return {
        "overall_signal": overall,
        "signals": signals,
        "buy_count": buy_signals,
        "sell_count": sell_signals
    }


def compare_stocks(symbols: List[str]) -> List[Dict]:
    """Compare multiple stocks"""
    comparison = []
    
    for symbol in symbols:
        try:
            info = get_stock_info(symbol)
            df = get_historical_data(symbol, period="3mo")
            
            # Calculate basic metrics
            returns_1m = ((df['Close'].iloc[-1] - df['Close'].iloc[-22]) / df['Close'].iloc[-22] * 100) if len(df) >= 22 else None
            returns_3m = ((df['Close'].iloc[-1] - df['Close'].iloc[0]) / df['Close'].iloc[0] * 100)
            
            comparison.append({
                "symbol": symbol,
                "name": info["name"],
                "current_price": info["current_price"],
                "returns_1m": float(returns_1m) if returns_1m else None,
                "returns_3m": float(returns_3m),
                "market_cap": info["market_cap"],
                "pe_ratio": info["pe_ratio"],
                "volatility": float(df['Close'].pct_change().std() * np.sqrt(252) * 100)
            })
        except Exception as e:
            logger.error(f"Error comparing stock {symbol}: {str(e)}")
            comparison.append({
                "symbol": symbol,
                "error": str(e)
            })
    
    return comparison
