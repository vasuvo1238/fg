"""
Options Pricing Engine - Black-Scholes Model and Greeks
Similar to Sensibull's options calculator
"""
import numpy as np
from scipy.stats import norm
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def black_scholes(
    spot_price: float,
    strike_price: float,
    time_to_expiry: float,  # in years
    risk_free_rate: float,
    volatility: float,
    option_type: str  # 'call' or 'put'
) -> float:
    """
    Calculate option price using Black-Scholes model
    """
    if time_to_expiry <= 0:
        # At expiry, return intrinsic value
        if option_type.lower() == 'call':
            return max(0, spot_price - strike_price)
        else:
            return max(0, strike_price - spot_price)
    
    # Calculate d1 and d2
    d1 = (np.log(spot_price / strike_price) + 
          (risk_free_rate + 0.5 * volatility**2) * time_to_expiry) / \
         (volatility * np.sqrt(time_to_expiry))
    
    d2 = d1 - volatility * np.sqrt(time_to_expiry)
    
    if option_type.lower() == 'call':
        price = (spot_price * norm.cdf(d1) - 
                strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(d2))
    else:  # put
        price = (strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(-d2) - 
                spot_price * norm.cdf(-d1))
    
    return max(0, price)


def calculate_greeks(
    spot_price: float,
    strike_price: float,
    time_to_expiry: float,
    risk_free_rate: float,
    volatility: float,
    option_type: str
) -> Dict[str, float]:
    """
    Calculate all Greeks for an option
    """
    if time_to_expiry <= 0:
        return {
            "delta": 1.0 if option_type.lower() == 'call' else -1.0,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0
        }
    
    # Calculate d1 and d2
    d1 = (np.log(spot_price / strike_price) + 
          (risk_free_rate + 0.5 * volatility**2) * time_to_expiry) / \
         (volatility * np.sqrt(time_to_expiry))
    
    d2 = d1 - volatility * np.sqrt(time_to_expiry)
    
    # Delta
    if option_type.lower() == 'call':
        delta = norm.cdf(d1)
    else:
        delta = -norm.cdf(-d1)
    
    # Gamma (same for call and put)
    gamma = norm.pdf(d1) / (spot_price * volatility * np.sqrt(time_to_expiry))
    
    # Theta
    if option_type.lower() == 'call':
        theta = (-(spot_price * norm.pdf(d1) * volatility) / (2 * np.sqrt(time_to_expiry)) -
                risk_free_rate * strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(d2))
    else:
        theta = (-(spot_price * norm.pdf(d1) * volatility) / (2 * np.sqrt(time_to_expiry)) +
                risk_free_rate * strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(-d2))
    
    # Theta per day (divide by 365)
    theta = theta / 365
    
    # Vega (same for call and put)
    vega = spot_price * norm.pdf(d1) * np.sqrt(time_to_expiry) / 100  # Per 1% change in volatility
    
    # Rho
    if option_type.lower() == 'call':
        rho = strike_price * time_to_expiry * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(d2) / 100
    else:
        rho = -strike_price * time_to_expiry * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(-d2) / 100
    
    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 4),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
        "rho": round(rho, 4)
    }


class OptionLeg:
    """Represents a single option leg in a strategy"""
    
    def __init__(
        self,
        option_type: str,  # 'call' or 'put'
        action: str,  # 'buy' or 'sell'
        strike: float,
        quantity: int,
        days_to_expiry: int,
        premium: Optional[float] = None
    ):
        self.option_type = option_type.lower()
        self.action = action.lower()
        self.strike = strike
        self.quantity = quantity
        self.days_to_expiry = days_to_expiry
        self.premium = premium
        
    def calculate_payoff(self, spot_price: float) -> float:
        """Calculate payoff at expiry for this leg"""
        if self.option_type == 'call':
            intrinsic = max(0, spot_price - self.strike)
        else:  # put
            intrinsic = max(0, self.strike - spot_price)
        
        # Buy = pay premium, receive intrinsic
        # Sell = receive premium, pay intrinsic
        if self.action == 'buy':
            payoff = (intrinsic - self.premium) * self.quantity
        else:  # sell
            payoff = (self.premium - intrinsic) * self.quantity
        
        return payoff


