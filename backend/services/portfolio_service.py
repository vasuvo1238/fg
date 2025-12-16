"""
Portfolio Management System
Supports manual positions and broker API integration
"""

import yfinance as yf
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

logger = logging.getLogger(__name__)

# Database reference
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database


class Position:
    """Represents a trading position"""
    def __init__(
        self,
        symbol: str,
        quantity: float,
        entry_price: float,
        entry_date: datetime,
        position_type: str = "long",  # "long" or "short"
        notes: str = None
    ):
        self.symbol = symbol.upper()
        self.quantity = quantity
        self.entry_price = entry_price
        self.entry_date = entry_date
        self.position_type = position_type
        self.notes = notes
        
    def to_dict(self):
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "entry_price": self.entry_price,
            "entry_date": self.entry_date.isoformat(),
            "position_type": self.position_type,
            "notes": self.notes
        }


async def add_position(
    user_id: str,
    symbol: str,
    quantity: float,
    entry_price: float,
    entry_date: datetime = None,
    position_type: str = "long",
    notes: str = None
) -> Dict:
    """Add a new position to user's portfolio"""
    
    position_id = f"pos_{uuid.uuid4().hex[:12]}"
    
    position = {
        "position_id": position_id,
        "user_id": user_id,
        "symbol": symbol.upper(),
        "quantity": quantity,
        "entry_price": entry_price,
        "entry_date": (entry_date or datetime.now(timezone.utc)).isoformat() if isinstance(entry_date, datetime) else str(entry_date) if entry_date else datetime.now(timezone.utc).isoformat(),
        "position_type": position_type,
        "notes": notes,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.trading_positions.insert_one(position)
    
    # Return without _id
    position_response = {k: v for k, v in position.items() if k != '_id'}
    
    return {"position_id": position_id, "status": "created", "position": position_response}


async def update_position(
    user_id: str,
    position_id: str,
    quantity: float = None,
    entry_price: float = None,
    notes: str = None
) -> Dict:
    """Update an existing position"""
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    if quantity is not None:
        update_fields["quantity"] = quantity
    if entry_price is not None:
        update_fields["entry_price"] = entry_price
    if notes is not None:
        update_fields["notes"] = notes
    
    result = await db.trading_positions.update_one(
        {"position_id": position_id, "user_id": user_id, "status": "open"},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        return {"error": "Position not found or already closed"}
    
    return {"status": "updated"}


async def close_position(
    user_id: str,
    position_id: str,
    exit_price: float,
    exit_date: datetime = None
) -> Dict:
    """Close a position"""
    
    # Get the position
    position = await db.trading_positions.find_one(
        {"position_id": position_id, "user_id": user_id, "status": "open"},
        {"_id": 0}
    )
    
    if not position:
        return {"error": "Position not found or already closed"}
    
    # Calculate P&L
    entry_price = position["entry_price"]
    quantity = position["quantity"]
    position_type = position["position_type"]
    
    if position_type == "long":
        pnl = (exit_price - entry_price) * quantity
        pnl_percent = ((exit_price - entry_price) / entry_price) * 100
    else:  # short
        pnl = (entry_price - exit_price) * quantity
        pnl_percent = ((entry_price - exit_price) / entry_price) * 100
    
    # Update position
    await db.trading_positions.update_one(
        {"position_id": position_id},
        {"$set": {
            "status": "closed",
            "exit_price": exit_price,
            "exit_date": exit_date or datetime.now(timezone.utc),
            "realized_pnl": round(pnl, 2),
            "realized_pnl_percent": round(pnl_percent, 2),
            "closed_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "status": "closed",
        "realized_pnl": round(pnl, 2),
        "realized_pnl_percent": round(pnl_percent, 2)
    }


async def get_positions(user_id: str, status: str = "open") -> List[Dict]:
    """Get user's positions"""
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    positions = await db.trading_positions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return positions


async def get_portfolio_analysis(user_id: str) -> Dict:
    """Get comprehensive portfolio analysis with current prices"""
    
    positions = await get_positions(user_id, status="open")
    
    if not positions:
        return {
            "total_positions": 0,
            "total_value": 0,
            "total_cost": 0,
            "total_pnl": 0,
            "total_pnl_percent": 0,
            "positions": [],
            "sector_allocation": {},
            "risk_metrics": {}
        }
    
    enriched_positions = []
    total_value = 0
    total_cost = 0
    sector_values = {}
    
    for pos in positions:
        try:
            ticker = yf.Ticker(pos["symbol"])
            info = ticker.info
            current_price = info.get("regularMarketPrice", pos["entry_price"])
            
            # Calculate P&L
            entry_price = pos["entry_price"]
            quantity = pos["quantity"]
            position_type = pos["position_type"]
            
            cost_basis = entry_price * quantity
            current_value = current_price * quantity
            
            if position_type == "long":
                unrealized_pnl = current_value - cost_basis
            else:
                unrealized_pnl = cost_basis - current_value
            
            pnl_percent = (unrealized_pnl / cost_basis) * 100 if cost_basis else 0
            
            # Get sector
            sector = info.get("sector", "Unknown")
            sector_values[sector] = sector_values.get(sector, 0) + current_value
            
            enriched_pos = {
                **pos,
                "current_price": round(current_price, 2),
                "current_value": round(current_value, 2),
                "cost_basis": round(cost_basis, 2),
                "unrealized_pnl": round(unrealized_pnl, 2),
                "unrealized_pnl_percent": round(pnl_percent, 2),
                "sector": sector,
                "company_name": info.get("shortName", pos["symbol"]),
                "day_change": info.get("regularMarketChangePercent", 0),
                "52w_high": info.get("fiftyTwoWeekHigh"),
                "52w_low": info.get("fiftyTwoWeekLow")
            }
            
            enriched_positions.append(enriched_pos)
            total_value += current_value
            total_cost += cost_basis
            
        except Exception as e:
            logger.error(f"Error fetching data for {pos['symbol']}: {e}")
            enriched_positions.append({**pos, "error": str(e)})
    
    total_pnl = total_value - total_cost
    total_pnl_percent = (total_pnl / total_cost * 100) if total_cost else 0
    
    # Sector allocation percentages
    sector_allocation = {}
    for sector, value in sector_values.items():
        sector_allocation[sector] = {
            "value": round(value, 2),
            "percent": round((value / total_value * 100) if total_value else 0, 2)
        }
    
    # Risk metrics
    winners = [p for p in enriched_positions if p.get("unrealized_pnl", 0) > 0]
    losers = [p for p in enriched_positions if p.get("unrealized_pnl", 0) < 0]
    
    risk_metrics = {
        "winning_positions": len(winners),
        "losing_positions": len(losers),
        "win_rate": round(len(winners) / len(enriched_positions) * 100 if enriched_positions else 0, 1),
        "largest_winner": max([p.get("unrealized_pnl", 0) for p in enriched_positions]) if enriched_positions else 0,
        "largest_loser": min([p.get("unrealized_pnl", 0) for p in enriched_positions]) if enriched_positions else 0,
        "avg_position_size": round(total_value / len(enriched_positions) if enriched_positions else 0, 2)
    }
    
    return {
        "total_positions": len(enriched_positions),
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_percent": round(total_pnl_percent, 2),
        "positions": sorted(enriched_positions, key=lambda x: x.get("unrealized_pnl", 0), reverse=True),
        "sector_allocation": sector_allocation,
        "risk_metrics": risk_metrics,
        "analysis_time": datetime.now(timezone.utc).isoformat()
    }


async def get_position_alerts(user_id: str) -> List[Dict]:
    """Generate alerts for positions (stop loss, take profit, news, etc.)"""
    
    portfolio = await get_portfolio_analysis(user_id)
    alerts = []
    
    for pos in portfolio.get("positions", []):
        symbol = pos.get("symbol")
        pnl_percent = pos.get("unrealized_pnl_percent", 0)
        current_price = pos.get("current_price", 0)
        high_52w = pos.get("52w_high", 0)
        low_52w = pos.get("52w_low", 0)
        
        # Large loss alert
        if pnl_percent < -10:
            alerts.append({
                "type": "stop_loss",
                "severity": "high",
                "symbol": symbol,
                "message": f"{symbol} is down {abs(pnl_percent):.1f}%. Consider reviewing stop-loss.",
                "action": "review"
            })
        
        # Large gain alert
        if pnl_percent > 20:
            alerts.append({
                "type": "take_profit",
                "severity": "medium",
                "symbol": symbol,
                "message": f"{symbol} is up {pnl_percent:.1f}%. Consider taking partial profits.",
                "action": "review"
            })
        
        # Near 52-week high
        if high_52w and current_price and (current_price / high_52w) > 0.95:
            alerts.append({
                "type": "near_high",
                "severity": "info",
                "symbol": symbol,
                "message": f"{symbol} is within 5% of 52-week high (${high_52w:.2f}).",
                "action": "monitor"
            })
        
        # Near 52-week low
        if low_52w and current_price and (current_price / low_52w) < 1.05:
            alerts.append({
                "type": "near_low",
                "severity": "warning",
                "symbol": symbol,
                "message": f"{symbol} is within 5% of 52-week low (${low_52w:.2f}).",
                "action": "review"
            })
    
    return alerts


# ==================== BROKER API INTEGRATION ====================

class AlpacaBroker:
    """Alpaca API integration for paper/live trading"""
    
    def __init__(self, api_key: str, secret_key: str, paper: bool = True):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = "https://paper-api.alpaca.markets" if paper else "https://api.alpaca.markets"
    
    async def get_account(self) -> Dict:
        """Get account information"""
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/account",
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.secret_key
                }
            )
            return response.json()
    
    async def get_positions(self) -> List[Dict]:
        """Get all positions from Alpaca"""
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/positions",
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.secret_key
                }
            )
            return response.json()
    
    async def sync_positions_to_db(self, user_id: str) -> Dict:
        """Sync Alpaca positions to local database"""
        
        positions = await self.get_positions()
        synced = 0
        
        for pos in positions:
            # Check if position exists
            existing = await db.trading_positions.find_one({
                "user_id": user_id,
                "symbol": pos["symbol"],
                "source": "alpaca",
                "status": "open"
            })
            
            if not existing:
                await db.trading_positions.insert_one({
                    "position_id": f"alp_{pos['asset_id'][:12]}",
                    "user_id": user_id,
                    "symbol": pos["symbol"],
                    "quantity": float(pos["qty"]),
                    "entry_price": float(pos["avg_entry_price"]),
                    "entry_date": datetime.now(timezone.utc),
                    "position_type": "long" if pos["side"] == "long" else "short",
                    "source": "alpaca",
                    "alpaca_id": pos["asset_id"],
                    "status": "open",
                    "created_at": datetime.now(timezone.utc)
                })
                synced += 1
        
        return {"synced": synced, "total_positions": len(positions)}


async def connect_broker(
    user_id: str,
    broker: str,
    api_key: str,
    secret_key: str,
    paper: bool = True
) -> Dict:
    """Connect a broker account"""
    
    # Validate credentials
    if broker == "alpaca":
        client = AlpacaBroker(api_key, secret_key, paper)
        try:
            account = await client.get_account()
            
            # Store connection
            await db.broker_connections.update_one(
                {"user_id": user_id, "broker": broker},
                {"$set": {
                    "user_id": user_id,
                    "broker": broker,
                    "api_key": api_key,  # In production, encrypt this
                    "secret_key": secret_key,  # In production, encrypt this
                    "paper": paper,
                    "account_id": account.get("id"),
                    "buying_power": account.get("buying_power"),
                    "connected_at": datetime.now(timezone.utc),
                    "status": "active"
                }},
                upsert=True
            )
            
            # Sync positions
            sync_result = await client.sync_positions_to_db(user_id)
            
            return {
                "status": "connected",
                "broker": broker,
                "account_id": account.get("id"),
                "buying_power": account.get("buying_power"),
                "positions_synced": sync_result["synced"]
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    return {"status": "error", "message": f"Broker {broker} not supported"}
