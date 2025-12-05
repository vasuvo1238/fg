"""
Advanced Risk Metrics Module
- Value at Risk (VaR) - Historical and Parametric
- Conditional Value at Risk (CVaR)
- Monte Carlo Simulations
- Maximum Drawdown
- Sortino Ratio
- Beta and Correlation Analysis
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import List, Dict, Tuple
import yfinance as yf
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def calculate_var(returns: pd.Series, confidence_level: float = 0.95, 
                  method: str = "historical") -> float:
    """
    Calculate Value at Risk (VaR)
    
    Args:
        returns: Series of returns
        confidence_level: Confidence level (e.g., 0.95 for 95%)
        method: 'historical' or 'parametric'
    
    Returns:
        VaR value (positive number represents loss)
    """
    if method == "historical":
        # Historical VaR - simply the percentile of returns
        var = -np.percentile(returns, (1 - confidence_level) * 100)
    else:  # parametric
        # Parametric VaR - assumes normal distribution
        mean = returns.mean()
        std = returns.std()
        var = -(mean + stats.norm.ppf(1 - confidence_level) * std)
    
    return float(var)


def calculate_cvar(returns: pd.Series, confidence_level: float = 0.95) -> float:
    """
    Calculate Conditional Value at Risk (CVaR) / Expected Shortfall
    Average loss beyond VaR
    """
    var = calculate_var(returns, confidence_level, method="historical")
    # Get returns worse than VaR
    tail_losses = returns[returns < -var]
    
    if len(tail_losses) > 0:
        cvar = -tail_losses.mean()
    else:
        cvar = var
    
    return float(cvar)


def calculate_max_drawdown(prices: pd.Series) -> Dict:
    """
    Calculate Maximum Drawdown - largest peak-to-trough decline
    """
    # Calculate cumulative returns
    cumulative = (1 + prices.pct_change()).cumprod()
    
    # Calculate running maximum
    running_max = cumulative.expanding().max()
    
    # Calculate drawdown
    drawdown = (cumulative - running_max) / running_max
    
    # Find maximum drawdown
    max_dd = drawdown.min()
    
    # Find the dates
    max_dd_idx = drawdown.idxmin()
    peak_idx = cumulative[:max_dd_idx].idxmax()
    
    # Recovery (if recovered)
    recovery_idx = None
    if max_dd_idx < len(cumulative) - 1:
        post_dd = cumulative[max_dd_idx:]
        recovered = post_dd[post_dd >= cumulative[peak_idx]]
        if len(recovered) > 0:
            recovery_idx = recovered.index[0]
    
    return {
        "max_drawdown": float(max_dd),
        "max_drawdown_percent": float(max_dd * 100),
        "peak_date": str(peak_idx) if peak_idx is not None else None,
        "trough_date": str(max_dd_idx) if max_dd_idx is not None else None,
        "recovery_date": str(recovery_idx) if recovery_idx is not None else None,
        "drawdown_duration_days": (max_dd_idx - peak_idx).days if peak_idx and max_dd_idx else 0
    }


def calculate_sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    """
    Calculate Sortino Ratio - like Sharpe but only considers downside volatility
    """
    excess_returns = returns.mean() * 252 - risk_free_rate
    
    # Downside deviation (only negative returns)
    downside_returns = returns[returns < 0]
    downside_std = downside_returns.std() * np.sqrt(252)
    
    if downside_std > 0:
        sortino = excess_returns / downside_std
    else:
        sortino = 0.0
    
    return float(sortino)


def calculate_beta(stock_returns: pd.Series, market_returns: pd.Series) -> Dict:
    """
    Calculate Beta and correlation with market
    """
    # Align the series
    aligned = pd.DataFrame({'stock': stock_returns, 'market': market_returns}).dropna()
    
    if len(aligned) < 30:
        return {"error": "Insufficient data for beta calculation"}
    
    # Calculate covariance and variance
    covariance = aligned['stock'].cov(aligned['market'])
    market_variance = aligned['market'].var()
    
    beta = covariance / market_variance if market_variance > 0 else 0
    
    # Calculate correlation
    correlation = aligned['stock'].corr(aligned['market'])
    
    # Calculate alpha (excess return)
    stock_mean = aligned['stock'].mean() * 252
    market_mean = aligned['market'].mean() * 252
    alpha = stock_mean - beta * market_mean
    
    return {
        "beta": float(beta),
        "alpha": float(alpha),
        "correlation": float(correlation),
        "interpretation": "Defensive" if beta < 0.8 else "Neutral" if beta < 1.2 else "Aggressive"
    }


def monte_carlo_simulation(
    initial_value: float,
    expected_return: float,
    volatility: float,
    days: int = 252,
    simulations: int = 1000,
    risk_free_rate: float = 0.02
) -> Dict:
    """
    Run Monte Carlo simulation for portfolio value
    
    Args:
        initial_value: Starting portfolio value
        expected_return: Expected annual return
        volatility: Annual volatility (std dev)
        days: Number of days to simulate
        simulations: Number of simulation paths
        risk_free_rate: Risk-free rate
    
    Returns:
        Dictionary with simulation results and statistics
    """
    # Daily parameters
    daily_return = expected_return / 252
    daily_volatility = volatility / np.sqrt(252)
    
    # Generate random returns for all simulations
    random_returns = np.random.normal(daily_return, daily_volatility, (days, simulations))
    
    # Calculate cumulative returns
    price_paths = initial_value * np.exp(np.cumsum(random_returns, axis=0))
    
    # Add initial value at the beginning
    price_paths = np.vstack([np.full(simulations, initial_value), price_paths])
    
    # Final values
    final_values = price_paths[-1]
    
    # Calculate statistics
    mean_final = np.mean(final_values)
    median_final = np.median(final_values)
    std_final = np.std(final_values)
    
    # Percentiles
    percentiles = {
        "5th": float(np.percentile(final_values, 5)),
        "25th": float(np.percentile(final_values, 25)),
        "50th": float(np.percentile(final_values, 50)),
        "75th": float(np.percentile(final_values, 75)),
        "95th": float(np.percentile(final_values, 95))
    }
    
    # Probability of loss
    prob_loss = np.sum(final_values < initial_value) / simulations
    
    # Expected shortfall (CVaR at 95%)
    var_95 = np.percentile(final_values, 5)
    tail_losses = final_values[final_values < var_95]
    cvar_95 = np.mean(tail_losses) if len(tail_losses) > 0 else var_95
    
    # Sample some paths for visualization (10 paths)
    sample_indices = np.random.choice(simulations, min(10, simulations), replace=False)
    sample_paths = []
    for idx in sample_indices:
        path_data = [{"day": i, "value": float(price_paths[i, idx])} for i in range(len(price_paths))]
        sample_paths.append(path_data)
    
    return {
        "initial_value": float(initial_value),
        "simulations": simulations,
        "days": days,
        "statistics": {
            "mean_final_value": float(mean_final),
            "median_final_value": float(median_final),
            "std_final_value": float(std_final),
            "min_final_value": float(np.min(final_values)),
            "max_final_value": float(np.max(final_values))
        },
        "percentiles": percentiles,
        "risk_metrics": {
            "probability_of_loss": float(prob_loss * 100),
            "var_95": float(var_95),
            "cvar_95": float(cvar_95),
            "expected_gain": float(mean_final - initial_value),
            "expected_return_percent": float((mean_final - initial_value) / initial_value * 100)
        },
        "sample_paths": sample_paths,
        "distribution": {
            "mean": float(mean_final),
            "std": float(std_final),
            "skew": float(stats.skew(final_values)),
            "kurtosis": float(stats.kurtosis(final_values))
        }
    }


def portfolio_risk_analysis(
    symbols: List[str],
    weights: List[float],
    portfolio_value: float,
    period: str = "1y",
    confidence_level: float = 0.95
) -> Dict:
    """
    Comprehensive risk analysis for a portfolio
    """
    try:
        # Fetch historical data
        data = yf.download(symbols, period=period, progress=False)['Adj Close']
        
        if isinstance(data, pd.Series):
            data = data.to_frame()
        
        # Calculate returns
        returns = data.pct_change().dropna()
        
        # Calculate portfolio returns
        weights_array = np.array(weights)
        portfolio_returns = returns @ weights_array
        
        # Basic statistics
        mean_return = portfolio_returns.mean() * 252
        volatility = portfolio_returns.std() * np.sqrt(252)
        sharpe_ratio = (mean_return - 0.02) / volatility if volatility > 0 else 0
        
        # Advanced risk metrics
        var_95 = calculate_var(portfolio_returns, confidence_level)
        cvar_95 = calculate_cvar(portfolio_returns, confidence_level)
        sortino = calculate_sortino_ratio(portfolio_returns)
        
        # Maximum drawdown
        portfolio_prices = (1 + portfolio_returns).cumprod() * portfolio_value
        max_dd = calculate_max_drawdown(portfolio_prices)
        
        # VaR in dollar terms
        var_dollar = var_95 * portfolio_value
        cvar_dollar = cvar_95 * portfolio_value
        
        # Beta vs SPY (market)
        try:
            spy_data = yf.download("SPY", period=period, progress=False)['Adj Close']
            spy_returns = spy_data.pct_change().dropna()
            
            # Align returns
            aligned_returns = pd.DataFrame({
                'portfolio': portfolio_returns,
                'market': spy_returns
            }).dropna()
            
            beta_analysis = calculate_beta(aligned_returns['portfolio'], aligned_returns['market'])
        except:
            beta_analysis = {"error": "Could not calculate beta"}
        
        return {
            "portfolio_value": float(portfolio_value),
            "expected_annual_return": float(mean_return),
            "annual_volatility": float(volatility),
            "sharpe_ratio": float(sharpe_ratio),
            "sortino_ratio": float(sortino),
            "var": {
                "confidence_level": confidence_level,
                "var_percent": float(var_95 * 100),
                "var_dollar": float(var_dollar),
                "interpretation": f"With {confidence_level*100}% confidence, losses will not exceed ${var_dollar:.2f} in a day"
            },
            "cvar": {
                "cvar_percent": float(cvar_95 * 100),
                "cvar_dollar": float(cvar_dollar),
                "interpretation": f"Average loss in worst {(1-confidence_level)*100}% of cases: ${cvar_dollar:.2f}"
            },
            "max_drawdown": max_dd,
            "beta_analysis": beta_analysis,
            "risk_rating": "Low" if volatility < 0.15 else "Medium" if volatility < 0.25 else "High"
        }
        
    except Exception as e:
        logger.error(f"Portfolio risk analysis error: {str(e)}")
        raise


def portfolio_rebalancing_advice(
    current_weights: Dict[str, float],
    target_weights: Dict[str, float],
    portfolio_value: float,
    threshold: float = 0.05
) -> Dict:
    """
    Generate rebalancing recommendations
    
    Args:
        current_weights: Current allocation {symbol: weight}
        target_weights: Target allocation {symbol: weight}
        portfolio_value: Total portfolio value
        threshold: Rebalancing threshold (5% by default)
    """
    recommendations = []
    needs_rebalancing = False
    
    all_symbols = set(list(current_weights.keys()) + list(target_weights.keys()))
    
    for symbol in all_symbols:
        current = current_weights.get(symbol, 0.0)
        target = target_weights.get(symbol, 0.0)
        diff = target - current
        
        if abs(diff) > threshold:
            needs_rebalancing = True
            
            current_value = current * portfolio_value
            target_value = target * portfolio_value
            trade_value = target_value - current_value
            
            recommendations.append({
                "symbol": symbol,
                "current_weight": float(current),
                "target_weight": float(target),
                "difference": float(diff),
                "current_value": float(current_value),
                "target_value": float(target_value),
                "action": "BUY" if trade_value > 0 else "SELL",
                "trade_value": float(abs(trade_value)),
                "shares_estimate": int(abs(trade_value) / 100)  # Rough estimate assuming $100/share
            })
    
    # Sort by absolute difference
    recommendations.sort(key=lambda x: abs(x['difference']), reverse=True)
    
    return {
        "needs_rebalancing": needs_rebalancing,
        "threshold": threshold,
        "recommendations": recommendations,
        "total_trades": len(recommendations),
        "summary": f"{'Rebalancing needed' if needs_rebalancing else 'Portfolio is balanced'} - {len(recommendations)} positions to adjust"
    }
