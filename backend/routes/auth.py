"""
Authentication Routes for FinTech Hub
Supports Google OAuth (via Emergent Auth) and Email/Password authentication
"""

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import hashlib
import secrets
from motor.motor_asyncio import AsyncIOMotorDatabase

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_tier: str = "free"
    usage_credits: int = 0
    created_at: datetime

class SessionData(BaseModel):
    session_id: str

# Password hashing
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hash_obj.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, hash_value = hashed.split(':')
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return hash_obj.hex() == hash_value
    except:
        return False

# Database dependency (will be injected from server.py)
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

async def get_current_user(request: Request) -> dict:
    """Get current user from session token (cookie or header)"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Optional auth - returns None if not authenticated
async def get_optional_user(request: Request) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

@auth_router.post("/session")
async def process_session(data: SessionData, response: Response):
    """Process session_id from Emergent Auth and create local session"""
    try:
        # Fetch user data from Emergent Auth
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = resp.json()
        
        # Check if user exists
        existing_user = await db.users.find_one(
            {"email": auth_data["email"]},
            {"_id": 0}
        )
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user data
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": auth_data["name"],
                    "picture": auth_data.get("picture"),
                    "last_login": datetime.now(timezone.utc)
                }}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": auth_data["email"],
                "name": auth_data["name"],
                "picture": auth_data.get("picture"),
                "auth_type": "google",
                "subscription_tier": "free",
                "usage_credits": 50,  # Free tier starter credits
                "total_predictions": 0,
                "created_at": datetime.now(timezone.utc),
                "last_login": datetime.now(timezone.utc)
            })
        
        # Create session
        session_token = auth_data.get("session_token") or secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Delete old sessions for this user
        await db.user_sessions.delete_many({"user_id": user_id})
        
        # Create new session
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60  # 7 days
        )
        
        # Get full user data
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        return {
            "success": True,
            "user": user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@auth_router.post("/register")
async def register_user(data: UserCreate, response: Response):
    """Register new user with email/password"""
    # Check if email exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(data.password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hashed_password,
        "picture": None,
        "auth_type": "email",
        "subscription_tier": "free",
        "usage_credits": 50,  # Free tier starter credits
        "total_predictions": 0,
        "created_at": datetime.now(timezone.utc),
        "last_login": datetime.now(timezone.utc)
    })
    
    # Create session
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    
    return {
        "success": True,
        "user": user
    }

@auth_router.post("/login")
async def login_user(data: UserLogin, response: Response):
    """Login with email/password"""
    user = await db.users.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("auth_type") == "google":
        raise HTTPException(status_code=400, detail="Please use Google login for this account")
    
    if not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user["user_id"]
    
    # Update last login
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Delete old sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Create new session
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    
    return {
        "success": True,
        "user": user_data
    }

@auth_router.get("/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    # Remove password from response
    user.pop("password", None)
    return user

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout current user"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"success": True, "message": "Logged out successfully"}

@auth_router.get("/check")
async def check_auth(request: Request):
    """Check if user is authenticated (lightweight endpoint)"""
    try:
        user = await get_current_user(request)
        return {"authenticated": True, "user_id": user["user_id"]}
    except HTTPException:
        return {"authenticated": False}
