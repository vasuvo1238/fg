"""
Trading Bot API Routes
Morning reports, portfolio management, scheduling
"""

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, time
import io
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.morning_bot import (
    generate_morning_report,
    format_report_text,
    get_futures_data,
    get_global_markets,
    get_crypto_data,
    get_sector_performance,
    get_gap_scanners,
    get_economic_calendar
)
from services.portfolio_service import (
    add_position,
    update_position,
    close_position,
    get_positions,
    get_portfolio_analysis,
    get_position_alerts,
    connect_broker,
    set_database as set_portfolio_db
)
from services.report_generator import (
    generate_morning_report_pdf,
    get_report_as_base64
)

trading_router = APIRouter(prefix="/trading", tags=["Trading Bot"])

# Database reference
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database
    set_portfolio_db(database)

# Pydantic Models
class PositionCreate(BaseModel):
    symbol: str
    quantity: float
    entry_price: float
    entry_date: Optional[datetime] = None
    position_type: str = "long"
    notes: Optional[str] = None

class PositionUpdate(BaseModel):
    quantity: Optional[float] = None
    entry_price: Optional[float] = None
    notes: Optional[str] = None

class PositionClose(BaseModel):
    exit_price: float
    exit_date: Optional[datetime] = None

class BrokerConnect(BaseModel):
    broker: str
    api_key: str
    secret_key: str
    paper: bool = True

class ScheduleConfig(BaseModel):
    enabled: bool = True
    time_utc: str = "11:00"  # 6 AM EST = 11:00 UTC
    days: List[str] = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    include_crypto_weekends: bool = True
    delivery_methods: List[str] = ["push", "email"]

# Helper
async def get_user_from_request(request: Request) -> dict:
    from routes.auth import get_current_user
    return await get_current_user(request)


# ==================== MORNING REPORT ====================

@trading_router.get("/morning-report")
async def get_morning_report(request: Request, include_portfolio: bool = True):
    """Generate morning trading report"""
    user = await get_user_from_request(request)
    
    report = await generate_morning_report(
        user_id=user["user_id"],
        include_portfolio=include_portfolio
    )
    
    # Add portfolio analysis if requested
    if include_portfolio:
        portfolio = await get_portfolio_analysis(user["user_id"])
        report["portfolio"] = portfolio
        report["position_alerts"] = await get_position_alerts(user["user_id"])
    
    return report

@trading_router.get("/morning-report/text")
async def get_morning_report_text(request: Request):
    """Get morning report as formatted text"""
    user = await get_user_from_request(request)
    report = await generate_morning_report(user_id=user["user_id"])
    return {"text": format_report_text(report)}

@trading_router.get("/morning-report/pdf")
async def download_morning_report_pdf(request: Request):
    """Download morning report as PDF"""
    user = await get_user_from_request(request)
    report = await generate_morning_report(user_id=user["user_id"])
    
    # Add portfolio
    portfolio = await get_portfolio_analysis(user["user_id"])
    report["portfolio"] = portfolio
    
    pdf_bytes = generate_morning_report_pdf(report)
    
    filename = f"morning_report_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@trading_router.get("/morning-report/base64")
async def get_morning_report_base64(request: Request):
    """Get morning report PDF as base64 (for mobile apps)"""
    user = await get_user_from_request(request)
    report = await generate_morning_report(user_id=user["user_id"])
    
    portfolio = await get_portfolio_analysis(user["user_id"])
    report["portfolio"] = portfolio
    
    base64_pdf = get_report_as_base64(report)
    
    return {
        "filename": f"morning_report_{datetime.now().strftime('%Y%m%d')}.pdf",
        "content_type": "application/pdf",
        "data": base64_pdf
    }


# ==================== MARKET DATA ====================

@trading_router.get("/futures")
async def get_futures():
    """Get current futures data"""
    return get_futures_data()

@trading_router.get("/global-markets")
async def get_global():
    """Get global market indices"""
    return get_global_markets()

@trading_router.get("/crypto")
async def get_crypto():
    """Get cryptocurrency data"""
    return get_crypto_data()

@trading_router.get("/sectors")
async def get_sectors():
    """Get sector performance"""
    return get_sector_performance()

@trading_router.get("/gap-scanners")
async def get_gaps(min_gap: float = 2.0, limit: int = 20):
    """Get stocks gapping up/down"""
    return get_gap_scanners(min_gap_percent=min_gap, limit=limit)

@trading_router.get("/economic-calendar")
async def get_economic():
    """Get today's economic events"""
    return {"events": get_economic_calendar(), "date": datetime.now(timezone.utc).date().isoformat()}


# ==================== PORTFOLIO MANAGEMENT ====================

@trading_router.post("/positions")
async def create_position(request: Request, position: PositionCreate):
    """Add a new position"""
    user = await get_user_from_request(request)
    
    result = await add_position(
        user_id=user["user_id"],
        symbol=position.symbol,
        quantity=position.quantity,
        entry_price=position.entry_price,
        entry_date=position.entry_date,
        position_type=position.position_type,
        notes=position.notes
    )
    
    return result

@trading_router.get("/positions")
async def list_positions(request: Request, status: str = "open"):
    """Get all positions"""
    user = await get_user_from_request(request)
    positions = await get_positions(user["user_id"], status=status)
    return {"positions": positions, "count": len(positions)}

