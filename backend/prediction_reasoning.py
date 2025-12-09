"""
Generate plain English explanations for predictions
"""
from typing import Dict


def explain_lstm_prediction(prediction: Dict) -> str:
    """Explain LSTM prediction in simple terms"""
    trend = prediction['trend']
    change_pct = abs(prediction['price_change_percent'])
    confidence = prediction['confidence']
    
    explanation = f"""**What is LSTM?**
Think of LSTM (Long Short-Term Memory) as an AI that studies patterns in stock price history - like a detective looking at how the stock moved in the past to guess where it's going.

**What it sees:**
The LSTM looked at 5 years of {prediction.get('symbol', 'this stock')}'s price movements - every up and down, every trend, every season.

**The prediction:**
The AI predicts the price will go **{trend}** by about **{change_pct:.1f}%**. 

**Why this prediction?**
{_explain_lstm_reason(prediction)}

**Confidence level: {confidence:.0f}%**
{_explain_confidence(confidence)}
"""
    return explanation


def _explain_lstm_reason(prediction: Dict) -> str:
    """Generate reasoning for LSTM prediction"""
    trend = prediction['trend']
    change_pct = abs(prediction['price_change_percent'])
    
    if trend == 'bullish':
        if change_pct < 2:
            return "The AI sees a slight upward pattern - like a gentle hill. Recent price movements suggest small gains ahead."
        elif change_pct < 5:
            return "The AI detected a solid upward trend - like climbing stairs. Historical patterns show momentum building."
        else:
            return "The AI found a strong bullish pattern - like a rocket trajectory. Multiple indicators point to significant growth potential."
    else:
        if change_pct < 2:
            return "The AI sees a slight downward drift - like a gentle slope. Recent patterns suggest minor weakness."
        elif change_pct < 5:
            return "The AI detected a bearish trend - like descending stairs. Historical patterns show weakening momentum."
        else:
            return "The AI found a strong bearish pattern - like a steep decline. Multiple indicators suggest significant downward pressure."


def explain_linear_regression(prediction: Dict) -> str:
    """Explain linear regression in simple terms"""
    trend = prediction['trend']
    change_pct = abs(prediction['price_change_percent'])
    confidence = prediction['confidence']
    
    explanation = f"""**What is Linear Regression?**
Imagine drawing a straight line through the stock's recent price points, like connecting dots in a trend. This line shows where the stock is "heading" if it continues its current path.

**The method:**
We looked at the past year of prices and drew a "best fit line" through them - like finding the average direction the stock is moving.

**The prediction:**
The trend line points **{trend}**, suggesting about **{change_pct:.1f}%** change.

**Why this prediction?**
{_explain_linear_reason(prediction)}

**Reliability: {confidence:.0f}%**
{_explain_linear_confidence(confidence)}
"""
    return explanation


def _explain_linear_reason(prediction: Dict) -> str:
    """Generate reasoning for linear regression"""
    trend = prediction['trend']
    change_pct = abs(prediction['price_change_percent'])
    
    if trend == 'bullish':
        return f"Over the past year, the stock has been on an upward trajectory. If this trend continues (like a car maintaining its speed), we expect it to rise by {change_pct:.1f}%."
    else:
        return f"Over the past year, the stock has been trending downward. If this pattern persists (like a ball rolling downhill), we expect it to fall by {change_pct:.1f}%."


def _explain_linear_confidence(confidence: float) -> str:
    """Explain linear regression confidence"""
    if confidence > 80:
        return "The trend line fits the data very well - the stock has been moving in a consistent direction."
    elif confidence > 60:
        return "The trend line fits reasonably well, though there's some zigzagging along the way."
    else:
        return "The trend line is loose - the stock has been moving erratically, making predictions less reliable."


