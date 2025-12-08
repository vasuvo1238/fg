"""
News and Sentiment Analysis Module
Provides real-time financial news and sentiment analysis using free data sources
"""
import yfinance as yf
from datetime import datetime
from typing import List, Dict, Optional
import logging
import re

logger = logging.getLogger(__name__)


def get_stock_news(symbol: str, limit: int = 10) -> List[Dict]:
    """
    Fetch latest news for a stock symbol using yfinance (100% free)
    
    Args:
        symbol: Stock ticker symbol
        limit: Maximum number of news articles to return
        
    Returns:
        List of news articles with sentiment analysis
    """
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news if hasattr(ticker, 'news') else []
        
        if not news:
            return []
        
        processed_news = []
        for article in news[:limit]:
            content = article.get('content', {})
            
            # Extract key information
            title = content.get('title', '')
            summary = content.get('summary', '')
            pub_date = content.get('pubDate', '')
            provider = article.get('provider', {}).get('displayName', 'Unknown')
            url = article.get('clickThroughUrl', {}).get('url', '')
            thumbnail = None
            
            # Extract thumbnail
            thumb_data = content.get('thumbnail', {})
            if thumb_data and 'resolutions' in thumb_data:
                resolutions = thumb_data['resolutions']
                if resolutions:
                    # Get smallest resolution for performance
                    thumbnail = resolutions[-1].get('url', None)
            
            # Simple sentiment analysis based on keywords
            sentiment = analyze_sentiment(title + ' ' + summary)
            
            processed_news.append({
                'title': title,
                'summary': summary,
                'url': url,
                'published_at': pub_date,
                'provider': provider,
                'thumbnail': thumbnail,
                'sentiment': sentiment['label'],
                'sentiment_score': sentiment['score']
            })
        
        return processed_news
        
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {e}")
        return []


def analyze_sentiment(text: str) -> Dict[str, any]:
    """
    Simple rule-based sentiment analysis (free, no API needed)
    
    Args:
        text: Text to analyze
        
    Returns:
        Dict with sentiment label and score
    """
    if not text:
        return {'label': 'neutral', 'score': 0.0}
    
    text_lower = text.lower()
    
    # Positive keywords
    positive_words = [
        'surge', 'soar', 'rally', 'gain', 'profit', 'growth', 'boost', 'rise',
        'increase', 'up', 'bullish', 'outperform', 'beat', 'strong', 'positive',
        'upgrade', 'buy', 'success', 'record', 'high', 'jump', 'advance'
    ]
    
    # Negative keywords
    negative_words = [
        'plunge', 'crash', 'fall', 'drop', 'loss', 'decline', 'down', 'bearish',
        'underperform', 'miss', 'weak', 'negative', 'downgrade', 'sell', 'failure',
        'low', 'tumble', 'slide', 'slump', 'concern', 'risk', 'warning'
    ]
    
    # Count occurrences
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    # Calculate score
    total = positive_count + negative_count
    if total == 0:
        return {'label': 'neutral', 'score': 0.0}
    
    score = (positive_count - negative_count) / total
    
    # Determine label
    if score > 0.2:
        label = 'positive'
    elif score < -0.2:
        label = 'negative'
    else:
        label = 'neutral'
    
    return {
        'label': label,
        'score': round(score, 2),
        'positive_signals': positive_count,
        'negative_signals': negative_count
    }


def get_news_sentiment_summary(symbol: str) -> Dict:
    """
    Get overall sentiment summary for a stock based on recent news
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Dict with sentiment summary statistics
    """
    try:
        news = get_stock_news(symbol, limit=20)
        
        if not news:
            return {
                'overall_sentiment': 'neutral',
                'sentiment_score': 0.0,
                'positive_count': 0,
                'negative_count': 0,
                'neutral_count': 0,
                'total_articles': 0
            }
        
        sentiments = [article['sentiment'] for article in news]
        scores = [article['sentiment_score'] for article in news]
        
        positive_count = sentiments.count('positive')
        negative_count = sentiments.count('negative')
        neutral_count = sentiments.count('neutral')
        
        avg_score = sum(scores) / len(scores) if scores else 0.0
        
        # Overall sentiment based on majority
        if positive_count > negative_count and positive_count > neutral_count:
            overall = 'positive'
        elif negative_count > positive_count and negative_count > neutral_count:
            overall = 'negative'
        else:
            overall = 'neutral'
        
        return {
            'overall_sentiment': overall,
            'sentiment_score': round(avg_score, 2),
            'positive_count': positive_count,
            'negative_count': negative_count,
            'neutral_count': neutral_count,
            'total_articles': len(news),
            'confidence': round((max(positive_count, negative_count, neutral_count) / len(news)) * 100, 1)
        }
        
    except Exception as e:
        logger.error(f"Error getting sentiment summary for {symbol}: {e}")
        return {
            'overall_sentiment': 'neutral',
            'sentiment_score': 0.0,
            'positive_count': 0,
            'negative_count': 0,
            'neutral_count': 0,
            'total_articles': 0
        }
