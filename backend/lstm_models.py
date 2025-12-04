"""
LSTM-based stock price prediction models
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import logging
import os
import pickle
from pathlib import Path

logger = logging.getLogger(__name__)

# Directory for caching trained models
MODEL_CACHE_DIR = Path("/app/backend/model_cache")
MODEL_CACHE_DIR.mkdir(exist_ok=True)


def prepare_lstm_data(df: pd.DataFrame, lookback_days: int = 60):
    """Prepare data for LSTM model"""
    # Use Close price
    data = df['Close'].values.reshape(-1, 1)
    
    # Scale the data
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    # Create sequences
    X, y = [], []
    for i in range(lookback_days, len(scaled_data)):
        X.append(scaled_data[i-lookback_days:i, 0])
        y.append(scaled_data[i, 0])
    
    X, y = np.array(X), np.array(y)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    return X, y, scaler


def build_lstm_model(input_shape):
    """Build LSTM model architecture"""
    model = Sequential([
        LSTM(units=50, return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        LSTM(units=50, return_sequences=True),
        Dropout(0.2),
        LSTM(units=50),
        Dropout(0.2),
        Dense(units=1)
    ])
    
    model.compile(optimizer='adam', loss='mean_squared_error', metrics=['mae'])
    return model


def train_lstm_model(df: pd.DataFrame, lookback_days: int = 60, epochs: int = 50):
    """Train LSTM model on historical data"""
    try:
        logger.info("Preparing LSTM training data...")
        X, y, scaler = prepare_lstm_data(df, lookback_days)
        
        # Split into train/test
        train_size = int(len(X) * 0.8)
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        logger.info(f"Training LSTM model on {len(X_train)} samples...")
        model = build_lstm_model((X.shape[1], 1))
        
        # Early stopping to prevent overfitting
        early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
        
        # Train the model
        history = model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=32,
            validation_data=(X_test, y_test),
            callbacks=[early_stop],
            verbose=0
        )
        
        # Evaluate
        train_loss, train_mae = model.evaluate(X_train, y_train, verbose=0)
        test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
        
        logger.info(f"LSTM Training complete. Train MAE: {train_mae:.4f}, Test MAE: {test_mae:.4f}")
        
        return model, scaler, history, test_mae
    
    except Exception as e:
        logger.error(f"Error training LSTM model: {str(e)}")
        raise


def predict_with_lstm(model, scaler, last_sequence: np.ndarray, days_ahead: int):
    """Make predictions using trained LSTM model"""
    predictions = []
    current_sequence = last_sequence.copy()
    
    for _ in range(days_ahead):
        # Reshape for prediction
        input_seq = current_sequence.reshape(1, current_sequence.shape[0], 1)
        
        # Predict next value
        pred_scaled = model.predict(input_seq, verbose=0)[0, 0]
        
        # Inverse transform to get actual price
        pred_price = scaler.inverse_transform([[pred_scaled]])[0, 0]
        predictions.append(pred_price)
        
        # Update sequence for next prediction
        current_sequence = np.append(current_sequence[1:], pred_scaled)
    
    return predictions


def lstm_prediction(df: pd.DataFrame, days_ahead: int = 30, symbol: str = None):
    """Generate LSTM predictions for stock"""
    try:
        lookback_days = 60
        
        # Check if cached model exists
        cache_file = MODEL_CACHE_DIR / f"{symbol}_lstm_model.pkl" if symbol else None
        scaler_file = MODEL_CACHE_DIR / f"{symbol}_scaler.pkl" if symbol else None
        
        use_cache = False
        if cache_file and cache_file.exists() and scaler_file and scaler_file.exists():
            # Check if cache is recent (less than 7 days old)
            cache_age_days = (pd.Timestamp.now() - pd.Timestamp(os.path.getmtime(cache_file), unit='s')).days
            if cache_age_days < 7:
                logger.info(f"Loading cached LSTM model for {symbol}")
                model = keras.models.load_model(cache_file)
                with open(scaler_file, 'rb') as f:
                    scaler = pickle.load(f)
                use_cache = True
        
        if not use_cache:
            # Train new model
            logger.info(f"Training new LSTM model for {symbol}")
            model, scaler, history, test_mae = train_lstm_model(df, lookback_days=lookback_days, epochs=50)
            
            # Cache the model
            if symbol and cache_file:
                model.save(cache_file)
                with open(scaler_file, 'wb') as f:
                    pickle.dump(scaler, f)
                logger.info(f"Cached LSTM model for {symbol}")
        
        # Prepare last sequence for prediction
        last_data = df['Close'].values[-lookback_days:].reshape(-1, 1)
        scaled_last_data = scaler.transform(last_data)
        
        # Make predictions
        predictions = predict_with_lstm(model, scaler, scaled_last_data.flatten(), days_ahead)
        
        # Generate prediction dates
        last_date = df.index[-1]
        prediction_dates = [(last_date + pd.Timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(days_ahead)]
        
        current_price = float(df['Close'].iloc[-1])
        predicted_price = predictions[-1]
        
        # Calculate confidence based on recent prediction accuracy
        # Use last 30 days to validate
        if len(df) >= lookback_days + 30:
            validation_data = df.iloc[-30:]['Close'].values
            validation_sequence = df.iloc[-lookback_days-30:-30]['Close'].values
            scaled_val_seq = scaler.transform(validation_sequence.reshape(-1, 1)).flatten()
            
            val_predictions = predict_with_lstm(model, scaler, scaled_val_seq, 30)
            mae = np.mean(np.abs(np.array(val_predictions) - validation_data))
            mape = np.mean(np.abs((validation_data - np.array(val_predictions)) / validation_data)) * 100
            confidence = max(0, 100 - mape)
        else:
            confidence = 75.0  # Default confidence
        
        return {
            "predictions": [
                {"date": date, "price": float(price)}
                for date, price in zip(prediction_dates, predictions)
            ],
            "trend": "bullish" if predicted_price > current_price else "bearish",
            "confidence": float(confidence),
            "current_price": current_price,
            "predicted_price_end": float(predicted_price),
            "price_change_percent": float(((predicted_price - current_price) / current_price) * 100),
            "model_type": "LSTM",
            "lookback_days": lookback_days
        }
    
    except Exception as e:
        logger.error(f"Error in LSTM prediction: {str(e)}")
        raise