@trading_router.get("/positions/{position_id}")
async def get_position(request: Request, position_id: str):
    """Get a specific position"""
    user = await get_user_from_request(request)
    
    position = await db.trading_positions.find_one(
        {"position_id": position_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    return position

@trading_router.put("/positions/{position_id}")
async def modify_position(request: Request, position_id: str, update: PositionUpdate):
    """Update a position"""
    user = await get_user_from_request(request)
    
    result = await update_position(
        user_id=user["user_id"],
        position_id=position_id,
        quantity=update.quantity,
        entry_price=update.entry_price,
        notes=update.notes
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@trading_router.post("/positions/{position_id}/close")
async def close_position_route(request: Request, position_id: str, close_data: PositionClose):
    """Close a position"""
    user = await get_user_from_request(request)
    
    result = await close_position(
        user_id=user["user_id"],
        position_id=position_id,
        exit_price=close_data.exit_price,
        exit_date=close_data.exit_date
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@trading_router.delete("/positions/{position_id}")
async def delete_position(request: Request, position_id: str):
    """Delete a position (only if closed)"""
    user = await get_user_from_request(request)
    
    result = await db.trading_positions.delete_one({
        "position_id": position_id,
        "user_id": user["user_id"],
        "status": "closed"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Position not found or still open")
    
    return {"status": "deleted"}


# ==================== PORTFOLIO ANALYSIS ====================

@trading_router.get("/portfolio/analysis")
async def analyze_portfolio(request: Request):
    """Get comprehensive portfolio analysis"""
    user = await get_user_from_request(request)
    return await get_portfolio_analysis(user["user_id"])

@trading_router.get("/portfolio/alerts")
async def get_alerts(request: Request):
    """Get position alerts"""
    user = await get_user_from_request(request)
    return {"alerts": await get_position_alerts(user["user_id"])}


# ==================== BROKER INTEGRATION ====================

@trading_router.post("/broker/connect")
async def connect_broker_account(request: Request, broker_data: BrokerConnect):
    """Connect a broker account"""
    user = await get_user_from_request(request)
    
    result = await connect_broker(
        user_id=user["user_id"],
        broker=broker_data.broker,
        api_key=broker_data.api_key,
        secret_key=broker_data.secret_key,
        paper=broker_data.paper
    )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    return result

@trading_router.get("/broker/status")
async def get_broker_status(request: Request):
    """Get broker connection status"""
    user = await get_user_from_request(request)
    
    connection = await db.broker_connections.find_one(
        {"user_id": user["user_id"], "status": "active"},
        {"_id": 0, "api_key": 0, "secret_key": 0}
    )
    
    return {"connected": connection is not None, "broker": connection}

@trading_router.delete("/broker/disconnect")
async def disconnect_broker(request: Request):
    """Disconnect broker account"""
    user = await get_user_from_request(request)
    
    await db.broker_connections.update_many(
        {"user_id": user["user_id"]},
        {"$set": {"status": "disconnected"}}
    )
    
    return {"status": "disconnected"}


# ==================== SCHEDULING ====================

@trading_router.get("/schedule")
async def get_schedule(request: Request):
    """Get user's report schedule"""
    user = await get_user_from_request(request)
    
    schedule = await db.report_schedules.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not schedule:
        schedule = {
            "enabled": False,
            "time_utc": "11:00",
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "include_crypto_weekends": True,
            "delivery_methods": ["push"]
        }
    
    return schedule

@trading_router.put("/schedule")
async def update_schedule(request: Request, config: ScheduleConfig):
    """Update report schedule"""
    user = await get_user_from_request(request)
    
    await db.report_schedules.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "user_id": user["user_id"],
            "enabled": config.enabled,
            "time_utc": config.time_utc,
            "days": config.days,
            "include_crypto_weekends": config.include_crypto_weekends,
            "delivery_methods": config.delivery_methods,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"status": "updated", "schedule": config.dict()}


# ==================== VOICE COMMANDS ====================

@trading_router.post("/voice/command")
async def process_voice_command(request: Request, command: dict):
    """Process a voice command"""
    user = await get_user_from_request(request)
    
    text = command.get("text", "").lower()
    
    # Parse command
    if "morning report" in text or "daily report" in text:
        report = await generate_morning_report(user_id=user["user_id"])
        return {
            "action": "morning_report",
            "response": "Here's your morning report.",
            "data": report
        }
    
    elif "portfolio" in text or "positions" in text:
        portfolio = await get_portfolio_analysis(user["user_id"])
        total_pnl = portfolio.get("total_pnl", 0)
        pnl_text = f"up ${total_pnl:.2f}" if total_pnl > 0 else f"down ${abs(total_pnl):.2f}"
        
        return {
            "action": "portfolio_summary",
            "response": f"Your portfolio is {pnl_text} today with {portfolio.get('total_positions', 0)} open positions.",
            "data": portfolio
        }
    
    elif "futures" in text or "pre-market" in text:
        futures = get_futures_data()
        sp_change = futures.get("ES=F", {}).get("change_percent", 0)
        direction = "up" if sp_change > 0 else "down"
        
        return {
            "action": "futures_summary",
            "response": f"S&P futures are {direction} {abs(sp_change):.1f}% in pre-market.",
            "data": futures
        }
    
    elif "alerts" in text:
        alerts = await get_position_alerts(user["user_id"])
        return {
            "action": "alerts",
            "response": f"You have {len(alerts)} position alerts.",
            "data": alerts
        }
    
    else:
        return {
            "action": "unknown",
            "response": "I can help you with: morning report, portfolio summary, futures, or alerts.",
            "suggestions": ["Get morning report", "Check my portfolio", "Show pre-market futures", "Any alerts?"]
        }