class OptionsStrategy:
    """
    Options Strategy Builder
    Build and analyze multi-leg options strategies
    """
    
    def __init__(self, name: str, underlying_symbol: str, spot_price: float):
        self.name = name
        self.underlying_symbol = underlying_symbol
        self.spot_price = spot_price
        self.legs: List[OptionLeg] = []
        self.risk_free_rate = 0.05  # 5% default
        self.volatility = 0.25  # 25% default
        
    def add_leg(
        self,
        option_type: str,
        action: str,
        strike: float,
        quantity: int,
        days_to_expiry: int
    ):
        """Add an option leg to the strategy"""
        # Calculate premium using Black-Scholes
        time_to_expiry = days_to_expiry / 365.0
        premium = black_scholes(
            self.spot_price,
            strike,
            time_to_expiry,
            self.risk_free_rate,
            self.volatility,
            option_type
        )
        
        leg = OptionLeg(option_type, action, strike, quantity, days_to_expiry, premium)
        self.legs.append(leg)
        
    def calculate_net_premium(self) -> float:
        """Calculate net premium paid/received"""
        net = 0
        for leg in self.legs:
            if leg.action == 'buy':
                net -= leg.premium * leg.quantity
            else:  # sell
                net += leg.premium * leg.quantity
        return net
    
    def calculate_payoff_at_price(self, price: float) -> float:
        """Calculate total strategy payoff at a given price"""
        total = 0
        for leg in self.legs:
            total += leg.calculate_payoff(price)
        return total
    
    def generate_payoff_diagram(self, price_range: Tuple[float, float] = None) -> Dict:
        """
        Generate payoff diagram data
        Returns prices and corresponding P&L values
        """
        if price_range is None:
            # Default: ±50% of spot price
            min_price = self.spot_price * 0.5
            max_price = self.spot_price * 1.5
        else:
            min_price, max_price = price_range
        
        # Generate 100 price points
        prices = np.linspace(min_price, max_price, 100)
        payoffs = [self.calculate_payoff_at_price(p) for p in prices]
        
        return {
            "prices": prices.tolist(),
            "payoffs": payoffs,
            "spot_price": self.spot_price
        }
    
    def calculate_max_profit_loss(self) -> Dict[str, Optional[float]]:
        """Calculate maximum profit and loss"""
        # Calculate over a wide range
        prices = np.linspace(self.spot_price * 0.2, self.spot_price * 2, 500)
        payoffs = [self.calculate_payoff_at_price(p) for p in prices]
        
        max_profit = max(payoffs)
        max_loss = min(payoffs)
        
        # Check if unlimited
        if abs(max_profit - payoffs[-1]) < 1 and payoffs[-1] > payoffs[-2]:
            max_profit = None  # Unlimited upside
        
        if abs(max_loss - payoffs[0]) < 1 and payoffs[0] < payoffs[1]:
            max_loss = None  # Unlimited downside
        
        return {
            "max_profit": max_profit,
            "max_loss": max_loss
        }
    
    def find_breakeven_points(self) -> List[float]:
        """Find breakeven prices where P&L = 0"""
        prices = np.linspace(self.spot_price * 0.2, self.spot_price * 2, 1000)
        payoffs = [self.calculate_payoff_at_price(p) for p in prices]
        
        breakevens = []
        for i in range(len(payoffs) - 1):
            # Check for sign change (crossing zero)
            if payoffs[i] * payoffs[i+1] < 0:
                # Linear interpolation to find exact breakeven
                be = prices[i] + (0 - payoffs[i]) * (prices[i+1] - prices[i]) / (payoffs[i+1] - payoffs[i])
                breakevens.append(round(be, 2))
        
        return breakevens
    
    def calculate_strategy_greeks(self) -> Dict[str, float]:
        """Calculate total Greeks for the entire strategy"""
        total_greeks = {
            "delta": 0,
            "gamma": 0,
            "theta": 0,
            "vega": 0,
            "rho": 0
        }
        
        for leg in self.legs:
            time_to_expiry = leg.days_to_expiry / 365.0
            greeks = calculate_greeks(
                self.spot_price,
                leg.strike,
                time_to_expiry,
                self.risk_free_rate,
                self.volatility,
                leg.option_type
            )
            
            # Multiply by quantity and direction (buy=+1, sell=-1)
            multiplier = leg.quantity if leg.action == 'buy' else -leg.quantity
            
            for key in total_greeks:
                total_greeks[key] += greeks[key] * multiplier
        
        return {k: round(v, 4) for k, v in total_greeks.items()}
    
    def get_strategy_summary(self) -> Dict:
        """Get complete strategy analysis"""
        net_premium = self.calculate_net_premium()
        max_pl = self.calculate_max_profit_loss()
        breakevens = self.find_breakeven_points()
        greeks = self.calculate_strategy_greeks()
        payoff_data = self.generate_payoff_diagram()
        
        # Probability of profit (simplified - assumes normal distribution)
        # Real implementation would use more sophisticated methods
        pop = 50.0  # Placeholder
        
        return {
            "strategy_name": self.name,
            "underlying": self.underlying_symbol,
            "spot_price": self.spot_price,
            "legs": [
                {
                    "type": leg.option_type,
                    "action": leg.action,
                    "strike": leg.strike,
                    "quantity": leg.quantity,
                    "premium": round(leg.premium, 2),
                    "days_to_expiry": leg.days_to_expiry
                }
                for leg in self.legs
            ],
            "net_premium": round(net_premium, 2),
            "max_profit": round(max_pl["max_profit"], 2) if max_pl["max_profit"] is not None else "Unlimited",
            "max_loss": round(max_pl["max_loss"], 2) if max_pl["max_loss"] is not None else "Unlimited",
            "breakeven_points": breakevens,
            "greeks": greeks,
            "payoff_diagram": payoff_data,
            "probability_of_profit": pop
        }


