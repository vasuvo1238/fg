"""
Email Service for FinTech Hub
Supports SendGrid, AWS SES, or SMTP
"""

import os
import asyncio
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

# Database reference
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

# Email templates
EMAIL_TEMPLATES = {
    "welcome": {
        "subject": "Welcome to FinTech Hub! 🎉",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981;">FinTech Hub</h1>
            </div>
            <h2 style="color: #1e293b;">Welcome, {name}!</h2>
            <p style="color: #475569; line-height: 1.6;">
                Your account has been created successfully. You now have access to:
            </p>
            <ul style="color: #475569; line-height: 1.8;">
                <li>AI-powered stock predictions</li>
                <li>Options strategy builder</li>
                <li>Portfolio optimization</li>
                <li>Cryptocurrency analysis</li>
                <li>And much more!</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{app_url}/dashboard" style="background: linear-gradient(to right, #10b981, #06b6d4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Get Started
                </a>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">
                You're currently on the Free plan with 5 predictions per day.
                <a href="{app_url}/dashboard" style="color: #10b981;">Upgrade</a> for unlimited access.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                FinTech Hub | AI-Powered Financial Intelligence<br>
                <a href="{app_url}/privacy" style="color: #94a3b8;">Privacy Policy</a> | 
                <a href="{app_url}/terms" style="color: #94a3b8;">Terms of Service</a>
            </p>
        </div>
        """
    },
    "usage_warning": {
        "subject": "Usage Alert: {percent}% of Daily Limit Used",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981;">FinTech Hub</h1>
            </div>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h3 style="color: #92400e; margin: 0;">⚠️ Usage Alert</h3>
            </div>
            <p style="color: #475569; line-height: 1.6;">
                Hi {name},<br><br>
                You've used <strong>{percent}%</strong> of your daily prediction limit ({used}/{limit} predictions).
            </p>
            <p style="color: #475569; line-height: 1.6;">
                Your limit resets at midnight UTC. To get unlimited predictions, consider upgrading your plan.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{app_url}/dashboard" style="background: linear-gradient(to right, #10b981, #06b6d4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    View Plans
                </a>
            </div>
        </div>
        """
    },
    "usage_limit": {
        "subject": "Daily Prediction Limit Reached",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981;">FinTech Hub</h1>
            </div>
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h3 style="color: #991b1b; margin: 0;">🚫 Limit Reached</h3>
            </div>
            <p style="color: #475569; line-height: 1.6;">
                Hi {name},<br><br>
                You've reached your daily prediction limit of <strong>{limit}</strong> predictions.
            </p>
            <p style="color: #475569; line-height: 1.6;">
                Your limit will reset at <strong>midnight UTC</strong>. Want to continue now? Upgrade to get more predictions!
            </p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #1e293b; margin-top: 0;">Upgrade Options:</h4>
                <p style="color: #475569; margin: 5px 0;">📊 <strong>Basic ($20/mo)</strong> - 200 predictions/day</p>
                <p style="color: #475569; margin: 5px 0;">🚀 <strong>Pro ($99/mo)</strong> - Unlimited + LSTM AI</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{app_url}/dashboard" style="background: linear-gradient(to right, #10b981, #06b6d4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Upgrade Now
                </a>
            </div>
        </div>
        """
    },
    "price_alert": {
        "subject": "🎯 Price Alert: {symbol} hit ${price}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981;">FinTech Hub</h1>
            </div>
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
                <h3 style="color: #065f46; margin: 0;">🎯 Price Alert Triggered!</h3>
            </div>
            <p style="color: #475569; line-height: 1.6;">
                Hi {name},<br><br>
                Your price alert for <strong>{symbol}</strong> has been triggered!
            </p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h2 style="color: #1e293b; margin: 0;">{symbol}</h2>
                <p style="font-size: 32px; color: #10b981; margin: 10px 0; font-weight: bold;">${price}</p>
                <p style="color: #64748b; margin: 0;">Target: ${target}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{app_url}/dashboard?tab=stocks&symbol={symbol}" style="background: linear-gradient(to right, #10b981, #06b6d4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    View Analysis
                </a>
            </div>
        </div>
        """
    },
    "weekly_summary": {
        "subject": "Your Weekly FinTech Hub Summary 📊",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981;">FinTech Hub</h1>
            </div>
            <h2 style="color: #1e293b;">Weekly Summary</h2>
            <p style="color: #475569;">Hi {name}, here's your activity for the past week:</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #1e293b; margin-top: 0;">📊 Your Stats</h4>
                <p style="color: #475569; margin: 5px 0;">Predictions Made: <strong>{predictions}</strong></p>
                <p style="color: #475569; margin: 5px 0;">Stocks Analyzed: <strong>{stocks}</strong></p>
                <p style="color: #475569; margin: 5px 0;">Options Strategies: <strong>{options}</strong></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{app_url}/dashboard" style="background: linear-gradient(to right, #10b981, #06b6d4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Continue Analyzing
                </a>
            </div>
        </div>
        """
    }
}

async def send_email(
    to_email: str,
    template_name: str,
    template_data: dict,
    custom_subject: str = None
):
    """Send email using configured provider"""
    
    template = EMAIL_TEMPLATES.get(template_name)
    if not template:
        logger.error(f"Email template '{template_name}' not found")
        return False
    
    # Get app URL
    app_url = os.environ.get("APP_URL", "https://marketmorning.preview.emergentagent.com")
    template_data["app_url"] = app_url
    
    # Format template
    subject = custom_subject or template["subject"].format(**template_data)
    html_content = template["html"].format(**template_data)
    
    # Try SendGrid first
    sendgrid_key = os.environ.get("SENDGRID_API_KEY")
    if sendgrid_key:
        return await send_via_sendgrid(to_email, subject, html_content, sendgrid_key)
    
    # Try SMTP
    smtp_host = os.environ.get("SMTP_HOST")
    if smtp_host:
        return await send_via_smtp(to_email, subject, html_content)
    
    # No email provider configured - log and queue
    logger.warning(f"No email provider configured. Queuing email to {to_email}")
    await db.email_queue.insert_one({
        "to": to_email,
        "subject": subject,
        "html": html_content,
        "status": "queued",
        "created_at": datetime.now(timezone.utc)
    })
    return True

async def send_via_sendgrid(to_email: str, subject: str, html_content: str, api_key: str):
    """Send email via SendGrid"""
    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": os.environ.get("FROM_EMAIL", "noreply@fintechhub.com"), "name": "FinTech Hub"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_content}]
                }
            )
            
            if response.status_code in [200, 202]:
                logger.info(f"Email sent to {to_email} via SendGrid")
                return True
            else:
                logger.error(f"SendGrid error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        logger.error(f"SendGrid exception: {e}")
        return False

async def send_via_smtp(to_email: str, subject: str, html_content: str):
    """Send email via SMTP"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        smtp_host = os.environ.get("SMTP_HOST")
        smtp_port = int(os.environ.get("SMTP_PORT", 587))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_pass = os.environ.get("SMTP_PASS")
        from_email = os.environ.get("FROM_EMAIL", "noreply@fintechhub.com")
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"FinTech Hub <{from_email}>"
        msg["To"] = to_email
        
        msg.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())
        
        logger.info(f"Email sent to {to_email} via SMTP")
        return True
    except Exception as e:
        logger.error(f"SMTP exception: {e}")
        return False

async def process_email_queue():
    """Process queued emails (run periodically)"""
    pending = await db.email_queue.find(
        {"status": "queued"},
        {"_id": 0}
    ).limit(50).to_list(50)
    
    for email in pending:
        success = await send_email(
            email["to"],
            "generic",
            {"content": email.get("html", email.get("message", ""))}
        )
        
        status = "sent" if success else "failed"
        await db.email_queue.update_one(
            {"to": email["to"], "created_at": email["created_at"]},
            {"$set": {"status": status, "processed_at": datetime.now(timezone.utc)}}
        )

async def send_welcome_email(email: str, name: str):
    """Send welcome email to new user"""
    return await send_email(email, "welcome", {"name": name})

async def send_usage_warning_email(email: str, name: str, percent: int, used: int, limit: int):
    """Send usage warning email"""
    return await send_email(email, "usage_warning", {
        "name": name,
        "percent": percent,
        "used": used,
        "limit": limit
    })

async def send_price_alert_email(email: str, name: str, symbol: str, price: float, target: float):
    """Send price alert email"""
    return await send_email(email, "price_alert", {
        "name": name,
        "symbol": symbol,
        "price": f"{price:.2f}",
        "target": f"{target:.2f}"
    })
