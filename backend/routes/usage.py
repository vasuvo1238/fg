"""
Usage Tracking System for FinTech Hub
Tracks API usage and enforces subscription limits
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

usage_router = APIRouter(prefix="/user", tags=["User & Usage"])

# Database reference (set from server.py)
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

# Subscription tier limits
TIER_LIMITS = {
    "free": {
        "daily_predictions": 5,
        "lstm_access": False,
        "options_builder": "basic",
        "crypto_coins": 10,
        "prediction_markets": "view_only",
        "price": 0
    },
    "basic": {
        "daily_predictions": 200,
        "lstm_access": False,
        "options_builder": "full",
        "crypto_coins": -1,  # unlimited
        "prediction_markets": "full",
        "price": 20
    },
    "pro": {
        "daily_predictions": -1,  # unlimited
        "lstm_access": True,
        "lstm_predictions": 100,
        "options_builder": "full",
        "crypto_coins": -1,
        "prediction_markets": "full",
        "price": 99
    }
}

class UsageStats(BaseModel):
    user_id: str
    subscription_tier: str
    usage_credits: int
    daily_predictions_used: int
    daily_predictions_limit: int
    lstm_predictions_used: int
    lstm_predictions_limit: int
    lstm_access: bool
    reset_time: datetime

async def get_user_from_request(request: Request) -> dict:
    """Get user from session token"""
    from routes.auth import get_current_user
    return await get_current_user(request)

async def check_and_track_usage(user_id: str, feature: str = "prediction", is_lstm: bool = False) -> bool:
    """
    Check if user can use feature and track usage.
    Returns True if allowed, raises HTTPException if limit exceeded.
    """
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier = user.get("subscription_tier", "free")
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    
    # Get today's usage
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    usage_record = await db.usage_tracking.find_one(
        {"user_id": user_id, "date": today.isoformat()},
        {"_id": 0}
    )
    
    if not usage_record:
        usage_record = {
            "user_id": user_id,
            "date": today.isoformat(),
            "predictions": 0,
            "lstm_predictions": 0,
            "options_analysis": 0,
            "crypto_lookups": 0,
            "created_at": datetime.now(timezone.utc)
        }
        await db.usage_tracking.insert_one(usage_record)
    
    # Check LSTM access
    if is_lstm:
        if not limits.get("lstm_access", False):
            raise HTTPException(
                status_code=403, 
                detail="LSTM predictions require Pro subscription ($99/month)"
            )
        lstm_limit = limits.get("lstm_predictions", 0)
        if lstm_limit != -1 and usage_record.get("lstm_predictions", 0) >= lstm_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily LSTM prediction limit ({lstm_limit}) reached. Resets at midnight UTC."
            )
    
    # Check daily prediction limit
    daily_limit = limits.get("daily_predictions", 5)
    if daily_limit != -1 and usage_record.get("predictions", 0) >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily prediction limit ({daily_limit}) reached. Upgrade to increase limit."
        )
    
    # Track usage
    update_fields = {"predictions": 1}
    if is_lstm:
        update_fields["lstm_predictions"] = 1
    
    await db.usage_tracking.update_one(
        {"user_id": user_id, "date": today.isoformat()},
        {"$inc": update_fields}
    )
    
    # Update total predictions
    await db.users.update_one(
        {"user_id": user_id},
        {"$inc": {"total_predictions": 1}}
    )
    
    return True

@usage_router.get("/usage")
async def get_usage_stats(request: Request):
    """Get current user's usage statistics"""
    user = await get_user_from_request(request)
    user_id = user["user_id"]
    tier = user.get("subscription_tier", "free")
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    
    # Get today's usage
    today = datetime.now(timezone.utc).date()
    usage_record = await db.usage_tracking.find_one(
        {"user_id": user_id, "date": today.isoformat()},
        {"_id": 0}
    )
    
    predictions_used = usage_record.get("predictions", 0) if usage_record else 0
    lstm_used = usage_record.get("lstm_predictions", 0) if usage_record else 0
    
    # Calculate reset time (midnight UTC)
    tomorrow = today + timedelta(days=1)
    reset_time = datetime.combine(tomorrow, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    return {
        "user_id": user_id,
        "subscription_tier": tier,
        "usage_credits": user.get("usage_credits", 0),
        "daily_predictions_used": predictions_used,
        "daily_predictions_limit": limits.get("daily_predictions", 5),
        "lstm_predictions_used": lstm_used,
        "lstm_predictions_limit": limits.get("lstm_predictions", 0),
        "lstm_access": limits.get("lstm_access", False),
        "total_predictions": user.get("total_predictions", 0),
        "reset_time": reset_time.isoformat(),
        "tier_benefits": limits
    }

@usage_router.get("/subscription")
async def get_subscription_info(request: Request):
    """Get subscription information and available plans"""
    user = await get_user_from_request(request)
    
    return {
        "current_tier": user.get("subscription_tier", "free"),
        "available_plans": {
            "basic": {
                "name": "Basic",
                "price": "$20/month",
                "features": [
                    "200 predictions per day",
                    "Full Options Builder access",
                    "Unlimited crypto analysis",
                    "Prediction Markets optimizer",
                    "Priority support"
                ]
            },
            "pro": {
                "name": "Pro (LSTM AI)",
                "price": "$99/month",
                "features": [
                    "Unlimited standard predictions",
                    "100 LSTM AI predictions per day",
                    "Advanced machine learning models",
                    "All Basic features included",
                    "API access",
                    "Dedicated support"
                ]
            }
        }
    }

@usage_router.get("/history")
async def get_usage_history(request: Request, days: int = 30):
    """Get usage history for the last N days"""
    user = await get_user_from_request(request)
    user_id = user["user_id"]
    
    # Calculate date range
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days)
    
    # Get usage records
    records = await db.usage_tracking.find(
        {
            "user_id": user_id,
            "date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
        },
        {"_id": 0}
    ).sort("date", -1).to_list(days)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "history": records,
        "total_predictions": sum(r.get("predictions", 0) for r in records),
        "total_lstm": sum(r.get("lstm_predictions", 0) for r in records)
    }

# Helper function to check feature access without tracking
async def check_feature_access(user_id: str, feature: str) -> dict:
    """Check if user has access to a feature without tracking usage"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return {"allowed": False, "reason": "User not found"}
    
    tier = user.get("subscription_tier", "free")
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    
    if feature == "lstm":
        return {
            "allowed": limits.get("lstm_access", False),
            "reason": None if limits.get("lstm_access") else "Requires Pro subscription"
        }
    
    if feature == "options_builder_full":
        return {
            "allowed": limits.get("options_builder") == "full",
            "reason": None if limits.get("options_builder") == "full" else "Requires Basic+ subscription"
        }
    
    return {"allowed": True, "reason": None}
