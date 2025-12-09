"""
API Routes for Prediction Market Portfolio Optimization
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging
from prediction_markets import (
    PredictionMarketOptimizer,
    find_arbitrage_opportunities
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic Models
class MarketProbabilityInput(BaseModel):
    """User's probability estimate for a market"""
    market_id: str = Field(..., description="Market identifier")
    probability: float = Field(..., ge=0.0, le=1.0, description="Probability estimate (0-1)")

class PortfolioOptimizationRequest(BaseModel):
    """Request for portfolio optimization"""
    markets: List[MarketProbabilityInput] = Field(..., description="List of markets with user probabilities")
    bankroll: float = Field(..., gt=0, description="Total available capital")
    kelly_fraction: float = Field(default=0.25, ge=0.0, le=1.0, description="Kelly fraction (0.25 = quarter Kelly)")
    max_markets: int = Field(default=10, ge=1, le=50, description="Maximum markets to bet on")
    min_ev: float = Field(default=0.05, ge=0.0, description="Minimum expected value threshold")

class MarketSearchRequest(BaseModel):
    """Request to search markets"""
    sources: List[str] = Field(default=['polymarket', 'kalshi'], description="Market sources to search")
    category: Optional[str] = Field(None, description="Filter by category")
    min_volume: Optional[float] = Field(None, description="Minimum volume filter")
    limit: int = Field(default=100, ge=1, le=500, description="Maximum markets to return")


