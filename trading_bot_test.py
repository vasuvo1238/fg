#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

class TradingBotTester:
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
                data = response.json()
                details += f", Login successful"
            else:
                details += f", Login failed - {response.text[:200]}"
                    
            self.log_test("Authentication - Login", success, details)
            return success
            
        except Exception as e:
            self.log_test("Authentication - Login", False, str(e))
            return False

    def test_trading_futures(self):
        """Test GET /api/trading/futures"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/futures",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Response: {json.dumps(data, indent=2)[:500]}..."
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Trading - Futures", success, details)
            return success
            
        except Exception as e:
            self.log_test("Trading - Futures", False, str(e))
            return False

    def test_trading_morning_report(self):
        """Test GET /api/trading/morning-report"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/morning-report",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Trading - Morning Report", success, details)
            return success
            
        except Exception as e:
            self.log_test("Trading - Morning Report", False, str(e))
            return False

    def test_trading_schedule_get(self):
        """Test GET /api/trading/schedule"""
        try:
            response = requests.get(
                f"{self.api_url}/trading/schedule",
                cookies=self.session_cookies,
                timeout=30
            )
            
            success = response.status_code in [200, 401]  # 401 expected if not authenticated
            details = f"Status: {response.status_code}"
            
            if response.status_code == 200:
                data = response.json()
                details += f", Schedule data retrieved"
            elif response.status_code == 401:
                details += ", Authentication required (expected)"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Trading - Get Schedule", success, details)
            return success
            
        except Exception as e:
            self.log_test("Trading - Get Schedule", False, str(e))
            return False

    def test_payments_tiers(self):
        """Test GET /api/payments/tiers"""
        try:
            response = requests.get(
                f"{self.api_url}/payments/tiers",
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if "basic" in data and "pro" in data:
                    basic_price = data["basic"].get("price", 0)
                    pro_price = data["pro"].get("price", 0)
                    details += f", Basic: ${basic_price}, Pro: ${pro_price}"
                else:
                    details += f", Response: {json.dumps(data, indent=2)[:300]}..."
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Payments - Tiers", success, details)
            return success
            
        except Exception as e:
            self.log_test("Payments - Tiers", False, str(e))
            return False

    def test_payments_checkout_create(self):
        """Test POST /api/payments/checkout/create"""
        try:
            payload = {
                "tier": "basic",
                "origin_url": "http://localhost:3000"
            }
            
            response = requests.post(
                f"{self.api_url}/payments/checkout/create",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Checkout created"
            else:
                details += f", Error: {response.text[:200]}"
                    
            self.log_test("Payments - Create Checkout", success, details)
            return success
            
        except Exception as e:
            self.log_test("Payments - Create Checkout", False, str(e))
            return False

    def run_tests(self):
        """Run focused tests for Trading Bot and Stripe APIs"""
        print("🚀 Testing Trading Bot & Stripe Payment APIs")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_auth_login,
            self.test_trading_futures,
            self.test_trading_morning_report,
            self.test_trading_schedule_get,
            self.test_payments_tiers,
            self.test_payments_checkout_create,
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
    tester = TradingBotTester()
    tester.run_tests()