def explain_zscore_mean_reversion(prediction: Dict) -> str:
    """Explain Z-Score mean reversion in simple terms"""
    z_score = prediction.get('z_score', 0)
    mean_price = prediction.get('mean_price', 0)
    current_price = prediction['current_price']
    signal = prediction.get('signal', 'HOLD')
    
    explanation = f"""**What is Mean Reversion?**
Like a rubber band that snaps back when stretched, stocks tend to return to their "average" price after going too high or too low.

**Current situation:**
- Average price (last 20 days): **${mean_price:.2f}**
- Current price: **${current_price:.2f}**
- Z-Score: **{z_score:.2f}** {_describe_zscore(z_score)}

**The prediction:**
{_explain_zscore_prediction(prediction)}

**Trading signal: {signal}**
{_explain_zscore_signal(signal, z_score)}

**The "rubber band" analogy:**
{_explain_rubber_band(z_score, current_price, mean_price)}
"""
    return explanation


def _describe_zscore(z_score: float) -> str:
    """Describe what the Z-score means"""
    if z_score > 2:
        return "(WAY above average - stretched rubber band!)"
    elif z_score > 1:
        return "(Above average)"
    elif z_score < -2:
        return "(WAY below average - compressed spring!)"
    elif z_score < -1:
        return "(Below average)"
    else:
        return "(Near average)"


def _explain_zscore_prediction(prediction: Dict) -> str:
    """Explain Z-score prediction reasoning"""
    z_score = prediction.get('z_score', 0)
    change_pct = prediction['price_change_percent']
    
    if abs(z_score) > 2:
        return f"The price has strayed far from its average (Z-score: {z_score:.2f}). Like a stretched rubber band, it's likely to snap back toward the mean, leading to a {change_pct:+.1f}% move."
    elif abs(z_score) > 1:
        return f"The price is moderately away from average. There's some pull back toward the mean, suggesting a {change_pct:+.1f}% adjustment."
    else:
        return f"The price is close to its average. Expect small movements as it hovers around the mean ({change_pct:+.1f}%)."


def _explain_zscore_signal(signal: str, z_score: float) -> str:
    """Explain trading signal"""
    if signal == "BUY":
        return f"The stock is unusually cheap (Z-score: {z_score:.2f}). Like buying on sale - it should bounce back up!"
    elif signal == "SELL":
        return f"The stock is unusually expensive (Z-score: {z_score:.2f}). Like selling at peak price - it may come back down."
    else:
        return "The stock is fairly priced. No urgency to buy or sell right now."


def _explain_rubber_band(z_score: float, current: float, mean: float) -> str:
    """Use rubber band analogy"""
    diff = ((current - mean) / mean) * 100
    
    if z_score > 2:
        return f"The stock is {diff:+.1f}% above its average - like a rubber band stretched {abs(diff):.0f}% beyond normal. History shows it usually snaps back!"
    elif z_score < -2:
        return f"The stock is {diff:+.1f}% below its average - like a compressed spring. It tends to bounce back up to normal levels."
    else:
        return f"The stock is only {abs(diff):.1f}% away from average - minimal tension, minimal expected movement."


def explain_ornstein_uhlenbeck(prediction: Dict) -> str:
    """Explain Ornstein-Uhlenbeck in simple terms"""
    theta = prediction.get('theta', 0)
    half_life = prediction.get('half_life_days')
    prediction['trend']
    
    explanation = f"""**What is Ornstein-Uhlenbeck (OU)?**
Imagine a boat on water - when a wave pushes it away from its mooring, it drifts back. OU models how stocks "drift back" to their long-term average price.

**The physics analogy:**
Think of the stock price as a ball in a bowl:
- If the ball rolls up the side (price gets too high), gravity pulls it back down
- If it rolls down (price gets too low), it naturally returns to the center
- The bowl's steepness determines how fast it returns

**Mean reversion speed:**
{_explain_ou_speed(theta, half_life)}

**The prediction:**
{_explain_ou_prediction(prediction)}

**What makes OU special:**
Unlike a simple average, OU considers both the pull back to average AND random market fluctuations (like waves disturbing the boat).
"""
    return explanation


def _explain_ou_speed(theta: float, half_life: float) -> str:
    """Explain mean reversion speed"""
    if half_life is None:
        return "This stock shows weak mean reversion - like a boat with a very loose rope. It might drift for a while."
    elif half_life < 10:
        return f"**Very fast reversion** (half-life: {half_life:.0f} days) - like a ball in a steep bowl. The stock snaps back to average quickly!"
    elif half_life < 30:
        return f"**Moderate reversion** (half-life: {half_life:.0f} days) - the stock returns to average at a steady pace."
    else:
        return f"**Slow reversion** (half-life: {half_life:.0f} days) - like a ball in a shallow bowl. Returns to average gradually."


