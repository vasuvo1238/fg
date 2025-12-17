#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

class JSONValidationTester:
    def __init__(self):
        self.base_url = "https://stockwizard-11.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.session_cookies = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")

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
            
            if response.status_code == 200:
                self.session_cookies = response.cookies
                return True
            return False
                    
        except Exception as e:
            return False

    def validate_json_response(self, endpoint, method="GET", payload=None, cookies=None):
        """Validate that API response is valid JSON with no serialization errors"""
        try:
            if method == "GET":
                response = requests.get(
                    f"{self.api_url}{endpoint}",
                    cookies=cookies,
                    timeout=30
                )
            elif method == "POST":
                response = requests.post(
                    f"{self.api_url}{endpoint}",
                    json=payload,
                    cookies=cookies,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    data = response.json()
                    
                    # Check for MongoDB _id serialization errors
                    response_text = response.text
                    if "ObjectId(" in response_text:
                        success = False
                        details += ", MongoDB ObjectId serialization error detected"
                    elif '"_id":' in response_text:
                        success = False
                        details += ", MongoDB _id field found in response"
                    else:
                        details += ", Valid JSON response"
                        
                except json.JSONDecodeError as e:
                    success = False
                    details += f", JSON decode error: {str(e)}"
            else:
                details += f", HTTP error"
                
            return success, details
            
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def run_tests(self):
        """Run JSON validation tests on key endpoints"""
        print("🚀 Testing API Response JSON Validation")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Login first
        if not self.test_auth_login():
            print("❌ Authentication failed, skipping authenticated tests")
            return
        
        # Test endpoints
        endpoints_to_test = [
            ("/trading/futures", "GET", None, None),
            ("/trading/morning-report", "GET", None, self.session_cookies),
            ("/trading/global-markets", "GET", None, self.session_cookies),
            ("/trading/sectors", "GET", None, self.session_cookies),
            ("/trading/gap-scanners", "GET", None, self.session_cookies),
            ("/trading/schedule", "GET", None, self.session_cookies),
            ("/trading/positions", "GET", None, self.session_cookies),
            ("/trading/portfolio/analysis", "GET", None, self.session_cookies),
            ("/payments/tiers", "GET", None, None),
            ("/payments/subscription/status", "GET", None, self.session_cookies),
            ("/stocks/AAPL/info", "GET", None, None),
            ("/stocks/AAPL/analyst-targets", "GET", None, None),
            ("/earnings/AAPL", "GET", None, None),
            ("/options-chain/AAPL/expiries", "GET", None, None),
            ("/portfolios/list", "GET", None, None),
        ]
        
        for endpoint, method, payload, cookies in endpoints_to_test:
            success, details = self.validate_json_response(endpoint, method, payload, cookies)
            self.log_test(f"JSON Validation - {endpoint}", success, details)
            time.sleep(0.5)  # Brief pause between tests
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 JSON Validation Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")

if __name__ == "__main__":
    tester = JSONValidationTester()
    tester.run_tests()