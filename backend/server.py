from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Models ==============

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_guardrail_triggered: bool = False

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str
    message: str
    is_guardrail_triggered: bool = False
    guardrail_message: Optional[str] = None

class ChatHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str
    messages: List[Message]

# ============== Guardrails System ==============

FINANCIAL_KEYWORDS = [
    'stock', 'bond', 'invest', 'portfolio', 'dividend', 'equity', 'debt',
    'mutual fund', 'etf', 'crypto', 'bitcoin', 'trading', 'market', 'finance',
    'financial', 'money', 'budget', 'savings', 'loan', 'mortgage', 'insurance',
    'retirement', '401k', 'ira', 'tax', 'credit', 'debit', 'bank', 'interest',
    'rate', 'forex', 'currency', 'economics', 'inflation', 'deflation', 'gdp',
    'asset', 'liability', 'wealth', 'income', 'expense', 'cash flow', 'roi',
    'capital', 'risk', 'return', 'yield', 'valuation', 'options', 'futures',
    'commodity', 'real estate', 'reit', 'hedge fund', 'venture capital',
    'private equity', 'ipo', 'merger', 'acquisition', 'diversification'
]

OFF_TOPIC_INDICATORS = [
    'recipe', 'cook', 'weather', 'movie', 'song', 'game', 'sport',
    'celebrity', 'fashion', 'travel', 'hotel', 'restaurant', 'joke',
    'story', 'poem', 'riddle', 'puzzle'
]

def check_guardrails(message: str) -> tuple[bool, Optional[str]]:
    """
    Check if the message is finance-related.
    Returns: (is_allowed, guardrail_message)
    """
    message_lower = message.lower()
    
    # Check for explicit off-topic indicators
    for indicator in OFF_TOPIC_INDICATORS:
        if indicator in message_lower:
            return False, "I specialize in financial topics only. Please ask me questions related to finance, investing, budgeting, or economics."
    
    # Check for financial keywords
    for keyword in FINANCIAL_KEYWORDS:
        if keyword in message_lower:
            return True, None
    
    # Check for common financial question patterns
    financial_patterns = [
        r'how (much|to|can|do|should).*(save|invest|spend|budget)',
        r'what (is|are).*(stock|bond|etf|mutual fund|portfolio|diversification)',
        r'(should|can|how) (i|we).*(retire|retirement)',
        r'(best|good).*(investment|portfolio|strategy)',
        r'(explain|tell me about).*(market|trading|investing)',
    ]
    
    for pattern in financial_patterns:
        if re.search(pattern, message_lower):
            return True, None
    
    # Default: reject if no finance-related content detected
    return False, "I'm a financial advisor chatbot. Please ask me questions about finance, investing, markets, budgeting, or any other financial topics."

# ============== API Routes ==============

@api_router.get("/")
async def root():
    return {"message": "Financial Advisor API"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Check guardrails
        is_allowed, guardrail_msg = check_guardrails(request.message)
        
        if not is_allowed:
            # Save user message with guardrail flag
            user_msg = Message(
                role="user",
                content=request.message,
                is_guardrail_triggered=True
            )
            
            user_msg_dict = user_msg.model_dump()
            user_msg_dict['timestamp'] = user_msg_dict['timestamp'].isoformat()
            user_msg_dict['session_id'] = session_id
            
            await db.messages.insert_one(user_msg_dict)
            
            return ChatResponse(
                session_id=session_id,
                message=guardrail_msg,
                is_guardrail_triggered=True,
                guardrail_message=guardrail_msg
            )
        
        # Save user message
        user_msg = Message(role="user", content=request.message)
        user_msg_dict = user_msg.model_dump()
        user_msg_dict['timestamp'] = user_msg_dict['timestamp'].isoformat()
        user_msg_dict['session_id'] = session_id
        
        await db.messages.insert_one(user_msg_dict)
        
        # Get chat history for context
        history = await db.messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(50)
        
        # Initialize LLM chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        system_message = """You are a professional financial advisor chatbot with expertise in all areas of finance. 
        
Your characteristics:
- Professional yet approachable tone
- Provide clear, accurate financial information
- Break down complex concepts into simple terms
- Always include appropriate disclaimers for investment advice
- Focus on education and empowerment
- Be concise but thorough

IMPORTANT GUIDELINES:
1. When discussing investments, always mention that past performance doesn't guarantee future results
2. Remind users to consult with a licensed financial advisor for personalized advice
3. Never guarantee specific returns or outcomes
4. Explain both benefits and risks of financial products
5. Use examples to illustrate concepts when helpful
6. Stay current with financial trends and regulations

Always aim to help users make informed financial decisions while being clear about the limitations of general advice."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.1")
        
        # Send message to LLM
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        # Save assistant response
        assistant_msg = Message(role="assistant", content=response)
        assistant_msg_dict = assistant_msg.model_dump()
        assistant_msg_dict['timestamp'] = assistant_msg_dict['timestamp'].isoformat()
        assistant_msg_dict['session_id'] = session_id
        
        await db.messages.insert_one(assistant_msg_dict)
        
        return ChatResponse(
            session_id=session_id,
            message=response,
            is_guardrail_triggered=False
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/history/{session_id}", response_model=ChatHistory)
async def get_chat_history(session_id: str):
    try:
        messages = await db.messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(1000)
        
        # Convert ISO string timestamps back to datetime objects
        for msg in messages:
            if isinstance(msg['timestamp'], str):
                msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
        
        return ChatHistory(
            session_id=session_id,
            messages=messages
        )
        
    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    try:
        result = await db.messages.delete_many({"session_id": session_id})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()