def _explain_ou_prediction(prediction: Dict) -> str:
    """Explain OU prediction"""
    trend = prediction['trend']
    change_pct = abs(prediction['price_change_percent'])
    current = prediction['current_price']
    mu = prediction.get('mu', current)
    
    diff = ((current - mu) / mu) * 100
    
    if trend == 'bullish':
        return f"The stock is currently {abs(diff):.1f}% below its long-term average of ${mu:.2f}. Like a ball below center in the bowl, it should roll up by {change_pct:.1f}%."
    else:
        return f"The stock is currently {abs(diff):.1f}% above its long-term average of ${mu:.2f}. Like a ball above center, it should settle down by {change_pct:.1f}%."


def explain_ensemble_prediction(ensemble_data: Dict, individual_preds: Dict) -> str:
    """Explain ensemble prediction in simple terms"""
    ensemble_price = ensemble_data['predicted_price']
    ensemble_change = ensemble_data['price_change_percent']
    weights = ensemble_data.get('model_weights', {})
    
    explanation = f"""**What is the Ensemble Prediction?**
Instead of trusting just one fortune teller, we ask four different experts and combine their wisdom - like getting a second (and third, and fourth) opinion!

**The Four Experts:**

1. **LSTM Neural Network** ({weights.get('lstm', 0.4)*100:.0f}% vote) 
   - The AI pattern detective
   - Prediction: ${individual_preds['lstm']['predicted_price_end']:.2f} ({individual_preds['lstm']['price_change_percent']:+.1f}%)

2. **Linear Regression** ({weights.get('linear', 0.2)*100:.0f}% vote)
   - The trend follower
   - Prediction: ${individual_preds['linear_regression']['predicted_price_end']:.2f} ({individual_preds['linear_regression']['price_change_percent']:+.1f}%)

3. **Z-Score Mean Reversion** ({weights.get('zscore', 0.2)*100:.0f}% vote)
   - The "rubber band" analyst
   - Prediction: ${individual_preds['z_score_mean_reversion']['predicted_price_end']:.2f} ({individual_preds['z_score_mean_reversion']['price_change_percent']:+.1f}%)

4. **Ornstein-Uhlenbeck** ({weights.get('ou', 0.2)*100:.0f}% vote)
   - The "ball in bowl" physicist
   - Prediction: ${individual_preds['ornstein_uhlenbeck']['predicted_price_end']:.2f} ({individual_preds['ornstein_uhlenbeck']['price_change_percent']:+.1f}%)

**Final Consensus: ${ensemble_price:.2f} ({ensemble_change:+.1f}%)**

**Why ensemble is better:**
{_explain_ensemble_advantage(individual_preds)}

**The wisdom of crowds:**
Just like asking multiple doctors for a diagnosis gives you better insight, combining different prediction methods reduces the chance of a single model being wrong!
"""
    return explanation


def _explain_ensemble_advantage(individual_preds: Dict) -> str:
    """Explain why ensemble is advantageous"""
    predictions = [
        individual_preds['lstm']['predicted_price_end'],
        individual_preds['linear_regression']['predicted_price_end'],
        individual_preds['z_score_mean_reversion']['predicted_price_end'],
        individual_preds['ornstein_uhlenbeck']['predicted_price_end']
    ]
    
    min_pred = min(predictions)
    max_pred = max(predictions)
    spread = ((max_pred - min_pred) / min_pred) * 100
    
    if spread > 10:
        return f"The models disagree significantly (spread: {spread:.1f}%). The ensemble helps balance optimistic and pessimistic views, giving you a middle-ground prediction that's often more reliable."
    elif spread > 5:
        return f"The models have moderate disagreement (spread: {spread:.1f}%). Combining them reduces the risk of following a single incorrect model."
    else:
        return f"The models largely agree (spread: {spread:.1f}%). This consensus gives us high confidence in the ensemble prediction!"