# Pre-built Strategy Templates
def bull_call_spread(spot_price: float, strike_width: float = None, days_to_expiry: int = 30) -> OptionsStrategy:
    """Bull Call Spread - Moderately bullish, limited risk/reward"""
    if strike_width is None:
        strike_width = spot_price * 0.05  # 5% width
    
    strategy = OptionsStrategy("Bull Call Spread", "STOCK", spot_price)
    
    # Buy ATM call
    strategy.add_leg("call", "buy", spot_price, 1, days_to_expiry)
    
    # Sell OTM call
    strategy.add_leg("call", "sell", spot_price + strike_width, 1, days_to_expiry)
    
    return strategy


def bear_put_spread(spot_price: float, strike_width: float = None, days_to_expiry: int = 30) -> OptionsStrategy:
    """Bear Put Spread - Moderately bearish, limited risk/reward"""
    if strike_width is None:
        strike_width = spot_price * 0.05
    
    strategy = OptionsStrategy("Bear Put Spread", "STOCK", spot_price)
    
    # Buy ATM put
    strategy.add_leg("put", "buy", spot_price, 1, days_to_expiry)
    
    # Sell OTM put
    strategy.add_leg("put", "sell", spot_price - strike_width, 1, days_to_expiry)
    
    return strategy


def long_straddle(spot_price: float, days_to_expiry: int = 30) -> OptionsStrategy:
    """Long Straddle - Big move expected, unlimited profit potential"""
    strategy = OptionsStrategy("Long Straddle", "STOCK", spot_price)
    
    # Buy ATM call
    strategy.add_leg("call", "buy", spot_price, 1, days_to_expiry)
    
    # Buy ATM put
    strategy.add_leg("put", "buy", spot_price, 1, days_to_expiry)
    
    return strategy


def iron_condor(spot_price: float, wing_width: float = None, days_to_expiry: int = 30) -> OptionsStrategy:
    """Iron Condor - Range-bound, limited risk/reward"""
    if wing_width is None:
        wing_width = spot_price * 0.1  # 10% wings
    
    strategy = OptionsStrategy("Iron Condor", "STOCK", spot_price)
    
    # Sell OTM put spread
    strategy.add_leg("put", "buy", spot_price - wing_width, 1, days_to_expiry)
    strategy.add_leg("put", "sell", spot_price - wing_width/2, 1, days_to_expiry)
    
    # Sell OTM call spread
    strategy.add_leg("call", "sell", spot_price + wing_width/2, 1, days_to_expiry)
    strategy.add_leg("call", "buy", spot_price + wing_width, 1, days_to_expiry)
    
    return strategy


def long_strangle(spot_price: float, wing_width: float = None, days_to_expiry: int = 30) -> OptionsStrategy:
    """Long Strangle - Big move expected, lower cost than straddle"""
    if wing_width is None:
        wing_width = spot_price * 0.05
    
    strategy = OptionsStrategy("Long Strangle", "STOCK", spot_price)
    
    # Buy OTM call
    strategy.add_leg("call", "buy", spot_price + wing_width, 1, days_to_expiry)
    
    # Buy OTM put
    strategy.add_leg("put", "buy", spot_price - wing_width, 1, days_to_expiry)
    
    return strategy


def butterfly_spread(spot_price: float, wing_width: float = None, days_to_expiry: int = 30) -> OptionsStrategy:
    """Butterfly Spread - Neutral, low risk/reward"""
    if wing_width is None:
        wing_width = spot_price * 0.05
    
    strategy = OptionsStrategy("Butterfly Spread", "STOCK", spot_price)
    
    # Buy lower strike call
    strategy.add_leg("call", "buy", spot_price - wing_width, 1, days_to_expiry)
    
    # Sell 2x ATM calls
    strategy.add_leg("call", "sell", spot_price, 2, days_to_expiry)
    
    # Buy higher strike call
    strategy.add_leg("call", "buy", spot_price + wing_width, 1, days_to_expiry)
    
    return strategy


STRATEGY_TEMPLATES = {
    "bull_call_spread": bull_call_spread,
    "bear_put_spread": bear_put_spread,
    "long_straddle": long_straddle,
    "iron_condor": iron_condor,
    "long_strangle": long_strangle,
    "butterfly_spread": butterfly_spread
}
