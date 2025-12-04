"""
Extract stock tickers from natural language queries
"""
import re
from typing import List, Optional, Dict
import yfinance as yf

# Common company name to ticker mappings
COMPANY_TICKER_MAP = {
    "apple": "AAPL",
    "microsoft": "MSFT",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "amazon": "AMZN",
    "nvidia": "NVDA",
    "tesla": "TSLA",
    "meta": "META",
    "facebook": "META",
    "netflix": "NFLX",
    "adobe": "ADBE",
    "intel": "INTC",
    "amd": "AMD",
    "qualcomm": "QCOM",
    "cisco": "CSCO",
    "oracle": "ORCL",
    "salesforce": "CRM",
    "paypal": "PYPL",
    "visa": "V",
    "mastercard": "MA",
    "jpmorgan": "JPM",
    "bank of america": "BAC",
    "wells fargo": "WFC",
    "goldman sachs": "GS",
    "morgan stanley": "MS",
    "berkshire": "BRK.B",
    "coca cola": "KO",
    "pepsi": "PEP",
    "walmart": "WMT",
    "target": "TGT",
    "costco": "COST",
    "disney": "DIS",
    "nike": "NKE",
    "starbucks": "SBUX",
    "mcdonald": "MCD",
    "boeing": "BA",
    "caterpillar": "CAT",
    "3m": "MMM",
    "ge": "GE",
    "general electric": "GE",
    "ford": "F",
    "gm": "GM",
    "general motors": "GM",
    "exxon": "XOM",
    "chevron": "CVX",
    "pfizer": "PFE",
    "johnson": "JNJ",
    "merck": "MRK",
    "abbvie": "ABBV",
    "eli lilly": "LLY",
    "bitcoin": "BTC-USD",
    "ethereum": "ETH-USD",
    "dogecoin": "DOGE-USD"
}

# Investment action keywords
BUY_KEYWORDS = ["buy", "purchase", "invest", "long", "bullish", "accumulate"]
SELL_KEYWORDS = ["sell", "short", "bearish", "dump", "exit"]
HOLD_KEYWORDS = ["hold", "keep", "maintain", "stay"]
PRICE_KEYWORDS = ["price", "cost", "value", "worth", "trading at"]
PREDICTION_KEYWORDS = ["predict", "forecast", "future", "outlook", "target", "expect"]


def extract_stock_tickers(text: str) -> List[str]:
    """Extract stock tickers from text"""
    text_lower = text.lower()
    tickers = []
    
    # Check for explicit ticker format (e.g., $AAPL, AAPL)
    ticker_pattern = r'\$?([A-Z]{1,5}(?:\.[A-Z]{1,2})?)'
    matches = re.findall(ticker_pattern, text)
    tickers.extend(matches)
    
    # Check company names
    for company, ticker in COMPANY_TICKER_MAP.items():
        if company in text_lower:
            tickers.append(ticker)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_tickers = []
    for ticker in tickers:
        if ticker not in seen:
            seen.add(ticker)
            unique_tickers.append(ticker)
    
    return unique_tickers


def detect_intent(text: str) -> Dict[str, any]:
    """Detect user intent regarding stocks"""
    text_lower = text.lower()
    
    intent = {
        "action": None,
        "wants_price": False,
        "wants_prediction": False,
        "wants_analysis": False,
        "tickers": []
    }
    
    # Extract tickers
    intent["tickers"] = extract_stock_tickers(text)
    
    # Detect action
    if any(word in text_lower for word in BUY_KEYWORDS):
        intent["action"] = "BUY"
    elif any(word in text_lower for word in SELL_KEYWORDS):
        intent["action"] = "SELL"
    elif any(word in text_lower for word in HOLD_KEYWORDS):
        intent["action"] = "HOLD"
    
    # Detect information needs
    if any(word in text_lower for word in PRICE_KEYWORDS):
        intent["wants_price"] = True
    
    if any(word in text_lower for word in PREDICTION_KEYWORDS):
        intent["wants_prediction"] = True
    
    # General analysis if asking about a stock
    if intent["tickers"] and any(word in text_lower for word in ["should", "what do you think", "opinion", "analysis", "recommendation"]):
        intent["wants_analysis"] = True
    
    return intent


def validate_ticker(ticker: str) -> bool:
    """Validate if ticker exists"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        return info.get('regularMarketPrice') is not None or info.get('currentPrice') is not None
    except:
        return False
