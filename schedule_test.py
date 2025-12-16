#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

class ScheduleTester:
    def __init__(self):
        self.base_url = "https://marketmorning.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.session_cookies = None

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
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
                    
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def test_schedule_update(self):
        """Test PUT /api/trading/schedule - Update schedule config"""
        try:
            payload = {
                "enabled": True,
                "time_utc": "11:00",
                "days": ["monday", "tuesday"],
                "delivery_methods": ["push"]
            }
            
            response = requests.put(
                f"{self.api_url}/trading/schedule",
                json=payload,
                cookies=self.session_cookies,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"Schedule Update - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                print("✅ Schedule update successful")
                return True
            else:
                print(f"❌ Schedule update failed")
                return False
                    
        except Exception as e:
            print(f"❌ Schedule update error: {str(e)}")
            return False

    def run_test(self):
        """Run schedule update test"""
        print("🚀 Testing Schedule Update API")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        if self.test_auth_login():
            self.test_schedule_update()

if __name__ == "__main__":
    tester = ScheduleTester()
    tester.run_test()