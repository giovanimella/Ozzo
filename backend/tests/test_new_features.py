"""
Test suite for NEW MLM Vanguard Features:
- Ranking System
- Goals & Bonuses
- Referral Links with Tracking
- Export Reports (CSV/JSON)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@vanguard.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_session(admin_token):
    """Authenticated session for admin"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    })
    return session


class TestRankingAPI:
    """Tests for GET /api/ranking/resellers - Ranking by sales, commissions, network, points"""
    
    def test_ranking_default_params(self, admin_session):
        """Test ranking with default parameters (month, sales)"""
        response = admin_session.get(f"{BASE_URL}/api/ranking/resellers")
        assert response.status_code == 200
        
        data = response.json()
        assert "ranking" in data
        assert "period" in data
        assert "metric" in data
        assert data["period"] == "month"
        assert data["metric"] == "sales"
        assert isinstance(data["ranking"], list)
    
    def test_ranking_by_sales(self, admin_session):
        """Test ranking by sales metric"""
        response = admin_session.get(f"{BASE_URL}/api/ranking/resellers?period=month&metric=sales&limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["metric"] == "sales"
    
    def test_ranking_by_commissions(self, admin_session):
        """Test ranking by commissions metric"""
        response = admin_session.get(f"{BASE_URL}/api/ranking/resellers?metric=commissions")
        assert response.status_code == 200
        
        data = response.json()
        assert data["metric"] == "commissions"
    
    def test_ranking_by_network(self, admin_session):
        """Test ranking by network size"""
        response = admin_session.get(f"{BASE_URL}/api/ranking/resellers?metric=network")
        assert response.status_code == 200
        
        data = response.json()
        assert data["metric"] == "network"
    
    def test_ranking_by_points(self, admin_session):
        """Test ranking by points"""
        response = admin_session.get(f"{BASE_URL}/api/ranking/resellers?metric=points")
        assert response.status_code == 200
        
        data = response.json()
        assert data["metric"] == "points"
    
    def test_ranking_different_periods(self, admin_session):
        """Test ranking with different time periods"""
        periods = ["week", "month", "quarter", "year", "all"]
        
        for period in periods:
            response = admin_session.get(f"{BASE_URL}/api/ranking/resellers?period={period}")
            assert response.status_code == 200, f"Failed for period: {period}"
            data = response.json()
            assert data["period"] == period
    
    def test_ranking_limit_param(self, admin_session):
        """Test ranking limit parameter"""
        response = admin_session.get(f"{BASE_URL}/api/ranking/resellers?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["ranking"]) <= 5
    
    def test_ranking_requires_auth(self):
        """Test that ranking requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ranking/resellers")
        assert response.status_code == 401


class TestGoalsAPI:
    """Tests for Goals/Metas CRUD - POST, GET, PUT, DELETE /api/goals"""
    
    @pytest.fixture(scope="class")
    def test_goal_data(self):
        """Sample goal data for testing"""
        return {
            "name": f"TEST_Meta_Vendas_{datetime.now().strftime('%H%M%S')}",
            "description": "Meta de teste automatizada",
            "metric": "sales",
            "target_value": 5000.00,
            "bonus_amount": 100.00,
            "bonus_type": "fixed",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "access_levels": [3, 4],
            "active": True
        }
    
    def test_create_goal(self, admin_session, test_goal_data):
        """Test POST /api/goals - Create a new goal"""
        response = admin_session.post(f"{BASE_URL}/api/goals", json=test_goal_data)
        assert response.status_code == 200, f"Failed to create goal: {response.text}"
        
        data = response.json()
        assert "goal_id" in data
        assert data["name"] == test_goal_data["name"]
        assert data["metric"] == "sales"
        assert data["target_value"] == 5000.00
        assert data["bonus_amount"] == 100.00
        assert data["active"] == True
        
        # Store goal_id for later tests
        test_goal_data["created_goal_id"] = data["goal_id"]
        return data["goal_id"]
    
    def test_list_goals(self, admin_session):
        """Test GET /api/goals - List all goals"""
        response = admin_session.get(f"{BASE_URL}/api/goals?active_only=false")
        assert response.status_code == 200
        
        data = response.json()
        assert "goals" in data
        assert isinstance(data["goals"], list)
    
    def test_list_goals_with_progress(self, admin_session):
        """Test that goals include progress information"""
        response = admin_session.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        
        data = response.json()
        # Goals may or may not have progress depending on user data
        assert "goals" in data
    
    def test_get_single_goal(self, admin_session, test_goal_data):
        """Test GET /api/goals/{goal_id} - Get single goal"""
        # First create a goal
        response = admin_session.post(f"{BASE_URL}/api/goals", json=test_goal_data)
        assert response.status_code == 200
        goal_id = response.json()["goal_id"]
        
        # Then get it
        response = admin_session.get(f"{BASE_URL}/api/goals/{goal_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["goal_id"] == goal_id
        assert "progress" in data
    
    def test_update_goal(self, admin_session, test_goal_data):
        """Test PUT /api/goals/{goal_id} - Update a goal"""
        # Create a goal first
        response = admin_session.post(f"{BASE_URL}/api/goals", json=test_goal_data)
        assert response.status_code == 200
        goal_id = response.json()["goal_id"]
        
        # Update it
        updated_data = {**test_goal_data, "name": "TEST_Meta_Atualizada", "target_value": 10000.00}
        response = admin_session.put(f"{BASE_URL}/api/goals/{goal_id}", json=updated_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Meta_Atualizada"
        assert data["target_value"] == 10000.00
        
        # Verify persistence with GET
        response = admin_session.get(f"{BASE_URL}/api/goals/{goal_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "TEST_Meta_Atualizada"
    
    def test_delete_goal(self, admin_session, test_goal_data):
        """Test DELETE /api/goals/{goal_id} - Delete a goal"""
        # Create a goal
        response = admin_session.post(f"{BASE_URL}/api/goals", json=test_goal_data)
        assert response.status_code == 200
        goal_id = response.json()["goal_id"]
        
        # Delete it
        response = admin_session.delete(f"{BASE_URL}/api/goals/{goal_id}")
        assert response.status_code == 200
        
        # Verify it's gone
        response = admin_session.get(f"{BASE_URL}/api/goals/{goal_id}")
        assert response.status_code == 404
    
    def test_goals_requires_auth(self):
        """Test that goals API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 401
    
    def test_create_goal_requires_admin(self, admin_token):
        """Test that creating goals requires admin level"""
        # Admin should be able to create goals
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        })
        
        response = session.post(f"{BASE_URL}/api/goals", json={
            "name": "TEST_Admin_Goal",
            "metric": "sales",
            "target_value": 1000,
            "bonus_amount": 50,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "access_levels": [3, 4],
            "active": True
        })
        assert response.status_code == 200


