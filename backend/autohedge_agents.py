"""
AutoHedge-style Multi-Agent Trading System
Inspired by The Swarm Corporation's AutoHedge framework
"""
from typing import Dict, List, Any
from datetime import datetime, timezone
import logging
from pydantic import BaseModel, ConfigDict
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

logger = logging.getLogger(__name__)


class AgentAnalysis(BaseModel):
    """Base model for agent analysis"""
    agent_name: str
    recommendation: str  # BUY, SELL, HOLD
    confidence: float  # 0-100
    reasoning: str
    key_points: List[str]


class TradeRecommendation(BaseModel):
    """Structured trade recommendation output"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    action: str  # BUY, SELL, HOLD
    symbol: str
    consensus_score: float  # 0-100
    position_size_percent: float  # % of portfolio
    entry_price_range: Dict[str, float]  # {"min": X, "max": Y}
    target_price: float
    stop_loss: float
    risk_reward_ratio: float
    time_horizon: str  # "short-term", "medium-term", "long-term"
    risk_level: int  # 1-10
    agents_analysis: Dict[str, AgentAnalysis]
    execution_plan: Dict[str, Any]
    timestamp: str


class DirectorAgent:
    """
    Director Agent - Generates trading thesis and overall strategy
    Coordinates the multi-agent system
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agent_name = "Director"
        
    async def generate_thesis(
        self, 
        stock_symbol: str, 
        stock_info: Dict, 
        technical_indicators: Dict,
        task: str
    ) -> AgentAnalysis:
        """Generate investment thesis"""
        
        prompt = f"""You are the Director Agent of an autonomous hedge fund. Your role is to generate a comprehensive investment thesis.

**Stock:** {stock_symbol} - {stock_info.get('name', 'Unknown')}
**Current Price:** ${stock_info.get('current_price', 0):.2f}
**Market Cap:** ${stock_info.get('market_cap', 0)/1e9:.2f}B
**P/E Ratio:** {stock_info.get('pe_ratio', 'N/A')}
**Sector:** {stock_info.get('sector', 'N/A')}

**Technical Context:**
- RSI: {technical_indicators.get('rsi', 0):.1f}
- Price vs MA-50: {"Above" if stock_info.get('current_price', 0) > technical_indicators.get('moving_averages', {}).get('ma_50', 0) else "Below"}

**Task:** {task}

**Your Analysis Must Include:**
1. **Fundamental Assessment** - Company strength, competitive position, growth prospects
2. **Market Conditions** - Sector trends, macro environment
3. **Investment Thesis** - Why buy/sell/hold now?
4. **Time Horizon** - Short-term (days), Medium-term (weeks-months), Long-term (months-years)

**Output Format (JSON):**
{{
    "recommendation": "BUY" | "SELL" | "HOLD",
    "confidence": 0-100,
    "reasoning": "Detailed strategic reasoning",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "time_horizon": "short-term" | "medium-term" | "long-term"
}}

Provide your analysis as valid JSON only."""

        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"director_{stock_symbol}_{datetime.now().timestamp()}",
            system_message="You are a strategic investment director. Provide analysis in JSON format only."
        ).with_model("openai", "gpt-5.1")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            # Parse JSON response
            analysis_data = json.loads(response)
            return AgentAnalysis(
                agent_name="Director",
                recommendation=analysis_data["recommendation"],
                confidence=float(analysis_data["confidence"]),
                reasoning=analysis_data["reasoning"],
                key_points=analysis_data["key_points"]
            )
        except:
            # Fallback if JSON parsing fails
            return AgentAnalysis(
                agent_name="Director",
                recommendation="HOLD",
                confidence=50.0,
                reasoning=response,
                key_points=["Analysis pending"]
            )


class QuantAgent:
    """
    Quantitative Analyst Agent - Technical analysis and statistical evaluation
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agent_name = "Quant"
        
    async def analyze(
        self,
        stock_symbol: str,
        technical_indicators: Dict,
        trading_signals: Dict,
        prediction: Dict,
        current_price: float
    ) -> AgentAnalysis:
        """Perform quantitative analysis"""
        
        prompt = f"""You are the Quantitative Analyst of an autonomous hedge fund. Analyze the technical setup.

**Stock:** {stock_symbol}
**Current Price:** ${current_price:.2f}

**Technical Indicators:**
- RSI: {technical_indicators.get('rsi', 0):.1f} (Oversold <30, Overbought >70)
- MACD: {technical_indicators.get('macd', {}).get('macd', 0):.2f}
- MA-20: ${technical_indicators.get('moving_averages', {}).get('ma_20', 0):.2f}
- MA-50: ${technical_indicators.get('moving_averages', {}).get('ma_50', 0):.2f}
- MA-200: ${technical_indicators.get('moving_averages', {}).get('ma_200', 0):.2f}

