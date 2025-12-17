#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

class PortfolioTester:
    def __init__(self):
        self.base_url = "https://stockwizard-11.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.session_cookies = None
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

    def test_auth_login(self):
        """Test POST /api/auth/login with test credentials"""
        try:
            payload = {
                "email": "test@test.com",
                "password": "password"
            }
            
            response = requests.post(
                f"{self.api_url}/auth/login",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                self.session_cookies = response.cookies
                details += f", Login successful"
            else:
                details += f", Login failed - {response.text[:200]}"
                    
            self.log_test("Authentication - Login", success, details)
            return success
            
        except Exception as e:
            self.log_test("Authentication - Login", False, str(e))
            return False

    def test_trading_positions_add(self):
        """Test POST /api/trading/positions - Add a position"""
        try:
            payload = {
                "symbol": "AAPL",
                "quantity": 10,
                "entry_price": 180.50,
                "position_type": "long"
            }
            
            response = requests.post(
                f"{self.api_url}/trading/positions",
                json=payload,
                cookies=self.session_cookies,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Position added: AAPL x10 @ $180.50"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Portfolio - Add Position", success, details)
            return success
            
        except Exception as e:
            self.log_test("Portfolio - Add Position", False, str(e))
            return False

    def test_trading_positions_get(self):
        """Test GET /api/trading/positions - Get all positions"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/positions",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", Positions: {len(data)}"
                elif "positions" in data:
                    details += f", Positions: {len(data['positions'])}"
                else:
                    details += f", Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Portfolio - Get Positions", success, details)
            return success
            
        except Exception as e:
            self.log_test("Portfolio - Get Positions", False, str(e))
            return False

    def test_trading_portfolio_analysis(self):
        """Test GET /api/trading/portfolio/analysis - Get portfolio analysis"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/portfolio/analysis",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Analysis keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Portfolio - Analysis", success, details)
            return success
            
        except Exception as e:
            self.log_test("Portfolio - Analysis", False, str(e))
            return False

    def test_trading_global_markets(self):
        """Test GET /api/trading/global-markets"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/global-markets",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Global markets keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Trading - Global Markets", success, details)
            return success
            
        except Exception as e:
            self.log_test("Trading - Global Markets", False, str(e))
            return False

    def test_trading_sectors(self):
        """Test GET /api/trading/sectors"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/sectors",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", Sectors: {len(data)}"
                else:
                    details += f", Response type: {type(data)}"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Trading - Sectors", success, details)
            return success
            
        except Exception as e:
            self.log_test("Trading - Sectors", False, str(e))
            return False

    def test_trading_gap_scanners(self):
        """Test GET /api/trading/gap-scanners"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/gap-scanners",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Gap scanners keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Trading - Gap Scanners", success, details)
            return success
            
        except Exception as e:
            self.log_test("Trading - Gap Scanners", False, str(e))
            return False

    def test_payments_subscription_status(self):
        """Test GET /api/payments/subscription/status"""
        try:
            response = requests.get(
                f"{self.api_url}/payments/subscription/status",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code in [200, 401]  # 401 might be expected
            details = f"Status: {response.status_code}"
            
            if response.status_code == 200:
                data = response.json()
                details += f", Subscription status retrieved"
            elif response.status_code == 401:
                details += ", Authentication required (expected)"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Payments - Subscription Status", success, details)
            return success
            
        except Exception as e:
            self.log_test("Payments - Subscription Status", False, str(e))
            return False

    def run_tests(self):
        """Run focused tests for Portfolio Management APIs"""
        print("🚀 Testing Portfolio Management & Additional Trading APIs")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_auth_login,
            self.test_trading_positions_add,
            self.test_trading_positions_get,
            self.test_trading_portfolio_analysis,
            self.test_trading_global_markets,
            self.test_trading_sectors,
            self.test_trading_gap_scanners,
            self.test_payments_subscription_status,
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
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")

if __name__ == "__main__":
    tester = PortfolioTester()
    tester.run_tests()