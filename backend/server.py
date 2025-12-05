from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor
from stock_analysis import (
    get_stock_info,
    get_historical_data,
    calculate_technical_indicators,
    statistical_prediction,
    generate_trading_signals,
    compare_stocks,
    get_analyst_recommendations
)
from lstm_models import lstm_prediction
from mean_reversion import (
    z_score_mean_reversion,
    ornstein_uhlenbeck_process,
    statistical_arbitrage_score,
    pairs_trading_suggestion
)
from stock_ticker_extractor import extract_stock_tickers, detect_intent, validate_ticker
from model_performance import (
    save_prediction,
    evaluate_predictions,
    get_model_performance,
    backtest_strategy,
    calculate_confidence_intervals
)
from prediction_reasoning import (
    explain_lstm_prediction,
    explain_linear_regression,
    explain_zscore_mean_reversion,
    explain_ornstein_uhlenbeck,
    explain_ensemble_prediction,
    explain_technical_indicators
)
from autohedge_agents import run_autohedge_analysis, TradeRecommendation
from portfolio_optimizer import (
    optimize_portfolio,
    generate_efficient_frontier,
    calculate_position_size_kelly,
    calculate_margin_leverage,
    optimal_leverage

from upstox_integration import (
    get_authorization_url,
    exchange_code_for_token,
    get_market_quote,
    get_historical_candles,
    get_portfolio_holdings,
    get_popular_indian_stocks
)

)
from risk_metrics import (
    portfolio_risk_analysis,
    monte_carlo_simulation,
    portfolio_rebalancing_advice
)
from options_pricing import (
    OptionsStrategy,
    STRATEGY_TEMPLATES,
    black_scholes,
    calculate_greeks
)
from options_chain import (
    get_options_chain,
    get_atm_options,
    get_available_expiries,
    get_options_summary
)
from technical_analysis import (
    get_technical_indicators,
    get_vix_data,
    get_earnings_calendar,
    get_market_overview
)


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

# Thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=4)

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

class StockPredictionRequest(BaseModel):
    symbol: str
    timeframe: str = "30d"  # 7d, 30d, 90d, 180d

class PortfolioStock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    quantity: float
    purchase_price: float
    purchase_date: datetime
    user_session: str

class AlertModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    target_price: float
    condition: str  # 'above' or 'below'
    user_session: str
    is_triggered: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

def check_guardrails(message: str, detected_tickers: List[str] = None) -> tuple[bool, Optional[str]]:
    """
    Check if the message is finance-related.
    Returns: (is_allowed, guardrail_message)
    """
    message_lower = message.lower()
    
    # If stock tickers detected, it's finance-related
    if detected_tickers and len(detected_tickers) > 0:
        return True, None
    
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
        r'how (much|to|can|do|should).*(save|invest|spend|budget|buy|sell)',
        r'what (is|are).*(stock|bond|etf|mutual fund|portfolio|diversification)',
        r'(should|can|how) (i|we).*(retire|retirement|invest|buy|sell|trade)',
        r'(best|good).*(investment|portfolio|strategy|stock)',
        r'(explain|tell me about).*(market|trading|investing)',
        r'(price|value|worth).*of',
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
        
        # Detect stock tickers and intent
        intent = detect_intent(request.message)
        detected_tickers = [t for t in intent["tickers"] if validate_ticker(t)] if intent["tickers"] else []
        
        # Check guardrails (pass detected tickers to allow stock queries)
        is_allowed, guardrail_msg = check_guardrails(request.message, detected_tickers)
        
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
        
        # Get chat history for context (excluding the just-added user message)
        history = await db.messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(50)
        
        # Build context from previous messages (excluding the current one)
        previous_messages = [msg for msg in history[:-1]] if len(history) > 1 else []
        
        # Fetch real-time stock data if stocks mentioned
        stock_context = ""
        if detected_tickers:
            stock_context = "\n\n=== LIVE STOCK DATA ===\n"
            loop = asyncio.get_event_loop()
            
            for ticker in detected_tickers[:3]:  # Limit to 3 stocks
                try:
                    info = await loop.run_in_executor(executor, get_stock_info, ticker)
                    stock_context += f"\n{ticker} - {info['name']}:\n"
                    stock_context += f"  Current Price: ${info['current_price']:.2f}\n"
                    
                    if info['previous_close']:
                        change_pct = ((info['current_price'] - info['previous_close']) / info['previous_close']) * 100
                        stock_context += f"  Change: {change_pct:+.2f}% (from ${info['previous_close']:.2f})\n"
                    
                    if info['market_cap']:
                        stock_context += f"  Market Cap: ${info['market_cap']/1e9:.2f}B\n"
                    
                    if info['pe_ratio']:
                        stock_context += f"  P/E Ratio: {info['pe_ratio']:.2f}\n"
                    
                    # Get technical indicators for better analysis
                    df = await loop.run_in_executor(executor, get_historical_data, ticker, "3mo")
                    indicators = await loop.run_in_executor(executor, calculate_technical_indicators, df)
                    signals = await loop.run_in_executor(executor, generate_trading_signals, indicators, info['current_price'])
                    
                    stock_context += f"  RSI: {indicators['rsi']:.1f} ({'Oversold' if indicators['rsi'] < 30 else 'Overbought' if indicators['rsi'] > 70 else 'Neutral'})\n"
                    stock_context += f"  Technical Signal: {signals['overall_signal']}\n"
                    
                except Exception as e:
                    logger.error(f"Error fetching stock data for {ticker}: {str(e)}")
                    stock_context += f"\n{ticker}: Unable to fetch data\n"
        
        # Initialize LLM chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # Build system message with context
        system_message = """You are a professional financial advisor chatbot with expertise in all areas of finance. 

Your characteristics:
- Professional yet approachable and friendly tone
- Provide clear, accurate financial information with real-time data
- Break down complex concepts into simple terms
- Always include appropriate disclaimers for investment advice
- Focus on education and empowerment
- Be concise but thorough

IMPORTANT GUIDELINES:
1. When user mentions a company name (e.g., "NVIDIA", "Apple"), understand they're asking about the stock
2. Use the LIVE STOCK DATA provided to give current, accurate information
3. Always mention: "This is not financial advice. Past performance doesn't guarantee future results."
4. Remind users to consult with a licensed financial advisor for personalized advice
5. Never guarantee specific returns or outcomes
6. Explain both benefits and risks
7. When asked "should I buy X", provide balanced analysis covering:
   - Current price and recent performance
   - Technical indicators (RSI, signals)
   - Risk factors
   - Market conditions
8. Be friendly and conversational while maintaining professionalism

Always end investment discussions with: "Please consult a licensed financial advisor before making investment decisions." """
        
        # Add stock data context
        if stock_context:
            system_message += stock_context
        
        # Add conversation history to context if exists
        if previous_messages:
            context_str = "\n\n=== CONVERSATION HISTORY ===\n"
            for msg in previous_messages:
                role = "User" if msg['role'] == 'user' else "Assistant"
                context_str += f"{role}: {msg['content']}\n"
            system_message += context_str
        
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

