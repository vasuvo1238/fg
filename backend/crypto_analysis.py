"""
Cryptocurrency Analysis Module
Provides crypto market data using CoinGecko API (100% free, no API key needed)
"""
import httpx
from typing import List, Dict, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

COINGECKO_API_BASE = "https://api.coingecko.com/api/v3"


async def get_crypto_list(limit: int = 100) -> List[Dict]:
    """
    Get list of top cryptocurrencies by market cap
    
    Args:
        limit: Number of cryptocurrencies to return
        
    Returns:
        List of cryptocurrency data
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{COINGECKO_API_BASE}/coins/markets",
                params={
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": limit,
                    "page": 1,
                    "sparkline": False,
                    "price_change_percentage": "1h,24h,7d"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                processed = []
                
                for coin in data:
                    processed.append({
                        'id': coin.get('id'),
                        'symbol': coin.get('symbol', '').upper(),
                        'name': coin.get('name'),
                        'image': coin.get('image'),
                        'current_price': coin.get('current_price'),
                        'market_cap': coin.get('market_cap'),
                        'market_cap_rank': coin.get('market_cap_rank'),
                        'total_volume': coin.get('total_volume'),
                        'price_change_1h': coin.get('price_change_percentage_1h_in_currency'),
                        'price_change_24h': coin.get('price_change_percentage_24h'),
                        'price_change_7d': coin.get('price_change_percentage_7d_in_currency'),
                        'high_24h': coin.get('high_24h'),
                        'low_24h': coin.get('low_24h'),
                        'circulating_supply': coin.get('circulating_supply'),
                        'total_supply': coin.get('total_supply'),
                        'max_supply': coin.get('max_supply'),
                        'ath': coin.get('ath'),
                        'ath_date': coin.get('ath_date'),
                        'atl': coin.get('atl'),
                        'atl_date': coin.get('atl_date')
                    })
                
                return processed
            else:
                logger.error(f"CoinGecko API error: {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Error fetching crypto list: {e}")
        return []


async def get_crypto_details(coin_id: str) -> Optional[Dict]:
    """
    Get detailed information about a specific cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
        
    Returns:
        Detailed cryptocurrency data
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{COINGECKO_API_BASE}/coins/{coin_id}",
                params={
                    "localization": "false",
                    "tickers": "false",
                    "market_data": "true",
                    "community_data": "true",
                    "developer_data": "true"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                market_data = data.get('market_data', {})
                
                return {
                    'id': data.get('id'),
                    'symbol': data.get('symbol', '').upper(),
                    'name': data.get('name'),
                    'description': data.get('description', {}).get('en', '')[:500],
                    'image': data.get('image', {}).get('large'),
                    'market_cap_rank': data.get('market_cap_rank'),
                    'current_price': market_data.get('current_price', {}).get('usd'),
                    'market_cap': market_data.get('market_cap', {}).get('usd'),
                    'total_volume': market_data.get('total_volume', {}).get('usd'),
                    'high_24h': market_data.get('high_24h', {}).get('usd'),
                    'low_24h': market_data.get('low_24h', {}).get('usd'),
                    'price_change_24h': market_data.get('price_change_percentage_24h'),
                    'price_change_7d': market_data.get('price_change_percentage_7d'),
                    'price_change_30d': market_data.get('price_change_percentage_30d'),
                    'price_change_1y': market_data.get('price_change_percentage_1y'),
                    'ath': market_data.get('ath', {}).get('usd'),
                    'ath_date': market_data.get('ath_date', {}).get('usd'),
                    'atl': market_data.get('atl', {}).get('usd'),
                    'atl_date': market_data.get('atl_date', {}).get('usd'),
                    'circulating_supply': market_data.get('circulating_supply'),
                    'total_supply': market_data.get('total_supply'),
                    'max_supply': market_data.get('max_supply'),
                    'homepage': data.get('links', {}).get('homepage', [''])[0],
                    'blockchain_site': data.get('links', {}).get('blockchain_site', []),
                    'github_repos': data.get('links', {}).get('repos_url', {}).get('github', []),
                    'sentiment_votes_up': data.get('sentiment_votes_up_percentage'),
                    'sentiment_votes_down': data.get('sentiment_votes_down_percentage')
                }
            else:
                logger.error(f"CoinGecko API error: {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching crypto details for {coin_id}: {e}")
        return None


async def get_crypto_chart_data(coin_id: str, days: int = 30) -> Dict:
    """
    Get historical price data for a cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID
        days: Number of days of historical data (1, 7, 30, 90, 365, max)
        
    Returns:
        Historical price data
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{COINGECKO_API_BASE}/coins/{coin_id}/market_chart",
                params={
                    "vs_currency": "usd",
                    "days": days,
                    "interval": "daily" if days > 1 else "hourly"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Format data for easier frontend consumption
                prices = data.get('prices', [])
                volumes = data.get('total_volumes', [])
                market_caps = data.get('market_caps', [])
                
                formatted_data = []
                for i in range(len(prices)):
                    formatted_data.append({
                        'timestamp': prices[i][0],
                        'date': datetime.fromtimestamp(prices[i][0] / 1000).strftime('%Y-%m-%d'),
                        'price': prices[i][1],
                        'volume': volumes[i][1] if i < len(volumes) else None,
                        'market_cap': market_caps[i][1] if i < len(market_caps) else None
                    })
                
                return {
                    'coin_id': coin_id,
                    'days': days,
                    'data': formatted_data
                }
            else:
                logger.error(f"CoinGecko API error: {response.status_code}")
                return {'coin_id': coin_id, 'days': days, 'data': []}
                
    except Exception as e:
        logger.error(f"Error fetching chart data for {coin_id}: {e}")
        return {'coin_id': coin_id, 'days': days, 'data': []}


async def get_trending_cryptos() -> List[Dict]:
    """
    Get trending cryptocurrencies on CoinGecko
    
    Returns:
        List of trending coins
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{COINGECKO_API_BASE}/search/trending")
            
            if response.status_code == 200:
                data = response.json()
                trending = data.get('coins', [])
                
                processed = []
                for item in trending:
                    coin = item.get('item', {})
                    processed.append({
                        'id': coin.get('id'),
                        'symbol': coin.get('symbol', '').upper(),
                        'name': coin.get('name'),
                        'thumb': coin.get('thumb'),
                        'market_cap_rank': coin.get('market_cap_rank'),
                        'price_btc': coin.get('price_btc'),
                        'score': coin.get('score')
                    })
                
                return processed
            else:
                logger.error(f"CoinGecko API error: {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Error fetching trending cryptos: {e}")
        return []
