import requests
import sys
import json
import time
from datetime import datetime

class FinancialChatbotTester:
    def __init__(self, base_url="https://finance-wizard-71.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def test_chat_finance_question(self):
        """Test chat with finance-related question"""
        try:
            # Generate unique session ID
            self.session_id = f"test_session_{int(time.time())}"
            
            payload = {
                "message": "What's the difference between stocks and bonds?",
                "session_id": self.session_id
            }
            
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Check response structure
                required_fields = ["session_id", "message", "is_guardrail_triggered"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get("is_guardrail_triggered", True):
                    success = False
                    details += ", Guardrails incorrectly triggered for finance question"
                elif len(data.get("message", "")) < 10:
                    success = False
                    details += ", Response too short or empty"
                else:
                    details += f", Response length: {len(data['message'])} chars"
                    
            self.log_test("Finance Question Chat", success, details)
            return success
            
        except Exception as e:
            self.log_test("Finance Question Chat", False, str(e))
            return False

    def test_chat_guardrails(self):
        """Test guardrails with non-finance question"""
        try:
            payload = {
                "message": "Tell me a joke about cats",
                "session_id": self.session_id
            }
            
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Guardrails should be triggered
                if not data.get("is_guardrail_triggered", False):
                    success = False
                    details += ", Guardrails should have been triggered"
                elif "guardrail_message" not in data:
                    success = False
                    details += ", Missing guardrail_message field"
                else:
                    details += ", Guardrails correctly triggered"
                    
            self.log_test("Guardrails System", success, details)
            return success
            
        except Exception as e:
            self.log_test("Guardrails System", False, str(e))
            return False

    def test_context_maintenance(self):
        """Test context maintenance across messages"""
        try:
            # Send first message
            payload1 = {
                "message": "I want to invest $10,000. What should I consider?",
                "session_id": self.session_id
            }
            
            response1 = requests.post(
                f"{self.api_url}/chat",
                json=payload1,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response1.status_code != 200:
                self.log_test("Context Maintenance", False, f"First message failed: {response1.status_code}")
                return False
            
            # Send follow-up message that requires context
            payload2 = {
                "message": "What about my risk tolerance?",
                "session_id": self.session_id
            }
            
            response2 = requests.post(
                f"{self.api_url}/chat",
                json=payload2,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response2.status_code == 200
            details = f"Status: {response2.status_code}"
            
            if success:
                data = response2.json()
                # Check if response acknowledges context
                response_text = data.get("message", "").lower()
                context_indicators = ["investment", "10,000", "consider", "risk", "tolerance"]
                context_found = any(indicator in response_text for indicator in context_indicators)
                
                if not context_found:
                    success = False
                    details += ", Response doesn't seem to maintain context"
                else:
                    details += ", Context appears to be maintained"
                    
            self.log_test("Context Maintenance", success, details)
            return success
            
        except Exception as e:
            self.log_test("Context Maintenance", False, str(e))
            return False

    def test_chat_history(self):
        """Test chat history retrieval"""
        try:
            if not self.session_id:
                self.log_test("Chat History", False, "No session ID available")
                return False
                
            response = requests.get(
                f"{self.api_url}/chat/history/{self.session_id}",
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                required_fields = ["session_id", "messages"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif not isinstance(data.get("messages"), list):
                    success = False
                    details += ", Messages should be a list"
                elif len(data["messages"]) < 2:
                    success = False
                    details += f", Expected multiple messages, got {len(data['messages'])}"
                else:
                    details += f", Retrieved {len(data['messages'])} messages"
                    
            self.log_test("Chat History Retrieval", success, details)
            return success
            
        except Exception as e:
            self.log_test("Chat History Retrieval", False, str(e))
            return False

    def test_session_deletion(self):
        """Test session deletion"""
        try:
            if not self.session_id:
                self.log_test("Session Deletion", False, "No session ID available")
                return False
                
            response = requests.delete(
                f"{self.api_url}/chat/session/{self.session_id}",
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if "deleted_count" not in data:
                    success = False
                    details += ", Missing deleted_count field"
                elif data["deleted_count"] < 1:
                    success = False
                    details += f", Expected deletions > 0, got {data['deleted_count']}"
                else:
                    details += f", Deleted {data['deleted_count']} messages"
                    
            self.log_test("Session Deletion", success, details)
            return success
            
        except Exception as e:
            self.log_test("Session Deletion", False, str(e))
            return False

    def test_stock_info_endpoint(self):
        """Test stock info endpoint"""
        try:
            # Test with AAPL (Apple)
            symbol = "AAPL"
            response = requests.get(
                f"{self.api_url}/stocks/{symbol}/info",
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                required_fields = ["symbol", "name", "current_price", "market_cap"]
                missing_fields = [field for field in required_fields if field not in data or data[field] is None]
                
                if missing_fields:
                    success = False
                    details += f", Missing/null fields: {missing_fields}"
                elif data.get("symbol") != symbol:
                    success = False
                    details += f", Symbol mismatch: expected {symbol}, got {data.get('symbol')}"
                elif not isinstance(data.get("current_price"), (int, float)) or data["current_price"] <= 0:
                    success = False
                    details += f", Invalid current_price: {data.get('current_price')}"
                else:
                    details += f", Stock: {data['name']}, Price: ${data['current_price']:.2f}"
                    
            self.log_test("Stock Info Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Stock Info Endpoint", False, str(e))
            return False

    def test_stock_prediction_endpoint(self):
        """Test stock prediction endpoint"""
        try:
            # Test with AAPL (Apple)
            symbol = "AAPL"
            payload = {
                "symbol": symbol,
                "timeframe": "30d"
            }
            
            response = requests.post(
                f"{self.api_url}/stocks/{symbol}/predict",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60  # Longer timeout for AI analysis
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                required_sections = ["current_info", "technical_indicators", "statistical_prediction", "trading_signals", "ai_analysis"]
                missing_sections = [section for section in required_sections if section not in data]
                
                if missing_sections:
                    success = False
                    details += f", Missing sections: {missing_sections}"
                else:
                    # Check technical indicators
                    tech_indicators = data["technical_indicators"]
                    if "moving_averages" not in tech_indicators or "rsi" not in tech_indicators:
                        success = False
                        details += ", Missing technical indicator data"
                    
                    # Check statistical prediction
                    stat_pred = data["statistical_prediction"]
                    if "predicted_price_end" not in stat_pred or "trend" not in stat_pred:
                        success = False
                        details += ", Missing statistical prediction data"
                    
                    # Check AI analysis
                    if not isinstance(data["ai_analysis"], str) or len(data["ai_analysis"]) < 50:
                        success = False
                        details += ", AI analysis too short or missing"
                    
                    if success:
                        details += f", Prediction: {stat_pred.get('trend', 'N/A')}, AI analysis: {len(data['ai_analysis'])} chars"
                    
            self.log_test("Stock Prediction Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Stock Prediction Endpoint", False, str(e))
            return False

    def test_stock_search_endpoint(self):
        """Test stock search endpoint"""
        try:
            # Test search functionality
            query = "GOOGL"
            response = requests.get(
                f"{self.api_url}/stocks/search/{query}",
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if "symbol" not in data or "name" not in data:
                    success = False
                    details += ", Missing symbol or name in search result"
                elif data.get("symbol") != query:
                    success = False
                    details += f", Symbol mismatch: expected {query}, got {data.get('symbol')}"
                else:
                    details += f", Found: {data['name']} ({data['symbol']})"
                    
            self.log_test("Stock Search Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Stock Search Endpoint", False, str(e))
            return False

    def test_invalid_stock_symbol(self):
        """Test handling of invalid stock symbol"""
        try:
            # Test with invalid symbol
            symbol = "INVALIDSTOCK123"
            response = requests.get(
                f"{self.api_url}/stocks/{symbol}/info",
                timeout=30
            )
            
            # Should return 404 or 500 for invalid stock
            success = response.status_code in [404, 500]
            details = f"Status: {response.status_code}"
            
            if not success:
                details += ", Should return error for invalid stock symbol"
            else:
                details += ", Correctly handled invalid stock symbol"
                    
            self.log_test("Invalid Stock Symbol Handling", success, details)
            return success
            
        except Exception as e:
            self.log_test("Invalid Stock Symbol Handling", False, str(e))
            return False

    # ============== Options Strategy Endpoints ==============
    
    def test_options_templates(self):
        """Test GET /options/templates - List all strategy templates"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/options/templates", timeout=15)
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                if "templates" not in data:
                    success = False
                    details += ", Missing 'templates' field"
                elif not isinstance(data["templates"], list):
                    success = False
                    details += ", 'templates' should be a list"
                elif len(data["templates"]) == 0:
                    success = False
                    details += ", No templates found"
                else:
                    # Check template structure
                    template = data["templates"][0]
                    required_fields = ["name", "description", "market_view", "risk", "reward"]
                    missing_fields = [field for field in required_fields if field not in template]
                    
                    if missing_fields:
                        success = False
                        details += f", Template missing fields: {missing_fields}"
                    else:
                        details += f", Found {len(data['templates'])} templates"
                        
            self.log_test("Options Templates", success, details)
            return success
            
        except Exception as e:
            self.log_test("Options Templates", False, str(e))
            return False

    def test_options_strategy_template(self):
        """Test POST /options/strategy/template - Build Bull Call Spread for AAPL"""
        try:
            payload = {
                "template_name": "bull_call_spread",
                "underlying_symbol": "AAPL",
                "spot_price": 150.0,
                "days_to_expiry": 30,
                "strike_width": 10.0,
                "volatility": 0.25
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/options/strategy/template",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_fields = ["strategy_name", "underlying_symbol", "legs", "analysis"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif not isinstance(data.get("legs"), list):
                    success = False
                    details += ", 'legs' should be a list"
                elif len(data["legs"]) != 2:
                    success = False
                    details += f", Bull call spread should have 2 legs, got {len(data['legs'])}"
                else:
                    details += f", Strategy: {data.get('strategy_name')}, Legs: {len(data['legs'])}"
                    
            self.log_test("Options Strategy Template (Bull Call Spread)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Options Strategy Template (Bull Call Spread)", False, str(e))
            return False

    def test_options_strategy_custom(self):
        """Test POST /options/strategy/custom - Create custom 2-leg strategy"""
        try:
            payload = {
                "strategy_name": "Custom Call Spread",
                "underlying_symbol": "AAPL",
                "spot_price": 150.0,
                "legs": [
                    {
                        "option_type": "call",
                        "action": "buy",
                        "strike": 100.0,
                        "quantity": 1,
                        "days_to_expiry": 30
                    },
                    {
                        "option_type": "call",
                        "action": "sell",
                        "strike": 110.0,
                        "quantity": 1,
                        "days_to_expiry": 30
                    }
                ],
                "volatility": 0.25,
                "risk_free_rate": 0.05
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/options/strategy/custom",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_fields = ["strategy_name", "underlying_symbol", "legs", "analysis"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get("strategy_name") != "Custom Call Spread":
                    success = False
                    details += f", Strategy name mismatch"
                elif len(data.get("legs", [])) != 2:
                    success = False
                    details += f", Expected 2 legs, got {len(data.get('legs', []))}"
                else:
                    details += f", Custom strategy created successfully"
                    
            self.log_test("Options Strategy Custom", success, details)
            return success
            
        except Exception as e:
            self.log_test("Options Strategy Custom", False, str(e))
            return False

    def test_options_strategies_history(self):
        """Test GET /options/strategies/history - Get recent strategies"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/options/strategies/history", timeout=15)
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                if "strategies" not in data:
                    success = False
                    details += ", Missing 'strategies' field"
                elif not isinstance(data["strategies"], list):
                    success = False
                    details += ", 'strategies' should be a list"
                else:
                    details += f", Found {len(data['strategies'])} historical strategies"
                    
            self.log_test("Options Strategies History", success, details)
            return success
            
        except Exception as e:
            self.log_test("Options Strategies History", False, str(e))
            return False

    # ============== Advanced Analytics Endpoints ==============
    
    def test_models_performance(self):
        """Test GET /models/performance - Get performance data for all models"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/models/performance?model_type=all", timeout=20)
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                # Check for expected performance metrics structure
                if isinstance(data, dict):
                    details += f", Performance data retrieved"
                else:
                    success = False
                    details += ", Invalid response structure"
                    
            self.log_test("Models Performance", success, details)
            return success
            
        except Exception as e:
            self.log_test("Models Performance", False, str(e))
            return False

    def test_models_evaluate(self):
        """Test POST /models/evaluate - Evaluate pending predictions"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/models/evaluate",
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                if "evaluated_count" not in data:
                    success = False
                    details += ", Missing 'evaluated_count' field"
                else:
                    details += f", Evaluated {data['evaluated_count']} predictions"
                    
            self.log_test("Models Evaluate", success, details)
            return success
            
        except Exception as e:
            self.log_test("Models Evaluate", False, str(e))
            return False

    def test_stocks_pairs_trading(self):
        """Test POST /stocks/pairs-trading with AAPL and MSFT"""
        try:
            payload = ["AAPL", "MSFT"]
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/stocks/pairs-trading",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=45
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                # Check for pairs trading analysis structure
                if isinstance(data, dict):
                    details += f", Pairs trading analysis completed"
                else:
                    success = False
                    details += ", Invalid response structure"
                    
            self.log_test("Stocks Pairs Trading", success, details)
            return success
            
        except Exception as e:
            self.log_test("Stocks Pairs Trading", False, str(e))
            return False

    def test_stocks_backtest(self):
        """Test POST /stocks/AAPL/backtest?timeframe=1y (may return 404 if no predictions)"""
        try:
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/stocks/AAPL/backtest?timeframe=1y",
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            latency = time.time() - start_time
            
            # 404 is expected if no evaluated predictions exist
            success = response.status_code in [200, 404]
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if response.status_code == 200:
                data = response.json()
                details += ", Backtest completed successfully"
            elif response.status_code == 404:
                details += ", No evaluated predictions found (expected behavior)"
            else:
                success = False
                details += ", Unexpected status code"
                    
            self.log_test("Stocks Backtest", success, details)
            return success
            
        except Exception as e:
            self.log_test("Stocks Backtest", False, str(e))
            return False

    # ============== Stock Prediction Endpoints ==============
    
    def test_stock_basic_info(self):
        """Test GET /stock/AAPL - Get basic stock info"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/stocks/AAPL/info", timeout=20)
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_fields = ["symbol", "name", "current_price"]
                missing_fields = [field for field in required_fields if field not in data or data[field] is None]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get("symbol") != "AAPL":
                    success = False
                    details += f", Symbol mismatch: expected AAPL, got {data.get('symbol')}"
                else:
                    details += f", Stock: {data['name']}, Price: ${data['current_price']:.2f}"
                    
            self.log_test("Stock Basic Info (AAPL)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Stock Basic Info (AAPL)", False, str(e))
            return False

    def test_historical_data(self):
        """Test GET /historical/AAPL?period=30d - Get 30 days historical data"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/stocks/AAPL/historical?period=1mo", timeout=20)
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_fields = ["symbol", "period", "data"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif not isinstance(data.get("data"), list):
                    success = False
                    details += ", 'data' should be a list"
                elif len(data["data"]) == 0:
                    success = False
                    details += ", No historical data returned"
                else:
                    # Check data point structure
                    data_point = data["data"][0]
                    required_point_fields = ["date", "open", "high", "low", "close", "volume"]
                    missing_point_fields = [field for field in required_point_fields if field not in data_point]
                    
                    if missing_point_fields:
                        success = False
                        details += f", Data point missing fields: {missing_point_fields}"
                    else:
                        details += f", Retrieved {len(data['data'])} data points"
                        
            self.log_test("Historical Data (AAPL 30d)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Historical Data (AAPL 30d)", False, str(e))
            return False

    def test_ensemble_predict(self):
        """Test POST /ensemble-predict/AAPL - Run ensemble prediction"""
        try:
            payload = {
                "symbol": "AAPL",
                "timeframe": "30d"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/stocks/AAPL/predict/ensemble",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=90  # Longer timeout for ensemble prediction
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_sections = ["ensemble_prediction", "individual_predictions", "technical_indicators", "ai_analysis"]
                missing_sections = [section for section in required_sections if section not in data]
                
                if missing_sections:
                    success = False
                    details += f", Missing sections: {missing_sections}"
                else:
                    # Check ensemble prediction structure
                    ensemble = data["ensemble_prediction"]
                    required_ensemble_fields = ["predicted_price", "price_change_percent", "confidence", "trend"]
                    missing_ensemble_fields = [field for field in required_ensemble_fields if field not in ensemble]
                    
                    if missing_ensemble_fields:
                        success = False
                        details += f", Ensemble missing fields: {missing_ensemble_fields}"
                    else:
                        # Check individual predictions
                        individual = data["individual_predictions"]
                        expected_models = ["lstm", "linear_regression", "z_score_mean_reversion", "ornstein_uhlenbeck"]
                        missing_models = [model for model in expected_models if model not in individual]
                        
                        if missing_models:
                            success = False
                            details += f", Missing models: {missing_models}"
                        else:
                            details += f", Ensemble: {ensemble['trend']}, Confidence: {ensemble['confidence']:.1f}%"
                            
            self.log_test("Ensemble Predict (AAPL)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Ensemble Predict (AAPL)", False, str(e))
            return False

    def test_autohedge_analysis(self):
        """Test POST /autohedge/AAPL - Get multi-agent trade analysis"""
        try:
            payload = {
                "symbol": "AAPL",
                "task": "Analyze this stock for investment",
                "portfolio_allocation": 100000.0,
                "timeframe": "30d"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/autohedge/analyze",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=120  # Very long timeout for multi-agent analysis
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_fields = ["symbol", "action", "confidence", "analysis"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Action: {data['action']}, Confidence: {data.get('confidence', 'N/A')}"
                    
            self.log_test("AutoHedge Analysis (AAPL)", success, details)
            return success
            
        except Exception as e:
            self.log_test("AutoHedge Analysis (AAPL)", False, str(e))
            return False

    # ============== Chat Endpoint ==============
    
    def test_chat_specific_question(self):
        """Test POST /chat with 'What is a stock?' and session_id"""
        try:
            test_session = f"stock_question_{int(time.time())}"
            
            payload = {
                "message": "What is a stock?",
                "session_id": test_session
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            latency = time.time() - start_time
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Latency: {latency:.2f}s"
            
            if success:
                data = response.json()
                required_fields = ["session_id", "message", "is_guardrail_triggered"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get("session_id") != test_session:
                    success = False
                    details += f", Session ID mismatch"
                elif data.get("is_guardrail_triggered", True):
                    success = False
                    details += ", Guardrails incorrectly triggered for finance question"
                elif len(data.get("message", "")) < 50:
                    success = False
                    details += ", Response too short for stock explanation"
                else:
                    # Check if response contains stock-related terms
                    response_text = data["message"].lower()
                    stock_terms = ["stock", "share", "company", "ownership", "equity", "investment"]
                    found_terms = sum(1 for term in stock_terms if term in response_text)
                    
                    if found_terms < 2:
                        success = False
                        details += f", Response lacks stock-related content (found {found_terms}/6 terms)"
                    else:
                        details += f", Quality response ({len(data['message'])} chars, {found_terms}/6 stock terms)"
                        
            self.log_test("Chat - What is a stock?", success, details)
            return success
            
        except Exception as e:
            self.log_test("Chat - What is a stock?", False, str(e))
            return False

    def test_llm_integration(self):
        """Test LLM integration with complex finance question"""
        try:
            # Generate new session for this test
            test_session = f"llm_test_{int(time.time())}"
            
            payload = {
                "message": "Explain the concept of compound interest and how it affects long-term investing strategies",
                "session_id": test_session
            }
            
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=45  # Longer timeout for LLM response
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                response_text = data.get("message", "")
                
                # Check for quality indicators
                quality_indicators = [
                    "compound", "interest", "invest", "time", "growth",
                    "return", "principal", "earn"
                ]
                
                found_indicators = sum(1 for indicator in quality_indicators 
                                     if indicator.lower() in response_text.lower())
                
                if len(response_text) < 100:
                    success = False
                    details += ", Response too short for complex question"
                elif found_indicators < 3:
                    success = False
                    details += f", Response lacks financial depth (found {found_indicators}/8 indicators)"
                elif data.get("is_guardrail_triggered", False):
                    success = False
                    details += ", Guardrails incorrectly triggered"
                else:
                    details += f", Quality response ({len(response_text)} chars, {found_indicators}/8 indicators)"
                    
            self.log_test("LLM Integration Quality", success, details)
            return success
            
        except Exception as e:
            self.log_test("LLM Integration Quality", False, str(e))
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Financial Chatbot API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_api_root,
            self.test_chat_finance_question,
            self.test_chat_guardrails,
            self.test_context_maintenance,
            self.test_chat_history,
            self.test_llm_integration,
            self.test_session_deletion,
            # Stock prediction tests
            self.test_stock_info_endpoint,
            self.test_stock_search_endpoint,
            self.test_stock_prediction_endpoint,
            self.test_invalid_stock_symbol,
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
                self.tests_run += 1
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = FinancialChatbotTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())