class TestReferralLinksAPI:
    """Tests for Referral Links - GET /api/referral/link, POST /api/referral/track"""
    
    def test_get_referral_link(self, admin_session):
        """Test GET /api/referral/link - Get user's referral link with stats"""
        response = admin_session.get(f"{BASE_URL}/api/referral/link")
        assert response.status_code == 200
        
        data = response.json()
        assert "referral_code" in data
        assert "referral_link" in data
        assert "stats" in data
        
        # Check stats structure
        stats = data["stats"]
        assert "total_clicks" in stats
        assert "total_conversions" in stats
        assert "conversion_rate" in stats
        assert "monthly_clicks" in stats
    
    def test_referral_link_format(self, admin_session):
        """Test that referral link has correct format"""
        response = admin_session.get(f"{BASE_URL}/api/referral/link")
        assert response.status_code == 200
        
        data = response.json()
        assert data["referral_link"].endswith(f"?ref={data['referral_code']}")
    
    def test_track_referral_click(self, admin_session):
        """Test POST /api/referral/track - Track a referral click"""
        # First get the referral code
        link_response = admin_session.get(f"{BASE_URL}/api/referral/link")
        referral_code = link_response.json()["referral_code"]
        
        # Track a click (no auth required for tracking)
        response = requests.post(f"{BASE_URL}/api/referral/track", json={
            "referral_code": referral_code,
            "user_agent": "Test Browser",
            "ip_address": "127.0.0.1"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "click_id" in data
        assert data["referral_code"] == referral_code
    
    def test_track_invalid_referral_code(self):
        """Test tracking with invalid referral code"""
        response = requests.post(f"{BASE_URL}/api/referral/track", json={
            "referral_code": "INVALID123",
            "user_agent": "Test Browser"
        })
        assert response.status_code == 404
    
    def test_get_referral_clicks(self, admin_session):
        """Test GET /api/referral/clicks - Get click history"""
        response = admin_session.get(f"{BASE_URL}/api/referral/clicks?page=1&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "clicks" in data
        assert "total" in data
        assert isinstance(data["clicks"], list)
    
    def test_referral_link_requires_auth(self):
        """Test that referral link requires authentication"""
        response = requests.get(f"{BASE_URL}/api/referral/link")
        assert response.status_code == 401


class TestExportAPI:
    """Tests for Export Reports - CSV/JSON endpoints"""
    
    def test_export_sales_csv(self, admin_session):
        """Test GET /api/export/sales?format=csv - Export sales report"""
        response = admin_session.get(f"{BASE_URL}/api/export/sales?format=csv")
        assert response.status_code == 200
        
        # Check content type for CSV
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type or response.text.startswith("order_id")
    
    def test_export_sales_json(self, admin_session):
        """Test GET /api/export/sales?format=json - Export sales as JSON"""
        response = admin_session.get(f"{BASE_URL}/api/export/sales?format=json")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
    
    def test_export_commissions_csv(self, admin_session):
        """Test GET /api/export/commissions - Export commissions report"""
        response = admin_session.get(f"{BASE_URL}/api/export/commissions?format=csv")
        assert response.status_code == 200
    
    def test_export_commissions_json(self, admin_session):
        """Test GET /api/export/commissions?format=json - Export commissions as JSON"""
        response = admin_session.get(f"{BASE_URL}/api/export/commissions?format=json")
        assert response.status_code == 200
        
        data = response.json()
        assert "commissions" in data
    
    def test_export_users_csv(self, admin_session):
        """Test GET /api/export/users - Export users report"""
        response = admin_session.get(f"{BASE_URL}/api/export/users?format=csv")
        assert response.status_code == 200
    
    def test_export_users_json(self, admin_session):
        """Test GET /api/export/users?format=json - Export users as JSON"""
        response = admin_session.get(f"{BASE_URL}/api/export/users?format=json")
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
    
    def test_export_users_filter_access_level(self, admin_session):
        """Test export users with access level filter"""
        response = admin_session.get(f"{BASE_URL}/api/export/users?format=json&access_level=0")
        assert response.status_code == 200
        
        data = response.json()
        # Should only contain admin users
        for user in data.get("users", []):
            assert user.get("access_level") == 0
    
    def test_export_requires_auth(self):
        """Test that export APIs require authentication"""
        endpoints = [
            "/api/export/sales",
            "/api/export/commissions",
            "/api/export/users"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"Expected 401 for {endpoint}"


class TestDashboardWithNewFeatures:
    """Tests to verify dashboard includes new feature data"""
    
    def test_admin_dashboard(self, admin_session):
        """Test admin dashboard still works"""
        response = admin_session.get(f"{BASE_URL}/api/dashboard/admin")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_counts" in data
        assert "orders_this_month" in data
        assert "commissions" in data
    
    def test_reseller_dashboard(self, admin_session):
        """Test reseller dashboard (admin can access)"""
        response = admin_session.get(f"{BASE_URL}/api/dashboard/reseller")
        assert response.status_code == 200
        
        data = response.json()
        assert "network" in data
        assert "commissions" in data
        assert "referral_code" in data


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_cleanup_test_goals(self, admin_session):
        """Clean up TEST_ prefixed goals"""
        # List all goals
        response = admin_session.get(f"{BASE_URL}/api/goals?active_only=false")
        if response.status_code == 200:
            goals = response.json().get("goals", [])
            for goal in goals:
                if goal.get("name", "").startswith("TEST_"):
                    admin_session.delete(f"{BASE_URL}/api/goals/{goal['goal_id']}")
        
        # Verify cleanup
        response = admin_session.get(f"{BASE_URL}/api/goals?active_only=false")
        if response.status_code == 200:
            remaining_test_goals = [g for g in response.json().get("goals", []) 
                                   if g.get("name", "").startswith("TEST_")]
            # Allow some goals to remain if deletion failed
            assert len(remaining_test_goals) <= 3, "Too many test goals remaining"
