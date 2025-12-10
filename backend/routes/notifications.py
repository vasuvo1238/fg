"""
Notification System for FinTech Hub
Supports In-App, Email, and Push notifications
"""

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import json
import os

notification_router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Database reference
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

# Notification Types
NotificationType = Literal[
    "usage_warning",      # Usage limit approaching
    "usage_limit",        # Usage limit reached
    "prediction_complete", # Prediction finished
    "price_alert",        # Stock price target hit
    "subscription",       # Subscription reminder
    "announcement",       # System announcement
    "welcome",            # Welcome notification
    "feature_update"      # New feature notification
]

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: NotificationType
    data: Optional[dict] = None
    link: Optional[str] = None

class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    data: Optional[dict] = None
    link: Optional[str] = None
    read: bool
    created_at: datetime

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

class EmailPreferences(BaseModel):
    usage_alerts: bool = True
    prediction_alerts: bool = True
    price_alerts: bool = True
    subscription_alerts: bool = True
    announcements: bool = True
    weekly_summary: bool = True

# Helper to get current user
async def get_current_user_from_request(request: Request) -> dict:
    from routes.auth import get_current_user
    return await get_current_user(request)

# ==================== IN-APP NOTIFICATIONS ====================

@notification_router.get("")
async def get_notifications(
    request: Request,
    limit: int = 20,
    unread_only: bool = False
):
    """Get user's notifications"""
    user = await get_current_user_from_request(request)
    user_id = user["user_id"]
    
    query = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get unread count
    unread_count = await db.notifications.count_documents({
        "user_id": user_id,
        "read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "total": len(notifications)
    }

@notification_router.post("/{notification_id}/read")
async def mark_as_read(request: Request, notification_id: str):
    """Mark a notification as read"""
    user = await get_current_user_from_request(request)
    
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}

@notification_router.post("/read-all")
async def mark_all_as_read(request: Request):
    """Mark all notifications as read"""
    user = await get_current_user_from_request(request)
    
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    return {"success": True}

@notification_router.delete("/{notification_id}")
async def delete_notification(request: Request, notification_id: str):
    """Delete a notification"""
    user = await get_current_user_from_request(request)
    
    result = await db.notifications.delete_one({
        "notification_id": notification_id,
        "user_id": user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}

@notification_router.delete("")
async def clear_all_notifications(request: Request):
    """Clear all notifications for user"""
    user = await get_current_user_from_request(request)
    
    result = await db.notifications.delete_many({"user_id": user["user_id"]})
    
    return {"success": True, "deleted": result.deleted_count}

# ==================== PUSH NOTIFICATIONS ====================

@notification_router.post("/push/subscribe")
async def subscribe_push(request: Request, subscription: PushSubscription):
    """Subscribe to push notifications"""
    user = await get_current_user_from_request(request)
    
    # Store subscription
    await db.push_subscriptions.update_one(
        {"user_id": user["user_id"], "endpoint": subscription.endpoint},
        {
            "$set": {
                "user_id": user["user_id"],
                "endpoint": subscription.endpoint,
                "keys": subscription.keys,
                "created_at": datetime.now(timezone.utc),
                "active": True
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Push notifications enabled"}

@notification_router.delete("/push/unsubscribe")
async def unsubscribe_push(request: Request):
    """Unsubscribe from push notifications"""
    user = await get_current_user_from_request(request)
    
    await db.push_subscriptions.update_many(
        {"user_id": user["user_id"]},
        {"$set": {"active": False}}
    )
    
    return {"success": True, "message": "Push notifications disabled"}

# ==================== EMAIL PREFERENCES ====================

@notification_router.get("/preferences")
async def get_notification_preferences(request: Request):
    """Get user's notification preferences"""
    user = await get_current_user_from_request(request)
    
    prefs = await db.notification_preferences.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not prefs:
        # Return defaults
        prefs = {
            "user_id": user["user_id"],
            "email": {
                "usage_alerts": True,
                "prediction_alerts": True,
                "price_alerts": True,
                "subscription_alerts": True,
                "announcements": True,
                "weekly_summary": True
            },
            "push": {
                "enabled": False,
                "usage_alerts": True,
                "prediction_alerts": True,
                "price_alerts": True
            },
            "in_app": {
                "enabled": True,
                "sound": True
            }
        }
    
    return prefs

@notification_router.put("/preferences")
async def update_notification_preferences(request: Request, preferences: dict):
    """Update user's notification preferences"""
    user = await get_current_user_from_request(request)
    
    await db.notification_preferences.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                **preferences,
                "user_id": user["user_id"],
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {"success": True}

# ==================== NOTIFICATION HELPERS ====================

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    data: dict = None,
    link: str = None,
    send_push: bool = True,
    send_email: bool = False
):
    """Create a notification for a user"""
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    
    notification = {
        "notification_id": notification_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "data": data or {},
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.notifications.insert_one(notification)
    
    # Check user preferences and send push/email if enabled
    prefs = await db.notification_preferences.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if send_push and prefs and prefs.get("push", {}).get("enabled"):
        await send_push_notification(user_id, title, message, link)
    
    if send_email and prefs and prefs.get("email", {}).get(f"{notification_type}_alerts", True):
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user:
            await queue_email_notification(user["email"], title, message, notification_type)
    
    return notification

async def send_push_notification(user_id: str, title: str, body: str, url: str = None):
    """Send push notification to user's subscribed devices"""
    try:
        from pywebpush import webpush, WebPushException
        
        vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
        vapid_email = os.environ.get("VAPID_EMAIL", "mailto:admin@fintechhub.com")
        
        if not vapid_private_key:
            print("VAPID keys not configured, skipping push notification")
            return
        
        subscriptions = await db.push_subscriptions.find(
            {"user_id": user_id, "active": True},
            {"_id": 0}
        ).to_list(10)
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url or "/dashboard",
            "icon": "/logo192.png",
            "badge": "/badge.png"
        })
        
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": sub["keys"]
                    },
                    data=payload,
                    vapid_private_key=vapid_private_key,
                    vapid_claims={"sub": vapid_email}
                )
            except WebPushException as e:
                if e.response and e.response.status_code == 410:
                    # Subscription expired, remove it
                    await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
    except ImportError:
        print("pywebpush not installed, skipping push notification")
    except Exception as e:
        print(f"Push notification error: {e}")

