"""
Portfolio Optimization Module
- Modern Portfolio Theory (Markowitz)
- Kelly Criterion for bet sizing
- Margin/Leverage calculations
- Efficient Frontier generation
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
import yfinance as yf
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


def fetch_historical_returns(symbols: List[str], period: str = "1y") -> pd.DataFrame:
    """Fetch historical price data and calculate returns"""
    try:
        # Download data
        raw_data = yf.download(symbols, period=period, progress=False)
        
        # Handle different data structures based on number of symbols
        if len(symbols) == 1:
            # Single symbol - data might be a DataFrame with columns like 'Adj Close', 'Close', etc.
            if 'Adj Close' in raw_data.columns:
                data = raw_data['Adj Close']
            else:
                data = raw_data['Close']
            data = data.to_frame(columns=[symbols[0]])
        else:
            # Multiple symbols - data should be MultiIndex DataFrame
            if isinstance(raw_data.columns, pd.MultiIndex):
                # MultiIndex columns - extract 'Adj Close' level
                if 'Adj Close' in raw_data.columns.get_level_values(0):
                    data = raw_data['Adj Close']
                else:
                    data = raw_data['Close']
            else:
                # Single level columns - assume it's already the price data
                data = raw_data
        
        # Ensure we have a DataFrame
        if isinstance(data, pd.Series):
            data = data.to_frame()
        
        # Calculate daily returns
        returns = data.pct_change().dropna()
        return returns
    except Exception as e:
        logger.error(f"Error fetching returns: {str(e)}")
        raise


def calculate_portfolio_stats(weights: np.ndarray, mean_returns: np.ndarray, 
                               cov_matrix: np.ndarray) -> Tuple[float, float, float]:
    """Calculate portfolio return, volatility, and Sharpe ratio"""
    portfolio_return = np.sum(mean_returns * weights) * 252  # Annualized
    portfolio_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))  # Annualized
    sharpe_ratio = portfolio_return / portfolio_std if portfolio_std > 0 else 0
    
    return portfolio_return, portfolio_std, sharpe_ratio


def negative_sharpe(weights: np.ndarray, mean_returns: np.ndarray, cov_matrix: np.ndarray) -> float:
    """Objective function for optimization (negative Sharpe for minimization)"""
    _, _, sharpe = calculate_portfolio_stats(weights, mean_returns, cov_matrix)
    return -sharpe


def portfolio_variance(weights: np.ndarray, mean_returns: np.ndarray, cov_matrix: np.ndarray) -> float:
    """Calculate portfolio variance"""
    return np.dot(weights.T, np.dot(cov_matrix * 252, weights))


def optimize_portfolio(symbols: List[str], period: str = "1y", 
                       risk_free_rate: float = 0.02) -> Dict:
    """
    Optimize portfolio using Modern Portfolio Theory
    Returns optimal weights for maximum Sharpe ratio
    """
    try:
        # Fetch returns
        returns = fetch_historical_returns(symbols, period)
        
        # Calculate mean returns and covariance matrix
        mean_returns = returns.mean().values
        cov_matrix = returns.cov().values
        
        num_assets = len(symbols)
        
        # Constraints: weights sum to 1
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        
        # Bounds: 0 <= weight <= 1 (no short selling)
        bounds = tuple((0, 1) for _ in range(num_assets))
        
        # Initial guess: equal weights
        initial_weights = np.array([1.0 / num_assets] * num_assets)
        
        # Optimize for maximum Sharpe ratio
        result = minimize(
            negative_sharpe,
            initial_weights,
            args=(mean_returns, cov_matrix),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        optimal_weights = result.x
        port_return, port_std, sharpe = calculate_portfolio_stats(
            optimal_weights, mean_returns, cov_matrix
        )
        
        return {
            "symbols": symbols,
            "optimal_weights": {sym: float(w) for sym, w in zip(symbols, optimal_weights)},
            "expected_return": float(port_return),
            "volatility": float(port_std),
            "sharpe_ratio": float(sharpe),
            "success": result.success
        }
        
    except Exception as e:
        logger.error(f"Portfolio optimization error: {str(e)}")
        raise


def generate_efficient_frontier(symbols: List[str], period: str = "1y", 
                                 num_portfolios: int = 100) -> Dict:
    """Generate efficient frontier with random portfolios"""
    try:
        returns = fetch_historical_returns(symbols, period)
        mean_returns = returns.mean().values
        cov_matrix = returns.cov().values
        
        num_assets = len(symbols)
        
        # Generate random portfolios
        results = []
        for _ in range(num_portfolios):
            weights = np.random.random(num_assets)
            weights /= np.sum(weights)  # Normalize to sum to 1
            
            port_return, port_std, sharpe = calculate_portfolio_stats(
                weights, mean_returns, cov_matrix
            )
            
            results.append({
                "return": float(port_return),
                "volatility": float(port_std),
                "sharpe": float(sharpe),
                "weights": weights.tolist()
            })
        
        # Find minimum variance portfolio
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bounds = tuple((0, 1) for _ in range(num_assets))
        initial_weights = np.array([1.0 / num_assets] * num_assets)
        
        min_var_result = minimize(
            portfolio_variance,
            initial_weights,
            args=(mean_returns, cov_matrix),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        min_var_return, min_var_std, min_var_sharpe = calculate_portfolio_stats(
            min_var_result.x, mean_returns, cov_matrix
        )
        
        return {
            "portfolios": results,
            "min_variance_portfolio": {
                "weights": {sym: float(w) for sym, w in zip(symbols, min_var_result.x)},
                "return": float(min_var_return),
                "volatility": float(min_var_std),
                "sharpe": float(min_var_sharpe)
            }
        }
        
    except Exception as e:
        logger.error(f"Efficient frontier error: {str(e)}")
        raise


def kelly_criterion(win_prob: float, win_loss_ratio: float) -> float:
    """
    Calculate optimal bet size using Kelly Criterion
    
    Kelly % = W - [(1 - W) / R]
    where:
        W = winning probability
        R = win/loss ratio (avg win / avg loss)
    """
    if win_prob <= 0 or win_prob >= 1 or win_loss_ratio <= 0:
        return 0.0
    
    kelly_pct = win_prob - ((1 - win_prob) / win_loss_ratio)
    
    # Return Kelly percentage (can be negative for -EV bets)
    return max(0.0, kelly_pct)  # Don't bet on -EV


def fractional_kelly(win_prob: float, win_loss_ratio: float, 
                     fraction: float = 0.5) -> float:
    """
    Fractional Kelly Criterion (safer, reduces volatility)
    Common fractions: 0.25 (quarter), 0.5 (half), 0.75 (three-quarter)
    """
    full_kelly = kelly_criterion(win_prob, win_loss_ratio)
    return full_kelly * fraction


def calculate_position_size_kelly(
    account_balance: float,
    win_prob: float,
    avg_win: float,
    avg_loss: float,
    fraction: float = 0.5
) -> Dict:
    """
    Calculate position size using Kelly Criterion
    """
    if avg_loss == 0:
        return {"error": "Average loss cannot be zero"}
    
    win_loss_ratio = abs(avg_win / avg_loss)
    
    # Full Kelly
    full_kelly = kelly_criterion(win_prob, win_loss_ratio)
    
    # Fractional Kelly (safer)
    frac_kelly = fractional_kelly(win_prob, win_loss_ratio, fraction)
    
    # Position sizes
    full_kelly_position = account_balance * full_kelly
    frac_kelly_position = account_balance * frac_kelly
    
    return {
        "win_probability": win_prob,
        "win_loss_ratio": win_loss_ratio,
        "full_kelly_percent": float(full_kelly * 100),
        "fractional_kelly_percent": float(frac_kelly * 100),
        "full_kelly_position_size": float(full_kelly_position),
        "fractional_kelly_position_size": float(frac_kelly_position),
        "recommended": "fractional" if frac_kelly > 0 else "none",
        "warning": "High risk - consider reducing position size" if full_kelly > 0.25 else None
    }


def calculate_margin_leverage(
    account_balance: float,
    position_size: float,
    maintenance_margin: float = 0.25,
    initial_margin: float = 0.5
) -> Dict:
    """
    Calculate margin requirements and leverage
    
    Args:
        account_balance: Total account cash
        position_size: Desired position value
        maintenance_margin: Minimum margin % (default 25%)
        initial_margin: Initial margin % required (default 50%)
    """
    
    # Maximum leverage (inverse of initial margin)
    max_leverage = 1 / initial_margin
    
    # Current leverage
    if account_balance <= 0:
        return {"error": "Account balance must be positive"}
    
    current_leverage = position_size / account_balance
    
    # Required initial margin
    required_initial_margin = position_size * initial_margin
    
    # Required maintenance margin
    required_maintenance_margin = position_size * maintenance_margin
    
    # Available buying power (with leverage)
    buying_power = account_balance * max_leverage
    
    # Margin call price calculation (approximate)
    # If position drops below maintenance margin level
    margin_call_threshold = account_balance - required_maintenance_margin
    
    # Safe position size (conservative - using 50% of max)
    safe_position_size = account_balance * (max_leverage * 0.5)
    
    return {
        "account_balance": float(account_balance),
        "position_size": float(position_size),
        "current_leverage": float(current_leverage),
        "max_leverage": float(max_leverage),
        "required_initial_margin": float(required_initial_margin),
        "required_maintenance_margin": float(required_maintenance_margin),
        "buying_power": float(buying_power),
        "margin_call_threshold": float(max(0, margin_call_threshold)),
        "safe_position_size": float(safe_position_size),
        "is_safe": current_leverage <= (max_leverage * 0.5),
        "risk_level": "low" if current_leverage <= 1.5 else "medium" if current_leverage <= 2.5 else "high"
    }


def optimal_leverage(
    account_balance: float,
    expected_return: float,
    volatility: float,
    risk_free_rate: float = 0.02
) -> Dict:
    """
    Calculate optimal leverage using continuous-time Kelly
    
    Optimal leverage = (μ - r) / σ²
    where:
        μ = expected return
        r = risk-free rate
        σ = volatility (standard deviation)
    """
    
    if volatility <= 0:
        return {"error": "Volatility must be positive"}
    
    # Optimal leverage ratio
    optimal_lev = (expected_return - risk_free_rate) / (volatility ** 2)
    
    # Cap at reasonable limits (e.g., 3x)
    optimal_lev = min(optimal_lev, 3.0)
    optimal_lev = max(optimal_lev, 0.0)
    
    # Position size with optimal leverage
    optimal_position = account_balance * optimal_lev
    
    # Expected portfolio return with leverage
    leveraged_return = optimal_lev * expected_return - (optimal_lev - 1) * risk_free_rate
    
    # Leveraged volatility
    leveraged_volatility = optimal_lev * volatility
    
    return {
        "optimal_leverage": float(optimal_lev),
        "optimal_position_size": float(optimal_position),
        "expected_leveraged_return": float(leveraged_return),
        "leveraged_volatility": float(leveraged_volatility),
        "sharpe_ratio": float(leveraged_return / leveraged_volatility) if leveraged_volatility > 0 else 0,
        "recommendation": "conservative" if optimal_lev < 1.5 else "moderate" if optimal_lev < 2.5 else "aggressive"
    }
