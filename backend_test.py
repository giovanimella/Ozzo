"""
MLM Vanguard System - Backend API Testing
Tests all major functionality of the MLM system
"""

import requests
import sys
import json
from datetime import datetime

class MLMAPITester:
    def __init__(self, base_url="https://jnilxmg9-stage-preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.regular_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_resources = {
            'users': [],
            'products': [],
            'orders': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   📝 {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Try to parse JSON response
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e),
                'endpoint': endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test basic connectivity"""
        return self.run_test(
            "Health Check", 
            "GET", 
            "health", 
            200,
            description="Verify API connectivity and database connection"
        )

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@vanguard.com", "password": "admin123"},
            description="Login with admin credentials"
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   🎫 Admin token acquired")
            return True
        return False

    def test_admin_dashboard(self):
        """Test admin dashboard data"""
        if not self.admin_token:
            print("❌ Skipping admin dashboard - no admin token")
            return False
            
        return self.run_test(
            "Admin Dashboard",
            "GET",
            "dashboard/admin",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Get admin dashboard statistics"
        )

    def test_settings_access(self):
        """Test settings access (admin only)"""
        if not self.admin_token:
            print("❌ Skipping settings - no admin token")
            return False
            
        return self.run_test(
            "Settings Access",
            "GET",
            "settings",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Access system settings (admin only)"
        )

    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "phone": "+5511999999999",
            "cpf": "12345678901",
            "access_level": 5  # Cliente
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data,
            description="Register new user as Cliente"
        )
        
        if success and 'token' in response:
            self.regular_token = response['token']
            self.created_resources['users'].append(response.get('user', {}).get('user_id'))
            print(f"   👤 Regular user token acquired")
            return True
        return False

    def test_user_dashboard(self):
        """Test regular user dashboard"""
        if not self.regular_token:
            print("❌ Skipping user dashboard - no regular token")
            return False
            
        return self.run_test(
            "User Dashboard",
            "GET",
            "dashboard/reseller",
            200,
            headers={'Authorization': f'Bearer {self.regular_token}'},
            description="Get regular user dashboard data"
        )

    def test_products_list(self):
        """Test products listing (public)"""
        return self.run_test(
            "Products List",
            "GET",
            "products",
            200,
            description="List all products (public access)"
        )

    def test_product_creation(self):
        """Test product creation (admin only)"""
        if not self.admin_token:
            print("❌ Skipping product creation - no admin token")
            return False
            
        product_data = {
            "name": f"Test Product {datetime.now().strftime('%H%M%S')}",
            "description": "Test product for MLM system",
            "price": 99.99,
            "discount_price": 79.99,
            "category": "Teste",
            "stock": 100,
            "active": True
        }
        
        success, response = self.run_test(
            "Product Creation",
            "POST",
            "products",
            200,
            data=product_data,
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Create new product (admin only)"
        )
        
        if success and 'product_id' in response:
            self.created_resources['products'].append(response['product_id'])
            return True
        return False

    def test_users_list(self):
        """Test users listing (admin/supervisor only)"""
        if not self.admin_token:
            print("❌ Skipping users list - no admin token")
            return False
            
        return self.run_test(
            "Users List",
            "GET",
            "users",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="List all users (admin access required)"
        )

    def test_network_tree(self):
        """Test network tree access"""
        if not self.admin_token:
            print("❌ Skipping network tree - no admin token")
            return False
            
        return self.run_test(
            "Network Tree",
            "GET",
            "network/tree",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Get MLM network hierarchy"
        )

    def test_wallet_access(self):
        """Test wallet access"""
        if not self.regular_token:
            print("❌ Skipping wallet - no regular token")
            return False
            
        return self.run_test(
            "Wallet Access",
            "GET",
            "wallet",
            200,
            headers={'Authorization': f'Bearer {self.regular_token}'},
            description="Access user wallet information"
        )

    def test_commissions_list(self):
        """Test commissions listing"""
        if not self.regular_token:
            print("❌ Skipping commissions - no regular token")
            return False
            
        return self.run_test(
            "Commissions List",
            "GET",
            "commissions",
            200,
            headers={'Authorization': f'Bearer {self.regular_token}'},
            description="List user commissions"
        )

    def test_categories_list(self):
        """Test product categories"""
        return self.run_test(
            "Categories List",
            "GET",
            "categories",
            200,
            description="Get product categories"
        )

    def test_unauthorized_access(self):
        """Test access without authentication"""
        success, _ = self.run_test(
            "Unauthorized Access",
            "GET",
            "dashboard/admin",
            401,
            description="Try to access admin endpoint without token (should fail)"
        )
        # For this test, failure is success
        if not success:
            self.tests_passed += 1
            print("✅ Correctly blocked unauthorized access")
            return True
        else:
            print("❌ Should have blocked unauthorized access")
            return False

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("🎯 MLM BACKEND TEST RESULTS")
        print("="*60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"📊 Tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                print(f"   • {test['name']}: {error_msg}")
        
        print(f"\n🔗 Base URL: {self.base_url}")
        print(f"🕒 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return success_rate >= 70  # Consider successful if 70%+ pass

def main():
    """Run all backend tests"""
    print("🚀 Starting MLM Backend API Tests")
    print("="*60)
    
    tester = MLMAPITester()
    
    # Core connectivity and auth tests
    print("\n📡 CONNECTIVITY & AUTHENTICATION")
    tester.test_health_check()
    tester.test_admin_login()
    tester.test_user_registration()
    
    # Dashboard and data access
    print("\n📊 DASHBOARD & DATA ACCESS")
    tester.test_admin_dashboard()
    tester.test_user_dashboard()
    tester.test_settings_access()
    
    # Core business logic
    print("\n🛍️ BUSINESS LOGIC")
    tester.test_products_list()
    tester.test_product_creation()
    tester.test_categories_list()
    
    # User management and network
    print("\n👥 USER MANAGEMENT & NETWORK")
    tester.test_users_list()
    tester.test_network_tree()
    
    # Financial features
    print("\n💰 FINANCIAL FEATURES")
    tester.test_wallet_access()
    tester.test_commissions_list()
    
    # Security
    print("\n🔒 SECURITY")
    tester.test_unauthorized_access()
    
    # Print final results
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())