# ============== Stock Prediction Endpoints ==============

@api_router.get("/stocks/search/{query}")
async def search_stocks(query: str):
    """Search for stocks by symbol or name"""
    try:
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(executor, get_stock_info, query.upper())
        
        # Validate that we got real data
        if not ticker.get("current_price"):
            raise HTTPException(status_code=404, detail=f"Stock symbol '{query.upper()}' not found or invalid")
        
        return ticker
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stock not found: {str(e)}")

@api_router.get("/stocks/{symbol}/info")
async def stock_info(symbol: str):
    """Get current stock information"""
    try:
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(executor, get_stock_info, symbol.upper())
        
        # Validate that we got real data
        if not info.get("current_price"):
            raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol.upper()}' not found or invalid")
        
        return info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stocks/{symbol}/historical")
async def stock_historical(symbol: str, period: str = "3mo"):
    """Get historical stock data - Supports: 1mo, 3mo, 6mo, 1y, 2y, 5y"""
    try:
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(executor, get_historical_data, symbol.upper(), period)
        
        data = []
        for index, row in df.iterrows():
            data.append({
                "date": index.strftime('%Y-%m-%d'),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        return {"symbol": symbol.upper(), "period": period, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stocks/{symbol}/analyst-targets")
async def get_analyst_targets(symbol: str):
    """Get analyst target prices and recommendations"""
    try:
        loop = asyncio.get_event_loop()
        analyst_data = await loop.run_in_executor(executor, get_analyst_recommendations, symbol.upper())
        
        if not analyst_data.get("has_data"):
            raise HTTPException(
                status_code=404, 
                detail="No analyst data available for this symbol"
            )
        
        return analyst_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analyst targets for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/stocks/{symbol}/predict")
async def predict_stock(symbol: str, request: StockPredictionRequest):
    """Get AI-powered stock prediction with statistical analysis"""
    try:
        # Parse timeframe
        days_map = {"7d": 7, "30d": 30, "90d": 90, "180d": 180}
        days_ahead = days_map.get(request.timeframe, 30)
        
        loop = asyncio.get_event_loop()
        
        # Fetch data in parallel
        info_future = loop.run_in_executor(executor, get_stock_info, symbol.upper())
        hist_future = loop.run_in_executor(executor, get_historical_data, symbol.upper(), "1y")
        
        info, df = await asyncio.gather(info_future, hist_future)
        
        # Calculate indicators and predictions
        indicators = await loop.run_in_executor(executor, calculate_technical_indicators, df.copy())
        prediction = await loop.run_in_executor(executor, statistical_prediction, df.copy(), days_ahead)
        signals = await loop.run_in_executor(
            executor,
            generate_trading_signals,
            indicators,
            info["current_price"]
        )
        
        # Get AI analysis
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        analysis_prompt = f"""Analyze this stock prediction for {info['name']} ({symbol.upper()}):

Current Price: ${info['current_price']:.2f}
Predicted Price ({days_ahead}d): ${prediction['predicted_price_end']:.2f}
Change: {prediction['price_change_percent']:.2f}%
Trend: {prediction['trend']}

Technical Indicators:
- RSI: {indicators['rsi']:.1f}
- MA20: ${indicators['moving_averages']['ma_20']:.2f}
- MA50: ${indicators['moving_averages']['ma_50']:.2f}
- Volatility: {indicators['volatility']:.2f}%

Trading Signals: {signals['overall_signal']}

Provide a concise professional analysis (3-4 sentences) covering:
1. Key insights from the technical indicators
2. Risk assessment based on volatility
3. Investment outlook (bullish/bearish/neutral)

Remember to include standard disclaimer about financial advice."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"stock_analysis_{symbol}_{datetime.now().timestamp()}",
            system_message="You are a professional financial analyst providing stock analysis."
        ).with_model("openai", "gpt-5.1")
        
        ai_analysis = await chat.send_message(UserMessage(text=analysis_prompt))
        
        return {
            "symbol": symbol.upper(),
            "company_name": info["name"],
            "current_info": info,
            "technical_indicators": indicators,
            "statistical_prediction": prediction,
            "trading_signals": signals,
            "ai_analysis": ai_analysis,
            "timeframe": request.timeframe
        }
    except Exception as e:
        logger.error(f"Error predicting stock {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stocks/{symbol}/predict/ensemble")
async def predict_stock_ensemble(symbol: str, request: StockPredictionRequest):
    """Get ensemble prediction with LSTM, Linear Regression, and Mean Reversion"""
    try:
        # Parse timeframe
        days_map = {"7d": 7, "30d": 30, "90d": 90, "180d": 180}
        days_ahead = days_map.get(request.timeframe, 30)
        
        loop = asyncio.get_event_loop()
        
        # Fetch data - need 5 years for LSTM
        info_future = loop.run_in_executor(executor, get_stock_info, symbol.upper())
        hist_future = loop.run_in_executor(executor, get_historical_data, symbol.upper(), "5y")
        
        info, df = await asyncio.gather(info_future, hist_future)
        
        logger.info(f"Running ensemble prediction for {symbol.upper()} with {len(df)} days of data")
        
        # Run all prediction models in parallel
        linear_future = loop.run_in_executor(executor, statistical_prediction, df.copy(), days_ahead)
        lstm_future = loop.run_in_executor(executor, lstm_prediction, df.copy(), days_ahead, symbol.upper())
        zscore_future = loop.run_in_executor(executor, z_score_mean_reversion, df.copy(), days_ahead, 20)
        ou_future = loop.run_in_executor(executor, ornstein_uhlenbeck_process, df.copy(), days_ahead)
        indicators_future = loop.run_in_executor(executor, calculate_technical_indicators, df.copy())
        arbitrage_future = loop.run_in_executor(executor, statistical_arbitrage_score, df.copy())
        
        linear_pred, lstm_pred, zscore_pred, ou_pred, indicators, arbitrage_score = await asyncio.gather(
            linear_future, lstm_future, zscore_future, ou_future, indicators_future, arbitrage_future
        )
        
        # Calculate ensemble prediction (weighted average)
        # LSTM gets highest weight due to deep learning
        weights = {
            "lstm": 0.4,
            "linear": 0.2,
            "zscore": 0.2,
            "ou": 0.2
        }
        
        ensemble_price = (
            lstm_pred["predicted_price_end"] * weights["lstm"] +
            linear_pred["predicted_price_end"] * weights["linear"] +
            zscore_pred["predicted_price_end"] * weights["zscore"] +
            ou_pred["predicted_price_end"] * weights["ou"]
        )
        
        ensemble_confidence = (
            lstm_pred["confidence"] * weights["lstm"] +
            linear_pred["confidence"] * weights["linear"] +
            zscore_pred["confidence"] * weights["zscore"] +
            ou_pred["confidence"] * weights["ou"]
        )
        
        current_price = info["current_price"]
        ensemble_change = ((ensemble_price - current_price) / current_price) * 100
        
        # Generate trading signals
        signals = await loop.run_in_executor(
            executor,
            generate_trading_signals,
            indicators,
            current_price
        )
        
        # Get AI analysis for ensemble
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        analysis_prompt = f"""Analyze this comprehensive stock prediction ensemble for {info['name']} ({symbol.upper()}):

**Current Price:** ${current_price:.2f}

**Model Predictions ({days_ahead}d):**
1. LSTM (Deep Learning): ${lstm_pred['predicted_price_end']:.2f} ({lstm_pred['price_change_percent']:+.2f}%) - Confidence: {lstm_pred['confidence']:.1f}%
2. Linear Regression: ${linear_pred['predicted_price_end']:.2f} ({linear_pred['price_change_percent']:+.2f}%) - Confidence: {linear_pred['confidence']:.1f}%
3. Z-Score Mean Reversion: ${zscore_pred['predicted_price_end']:.2f} ({zscore_pred['price_change_percent']:+.2f}%)
4. Ornstein-Uhlenbeck: ${ou_pred['predicted_price_end']:.2f} ({ou_pred['price_change_percent']:+.2f}%)

**Ensemble Prediction:** ${ensemble_price:.2f} ({ensemble_change:+.2f}%) - Confidence: {ensemble_confidence:.1f}%

**Mean Reversion Analysis:**
- Score: {arbitrage_score['mean_reversion_score']:.1f}/100
- Hurst Exponent: {arbitrage_score['hurst_exponent']:.3f} ({arbitrage_score['interpretation']['hurst']})
- {arbitrage_score['interpretation']['overall']}

**Technical Indicators:**
- RSI: {indicators['rsi']:.1f}
- Overall Signal: {signals['overall_signal']}

Provide a comprehensive 4-5 sentence analysis covering:
1. Consensus view from all models
2. Key divergences between models (if any)
3. Mean reversion characteristics and implications
4. Investment recommendation with risk assessment

Include appropriate disclaimer about financial advice."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"ensemble_analysis_{symbol}_{datetime.now().timestamp()}",
            system_message="You are a quantitative analyst providing ensemble model analysis."
        ).with_model("openai", "gpt-5.1")
        
        ai_analysis = await chat.send_message(UserMessage(text=analysis_prompt))
        
        # Calculate confidence intervals from all model predictions
        all_predictions = [
            lstm_pred["predicted_price_end"],
            linear_pred["predicted_price_end"],
            zscore_pred["predicted_price_end"],
            ou_pred["predicted_price_end"]
        ]
        
        confidence_interval = calculate_confidence_intervals(all_predictions, 0.95)
        
        # Save predictions for performance tracking
        for model_name, pred_data in [
            ("lstm", lstm_pred),
            ("linear_regression", linear_pred),
            ("z_score_mean_reversion", zscore_pred),
            ("ornstein_uhlenbeck", ou_pred)
        ]:
            pred_with_timeframe = {**pred_data, "timeframe_days": days_ahead}
            await save_prediction(db, symbol.upper(), model_name, pred_with_timeframe)
        
        # Save ensemble prediction
        ensemble_pred_data = {
            "current_price": current_price,
            "predicted_price_end": ensemble_price,
            "price_change_percent": ensemble_change,
            "confidence": ensemble_confidence,
            "timeframe_days": days_ahead
        }
        await save_prediction(db, symbol.upper(), "ensemble", ensemble_pred_data)
        
        # Generate plain English explanations
        explanations = {
            "lstm": explain_lstm_prediction({**lstm_pred, "symbol": symbol.upper()}),
            "linear_regression": explain_linear_regression(linear_pred),
            "z_score_mean_reversion": explain_zscore_mean_reversion(zscore_pred),
            "ornstein_uhlenbeck": explain_ornstein_uhlenbeck(ou_pred),
            "ensemble": explain_ensemble_prediction(
                {"predicted_price": ensemble_price, "price_change_percent": ensemble_change, "model_weights": weights},
                {
                    "lstm": lstm_pred,
                    "linear_regression": linear_pred,
                    "z_score_mean_reversion": zscore_pred,
                    "ornstein_uhlenbeck": ou_pred
                }
            ),
            "technical_indicators": explain_technical_indicators(indicators, current_price)
        }
        
        return {
            "symbol": symbol.upper(),
            "company_name": info["name"],
            "current_info": info,
            "timeframe": request.timeframe,
            "ensemble_prediction": {
                "predicted_price": float(ensemble_price),
                "price_change_percent": float(ensemble_change),
                "confidence": float(ensemble_confidence),
                "trend": "bullish" if ensemble_price > current_price else "bearish",
                "model_weights": weights
            },
            "confidence_interval": confidence_interval,
            "individual_predictions": {
                "lstm": lstm_pred,
                "linear_regression": linear_pred,
                "z_score_mean_reversion": zscore_pred,
                "ornstein_uhlenbeck": ou_pred
            },
            "confidence_interval": confidence_interval,
            "technical_indicators": indicators,
            "trading_signals": signals,
            "mean_reversion_analysis": arbitrage_score,
            "ai_analysis": ai_analysis,
            "explanations": explanations
        }
    except Exception as e:
        logger.error(f"Error in ensemble prediction for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stocks/compare")
async def compare_stocks_endpoint(symbols: List[str]):
    """Compare multiple stocks"""
    try:
        loop = asyncio.get_event_loop()
        comparison = await loop.run_in_executor(executor, compare_stocks, symbols)
        return {"stocks": comparison}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== AutoHedge Multi-Agent Trade Recommendations ==============

class AutoHedgeRequest(BaseModel):
    symbol: str
    task: str = "Analyze this stock for investment"
    portfolio_allocation: float = 100000.0  # $100k default
    timeframe: str = "30d"

@api_router.post("/autohedge/analyze", response_model=TradeRecommendation)
async def autohedge_trade_recommendation(request: AutoHedgeRequest):
    """
    Run full AutoHedge multi-agent analysis for trade recommendations
    Returns structured output with Director, Quant, Risk Manager, and Execution agent analysis
    """
    try:
        symbol = request.symbol.upper()
        
        logger.info(f"Starting AutoHedge analysis for {symbol}")
        
        # Parse timeframe
        days_map = {"7d": 7, "30d": 30, "90d": 90, "180d": 180}
        days_ahead = days_map.get(request.timeframe, 30)
        
        loop = asyncio.get_event_loop()
        
        # Fetch all required data
        info_future = loop.run_in_executor(executor, get_stock_info, symbol)
        hist_future = loop.run_in_executor(executor, get_historical_data, symbol, "1y")
        
        info, df = await asyncio.gather(info_future, hist_future)
        
        # Get technical analysis
        indicators = await loop.run_in_executor(executor, calculate_technical_indicators, df.copy())
        signals = await loop.run_in_executor(executor, generate_trading_signals, indicators, info["current_price"])
        
        # Get prediction for quantitative analysis
        prediction = await loop.run_in_executor(executor, statistical_prediction, df.copy(), days_ahead)
        
        # Run AutoHedge multi-agent system
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        recommendation = await run_autohedge_analysis(
            stock_symbol=symbol,
            stock_info=info,
            technical_indicators=indicators,
            trading_signals=signals,
            prediction=prediction,
            task=request.task,
            api_key=api_key,
            portfolio_allocation=request.portfolio_allocation
        )
        
        # Save to database for tracking
        recommendation_dict = recommendation.model_dump()
        recommendation_dict['timestamp'] = recommendation_dict['timestamp']
        
        await db.autohedge_recommendations.insert_one(recommendation_dict)
        
        logger.info(f"AutoHedge analysis saved: {recommendation.action} {symbol}")
        
        return recommendation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AutoHedge analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/autohedge/history/{symbol}")
async def get_autohedge_history(symbol: str, limit: int = 10):
    """Get historical AutoHedge recommendations for a symbol"""
    try:
        recommendations = await db.autohedge_recommendations.find(
            {"symbol": symbol.upper()},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"symbol": symbol.upper(), "recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== Options Strategy Builder ==============

class OptionLegRequest(BaseModel):
    option_type: str  # 'call' or 'put'
    action: str  # 'buy' or 'sell'
    strike: float
    quantity: int
    days_to_expiry: int

class CustomStrategyRequest(BaseModel):
    strategy_name: str
    underlying_symbol: str
    spot_price: float
    legs: List[OptionLegRequest]
    volatility: Optional[float] = 0.25
    risk_free_rate: Optional[float] = 0.05

class TemplateStrategyRequest(BaseModel):
    template_name: str
    underlying_symbol: str
    spot_price: float
    days_to_expiry: int = 30
    strike_width: Optional[float] = None
    volatility: Optional[float] = 0.25

@api_router.post("/options/strategy/custom")
async def build_custom_strategy(request: CustomStrategyRequest):
    """Build a custom options strategy"""
    try:
        strategy = OptionsStrategy(
            request.strategy_name,
            request.underlying_symbol,
            request.spot_price
        )
        strategy.volatility = request.volatility
        strategy.risk_free_rate = request.risk_free_rate
        
        # Add all legs
        for leg in request.legs:
            strategy.add_leg(
                leg.option_type,
                leg.action,
                leg.strike,
                leg.quantity,
                leg.days_to_expiry
            )
        
        # Get complete analysis
        loop = asyncio.get_event_loop()
        summary = await loop.run_in_executor(executor, strategy.get_strategy_summary)
        
        # Save to database (create a copy to avoid _id injection)
        db_record = summary.copy()
        db_record["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.options_strategies.insert_one(db_record)
        
        return summary
        
    except Exception as e:
        logger.error(f"Error building custom strategy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/options/strategy/template")
async def build_template_strategy(request: TemplateStrategyRequest):
    """Build a strategy from template"""
    try:
        if request.template_name not in STRATEGY_TEMPLATES:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown template. Available: {list(STRATEGY_TEMPLATES.keys())}"
            )
        
        # Build strategy from template
        loop = asyncio.get_event_loop()
        strategy_func = STRATEGY_TEMPLATES[request.template_name]
        
        if request.strike_width:
            strategy = await loop.run_in_executor(
                executor,
                strategy_func,
                request.spot_price,
                request.strike_width,
                request.days_to_expiry
            )
        else:
            strategy = await loop.run_in_executor(
                executor,
                strategy_func,
                request.spot_price,
                None,
                request.days_to_expiry
            )
        
        strategy.underlying_symbol = request.underlying_symbol
        strategy.volatility = request.volatility
        
        # Get analysis
        summary = await loop.run_in_executor(executor, strategy.get_strategy_summary)
        
        # Save to database (create a copy to avoid _id injection)
        db_record = summary.copy()
        db_record["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.options_strategies.insert_one(db_record)
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building template strategy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/options/templates")
async def list_strategy_templates():
    """List all available strategy templates"""
    return {
        "templates": [
            {
                "name": "bull_call_spread",
                "description": "Moderately bullish, limited risk/reward",
                "market_view": "Bullish",
                "risk": "Limited",
                "reward": "Limited"
            },
            {
                "name": "bear_put_spread",
                "description": "Moderately bearish, limited risk/reward",
                "market_view": "Bearish",
                "risk": "Limited",
                "reward": "Limited"
            },
            {
                "name": "long_straddle",
                "description": "Big move expected (either direction)",
                "market_view": "Volatile",
                "risk": "Limited (premium paid)",
                "reward": "Unlimited"
            },
            {
                "name": "iron_condor",
                "description": "Range-bound, neutral",
                "market_view": "Neutral",
                "risk": "Limited",
                "reward": "Limited"
            },
            {
                "name": "long_strangle",
                "description": "Big move expected, lower cost than straddle",
                "market_view": "Volatile",
                "risk": "Limited (premium paid)",
                "reward": "Unlimited"
            },
            {
                "name": "butterfly_spread",
                "description": "Neutral, low risk/reward",
                "market_view": "Neutral",
                "risk": "Limited",
                "reward": "Limited"
            }
        ]
    }

@api_router.get("/options/price")
async def calculate_option_price(
    spot_price: float,
    strike: float,
    days_to_expiry: int,
    volatility: float = 0.25,
    risk_free_rate: float = 0.05,
    option_type: str = "call"
):
    """Calculate single option price and Greeks"""
    try:
        time_to_expiry = days_to_expiry / 365.0
        
        loop = asyncio.get_event_loop()
        
        price = await loop.run_in_executor(
            executor,
            black_scholes,
            spot_price, strike, time_to_expiry, risk_free_rate, volatility, option_type
        )
        
        greeks = await loop.run_in_executor(
            executor,
            calculate_greeks,
            spot_price, strike, time_to_expiry, risk_free_rate, volatility, option_type
        )
        
        return {
            "price": round(price, 2),
            "greeks": greeks,
            "inputs": {
                "spot_price": spot_price,
                "strike": strike,
                "days_to_expiry": days_to_expiry,
                "volatility": volatility,
                "option_type": option_type
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating option price: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/options/strategies/history")
async def get_strategy_history(limit: int = 20):
    """Get recently built strategies"""
    try:
        strategies = await db.options_strategies.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {"strategies": strategies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== Portfolio Management ==============

@api_router.post("/portfolio/add")
async def add_to_portfolio(stock: PortfolioStock):
    """Add stock to portfolio"""
    try:
        stock_dict = stock.model_dump()
        stock_dict['purchase_date'] = stock_dict['purchase_date'].isoformat()
        
        await db.portfolio.insert_one(stock_dict)
        return stock
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/portfolio/{user_session}")
async def get_portfolio(user_session: str):
    """Get user's portfolio"""
    try:
        portfolio = await db.portfolio.find(
            {"user_session": user_session},
            {"_id": 0}
        ).to_list(100)
        
        # Calculate current values
        for item in portfolio:
            try:
                loop = asyncio.get_event_loop()
                info = await loop.run_in_executor(executor, get_stock_info, item['symbol'])
                item['current_price'] = info['current_price']
                item['current_value'] = item['quantity'] * info['current_price']
                item['cost_basis'] = item['quantity'] * item['purchase_price']
                item['gain_loss'] = item['current_value'] - item['cost_basis']
                item['gain_loss_percent'] = (item['gain_loss'] / item['cost_basis']) * 100
            except:
                item['current_price'] = None
        
        return {"portfolio": portfolio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/portfolio/{stock_id}")
async def remove_from_portfolio(stock_id: str):
    """Remove stock from portfolio"""
    try:
        result = await db.portfolio.delete_one({"id": stock_id})
        return {"deleted": result.deleted_count > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== Price Alerts ==============

@api_router.post("/alerts/create")
async def create_alert(alert: AlertModel):
    """Create price alert"""
    try:
        alert_dict = alert.model_dump()
        alert_dict['created_at'] = alert_dict['created_at'].isoformat()
        
        await db.alerts.insert_one(alert_dict)
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/alerts/{user_session}")
async def get_alerts(user_session: str):
    """Get user's alerts"""
    try:
        alerts = await db.alerts.find(
            {"user_session": user_session, "is_triggered": False},
            {"_id": 0}
        ).to_list(100)
        
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/alerts/{user_session}/check")
async def check_alerts(user_session: str):
    """Check if any alerts should be triggered"""
    try:
        alerts = await db.alerts.find(
            {"user_session": user_session, "is_triggered": False},
            {"_id": 0}
        ).to_list(100)
        
        triggered = []
        loop = asyncio.get_event_loop()
        
        for alert in alerts:
            try:
                info = await loop.run_in_executor(executor, get_stock_info, alert['symbol'])
                current_price = info['current_price']
                
                should_trigger = False
                if alert['condition'] == 'above' and current_price >= alert['target_price']:
                    should_trigger = True
                elif alert['condition'] == 'below' and current_price <= alert['target_price']:
                    should_trigger = True
                
                if should_trigger:
                    await db.alerts.update_one(
                        {"id": alert['id']},
                        {"$set": {"is_triggered": True}}
                    )
                    triggered.append({
                        **alert,
                        "current_price": current_price
                    })
            except:
                continue
        
        return {"triggered_alerts": triggered}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    """Delete alert"""
    try:
        result = await db.alerts.delete_one({"id": alert_id})
        return {"deleted": result.deleted_count > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== Pairs Trading ==============

@api_router.post("/stocks/pairs-trading")
async def analyze_pairs_trading(symbols: List[str]):
    """Analyze pairs trading opportunities between stocks"""
    try:
        if len(symbols) != 2:
            raise HTTPException(status_code=400, detail="Exactly 2 symbols required for pairs trading")
        
        loop = asyncio.get_event_loop()
        
        # Fetch historical data for both stocks
        df1_future = loop.run_in_executor(executor, get_historical_data, symbols[0].upper(), "1y")
        df2_future = loop.run_in_executor(executor, get_historical_data, symbols[1].upper(), "1y")
        
        df1, df2 = await asyncio.gather(df1_future, df2_future)
        
        # Analyze pairs trading
        pairs_analysis = await loop.run_in_executor(
            executor,
            pairs_trading_suggestion,
            df1, df2, symbols[0].upper(), symbols[1].upper()
        )
        
        return pairs_analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in pairs trading analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Model Performance & Backtesting ==============

@api_router.get("/models/performance")
async def model_performance(model_type: Optional[str] = None, symbol: Optional[str] = None):
    """Get model performance statistics"""
    try:
        performance = await get_model_performance(db, model_type, symbol)
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/models/evaluate")
async def evaluate_model_predictions():
    """Evaluate past predictions against actual prices"""
    try:
        async def get_price(symbol):
            try:
                loop = asyncio.get_event_loop()
                info = await loop.run_in_executor(executor, get_stock_info, symbol)
                return info.get('current_price')
            except:
                return None
        
        count = await evaluate_predictions(db, get_price)
        return {"evaluated_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stocks/{symbol}/backtest")
async def backtest_predictions(symbol: str, timeframe: str = "1y"):
    """Backtest prediction strategy"""
    try:
        loop = asyncio.get_event_loop()
        
        # Get historical data
        df = await loop.run_in_executor(executor, get_historical_data, symbol.upper(), timeframe)
        
        # Get past predictions for this symbol
        predictions = await db.model_predictions.find(
            {"symbol": symbol.upper(), "is_evaluated": True},
            {"_id": 0}
        ).to_list(100)
        
        if not predictions:
            raise HTTPException(status_code=404, detail="No evaluated predictions found for backtesting")
        
        # Run backtest
        backtest_results = await loop.run_in_executor(
            executor,
            backtest_strategy,
            df, predictions, 10000
        )
        
        return backtest_results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in backtesting: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Custom Ensemble Weights ==============

class CustomWeights(BaseModel):
    lstm_weight: float = 0.4
    linear_weight: float = 0.2
    zscore_weight: float = 0.2
    ou_weight: float = 0.2

@api_router.post("/stocks/{symbol}/predict/custom")
async def predict_with_custom_weights(symbol: str, request: StockPredictionRequest, weights: CustomWeights):
    """Predict with custom ensemble weights"""
    try:
        # Validate weights sum to 1
        total_weight = weights.lstm_weight + weights.linear_weight + weights.zscore_weight + weights.ou_weight
        if abs(total_weight - 1.0) > 0.01:
            raise HTTPException(status_code=400, detail="Weights must sum to 1.0")
        
        days_map = {"7d": 7, "30d": 30, "90d": 90, "180d": 180}
        days_ahead = days_map.get(request.timeframe, 30)
        
        loop = asyncio.get_event_loop()
        
        # Fetch data
        info_future = loop.run_in_executor(executor, get_stock_info, symbol.upper())
        hist_future = loop.run_in_executor(executor, get_historical_data, symbol.upper(), "5y")
        
        info, df = await asyncio.gather(info_future, hist_future)
        
        # Run all models
        linear_future = loop.run_in_executor(executor, statistical_prediction, df.copy(), days_ahead)
        lstm_future = loop.run_in_executor(executor, lstm_prediction, df.copy(), days_ahead, symbol.upper())
        zscore_future = loop.run_in_executor(executor, z_score_mean_reversion, df.copy(), days_ahead, 20)
        ou_future = loop.run_in_executor(executor, ornstein_uhlenbeck_process, df.copy(), days_ahead)
        
        linear_pred, lstm_pred, zscore_pred, ou_pred = await asyncio.gather(
            linear_future, lstm_future, zscore_future, ou_future
        )
        
        # Apply custom weights
        custom_weights = {
            "lstm": weights.lstm_weight,
            "linear": weights.linear_weight,
            "zscore": weights.zscore_weight,
            "ou": weights.ou_weight
        }
        
        ensemble_price = (
            lstm_pred["predicted_price_end"] * custom_weights["lstm"] +
            linear_pred["predicted_price_end"] * custom_weights["linear"] +
            zscore_pred["predicted_price_end"] * custom_weights["zscore"] +
            ou_pred["predicted_price_end"] * custom_weights["ou"]
        )
        
        # Calculate confidence intervals
        all_predictions = [
            lstm_pred["predicted_price_end"],
            linear_pred["predicted_price_end"],
            zscore_pred["predicted_price_end"],
            ou_pred["predicted_price_end"]
        ]
        
        confidence_interval = calculate_confidence_intervals(all_predictions, 0.95)
        
        current_price = info["current_price"]
        ensemble_change = ((ensemble_price - current_price) / current_price) * 100
        
        return {
            "symbol": symbol.upper(),
            "ensemble_prediction": {
                "predicted_price": float(ensemble_price),
                "price_change_percent": float(ensemble_change),
                "trend": "bullish" if ensemble_price > current_price else "bearish",
                "custom_weights": custom_weights
            },
            "confidence_interval": confidence_interval,
            "individual_predictions": {
                "lstm": lstm_pred,
                "linear_regression": linear_pred,
                "z_score_mean_reversion": zscore_pred,
                "ornstein_uhlenbeck": ou_pred
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in custom weights prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Portfolio Optimization & Kelly Criterion ==============

@api_router.post("/portfolio/optimize")
async def optimize_portfolio_endpoint(symbols: List[str], period: str = "1y"):
    """Optimize portfolio using Modern Portfolio Theory"""
    try:
        if len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            optimize_portfolio,
            symbols,
            period
        )
        return result
    except Exception as e:
        logger.error(f"Portfolio optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/portfolio/efficient-frontier")
async def efficient_frontier_endpoint(symbols: List[str], period: str = "1y", num_portfolios: int = 100):
    """Generate efficient frontier"""
    try:
        if len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            generate_efficient_frontier,
            symbols,
            period,
            num_portfolios
        )
        return result
    except Exception as e:
        logger.error(f"Efficient frontier error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class KellyRequest(BaseModel):
    account_balance: float
    win_probability: float
    avg_win: float
    avg_loss: float
    fraction: float = 0.5


@api_router.post("/portfolio/kelly-criterion")
async def kelly_criterion_endpoint(request: KellyRequest):
    """Calculate optimal position size using Kelly Criterion"""
    try:
        result = calculate_position_size_kelly(
            request.account_balance,
            request.win_probability,
            request.avg_win,
            request.avg_loss,
            request.fraction
        )
        return result
    except Exception as e:
        logger.error(f"Kelly criterion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class MarginRequest(BaseModel):
    account_balance: float
    position_size: float
    maintenance_margin: float = 0.25
    initial_margin: float = 0.5


@api_router.post("/portfolio/margin-calculator")
async def margin_calculator_endpoint(request: MarginRequest):
    """Calculate margin requirements and leverage"""
    try:
        result = calculate_margin_leverage(
            request.account_balance,
            request.position_size,
            request.maintenance_margin,
            request.initial_margin
        )
        return result
    except Exception as e:
        logger.error(f"Margin calculator error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class OptimalLeverageRequest(BaseModel):
    account_balance: float
    expected_return: float
    volatility: float
    risk_free_rate: float = 0.02


@api_router.post("/portfolio/optimal-leverage")
async def optimal_leverage_endpoint(request: OptimalLeverageRequest):
    """Calculate optimal leverage"""
    try:
        result = optimal_leverage(
            request.account_balance,
            request.expected_return,
            request.volatility,
            request.risk_free_rate
        )
        return result
    except Exception as e:
        logger.error(f"Optimal leverage error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Advanced Risk Metrics ==============

class RiskAnalysisRequest(BaseModel):
    symbols: List[str]
    weights: List[float]
    portfolio_value: float
    period: str = "1y"
    confidence_level: float = 0.95


@api_router.post("/portfolio/risk-analysis")
async def risk_analysis_endpoint(request: RiskAnalysisRequest):
    """Comprehensive portfolio risk analysis (VaR, CVaR, Max Drawdown, etc.)"""
    try:
        if len(request.symbols) != len(request.weights):
            raise HTTPException(status_code=400, detail="Symbols and weights must have same length")
        
        if abs(sum(request.weights) - 1.0) > 0.01:
            raise HTTPException(status_code=400, detail="Weights must sum to 1.0")
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            portfolio_risk_analysis,
            request.symbols,
            request.weights,
            request.portfolio_value,
            request.period,
            request.confidence_level
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class MonteCarloRequest(BaseModel):
    initial_value: float
    expected_return: float
    volatility: float
    days: int = 252
    simulations: int = 1000


@api_router.post("/portfolio/monte-carlo")
async def monte_carlo_endpoint(request: MonteCarloRequest):
    """Run Monte Carlo simulation for portfolio"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            monte_carlo_simulation,
            request.initial_value,
            request.expected_return,
            request.volatility,
            request.days,
            request.simulations
        )
        return result
    except Exception as e:
        logger.error(f"Monte Carlo simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class RebalancingRequest(BaseModel):
    current_weights: Dict[str, float]
    target_weights: Dict[str, float]
    portfolio_value: float
    threshold: float = 0.05


@api_router.post("/portfolio/rebalancing-advice")
async def rebalancing_advice_endpoint(request: RebalancingRequest):
    """Get portfolio rebalancing recommendations"""
    try:
        result = portfolio_rebalancing_advice(
            request.current_weights,
            request.target_weights,
            request.portfolio_value,
            request.threshold
        )
        return result
    except Exception as e:
        logger.error(f"Rebalancing advice error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Options Chain Data (Real-time Bid/Ask/LTP) ==============

@api_router.get("/options-chain/{symbol}")
async def get_options_chain_endpoint(symbol: str, expiry: Optional[str] = None):
    """Get complete options chain with Bid/Ask/LTP"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            get_options_chain,
            symbol.upper(),
            expiry
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Options chain error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/options-chain/{symbol}/atm")
async def get_atm_options_endpoint(symbol: str, expiry: Optional[str] = None, num_strikes: int = 5):
    """Get ATM options and nearby strikes"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            get_atm_options,
            symbol.upper(),
            expiry,
            num_strikes
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ATM options error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/options-chain/{symbol}/expiries")
async def get_expiries_endpoint(symbol: str):
    """Get available expiration dates for a symbol"""
    try:
        loop = asyncio.get_event_loop()
        expiries = await loop.run_in_executor(
            executor,
            get_available_expiries,
            symbol.upper()
        )
        return {"symbol": symbol.upper(), "expiries": expiries}
    except Exception as e:
        logger.error(f"Get expiries error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/options-chain/{symbol}/summary")
async def get_options_summary_endpoint(symbol: str, expiry: Optional[str] = None):
    """Get options chain summary (volume, OI, PCR, IV)"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            get_options_summary,
            symbol.upper(),
            expiry
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Options summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Technical Analysis (TA-Lib, VIX, Earnings) ==============

@api_router.get("/technical-analysis/{symbol}")
async def technical_analysis_endpoint(symbol: str, period: str = "6mo"):
    """Get complete technical analysis with all indicators"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            get_technical_indicators,
            symbol.upper(),
            period
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Technical analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/market/vix")
async def vix_data_endpoint():
    """Get VIX (Volatility Index) data and interpretation"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, get_vix_data)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VIX data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/earnings/{symbol}")
async def earnings_calendar_endpoint(symbol: str):
    """Get earnings calendar for a symbol"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            get_earnings_calendar,
            symbol.upper()
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Earnings calendar error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/market/overview")
async def market_overview_endpoint():
    """Get market overview with major indices"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, get_market_overview)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market overview error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Data Persistence (Save/Load Portfolios & Strategies) ==============

@api_router.post("/portfolios/save")
async def save_portfolio(portfolio_data: Dict[str, Any]):
    """Save portfolio configuration"""
    try:
        portfolio_data["created_at"] = datetime.now(timezone.utc).isoformat()
        portfolio_data["id"] = portfolio_data.get("id", str(uuid.uuid4()))
        
        # Upsert (update if exists, insert if not)
        await db.portfolios.update_one(
            {"id": portfolio_data["id"]},
            {"$set": portfolio_data},
            upsert=True
        )
        
        return {"success": True, "id": portfolio_data["id"], "message": "Portfolio saved successfully"}
    except Exception as e:
        logger.error(f"Save portfolio error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/portfolios/list")
async def list_portfolios():
    """List all saved portfolios"""
    try:
        portfolios = await db.portfolios.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"portfolios": portfolios}
    except Exception as e:
        logger.error(f"List portfolios error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/portfolios/{portfolio_id}")
async def get_portfolio(portfolio_id: str):
    """Load a specific portfolio"""
    try:
        portfolio = await db.portfolios.find_one({"id": portfolio_id}, {"_id": 0})
        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return portfolio
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get portfolio error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/portfolios/{portfolio_id}")
async def delete_portfolio(portfolio_id: str):
    """Delete a portfolio"""
    try:
        result = await db.portfolios.delete_one({"id": portfolio_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return {"success": True, "message": "Portfolio deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete portfolio error: {str(e)}")
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


# ==================== UPSTOX INTEGRATION (INDIAN MARKETS) ====================

@api_router.get("/upstox/auth/login")
async def upstox_login():
    """Initiate Upstox OAuth login flow for Indian market access"""
    try:
        auth_url = get_authorization_url()
        return {"authorization_url": auth_url}
    except Exception as e:
        logger.error(f"Upstox login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate Upstox login")

@api_router.get("/upstox/callback")
async def upstox_callback(code: str = None):
    """Handle Upstox OAuth callback"""
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")
    
    try:
        loop = asyncio.get_event_loop()
        token_data = await loop.run_in_executor(executor, exchange_code_for_token, code)
        
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=token_data["error"])
        
        # Store token in database for user
        access_token = token_data.get("access_token")
        # In production, associate with user session
        
        # For now, return token to frontend
        # In production: redirect to frontend with token
        return {
            "access_token": access_token,
            "message": "Successfully authenticated with Upstox"
        }
    except Exception as e:
        logger.error(f"Upstox callback error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.get("/upstox/quote/{symbol}")
async def get_indian_stock_quote(symbol: str):
    """
    Get real-time quote for Indian stock (read-only, no auth required for demo)
    In production, this would require user authentication and stored token
    """
    try:
        # For demo/read-only mode, we'll use a mock response
        # In production with user auth, use: get_market_quote(symbol, user_access_token)
        
        # Mock response for demonstration
        quote_data = {
            "symbol": symbol.upper(),
            "last_price": 2500.00 if symbol.upper() == "RELIANCE" else 3500.00,
            "open": 2490.00 if symbol.upper() == "RELIANCE" else 3480.00,
            "high": 2520.00 if symbol.upper() == "RELIANCE" else 3530.00,
            "low": 2480.00 if symbol.upper() == "RELIANCE" else 3460.00,
            "close": 2500.00 if symbol.upper() == "RELIANCE" else 3500.00,
            "volume": 1000000,
            "timestamp": datetime.now().isoformat(),
            "exchange": "NSE",
            "note": "Demo data - Connect your Upstox account for real-time data"
        }
        
        return quote_data
    except Exception as e:
        logger.error(f"Error fetching Indian stock quote for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch quote")

@api_router.get("/upstox/historical/{symbol}")
async def get_indian_stock_historical(
    symbol: str,
    interval: str = "1day",
    from_date: str = None,
    to_date: str = None
):
    """Get historical data for Indian stock"""
    try:
        # Mock historical data for demonstration
        # In production with auth: get_historical_candles(symbol, token, interval, from_date, to_date)
        
        if not to_date:
            to_date = datetime.now().strftime("%Y-%m-%d")
        if not from_date:
            from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Generate mock candles
        mock_candles = []
        base_price = 2500 if symbol.upper() == "RELIANCE" else 3500
        current_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d")
        
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() < 5:
                variation = (hash(current_date.isoformat()) % 100) - 50
                open_price = base_price + variation
                close_price = open_price + ((hash(str(current_date) + "close") % 20) - 10)
                high_price = max(open_price, close_price) + (hash(str(current_date) + "high") % 10)
                low_price = min(open_price, close_price) - (hash(str(current_date) + "low") % 10)
                
                mock_candles.append({
                    "timestamp": current_date.isoformat(),
                    "open": round(open_price, 2),
                    "high": round(high_price, 2),
                    "low": round(low_price, 2),
                    "close": round(close_price, 2),
                    "volume": 1000000 + (hash(str(current_date) + "vol") % 500000)
                })
            
            current_date += timedelta(days=1)
        
        return {
            "symbol": symbol.upper(),
            "interval": interval,
            "from_date": from_date,
            "to_date": to_date,
            "candles": mock_candles,
            "note": "Demo data - Connect your Upstox account for real historical data"
        }
    except Exception as e:
        logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch historical data")

@api_router.get("/upstox/popular-stocks")
async def get_popular_indian_stocks_list():
    """Get list of popular Indian stocks for quick access"""
    try:
        stocks = get_popular_indian_stocks()
        return {
            "stocks": stocks,
            "count": len(stocks)
        }
    except Exception as e:
        logger.error(f"Error fetching popular stocks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch stock list")

@api_router.post("/upstox/search")
async def search_indian_stocks(search_query: dict):
    """Search for Indian stocks by symbol or name"""
    query = search_query.get("query", "").upper()
    
    if not query or len(query) < 2:
        return {"results": []}
    
    # Get all popular stocks
    all_stocks = get_popular_indian_stocks()
    
    # Filter by query
    results = [
        stock for stock in all_stocks
        if query in stock["symbol"] or query in stock["name"].upper()
    ]
    
    return {
        "query": query,
        "results": results[:10]  # Limit to 10 results
    }

    client.close()