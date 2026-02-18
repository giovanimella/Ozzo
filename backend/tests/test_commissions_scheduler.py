"""
Test file for Commissions API and Scheduler endpoints
Features tested:
- GET /api/commissions - List user commissions
- GET /api/commissions/summary - Commission summary by level and status
- GET /api/admin/scheduler-status - Scheduler running status
- POST /api/admin/run-job/release_commissions - Manual job execution
- POST /api/admin/run-job/check_qualifications - Manual job execution
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@vanguard.com"
ADMIN_PASSWORD = "admin123"
REVENDEDOR_EMAIL = "revendedor@teste.com"
REVENDEDOR_PASSWORD = "teste123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def revendedor_token():
    """Get revendedor authentication token - creates user if doesn't exist"""
    # Try to login first
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": REVENDEDOR_EMAIL,
        "password": REVENDEDOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    
    # Create revendedor if doesn't exist
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": REVENDEDOR_EMAIL,
        "password": REVENDEDOR_PASSWORD,
        "name": "Revendedor Teste",
        "access_level": 4
    })
    if response.status_code == 200:
        return response.json().get("token")
    
    pytest.skip("Revendedor authentication failed")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestCommissionsAPI:
    """Test commissions endpoints for authenticated users"""
    
    def test_get_commissions_list(self, revendedor_token):
        """Test GET /api/commissions - List user commissions"""
        response = requests.get(
            f"{BASE_URL}/api/commissions",
            headers={"Authorization": f"Bearer {revendedor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "commissions" in data
        assert "total" in data
        assert "page" in data
        assert isinstance(data["commissions"], list)
        print(f"✓ GET /api/commissions - Found {data['total']} commissions")
    
    def test_get_commissions_with_filter(self, revendedor_token):
        """Test GET /api/commissions with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/commissions?status=blocked",
            headers={"Authorization": f"Bearer {revendedor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned commissions have the filtered status
        for commission in data["commissions"]:
            assert commission.get("status") == "blocked"
        print(f"✓ GET /api/commissions with status filter - {len(data['commissions'])} blocked commissions")
    
    def test_get_commissions_pagination(self, revendedor_token):
        """Test pagination on commissions endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/commissions?page=1&limit=5",
            headers={"Authorization": f"Bearer {revendedor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["commissions"]) <= 5
        assert data["page"] == 1
        print("✓ GET /api/commissions pagination working")
    
    def test_get_commissions_unauthorized(self):
        """Test that commissions require authentication"""
        response = requests.get(f"{BASE_URL}/api/commissions")
        assert response.status_code == 401
        print("✓ Commissions endpoint requires authentication")


class TestCommissionsSummary:
    """Test commissions summary endpoint"""
    
    def test_get_commissions_summary(self, revendedor_token):
        """Test GET /api/commissions/summary - Get commission summary"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/summary",
            headers={"Authorization": f"Bearer {revendedor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "by_level" in data
        assert "by_status" in data
        assert "this_month" in data
        assert "available_balance" in data
        assert "blocked_balance" in data
        
        # Validate types
        assert isinstance(data["by_level"], dict)
        assert isinstance(data["by_status"], dict)
        assert isinstance(data["this_month"], (int, float))
        assert isinstance(data["available_balance"], (int, float))
        assert isinstance(data["blocked_balance"], (int, float))
        
        print(f"✓ GET /api/commissions/summary - Available: {data['available_balance']}, Blocked: {data['blocked_balance']}")
    
    def test_commissions_summary_unauthorized(self):
        """Test that summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/commissions/summary")
        assert response.status_code == 401
        print("✓ Commission summary endpoint requires authentication")


class TestSchedulerStatus:
    """Test scheduler status endpoint (Admin only)"""
    
    def test_get_scheduler_status(self, admin_token):
        """Test GET /api/admin/scheduler-status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/scheduler-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "scheduler_running" in data
        assert "jobs" in data
        assert "last_runs" in data
        assert "pending" in data
        
        # Verify scheduler is running
        assert data["scheduler_running"] == True, "Scheduler should be running"
        
        # Verify jobs are registered
        assert isinstance(data["jobs"], list)
        job_ids = [job["id"] for job in data["jobs"]]
        assert "release_commissions" in job_ids, "release_commissions job should be registered"
        assert "check_qualifications" in job_ids, "check_qualifications job should be registered"
        
        print(f"✓ Scheduler is running with {len(data['jobs'])} jobs registered")
        print(f"  Jobs: {job_ids}")
    
    def test_scheduler_status_unauthorized(self, revendedor_token):
        """Test that scheduler status requires admin access"""
        response = requests.get(
            f"{BASE_URL}/api/admin/scheduler-status",
            headers={"Authorization": f"Bearer {revendedor_token}"}
        )
        # Should return 403 (forbidden) for non-admin users
        assert response.status_code == 403
        print("✓ Scheduler status endpoint requires admin access")
    
    def test_scheduler_status_unauthenticated(self):
        """Test that scheduler status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/scheduler-status")
        assert response.status_code == 401
        print("✓ Scheduler status endpoint requires authentication")


class TestManualJobExecution:
    """Test manual job execution endpoints (Admin only)"""
    
    def test_run_release_commissions_job(self, admin_token):
        """Test POST /api/admin/run-job/release_commissions"""
        response = requests.post(
            f"{BASE_URL}/api/admin/run-job/release_commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "release" in data["message"].lower() or "commission" in data["message"].lower()
        print(f"✓ POST /api/admin/run-job/release_commissions - {data['message']}")
    
    def test_run_check_qualifications_job(self, admin_token):
        """Test POST /api/admin/run-job/check_qualifications"""
        response = requests.post(
            f"{BASE_URL}/api/admin/run-job/check_qualifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "qualification" in data["message"].lower() or "check" in data["message"].lower()
        print(f"✓ POST /api/admin/run-job/check_qualifications - {data['message']}")
    
    def test_run_invalid_job(self, admin_token):
        """Test running non-existent job returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/run-job/invalid_job_name",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Invalid job returns 404")
    
    def test_run_job_unauthorized(self, revendedor_token):
        """Test that running jobs requires admin access"""
        response = requests.post(
            f"{BASE_URL}/api/admin/run-job/release_commissions",
            headers={"Authorization": f"Bearer {revendedor_token}"}
        )
        assert response.status_code == 403
        print("✓ Manual job execution requires admin access")


class TestExistingEndpoints:
    """Verify existing endpoints still work (regression test)"""
    
    def test_dashboard_admin(self, admin_token):
        """Test admin dashboard still works"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_counts" in data
        print("✓ GET /api/dashboard/admin working")
    
    def test_users_list(self, admin_token):
        """Test users list still works"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"✓ GET /api/users - {data['total']} users")
    
    def test_orders_list(self, admin_token):
        """Test orders list still works"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✓ GET /api/orders - {data['total']} orders")
    
    def test_products_list(self):
        """Test products list (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print(f"✓ GET /api/products - {data['total']} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
