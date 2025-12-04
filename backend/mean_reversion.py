"""
Mean reversion trading strategies
"""
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.stattools import adfuller
import logging

logger = logging.getLogger(__name__)


def z_score_mean_reversion(df: pd.DataFrame, days_ahead: int = 30, window: int = 20):
    """
    Z-Score based mean reversion strategy
    Uses Bollinger Bands concept with Z-scores
    """
    try:
        prices = df['Close'].values
        
        # Calculate rolling mean and std
        rolling_mean = pd.Series(prices).rolling(window=window).mean()
        rolling_std = pd.Series(prices).rolling(window=window).std()
        
        # Calculate Z-score
        z_scores = (prices - rolling_mean) / rolling_std
        
        # Current price and Z-score
        current_price = float(prices[-1])
        current_z = float(z_scores.iloc[-1])
        mean_price = float(rolling_mean.iloc[-1])
        
        # Predict reversion to mean
        # If Z-score is high (>2), expect price to drop towards mean
        # If Z-score is low (<-2), expect price to rise towards mean
        
        # Calculate expected reversion
        reversion_strength = np.tanh(current_z)  # Bounded between -1 and 1
        
        # Generate prediction path
        predictions = []
        for i in range(1, days_ahead + 1):
            # Exponential decay towards mean
            decay_factor = np.exp(-i / (days_ahead * 0.3))
            predicted_deviation = (current_price - mean_price) * decay_factor
            predicted_price = mean_price + predicted_deviation
            predictions.append(float(predicted_price))
        
        # Generate prediction dates
        last_date = df.index[-1]
        prediction_dates = [(last_date + pd.Timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(days_ahead)]
        
        # Determine signal
        if current_z > 2:
            signal = "SELL"
            reason = f"Price is {abs(current_z):.2f} std dev above mean - expect reversion down"
        elif current_z < -2:
            signal = "BUY"
            reason = f"Price is {abs(current_z):.2f} std dev below mean - expect reversion up"
        else:
            signal = "HOLD"
            reason = f"Price near mean (Z={current_z:.2f}) - no clear reversion signal"
        
        predicted_price_end = predictions[-1]
        
        return {
            "predictions": [
                {"date": date, "price": price}
                for date, price in zip(prediction_dates, predictions)
            ],
            "trend": "bearish" if predicted_price_end < current_price else "bullish",
            "confidence": float(min(95, 60 + abs(current_z) * 10)),  # Higher confidence with extreme Z-scores
            "current_price": current_price,
            "predicted_price_end": predicted_price_end,
            "price_change_percent": float(((predicted_price_end - current_price) / current_price) * 100),
            "model_type": "Z-Score Mean Reversion",
            "z_score": float(current_z),
            "mean_price": mean_price,
            "signal": signal,
            "signal_reason": reason
        }
    
    except Exception as e:
        logger.error(f"Error in Z-score mean reversion: {str(e)}")
        raise


def ornstein_uhlenbeck_process(df: pd.DataFrame, days_ahead: int = 30):
    """
    Ornstein-Uhlenbeck process for mean reversion
    Models price as mean-reverting stochastic process
    """
    try:
        prices = df['Close'].values
        log_prices = np.log(prices)
        
        # Estimate OU parameters
        # dx = theta * (mu - x) * dt + sigma * dW
        
        # Calculate differences
        diff = np.diff(log_prices)
        
        # Estimate theta (mean reversion speed) and mu (long-term mean)
        X = log_prices[:-1]
        Y = diff
        
        # Linear regression to estimate parameters
        theta = -np.cov(X, Y)[0, 1] / np.var(X)
        mu = np.mean(log_prices)
        sigma = np.std(diff)
        
        # Current log price
        current_log_price = log_prices[-1]
        current_price = prices[-1]
        
        # Generate predictions
        predictions = []
        predicted_log_price = current_log_price
        
        dt = 1  # 1 day
        for _ in range(days_ahead):
            # OU process step
            predicted_log_price += theta * (mu - predicted_log_price) * dt + sigma * np.random.randn() * np.sqrt(dt)
            predictions.append(float(np.exp(predicted_log_price)))
        
        # Generate prediction dates
        last_date = df.index[-1]
        prediction_dates = [(last_date + pd.Timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(days_ahead)]
        
        predicted_price_end = predictions[-1]
        
        # Calculate half-life (time to revert halfway to mean)
        half_life = np.log(2) / abs(theta) if theta != 0 else float('inf')
        
        return {
            "predictions": [
                {"date": date, "price": price}
                for date, price in zip(prediction_dates, predictions)
            ],
            "trend": "bearish" if predicted_price_end < current_price else "bullish",
            "confidence": float(min(90, 50 + abs(theta) * 1000)),
            "current_price": float(current_price),
            "predicted_price_end": predicted_price_end,
            "price_change_percent": float(((predicted_price_end - current_price) / current_price) * 100),
            "model_type": "Ornstein-Uhlenbeck",
            "theta": float(theta),
            "mu": float(np.exp(mu)),
            "sigma": float(sigma),
            "half_life_days": float(half_life) if half_life != float('inf') else None
        }
    
    except Exception as e:
        logger.error(f"Error in Ornstein-Uhlenbeck process: {str(e)}")
        raise


def statistical_arbitrage_score(df: pd.DataFrame):
    """
    Calculate mean reversion score for statistical arbitrage
    Uses multiple tests to determine if stock exhibits mean reversion
    """
    try:
        prices = df['Close'].values
        returns = np.diff(np.log(prices))
        
        # Augmented Dickey-Fuller test for stationarity
        adf_result = adfuller(prices)
        is_stationary = adf_result[1] < 0.05  # p-value < 0.05
        
        # Hurst exponent (H < 0.5 indicates mean reversion)
        lags = range(2, 20)
        tau = [np.sqrt(np.std(np.subtract(prices[lag:], prices[:-lag]))) for lag in lags]
        poly = np.polyfit(np.log(lags), np.log(tau), 1)
        hurst = poly[0] * 2
        
        # Half-life of mean reversion
        lagged_prices = prices[:-1]
        price_changes = np.diff(prices)
        lag_coefficient = np.polyfit(lagged_prices, price_changes, 1)[0]
        half_life = -np.log(2) / lag_coefficient if lag_coefficient < 0 else None
        
        # Calculate score (0-100)
        score = 0
        if is_stationary:
            score += 30
        if hurst < 0.5:
            score += 30 * (0.5 - hurst) / 0.5
        if half_life and 5 < half_life < 60:
            score += 40
        
        return {
            "mean_reversion_score": float(min(100, score)),
            "is_mean_reverting": bool(score > 50),
            "hurst_exponent": float(hurst),
            "is_stationary": bool(is_stationary),
            "adf_p_value": float(adf_result[1]),
            "half_life_days": float(half_life) if half_life else None,
            "interpretation": {
                "hurst": "Mean reverting" if hurst < 0.5 else "Trending" if hurst > 0.5 else "Random walk",
                "stationarity": "Stationary (good for mean reversion)" if is_stationary else "Non-stationary",
                "overall": "Strong mean reversion" if score > 70 else "Moderate mean reversion" if score > 50 else "Weak/No mean reversion"
            }
        }
    
    except Exception as e:
        logger.error(f"Error calculating arbitrage score: {str(e)}")
        raise


def pairs_trading_suggestion(df1: pd.DataFrame, df2: pd.DataFrame, symbol1: str, symbol2: str):
    """
    Suggest pairs trading opportunities
    Finds cointegrated pairs for mean reversion trading
    """
    try:
        # Get close prices
        prices1 = df1['Close'].values
        prices2 = df2['Close'].values
        
        # Ensure same length
        min_len = min(len(prices1), len(prices2))
        prices1 = prices1[-min_len:]
        prices2 = prices2[-min_len:]
        
        # Calculate correlation
        correlation = np.corrcoef(prices1, prices2)[0, 1]
        
        # Calculate spread
        # Hedge ratio using linear regression
        hedge_ratio = np.polyfit(prices2, prices1, 1)[0]
        spread = prices1 - hedge_ratio * prices2
        
        # Z-score of spread
        spread_mean = np.mean(spread)
        spread_std = np.std(spread)
        current_spread_z = (spread[-1] - spread_mean) / spread_std if spread_std > 0 else 0
        
        # Test for cointegration (simplified)
        adf_spread = adfuller(spread)
        is_cointegrated = bool(adf_spread[1] < 0.05)
        
        # Trading signal
        if current_spread_z > 2:
            signal = f"SHORT {symbol1} / LONG {symbol2}"
            reason = "Spread is abnormally high - expect convergence"
        elif current_spread_z < -2:
            signal = f"LONG {symbol1} / SHORT {symbol2}"
            reason = "Spread is abnormally low - expect convergence"
        else:
            signal = "NO TRADE"
            reason = "Spread is near equilibrium"
        
        return {
            "pair": f"{symbol1}-{symbol2}",
            "correlation": float(correlation),
            "hedge_ratio": float(hedge_ratio),
            "spread_z_score": float(current_spread_z),
            "is_cointegrated": is_cointegrated,
            "cointegration_p_value": float(adf_spread[1]),
            "signal": signal,
            "reason": reason,
            "suitable_for_pairs_trading": bool(is_cointegrated and abs(correlation) > 0.7)
        }
    
    except Exception as e:
        logger.error(f"Error in pairs trading analysis: {str(e)}")
        raise