**Trading Signals:**
- Overall Signal: {trading_signals.get('overall_signal', 'NEUTRAL')}
- Buy Signals: {trading_signals.get('buy_count', 0)}
- Sell Signals: {trading_signals.get('sell_count', 0)}

**Prediction (30d):**
- Predicted Price: ${prediction.get('predicted_price_end', 0):.2f}
- Expected Change: {prediction.get('price_change_percent', 0):+.2f}%
- Confidence: {prediction.get('confidence', 0):.1f}%

**Your Analysis:**
1. **Technical Setup Quality** - Is this a good entry point?
2. **Momentum Assessment** - Trending up or down?
3. **Statistical Edge** - What's the probability of success?
4. **Key Levels** - Support/resistance levels

**Output Format (JSON):**
{{
    "recommendation": "BUY" | "SELL" | "HOLD",
    "confidence": 0-100,
    "reasoning": "Technical analysis reasoning",
    "key_points": ["Technical point 1", "Technical point 2", "Technical point 3"]
}}

Provide your analysis as valid JSON only."""

        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"quant_{stock_symbol}_{datetime.now().timestamp()}",
            system_message="You are a quantitative analyst. Provide analysis in JSON format only."
        ).with_model("openai", "gpt-5.1")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            analysis_data = json.loads(response)
            return AgentAnalysis(
                agent_name="Quant",
                recommendation=analysis_data["recommendation"],
                confidence=float(analysis_data["confidence"]),
                reasoning=analysis_data["reasoning"],
                key_points=analysis_data["key_points"]
            )
        except:
            return AgentAnalysis(
                agent_name="Quant",
                recommendation="HOLD",
                confidence=50.0,
                reasoning=response,
                key_points=["Analysis pending"]
            )


class RiskManagerAgent:
    """
    Risk Manager Agent - Risk assessment and position sizing
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agent_name = "Risk Manager"
        
    async def assess_risk(
        self,
        stock_symbol: str,
        director_analysis: AgentAnalysis,
        quant_analysis: AgentAnalysis,
        volatility: float,
        portfolio_allocation: float = 100000.0
    ) -> AgentAnalysis:
        """Assess risk and determine position sizing"""
        
        prompt = f"""You are the Risk Manager of an autonomous hedge fund. Assess trade risk and determine position size.

**Stock:** {stock_symbol}
**Available Capital:** ${portfolio_allocation:,.0f}

**Director's View:**
- Recommendation: {director_analysis.recommendation}
- Confidence: {director_analysis.confidence:.0f}%
- Key Points: {', '.join(director_analysis.key_points[:2])}

**Quant's View:**
- Recommendation: {quant_analysis.recommendation}
- Confidence: {quant_analysis.confidence:.0f}%

**Risk Metrics:**
- Historical Volatility: {volatility:.2f}%

**Your Risk Assessment:**
1. **Risk Level** (1-10 scale) - How risky is this trade?
2. **Position Size** - What % of portfolio? (1-25% typical range)
3. **Risk Factors** - What could go wrong?
4. **Risk Mitigation** - How to protect capital?

**Position Sizing Guidelines:**
- Low Risk (1-3): Up to 15-25% position
- Medium Risk (4-6): 8-15% position
- High Risk (7-10): 2-8% position

**Output Format (JSON):**
{{
    "recommendation": "BUY" | "SELL" | "HOLD",
    "confidence": 0-100,
    "reasoning": "Risk assessment reasoning",
    "key_points": ["Risk point 1", "Risk point 2", "Risk point 3"],
    "risk_level": 1-10,
    "position_size_percent": 1-25
}}

Provide your analysis as valid JSON only."""

        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"risk_{stock_symbol}_{datetime.now().timestamp()}",
            system_message="You are a risk manager. Provide analysis in JSON format only."
        ).with_model("openai", "gpt-5.1")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            analysis_data = json.loads(response)
            return AgentAnalysis(
                agent_name="Risk Manager",
                recommendation=analysis_data["recommendation"],
                confidence=float(analysis_data["confidence"]),
                reasoning=analysis_data["reasoning"],
                key_points=analysis_data["key_points"]
            )
        except:
            return AgentAnalysis(
                agent_name="Risk Manager",
                recommendation="HOLD",
                confidence=50.0,
                reasoning=response,
                key_points=["Analysis pending"]
            )