def _explain_confidence(confidence: float) -> str:
    """Explain confidence level"""
    if confidence > 90:
        return "🟢 Very High - The model is very confident based on clear historical patterns."
    elif confidence > 75:
        return "🟡 High - Good confidence with reliable historical data."
    elif confidence > 60:
        return "🟠 Moderate - Reasonable confidence, but some uncertainty remains."
    else:
        return "🔴 Low - The model is less certain due to erratic historical patterns."


def explain_technical_indicators(indicators: Dict, current_price: float) -> str:
    """Explain technical indicators in simple terms"""
    rsi = indicators.get('rsi')
    ma_20 = indicators['moving_averages'].get('ma_20')
    ma_50 = indicators['moving_averages'].get('ma_50')
    
    explanation = f"""**Technical Indicators Explained (Simple)**

**1. RSI (Relative Strength Index): {rsi:.1f}**
{_explain_rsi(rsi)}

**2. Moving Averages (Price Trends)**
{_explain_moving_averages(ma_20, ma_50, current_price)}

**3. What These Mean Together**
{_explain_indicator_combination(rsi, ma_20, ma_50, current_price)}
"""
    return explanation


def _explain_rsi(rsi: float) -> str:
    """Explain RSI in simple terms"""
    if rsi > 70:
        return f"""*Think of RSI as a "crowd excitement meter" from 0-100.*

Current: **{rsi:.1f}** - 🔥 VERY EXCITED (Overbought)
Like a concert where too many people showed up - prices might be inflated. Could cool down soon."""
    elif rsi > 50:
        return f"""*Think of RSI as a "crowd excitement meter" from 0-100.*

Current: **{rsi:.1f}** - 📈 Moderate bullishness
The crowd is interested but not overly excited. Healthy buying pressure."""
    elif rsi > 30:
        return f"""*Think of RSI as a "crowd excitement meter" from 0-100.*

Current: **{rsi:.1f}** - 📉 Moderate bearishness  
Interest is waning but not panic-selling. Neutral territory."""
    else:
        return f"""*Think of RSI as a "crowd excitement meter" from 0-100.*

Current: **{rsi:.1f}** - 🧊 VERY COLD (Oversold)
Like a clearance sale - very few buyers. Could be a bargain opportunity!"""


def _explain_moving_averages(ma_20: float, ma_50: float, current_price: float) -> str:
    """Explain moving averages"""
    explanation = f"""*Moving averages are like "smoothed-out" price trends:*

**MA-20 (Short-term trend):** ${ma_20:.2f}
- Average price over last 20 days
- Current price vs MA-20: {"ABOVE ✅" if current_price > ma_20 else "BELOW ⚠️"}

**MA-50 (Long-term trend):** ${ma_50:.2f}  
- Average price over last 50 days
- Current price vs MA-50: {"ABOVE ✅" if current_price > ma_50 else "BELOW ⚠️"}

**Rule of thumb:**
- Price above both MAs = 🚀 Uptrend (bullish)
- Price below both MAs = 📉 Downtrend (bearish)
- Price between MAs = 🤷 Uncertain direction
"""
    return explanation


def _explain_indicator_combination(rsi: float, ma_20: float, ma_50: float, current_price: float) -> str:
    """Explain what indicators mean together"""
    above_ma20 = current_price > ma_20
    above_ma50 = current_price > ma_50
    
    if above_ma20 and above_ma50 and rsi > 50:
        return "✅ **Strong bullish setup** - Price trending up with solid momentum. The stock is in a healthy uptrend!"
    elif above_ma20 and above_ma50 and rsi > 70:
        return "⚠️ **Overbought uptrend** - Price is trending up BUT may be overheated. Consider waiting for a pullback."
    elif not above_ma20 and not above_ma50 and rsi < 50:
        return "❌ **Bearish setup** - Price trending down with weak momentum. Caution advised."
    elif not above_ma20 and not above_ma50 and rsi < 30:
        return "💡 **Oversold opportunity?** - Price is down BUT may be overly punished. Could be a contrarian buy opportunity."
    else:
        return "🤔 **Mixed signals** - Indicators don't clearly agree. Exercise caution and wait for clearer direction."