@router.get("/markets")
async def get_markets(
    sources: str = Query("polymarket,kalshi", description="Comma-separated market sources"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_volume: Optional[float] = Query(None, description="Minimum volume"),
    limit: int = Query(100, ge=1, le=500, description="Max markets to return")
):
    """
    Fetch active prediction markets from Polymarket and/or Kalshi
    
    Example: GET /api/prediction-markets/markets?sources=polymarket&limit=50
    """
    try:
        optimizer = PredictionMarketOptimizer()
        source_list = [s.strip() for s in sources.split(',')]
        
        # Fetch markets
        markets_df = await optimizer.fetch_all_markets(sources=source_list)
        
        if markets_df.empty:
            return {
                "markets": [],
                "total": 0,
                "message": "No markets found"
            }
        
        # Apply filters
        if category:
            markets_df = markets_df[markets_df['category'] == category]
        
        if min_volume:
            markets_df = markets_df[markets_df['volume'] >= min_volume]
        
        # Limit results
        markets_df = markets_df.head(limit)
        
        # Convert to JSON
        markets_list = markets_df.to_dict('records')
        
        return {
            "markets": markets_list,
            "total": len(markets_list),
            "sources": source_list,
            "filters_applied": {
                "category": category,
                "min_volume": min_volume
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching markets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize")
async def optimize_portfolio(request: PortfolioOptimizationRequest):
    """
    Optimize portfolio allocation across prediction markets using Kelly Criterion
    
    Request body:
    {
        "markets": [
            {"market_id": "0x123abc", "probability": 0.65},
            {"market_id": "0x456def", "probability": 0.72}
        ],
        "bankroll": 10000,
        "kelly_fraction": 0.25,
        "max_markets": 10,
        "min_ev": 0.05
    }
    
    Returns optimized portfolio with bet sizes and expected values
    """
    try:
        optimizer = PredictionMarketOptimizer()
        
        # Fetch current market data
        markets_df = await optimizer.fetch_all_markets()
        
        if markets_df.empty:
            raise HTTPException(status_code=404, detail="No markets available")
        
        # Convert user probabilities to dict
        user_probs = {m.market_id: m.probability for m in request.markets}
        
        # Optimize portfolio
        result = optimizer.optimize_portfolio(
            markets=markets_df,
            user_probabilities=user_probs,
            bankroll=request.bankroll,
            kelly_fraction=request.kelly_fraction,
            max_markets=request.max_markets,
            min_ev=request.min_ev
        )
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "portfolio": result,
            "parameters": {
                "bankroll": request.bankroll,
                "kelly_fraction": request.kelly_fraction,
                "max_markets": request.max_markets,
                "min_ev": request.min_ev
            }
        }
    
    except Exception as e:
        logger.error(f"Portfolio optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate-ev")
async def calculate_expected_value(
    true_probability: float = Query(..., ge=0.0, le=1.0, description="Your probability estimate"),
    market_price: float = Query(..., ge=0.0, le=1.0, description="Current market price"),
    position: str = Query("yes", description="Position type: yes or no")
):
    """
    Calculate expected value for a single position
    
    Example: POST /api/prediction-markets/calculate-ev?true_probability=0.65&market_price=0.50&position=yes
    """
    try:
        optimizer = PredictionMarketOptimizer()
        
        ev = optimizer.calculate_expected_value(
            true_probability=true_probability,
            market_price=market_price,
            position=position.lower()
        )
        
        kelly = optimizer.calculate_kelly_fraction(
            true_probability=true_probability,
            market_price=market_price,
            position=position.lower()
        )
        
        return {
            "expected_value": round(ev, 4),
            "kelly_fraction": round(kelly, 4),
            "quarter_kelly": round(kelly * 0.25, 4),
            "half_kelly": round(kelly * 0.5, 4),
            "is_positive_ev": ev > 0,
            "interpretation": {
                "ev": "Positive EV - Good bet!" if ev > 0 else "Negative EV - Avoid!",
                "kelly": f"Bet {kelly*100:.1f}% of bankroll" if kelly > 0 else "No bet recommended"
            }
        }
    
    except Exception as e:
        logger.error(f"EV calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate-kelly")
async def calculate_kelly_bet_size(
    true_probability: float = Query(..., ge=0.0, le=1.0),
    market_price: float = Query(..., ge=0.0, le=1.0),
    bankroll: float = Query(..., gt=0),
    position: str = Query("yes"),
    kelly_fraction: float = Query(0.25, ge=0.0, le=1.0, description="Fraction of full Kelly")
):
    """
    Calculate Kelly Criterion bet size
    
    Returns recommended bet amount in dollars
    """
    try:
        optimizer = PredictionMarketOptimizer()
        
        kelly = optimizer.calculate_fractional_kelly(
            true_probability=true_probability,
            market_price=market_price,
            position=position.lower(),
            kelly_fraction=kelly_fraction
        )
        
        bet_amount = bankroll * kelly
        
        # Calculate potential outcomes
        if position.lower() == 'yes':
            potential_win = bet_amount * (1 / market_price - 1)
            potential_loss = bet_amount
        else:
            potential_win = bet_amount * (1 / (1 - market_price) - 1)
            potential_loss = bet_amount
        
        return {
            "kelly_fraction": round(kelly, 4),
            "recommended_bet": round(bet_amount, 2),
            "potential_win": round(potential_win, 2),
            "potential_loss": round(potential_loss, 2),
            "risk_reward_ratio": round(potential_win / potential_loss, 2) if potential_loss > 0 else 0,
            "bankroll_percentage": round(kelly * 100, 2)
        }
    
    except Exception as e:
        logger.error(f"Kelly calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/arbitrage")
async def find_arbitrage():
    """
    Find arbitrage opportunities across prediction markets
    
    Returns markets with significant price discrepancies
    """
    try:
        optimizer = PredictionMarketOptimizer()
        
        # Fetch markets from all sources
        markets_df = await optimizer.fetch_all_markets()
        
        if markets_df.empty:
            return {
                "opportunities": [],
                "total": 0,
                "message": "No markets available for arbitrage analysis"
            }
        
        # Find arbitrage opportunities
        opportunities = find_arbitrage_opportunities(markets_df)
        
        return {
            "opportunities": opportunities,
            "total": len(opportunities),
            "timestamp": datetime.now().isoformat(),
            "note": "Arbitrage opportunities account for price differences but not fees or slippage"
        }
    
    except Exception as e:
        logger.error(f"Arbitrage search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market/{market_id}")
async def get_market_details(
    market_id: str,
    source: str = Query("polymarket", description="Market source: polymarket or kalshi")
):
    """
    Get detailed information about a specific market
    """
    try:
        optimizer = PredictionMarketOptimizer()
        
        # Fetch all markets
        markets_df = await optimizer.fetch_all_markets(sources=[source])
        
        # Find specific market
        market = markets_df[markets_df['id'] == market_id]
        
        if market.empty:
            raise HTTPException(status_code=404, detail=f"Market {market_id} not found on {source}")
        
        market_data = market.iloc[0].to_dict()
        
        # Add calculated metrics
        mid_price = (market_data['yes_price'] + market_data['no_price']) / 2
        spread = abs(market_data['yes_price'] - market_data['no_price'])
        
        return {
            "market": market_data,
            "metrics": {
                "mid_price": round(mid_price, 4),
                "spread": round(spread, 4),
                "implied_probability_yes": round(market_data['yes_price'], 4),
                "implied_probability_no": round(market_data['no_price'], 4)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching market details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_market_categories():
    """
    Get list of available market categories
    """
    try:
        optimizer = PredictionMarketOptimizer()
        markets_df = await optimizer.fetch_all_markets()
        
        if markets_df.empty:
            return {"categories": [], "total": 0}
        
        categories = markets_df['category'].unique().tolist()
        category_counts = markets_df['category'].value_counts().to_dict()
        
        return {
            "categories": categories,
            "total": len(categories),
            "category_counts": category_counts
        }
    
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))
