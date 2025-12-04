"""
Model performance tracking and backtesting
"""
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


async def save_prediction(db, symbol: str, model_type: str, prediction_data: Dict):
    """Save prediction to database for tracking"""
    try:
        prediction_record = {
            "symbol": symbol,
            "model_type": model_type,
            "prediction_date": datetime.now(timezone.utc).isoformat(),
            "current_price": prediction_data["current_price"],
            "predicted_price": prediction_data["predicted_price_end"],
            "predicted_change_percent": prediction_data["price_change_percent"],
            "confidence": prediction_data["confidence"],
            "timeframe_days": prediction_data.get("timeframe_days", 30),
            "target_date": (datetime.now(timezone.utc) + timedelta(days=prediction_data.get("timeframe_days", 30))).isoformat(),
            "actual_price": None,
            "actual_change_percent": None,
            "accuracy": None,
            "is_evaluated": False
        }
        
        await db.model_predictions.insert_one(prediction_record)
        logger.info(f"Saved {model_type} prediction for {symbol}")
        
    except Exception as e:
        logger.error(f"Error saving prediction: {str(e)}")


async def evaluate_predictions(db, get_current_price_func):
    """Evaluate past predictions that have reached their target date"""
    try:
        now = datetime.now(timezone.utc)
        
        # Find predictions that should be evaluated
        predictions = await db.model_predictions.find({
            "is_evaluated": False,
            "target_date": {"$lte": now.isoformat()}
        }).to_list(100)
        
        evaluated_count = 0
        
        for pred in predictions:
            try:
                # Get current actual price
                actual_price = await get_current_price_func(pred['symbol'])
                
                if actual_price:
                    actual_change = ((actual_price - pred['current_price']) / pred['current_price']) * 100
                    
                    # Calculate accuracy (inverse of error percentage)
                    error = abs(pred['predicted_change_percent'] - actual_change)
                    accuracy = max(0, 100 - error)
                    
                    # Determine if direction was correct
                    predicted_direction = "up" if pred['predicted_change_percent'] > 0 else "down"
                    actual_direction = "up" if actual_change > 0 else "down"
                    direction_correct = predicted_direction == actual_direction
                    
                    # Update prediction with actual results
                    await db.model_predictions.update_one(
                        {"_id": pred['_id']},
                        {"$set": {
                            "actual_price": actual_price,
                            "actual_change_percent": actual_change,
                            "accuracy": accuracy,
                            "direction_correct": direction_correct,
                            "is_evaluated": True,
                            "evaluated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    evaluated_count += 1
                    
            except Exception as e:
                logger.error(f"Error evaluating prediction for {pred['symbol']}: {str(e)}")
                continue
        
        logger.info(f"Evaluated {evaluated_count} predictions")
        return evaluated_count
        
    except Exception as e:
        logger.error(f"Error in evaluate_predictions: {str(e)}")
        return 0


async def get_model_performance(db, model_type: str = None, symbol: str = None, days: int = 90):
    """Get model performance statistics"""
    try:
        # Build query
        query = {"is_evaluated": True}
        if model_type:
            query["model_type"] = model_type
        if symbol:
            query["symbol"] = symbol
        
        # Get date range
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query["prediction_date"] = {"$gte": cutoff_date}
        
        # Fetch predictions
        predictions = await db.model_predictions.find(query, {"_id": 0}).to_list(1000)
        
        if not predictions:
            return {
                "model_type": model_type or "all",
                "symbol": symbol or "all",
                "total_predictions": 0,
                "avg_accuracy": 0,
                "direction_accuracy": 0,
                "metrics": {}
            }
        
        # Calculate metrics
        accuracies = [p['accuracy'] for p in predictions]
        direction_correct = sum(1 for p in predictions if p.get('direction_correct', False))
        
        # Calculate error metrics
        errors = [abs(p['predicted_change_percent'] - p['actual_change_percent']) for p in predictions]
        
        return {
            "model_type": model_type or "all",
            "symbol": symbol or "all",
            "total_predictions": len(predictions),
            "avg_accuracy": float(np.mean(accuracies)),
            "direction_accuracy": float((direction_correct / len(predictions)) * 100),
            "metrics": {
                "mean_absolute_error": float(np.mean(errors)),
                "median_absolute_error": float(np.median(errors)),
                "std_error": float(np.std(errors)),
                "best_accuracy": float(max(accuracies)),
                "worst_accuracy": float(min(accuracies))
            },
            "recent_predictions": predictions[-5:]  # Last 5 predictions
        }
        
    except Exception as e:
        logger.error(f"Error getting model performance: {str(e)}")
        raise


def backtest_strategy(df: pd.DataFrame, predictions: List[Dict], initial_capital: float = 10000):
    """Backtest a trading strategy based on model predictions"""
    try:
        capital = initial_capital
        shares = 0
        trades = []
        
        df = df.reset_index()
        df['Date'] = pd.to_datetime(df['Date'])
        
        for pred in predictions:
            pred_date = pd.to_datetime(pred['prediction_date'])
            
            # Find the next available trading day
            future_df = df[df['Date'] > pred_date]
            if len(future_df) == 0:
                continue
            
            entry_price = future_df.iloc[0]['Close']
            entry_date = future_df.iloc[0]['Date']
            
            # Determine action based on prediction
            predicted_change = pred['predicted_change_percent']
            
            if predicted_change > 2 and capital > 0:  # Buy signal
                shares_to_buy = capital / entry_price
                shares += shares_to_buy
                capital = 0
                trades.append({
                    "date": entry_date,
                    "action": "BUY",
                    "price": entry_price,
                    "shares": shares_to_buy,
                    "predicted_change": predicted_change
                })
                
            elif predicted_change < -2 and shares > 0:  # Sell signal
                capital = shares * entry_price
                trades.append({
                    "date": entry_date,
                    "action": "SELL",
                    "price": entry_price,
                    "shares": shares,
                    "predicted_change": predicted_change
                })
                shares = 0
        
        # Close any open positions
        if shares > 0:
            final_price = df.iloc[-1]['Close']
            capital = shares * final_price
            shares = 0
        
        # Calculate returns
        final_value = capital
        total_return = ((final_value - initial_capital) / initial_capital) * 100
        
        # Calculate buy & hold return for comparison
        buy_hold_shares = initial_capital / df.iloc[0]['Close']
        buy_hold_final = buy_hold_shares * df.iloc[-1]['Close']
        buy_hold_return = ((buy_hold_final - initial_capital) / initial_capital) * 100
        
        return {
            "initial_capital": initial_capital,
            "final_value": float(final_value),
            "total_return_percent": float(total_return),
            "buy_hold_return_percent": float(buy_hold_return),
            "outperformance": float(total_return - buy_hold_return),
            "total_trades": len(trades),
            "trades": trades
        }
        
    except Exception as e:
        logger.error(f"Error in backtesting: {str(e)}")
        raise


def calculate_confidence_intervals(predictions: List[float], confidence_level: float = 0.95):
    """Calculate confidence intervals for predictions"""
    try:
        predictions = np.array(predictions)
        mean = np.mean(predictions)
        std = np.std(predictions)
        
        # Calculate confidence interval
        from scipy import stats as scipy_stats
        confidence_interval = scipy_stats.t.interval(
            confidence_level,
            len(predictions) - 1,
            loc=mean,
            scale=scipy_stats.sem(predictions)
        )
        
        return {
            "mean": float(mean),
            "std": float(std),
            "confidence_level": confidence_level,
            "lower_bound": float(confidence_interval[0]),
            "upper_bound": float(confidence_interval[1]),
            "margin_of_error": float((confidence_interval[1] - confidence_interval[0]) / 2)
        }
        
    except Exception as e:
        logger.error(f"Error calculating confidence intervals: {str(e)}")
        raise