class ExecutionAgent:
    """
    Execution Agent - Generates trade orders with entry/exit points
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agent_name = "Execution"
        
    async def generate_order(
        self,
        stock_symbol: str,
        consensus_recommendation: str,
        current_price: float,
        risk_level: int,
        position_size_percent: float,
        volatility: float
    ) -> Dict:
        """Generate execution plan with entry/exit points"""
        
        # Calculate entry range (±2% from current)
        entry_min = current_price * 0.98
        entry_max = current_price * 1.02
        
        # Calculate target and stop-loss based on risk
        if consensus_recommendation == "BUY":
            # Target: 10-30% above based on risk
            target_multiplier = 1.10 + (risk_level * 0.02)  # 1.10 to 1.30
            target_price = current_price * target_multiplier
            
            # Stop-loss: 5-15% below based on risk
            stop_multiplier = 1.0 - (0.05 + risk_level * 0.01)  # 0.95 to 0.85
            stop_loss = current_price * stop_multiplier
            
        elif consensus_recommendation == "SELL":
            # For selling, inverse logic
            target_price = current_price * 0.90
            stop_loss = current_price * 1.05
        else:
            # HOLD - no trade
            target_price = current_price
            stop_loss = current_price
        
        # Calculate risk-reward ratio
        risk_reward_ratio = abs(target_price - current_price) / abs(stop_loss - current_price) if stop_loss != current_price else 0
        
        return {
            "action": consensus_recommendation,
            "entry_price_range": {
                "min": round(entry_min, 2),
                "max": round(entry_max, 2)
            },
            "target_price": round(target_price, 2),
            "stop_loss": round(stop_loss, 2),
            "risk_reward_ratio": round(risk_reward_ratio, 2),
            "execution_style": "Limit Order" if consensus_recommendation != "HOLD" else "No Trade",
            "notes": f"Position size: {position_size_percent:.1f}% of portfolio"
        }


async def run_autohedge_analysis(
    stock_symbol: str,
    stock_info: Dict,
    technical_indicators: Dict,
    trading_signals: Dict,
    prediction: Dict,
    task: str,
    api_key: str,
    portfolio_allocation: float = 100000.0
) -> TradeRecommendation:
    """
    Run full AutoHedge multi-agent analysis
    Returns structured trade recommendation
    """
    
    # Initialize agents
    director = DirectorAgent(api_key)
    quant = QuantAgent(api_key)
    risk_manager = RiskManagerAgent(api_key)
    execution = ExecutionAgent(api_key)
    
    logger.info(f"Starting AutoHedge analysis for {stock_symbol}")
    
    # Run agents in sequence (Director -> Quant -> Risk -> Execution)
    director_analysis = await director.generate_thesis(
        stock_symbol=stock_symbol,
        stock_info=stock_info,
        technical_indicators=technical_indicators,
        task=task
    )
    
    quant_analysis = await quant.analyze(
        stock_symbol=stock_symbol,
        technical_indicators=technical_indicators,
        trading_signals=trading_signals,
        prediction=prediction,
        current_price=stock_info["current_price"]
    )
    
    risk_analysis = await risk_manager.assess_risk(
        stock_symbol=stock_symbol,
        director_analysis=director_analysis,
        quant_analysis=quant_analysis,
        volatility=prediction.get("volatility", 20.0),
        portfolio_allocation=portfolio_allocation
    )
    
    # Determine consensus
    votes = {
        "BUY": 0,
        "SELL": 0,
        "HOLD": 0
    }
    
    total_confidence = 0
    for analysis in [director_analysis, quant_analysis, risk_analysis]:
        votes[analysis.recommendation] += 1
        total_confidence += analysis.confidence
    
    # Consensus is the majority vote
    consensus_action = max(votes, key=votes.get)
    consensus_score = (total_confidence / 3)  # Average confidence
    
    # Extract risk level and position size from risk manager
    try:
        risk_data = json.loads(risk_analysis.reasoning)
        risk_level = risk_data.get("risk_level", 5)
        position_size = risk_data.get("position_size_percent", 10.0)
    except:
        risk_level = 5
        position_size = 10.0
    
    # Generate execution plan
    execution_plan = await execution.generate_order(
        stock_symbol=stock_symbol,
        consensus_recommendation=consensus_action,
        current_price=stock_info["current_price"],
        risk_level=risk_level,
        position_size_percent=position_size,
        volatility=prediction.get("volatility", 20.0)
    )
    
    # Build final recommendation
    recommendation = TradeRecommendation(
        action=consensus_action,
        symbol=stock_symbol,
        consensus_score=consensus_score,
        position_size_percent=position_size,
        entry_price_range=execution_plan["entry_price_range"],
        target_price=execution_plan["target_price"],
        stop_loss=execution_plan["stop_loss"],
        risk_reward_ratio=execution_plan["risk_reward_ratio"],
        time_horizon=getattr(director_analysis, 'time_horizon', 'medium-term'),
        risk_level=risk_level,
        agents_analysis={
            "director": director_analysis,
            "quant": quant_analysis,
            "risk_manager": risk_analysis
        },
        execution_plan=execution_plan,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    
    logger.info(f"AutoHedge analysis complete: {consensus_action} with {consensus_score:.0f}% confidence")
    
    return recommendation
