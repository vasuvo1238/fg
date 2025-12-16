"""
Stripe Payment Routes
Handles subscription management, checkout sessions, and webhooks
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)

stripe_router = APIRouter(prefix="/payments", tags=["Payments"])

# Database reference
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

# Subscription tiers
SUBSCRIPTION_TIERS = {
    "basic": {
        "name": "Basic Plan",
        "price": 20.00,
        "features": [
            "Daily Morning Reports",
            "Portfolio Tracking",
            "Real-time Market Data",
            "Email Notifications",
            "Basic Technical Analysis"
        ]
    },
    "pro": {
        "name": "Pro Plan (LSTM Access)",
        "price": 99.00,
        "features": [
            "Everything in Basic",
            "LSTM AI Predictions",
            "AutoHedge Multi-Agent Analysis",
            "Advanced Options Strategies",
            "Priority Support",
            "SMS/WhatsApp Notifications",
            "Broker API Integration"
        ]
    }
}

class CreateCheckoutRequest(BaseModel):
    tier: str  # 'basic' or 'pro'
    origin_url: str

class CheckoutStatusRequest(BaseModel):
    session_id: str

class SubscriptionStatus(BaseModel):
    tier: str
    status: str
    expires_at: Optional[datetime] = None


@stripe_router.get("/tiers")
async def get_subscription_tiers():
    """Get available subscription tiers"""
    return {
        "tiers": SUBSCRIPTION_TIERS,
        "currency": "usd"
    }


@stripe_router.post("/checkout/create")
async def create_checkout_session(request: Request, checkout_data: CreateCheckoutRequest):
    """Create a Stripe checkout session for subscription"""
    
    # Validate tier
    if checkout_data.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Available: {list(SUBSCRIPTION_TIERS.keys())}")
    
    # Get user from session
    from routes.auth import get_current_user
    try:
        user = await get_current_user(request)
        user_id = user["user_id"]
        user_email = user.get("email", "")
    except Exception:
        user_id = "anonymous"
        user_email = ""
    
    # Get amount from server-side definition (security: never trust frontend amount)
    tier_info = SUBSCRIPTION_TIERS[checkout_data.tier]
    amount = tier_info["price"]
    
    # Initialize Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Build URLs from provided origin
    success_url = f"{checkout_data.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_data.origin_url}/payment-cancel"
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "user_email": user_email,
            "tier": checkout_data.tier,
            "tier_name": tier_info["name"],
            "source": "web_subscription"
        }
    )
    
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create pending transaction record BEFORE redirect
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": user_id,
            "email": user_email,
            "tier": checkout_data.tier,
            "amount": amount,
            "currency": "usd",
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")


@stripe_router.get("/checkout/status/{session_id}")
async def get_checkout_status(request: Request, session_id: str):
    """Get payment status for a checkout session"""
    
    # Check if already processed
    existing = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if existing and existing.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "tier": existing.get("tier"),
            "message": "Payment already processed"
        }
    
    # Initialize Stripe and check status
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction record
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # If payment is successful, update user subscription
        if status.payment_status == "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id, "payment_status": {"$ne": "paid"}},  # Only update if not already paid
                {"$set": update_data}
            )
            
            # Get user info from transaction
            if existing:
                user_id = existing.get("user_id")
                tier = existing.get("tier")
                
                if user_id and user_id != "anonymous":
                    # Update user's subscription tier
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "subscription_tier": tier,
                            "subscription_status": "active",
                            "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
        else:
            # Update transaction with current status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "tier": existing.get("tier") if existing else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@stripe_router.get("/subscription/status")
async def get_subscription_status(request: Request):
    """Get current user's subscription status"""
    
    from routes.auth import get_current_user
    try:
        user = await get_current_user(request)
    except Exception:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_data = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "subscription_tier": 1, "subscription_status": 1, "subscription_updated_at": 1}
    )
    
    if not user_data:
        return {
            "tier": "free",
            "status": "active",
            "features": ["Basic Chat", "Limited API Calls"]
        }
    
    tier = user_data.get("subscription_tier", "free")
    
    return {
        "tier": tier,
        "status": user_data.get("subscription_status", "active"),
        "updated_at": user_data.get("subscription_updated_at"),
        "features": SUBSCRIPTION_TIERS.get(tier, {}).get("features", ["Basic Chat", "Limited API Calls"])
    }


@stripe_router.get("/transactions")
async def get_payment_transactions(request: Request):
    """Get user's payment history"""
    
    from routes.auth import get_current_user
    try:
        user = await get_current_user(request)
    except:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    transactions = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"transactions": transactions}
