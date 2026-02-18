"""
Test Users CRUD Operations - MLM Vanguard System
Tests for user creation, update, and status management
"""
import pytest
import requests
import os
import uuid

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUsersModule:
    """Tests for User CRUD operations via admin"""
    
    token = None
    admin_user = None
    created_user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin before tests"""
        if not TestUsersModule.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@vanguard.com",
                "password": "admin123"
            })
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            data = response.json()
            TestUsersModule.token = data["token"]
            TestUsersModule.admin_user = data["user"]
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestUsersModule.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_admin_login_works(self):
        """Test admin login returns valid token and user data"""
        assert TestUsersModule.token is not None
        assert TestUsersModule.admin_user is not None
        assert TestUsersModule.admin_user["email"] == "admin@vanguard.com"
        assert TestUsersModule.admin_user["access_level"] == 0
        print("PASS: Admin login successful")
    
    def test_02_list_users(self):
        """Test listing users with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/users?page=1&limit=10",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert isinstance(data["users"], list)
        print(f"PASS: Listed {len(data['users'])} users, total: {data['total']}")
    
    def test_03_create_user_via_register(self):
        """Test creating a new user via admin registration"""
        unique_id = uuid.uuid4().hex[:6]
        user_data = {
            "email": f"TEST_user_{unique_id}@test.com",
            "password": "test123456",
            "name": f"TEST User {unique_id}",
            "phone": "(11) 99999-9999",
            "access_level": 5,  # Cliente
            "cpf": "123.456.789-00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            headers=self.get_headers(),
            json=user_data
        )
        
        assert response.status_code == 200, f"Create user failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == user_data["email"]
        assert data["user"]["name"] == user_data["name"]
        assert "user_id" in data["user"]
        
        TestUsersModule.created_user_id = data["user"]["user_id"]
        print(f"PASS: Created user with ID: {TestUsersModule.created_user_id}")
    
    def test_04_get_single_user(self):
        """Test getting a single user by ID"""
        if not TestUsersModule.created_user_id:
            pytest.skip("No user created to get")
        
        response = requests.get(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == TestUsersModule.created_user_id
        print(f"PASS: Retrieved user: {data['name']}")
    
    def test_05_update_user(self):
        """Test updating user details via PUT /api/users/{user_id}"""
        if not TestUsersModule.created_user_id:
            pytest.skip("No user created to update")
        
        update_data = {
            "name": "TEST Updated Name",
            "phone": "(11) 88888-8888",
            "status": "active",
            "points": 100
        }
        
        response = requests.put(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers(),
            json=update_data
        )
        
        assert response.status_code == 200, f"Update user failed: {response.text}"
        data = response.json()
        assert data["name"] == "TEST Updated Name"
        assert data["phone"] == "(11) 88888-8888"
        assert data["points"] == 100
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 200
        verify_data = get_response.json()
        assert verify_data["name"] == "TEST Updated Name"
        print("PASS: User updated successfully and verified")
    
    def test_06_update_user_status_to_suspended(self):
        """Test suspending a user"""
        if not TestUsersModule.created_user_id:
            pytest.skip("No user created to suspend")
        
        response = requests.put(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers(),
            json={"status": "suspended"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "suspended"
        print("PASS: User suspended successfully")
    
    def test_07_update_user_status_to_active(self):
        """Test reactivating a suspended user"""
        if not TestUsersModule.created_user_id:
            pytest.skip("No user created to reactivate")
        
        response = requests.put(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers(),
            json={"status": "active"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        print("PASS: User reactivated successfully")
    
    def test_08_update_user_access_level(self):
        """Test changing user access level"""
        if not TestUsersModule.created_user_id:
            pytest.skip("No user created to update")
        
        response = requests.put(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers(),
            json={"access_level": 4}  # Revendedor
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["access_level"] == 4
        print("PASS: User access level changed to Revendedor")
    
    def test_09_update_user_balance(self):
        """Test updating user balance (admin only)"""
        if not TestUsersModule.created_user_id:
            pytest.skip("No user created to update")
        
        response = requests.put(
            f"{BASE_URL}/api/users/{TestUsersModule.created_user_id}",
            headers=self.get_headers(),
            json={
                "available_balance": 150.50,
                "blocked_balance": 25.00
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["available_balance"] == 150.50
        assert data["blocked_balance"] == 25.00
        print("PASS: User balance updated successfully")
    
    def test_10_filter_users_by_status(self):
        """Test filtering users by status"""
        response = requests.get(
            f"{BASE_URL}/api/users?status=active&limit=10",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned users should be active
        for user in data["users"]:
            assert user["status"] == "active"
        print(f"PASS: Filtered {len(data['users'])} active users")
    
    def test_11_filter_users_by_access_level(self):
        """Test filtering users by access level"""
        response = requests.get(
            f"{BASE_URL}/api/users?access_level=0&limit=10",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned users should be admin_tecnico
        for user in data["users"]:
            assert user["access_level"] == 0
        print(f"PASS: Filtered {len(data['users'])} admin users")
    
    def test_12_search_users(self):
        """Test searching users by name or email"""
        response = requests.get(
            f"{BASE_URL}/api/users?search=admin&limit=10",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) >= 1
        # At least one result should match
        found_admin = any("admin" in u.get("name", "").lower() or "admin" in u.get("email", "").lower() 
                        for u in data["users"])
        assert found_admin
        print(f"PASS: Search found {len(data['users'])} matching users")


class TestOrdersAPI:
    """Test Orders API"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestOrdersAPI.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@vanguard.com",
                "password": "admin123"
            })
            TestOrdersAPI.token = response.json()["token"]
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestOrdersAPI.token}"}
    
    def test_list_orders(self):
        """Test listing orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders?page=1&limit=10",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        print(f"PASS: Listed {len(data['orders'])} orders")


class TestWithdrawalsAPI:
    """Test Withdrawals API"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestWithdrawalsAPI.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@vanguard.com",
                "password": "admin123"
            })
            TestWithdrawalsAPI.token = response.json()["token"]
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestWithdrawalsAPI.token}"}
    
    def test_list_withdrawals(self):
        """Test listing withdrawals (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/withdrawals?page=1&limit=10",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "withdrawals" in data
        print(f"PASS: Listed {len(data['withdrawals'])} withdrawals")


class TestLogsAPI:
    """Test System Logs API"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestLogsAPI.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@vanguard.com",
                "password": "admin123"
            })
            TestLogsAPI.token = response.json()["token"]
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestLogsAPI.token}"}
    
    def test_list_logs(self):
        """Test listing system logs"""
        response = requests.get(
            f"{BASE_URL}/api/logs?page=1&limit=20",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        print(f"PASS: Listed {len(data['logs'])} logs")


class TestSettingsAPI:
    """Test Settings API (Admin Técnico only)"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestSettingsAPI.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@vanguard.com",
                "password": "admin123"
            })
            TestSettingsAPI.token = response.json()["token"]
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestSettingsAPI.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_settings(self):
        """Test getting system settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "commission_level_1" in data
        assert "min_withdrawal_amount" in data
        print("PASS: Settings retrieved successfully")
    
    def test_update_settings(self):
        """Test updating system settings"""
        response = requests.put(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers(),
            json={"commission_level_1": 10}
        )
        assert response.status_code == 200
        print("PASS: Settings updated successfully")


class TestProductsAPI:
    """Test Products API"""
    
    token = None
    created_product_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestProductsAPI.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@vanguard.com",
                "password": "admin123"
            })
            TestProductsAPI.token = response.json()["token"]
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestProductsAPI.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_list_products(self):
        """Test listing products (public)"""
        response = requests.get(f"{BASE_URL}/api/products?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print(f"PASS: Listed {len(data['products'])} products")
    
    def test_02_create_product(self):
        """Test creating a product"""
        unique_id = uuid.uuid4().hex[:6]
        product_data = {
            "name": f"TEST Product {unique_id}",
            "description": "Test product description",
            "price": 99.90,
            "discount_price": 79.90,
            "category": "Test Category",
            "stock": 100,
            "images": [],
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            headers=self.get_headers(),
            json=product_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == product_data["name"]
        TestProductsAPI.created_product_id = data["product_id"]
        print(f"PASS: Created product: {data['product_id']}")
    
    def test_03_get_product(self):
        """Test getting a single product"""
        if not TestProductsAPI.created_product_id:
            pytest.skip("No product created")
        
        response = requests.get(f"{BASE_URL}/api/products/{TestProductsAPI.created_product_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["product_id"] == TestProductsAPI.created_product_id
        print("PASS: Product retrieved successfully")
    
    def test_04_update_product(self):
        """Test updating a product"""
        if not TestProductsAPI.created_product_id:
            pytest.skip("No product created")
        
        response = requests.put(
            f"{BASE_URL}/api/products/{TestProductsAPI.created_product_id}",
            headers=self.get_headers(),
            json={
                "name": "TEST Updated Product",
                "description": "Updated description",
                "price": 149.90,
                "category": "Test Category",
                "stock": 50,
                "images": [],
                "active": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST Updated Product"
        print("PASS: Product updated successfully")
    
    def test_05_delete_product(self):
        """Test deleting a product"""
        if not TestProductsAPI.created_product_id:
            pytest.skip("No product created")
        
        response = requests.delete(
            f"{BASE_URL}/api/products/{TestProductsAPI.created_product_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        print("PASS: Product deleted successfully")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self):
        """Delete test users created during tests"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vanguard.com",
            "password": "admin123"
        })
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all users and find TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/users?limit=100", headers=headers)
        if response.status_code == 200:
            users = response.json()["users"]
            test_users = [u for u in users if u.get("name", "").startswith("TEST")]
            for user in test_users:
                # Note: This requires access_level 0 (admin_tecnico)
                requests.delete(f"{BASE_URL}/api/users/{user['user_id']}", headers=headers)
            print(f"Cleanup: Deleted {len(test_users)} test users")
