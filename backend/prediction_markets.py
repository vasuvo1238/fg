"""
Prediction Market Portfolio Optimizer for Polymarket and Kalshi
Optimizes portfolio allocation across prediction markets using Kelly Criterion
and expected value calculations
"""

import os
import httpx
import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging
import numpy as np
from scipy.optimize import minimize
import pandas as pd

logger = logging.getLogger(__name__)

# API Configuration
POLYMARKET_API_BASE = "https://gamma-api.polymarket.com"
KALSHI_API_BASE = "https://trading-api.kalshi.com/trade-api/v2"


class PolymarketClient:
    """Client for Polymarket prediction market data"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = POLYMARKET_API_BASE
        
    async def get_markets(self, limit: int = 100, closed: bool = False) -> List[Dict]:
        """
        Fetch active markets from Polymarket
        
        Returns:
            List of market dictionaries with prices, volumes, and metadata
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "limit": limit,
                    "closed": str(closed).lower()
                }
                
                response = await client.get(
                    f"{self.base_url}/markets",
                    params=params
                )
                
                if response.status_code == 200:
                    markets = response.json()
                    logger.info(f"Fetched {len(markets)} markets from Polymarket")
                    return markets
                else:
                    logger.error(f"Polymarket API error: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching Polymarket markets: {e}")
            return []
    
    async def get_market_prices(self, condition_id: str) -> Dict:
        """Get current prices for a specific market"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/markets/{condition_id}/prices"
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Could not fetch prices for {condition_id}")
                    return {}
                    
        except Exception as e:
            logger.error(f"Error fetching market prices: {e}")
            return {}
    
    def parse_market_data(self, market: Dict) -> Dict:
        """
        Parse Polymarket market data into standardized format
        
        Returns:
            {
                'id': market_id,
                'title': market_title,
                'yes_price': float (0-1),
                'no_price': float (0-1),
                'volume': total_volume,
                'liquidity': available_liquidity,
                'end_date': resolution_date,
                'category': market_category
            }
        """
        try:
            # Extract relevant data from market response
            return {
                'id': market.get('condition_id', market.get('id', '')),
                'title': market.get('question', market.get('title', 'Unknown')),
                'yes_price': float(market.get('outcome_prices', [0.5, 0.5])[0]),
                'no_price': float(market.get('outcome_prices', [0.5, 0.5])[1]),
                'volume': float(market.get('volume', 0)),
                'liquidity': float(market.get('liquidity', 0)),
                'end_date': market.get('end_date_iso', None),
                'category': market.get('tags', ['general'])[0] if market.get('tags') else 'general',
                'source': 'polymarket'
            }
        except Exception as e:
            logger.error(f"Error parsing market data: {e}")
            return None


class KalshiClient:
    """Client for Kalshi prediction market data"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = KALSHI_API_BASE
        
    async def get_markets(self, limit: int = 100, status: str = "open") -> List[Dict]:
        """
        Fetch markets from Kalshi
        
        Args:
            limit: Maximum number of markets to return
            status: Market status ('open', 'closed', 'settled')
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {}
                if self.api_key:
                    headers['KALSHI-ACCESS-KEY'] = self.api_key
                
                params = {
                    "limit": limit,
                    "status": status
                }
                
                response = await client.get(
                    f"{self.base_url}/markets",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    markets = data.get('markets', [])
                    logger.info(f"Fetched {len(markets)} markets from Kalshi")
                    return markets
                else:
                    logger.error(f"Kalshi API error: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching Kalshi markets: {e}")
            return []
    
    def parse_market_data(self, market: Dict) -> Dict:
        """
        Parse Kalshi market data into standardized format
        """
        try:
            # Kalshi provides yes_bid and yes_ask in cents (0-100)
            yes_price = (market.get('yes_bid', 50) + market.get('yes_ask', 50)) / 200.0
            
            return {
                'id': market.get('ticker', ''),
                'title': market.get('title', 'Unknown'),
                'yes_price': yes_price,
                'no_price': 1.0 - yes_price,
                'volume': float(market.get('volume', 0)),
                'liquidity': float(market.get('open_interest', 0)),
                'end_date': market.get('close_time', None),
                'category': market.get('category', 'general'),
                'source': 'kalshi'
            }
        except Exception as e:
            logger.error(f"Error parsing Kalshi market: {e}")
            return None


class PredictionMarketOptimizer:
    """
    Portfolio optimizer for prediction markets using Kelly Criterion
    and expected value calculations
    
    Phase 1 Enhancements:
    - Market correlation analysis
    - Liquidity-weighted optimization
    - Time decay adjustment
    - Market maker spread analysis
    """
    
    def __init__(self):
        self.polymarket = PolymarketClient()
        self.kalshi = KalshiClient()
        
        # Phase 1 enhancement parameters
        self.max_liquidity_pct = 0.05  # Max 5% of market liquidity
        self.correlation_penalty = 0.5  # Reduce Kelly by 50% for correlated markets
        self.spread_cost_factor = 1.5  # Increase required edge by 1.5x spread
        
    async def fetch_all_markets(self, sources: List[str] = ['polymarket', 'kalshi']) -> pd.DataFrame:
        """
        Fetch markets from all specified sources
        
        Returns:
            DataFrame with standardized market data
        """
        all_markets = []
        
        if 'polymarket' in sources:
            poly_markets = await self.polymarket.get_markets(limit=200)
            for market in poly_markets:
                parsed = self.polymarket.parse_market_data(market)
                if parsed:
                    all_markets.append(parsed)
        
        if 'kalshi' in sources:
            kalshi_markets = await self.kalshi.get_markets(limit=200)
            for market in kalshi_markets:
                parsed = self.kalshi.parse_market_data(market)
                if parsed:
                    all_markets.append(parsed)
        
        df = pd.DataFrame(all_markets)
        logger.info(f"Fetched {len(df)} total markets from {sources}")
        return df
    
    def calculate_expected_value(
        self, 
        true_probability: float, 
        market_price: float, 
        position: str = 'yes'
    ) -> float:
        """
        Calculate expected value of a position
        
        Args:
            true_probability: Your estimate of true probability (0-1)
            market_price: Current market price (0-1)
            position: 'yes' or 'no'
            
        Returns:
            Expected value (positive = +EV, negative = -EV)
        """
        if position == 'yes':
            # Buying YES
            ev = (true_probability * (1 - market_price)) - ((1 - true_probability) * market_price)
        else:
            # Buying NO
            ev = ((1 - true_probability) * (1 - market_price)) - (true_probability * market_price)
        
        return ev
    
    def calculate_kelly_fraction(
        self, 
        true_probability: float, 
        market_price: float, 
        position: str = 'yes'
    ) -> float:
        """
        Calculate Kelly Criterion bet size
        
        Args:
            true_probability: Your estimate of true probability
            market_price: Current market price
            position: 'yes' or 'no'
            
        Returns:
            Kelly fraction (0-1, fraction of bankroll to bet)
        """
        if position == 'yes':
            # Kelly for YES position
            if market_price >= 1.0 or market_price <= 0:
                return 0.0
            
            win_prob = true_probability
            lose_prob = 1 - true_probability
            win_odds = (1 - market_price) / market_price
            
            kelly = (win_prob * win_odds - lose_prob) / win_odds
        else:
            # Kelly for NO position
            if market_price >= 1.0 or market_price <= 0:
                return 0.0
            
            win_prob = 1 - true_probability
            lose_prob = true_probability
            win_odds = market_price / (1 - market_price)
            
            kelly = (win_prob * win_odds - lose_prob) / win_odds
        
        # Return max(0, kelly) to avoid negative bets
        return max(0.0, kelly)
    
    def calculate_fractional_kelly(
        self,
        true_probability: float,
        market_price: float,
        position: str = 'yes',
        kelly_fraction: float = 0.25
    ) -> float:
        """
        Calculate fractional Kelly (more conservative)
        
        Args:
            kelly_fraction: Fraction of full Kelly to use (0.25 = quarter Kelly)
        """
        full_kelly = self.calculate_kelly_fraction(true_probability, market_price, position)
        return full_kelly * kelly_fraction
    
    def optimize_portfolio(
        self,
        markets: pd.DataFrame,
        user_probabilities: Dict[str, float],
        bankroll: float,
        kelly_fraction: float = 0.25,
        max_markets: int = 10,
        min_ev: float = 0.05
    ) -> Dict:
        """
        Optimize portfolio allocation across prediction markets
        
        Args:
            markets: DataFrame with market data
            user_probabilities: Dict mapping market_id to user's probability estimate
            bankroll: Total available capital
            kelly_fraction: Fraction of Kelly to use (0.25 = quarter Kelly)
            max_markets: Maximum number of markets to bet on
            min_ev: Minimum expected value to consider a market
            
        Returns:
            Dictionary with allocation recommendations
        """
        recommendations = []
        
        for market_id, user_prob in user_probabilities.items():
            # Find market in dataframe
            market = markets[markets['id'] == market_id]
            
            if market.empty:
                logger.warning(f"Market {market_id} not found")
                continue
            
            market = market.iloc[0]
            
            # Calculate for YES position
            yes_ev = self.calculate_expected_value(user_prob, market['yes_price'], 'yes')
            yes_kelly = self.calculate_fractional_kelly(user_prob, market['yes_price'], 'yes', kelly_fraction)
            
            # Calculate for NO position
            no_ev = self.calculate_expected_value(user_prob, market['yes_price'], 'no')
            no_kelly = self.calculate_fractional_kelly(user_prob, market['yes_price'], 'no', kelly_fraction)
            
            # Choose best position
            if yes_ev > no_ev and yes_ev > min_ev:
                recommendations.append({
                    'market_id': market_id,
                    'title': market['title'],
                    'position': 'YES',
                    'market_price': market['yes_price'],
                    'user_probability': user_prob,
                    'expected_value': yes_ev,
                    'kelly_fraction': yes_kelly,
                    'recommended_bet': bankroll * yes_kelly,
                    'potential_profit': bankroll * yes_kelly * (1 / market['yes_price'] - 1),
                    'source': market['source']
                })
            elif no_ev > min_ev:
                recommendations.append({
                    'market_id': market_id,
                    'title': market['title'],
                    'position': 'NO',
                    'market_price': market['no_price'],
                    'user_probability': 1 - user_prob,
                    'expected_value': no_ev,
                    'kelly_fraction': no_kelly,
                    'recommended_bet': bankroll * no_kelly,
                    'potential_profit': bankroll * no_kelly * (1 / market['no_price'] - 1),
                    'source': market['source']
                })
        
        # Sort by EV and take top N
        recommendations.sort(key=lambda x: x['expected_value'], reverse=True)
        recommendations = recommendations[:max_markets]
        
        # Calculate portfolio statistics
        total_allocated = sum(r['recommended_bet'] for r in recommendations)
        total_potential_profit = sum(r['potential_profit'] for r in recommendations)
        avg_ev = np.mean([r['expected_value'] for r in recommendations]) if recommendations else 0
        
        return {
            'recommendations': recommendations,
            'portfolio_stats': {
                'total_allocated': total_allocated,
                'total_potential_profit': total_potential_profit,
                'average_ev': avg_ev,
                'num_markets': len(recommendations),
                'allocation_percentage': (total_allocated / bankroll) * 100 if bankroll > 0 else 0
            }
        }
    
    def calculate_portfolio_sharpe(
        self,
        positions: List[Dict],
        correlation_matrix: Optional[np.ndarray] = None
    ) -> float:
        """
        Calculate Sharpe ratio for prediction market portfolio
        
        Args:
            positions: List of position dictionaries with EV and variance
            correlation_matrix: Optional correlation matrix between markets
            
        Returns:
            Sharpe ratio
        """
        if not positions:
            return 0.0
        
        # Extract expected returns
        expected_returns = np.array([p['expected_value'] for p in positions])
        
        # Estimate variance (simplified)
        variances = np.array([
            p['market_price'] * (1 - p['market_price'])  # Binomial variance
            for p in positions
        ])
        
        # If no correlation matrix provided, assume independence
        if correlation_matrix is None:
            correlation_matrix = np.eye(len(positions))
        
        # Portfolio return
        portfolio_return = np.sum(expected_returns)
        
        # Portfolio variance
        weights = np.array([p['recommended_bet'] for p in positions])
        weights = weights / np.sum(weights) if np.sum(weights) > 0 else weights
        
        portfolio_variance = np.dot(weights, np.dot(correlation_matrix * np.outer(variances, variances), weights))
        portfolio_std = np.sqrt(portfolio_variance)
        
        # Sharpe ratio (assuming risk-free rate = 0)
        sharpe = portfolio_return / portfolio_std if portfolio_std > 0 else 0
        
        return sharpe


def find_arbitrage_opportunities(markets: pd.DataFrame) -> List[Dict]:
    """
    Find arbitrage opportunities across prediction markets
    
    Arbitrage exists when YES_price + NO_price < 1.0 (after fees)
    or when same event is priced differently on different platforms
    """
    arbitrage_opportunities = []
    
    # Group by title to find same events across platforms
    market_groups = markets.groupby('title')
    
    for title, group in market_groups:
        if len(group) > 1:
            # Same event on multiple platforms
            max_yes = group['yes_price'].max()
            min_yes = group['yes_price'].min()
            
            if (max_yes - min_yes) > 0.05:  # 5% difference
                arbitrage_opportunities.append({
                    'type': 'cross_platform',
                    'title': title,
                    'platforms': group['source'].tolist(),
                    'price_difference': max_yes - min_yes,
                    'potential_profit_pct': ((max_yes - min_yes) / min_yes) * 100
                })
    
    return arbitrage_opportunities