async def queue_email_notification(email: str, subject: str, message: str, notification_type: str):
    """Queue email notification for sending"""
    # Store in queue for background processing
    await db.email_queue.insert_one({
        "email": email,
        "subject": f"FinTech Hub: {subject}",
        "message": message,
        "type": notification_type,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    })

async def send_welcome_notification(user_id: str, user_name: str):
    """Send welcome notification to new user"""
    await create_notification(
        user_id=user_id,
        title="Welcome to FinTech Hub! 🎉",
        message=f"Hi {user_name}! Your account is ready. Start exploring AI-powered financial insights.",
        notification_type="welcome",
        link="/dashboard",
        send_push=False,
        send_email=True
    )

async def send_usage_warning(user_id: str, usage_percent: int, limit: int):
    """Send usage warning notification"""
    await create_notification(
        user_id=user_id,
        title=f"Usage Alert: {usage_percent}% Used",
        message=f"You've used {usage_percent}% of your daily {limit} predictions. Consider upgrading for more.",
        notification_type="usage_warning",
        data={"usage_percent": usage_percent, "limit": limit},
        link="/dashboard",
        send_push=True,
        send_email=False
    )

async def send_usage_limit_reached(user_id: str):
    """Send notification when usage limit is reached"""
    await create_notification(
        user_id=user_id,
        title="Daily Limit Reached",
        message="You've reached your daily prediction limit. Upgrade to continue or wait until tomorrow.",
        notification_type="usage_limit",
        link="/dashboard",
        send_push=True,
        send_email=True
    )

async def send_prediction_complete(user_id: str, symbol: str, prediction_type: str):
    """Send notification when prediction is complete"""
    await create_notification(
        user_id=user_id,
        title=f"Prediction Ready: {symbol}",
        message=f"Your {prediction_type} prediction for {symbol} is ready to view.",
        notification_type="prediction_complete",
        data={"symbol": symbol, "type": prediction_type},
        link=f"/dashboard?tab=stocks&symbol={symbol}",
        send_push=True,
        send_email=False
    )

async def send_price_alert(user_id: str, symbol: str, current_price: float, target_price: float, direction: str):
    """Send price alert notification"""
    await create_notification(
        user_id=user_id,
        title=f"Price Alert: {symbol}",
        message=f"{symbol} has {'reached' if direction == 'hit' else 'crossed'} ${target_price:.2f}! Current: ${current_price:.2f}",
        notification_type="price_alert",
        data={"symbol": symbol, "current_price": current_price, "target_price": target_price},
        link=f"/dashboard?tab=stocks&symbol={symbol}",
        send_push=True,
        send_email=True
    )

async def send_announcement(title: str, message: str, link: str = None):
    """Send announcement to all users"""
    users = await db.users.find({}, {"user_id": 1, "_id": 0}).to_list(10000)
    
    for user in users:
        await create_notification(
            user_id=user["user_id"],
            title=title,
            message=message,
            notification_type="announcement",
            link=link or "/dashboard",
            send_push=True,
            send_email=True
        )
