"""
Test PWA and Push Notifications features for Vanguard MLM
Tests manifest.json, service worker, and push notification APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPWAAssets:
    """Test PWA static files are served correctly"""
    
    def test_manifest_json_accessible(self):
        """Verify manifest.json is accessible and valid"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"manifest.json not accessible: {response.status_code}"
        
        # Verify it's valid JSON
        data = response.json()
        assert "name" in data, "manifest.json missing 'name'"
        assert "short_name" in data, "manifest.json missing 'short_name'"
        assert "icons" in data, "manifest.json missing 'icons'"
        assert "start_url" in data, "manifest.json missing 'start_url'"
        assert "display" in data, "manifest.json missing 'display'"
        assert "theme_color" in data, "manifest.json missing 'theme_color'"
        
        # Verify values
        assert data["name"] == "Vanguard MLM"
        assert data["short_name"] == "Vanguard"
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#2563eb"
        print(f"manifest.json: name={data['name']}, display={data['display']}, icons_count={len(data['icons'])}")
    
    def test_manifest_icons_present(self):
        """Verify manifest has all required icon sizes"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        
        icon_sizes = [icon["sizes"] for icon in data["icons"]]
        required_sizes = ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"]
        
        for size in required_sizes:
            assert size in icon_sizes, f"Missing icon size: {size}"
        print(f"All {len(required_sizes)} icon sizes present: {', '.join(required_sizes)}")
    
    def test_service_worker_accessible(self):
        """Verify sw.js is accessible"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200, f"sw.js not accessible: {response.status_code}"
        
        content = response.text
        assert "addEventListener('install'" in content, "sw.js missing install event"
        assert "addEventListener('push'" in content, "sw.js missing push event"
        assert "addEventListener('notificationclick'" in content, "sw.js missing notificationclick event"
        print("sw.js: Contains install, push, and notificationclick handlers")
    
    def test_index_html_pwa_meta_tags(self):
        """Verify index.html has required PWA meta tags"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        
        content = response.text
        
        # Check for PWA meta tags
        assert 'name="theme-color"' in content, "Missing theme-color meta tag"
        assert 'name="apple-mobile-web-app-capable"' in content, "Missing apple-mobile-web-app-capable"
        assert 'name="apple-mobile-web-app-status-bar-style"' in content, "Missing apple-mobile-web-app-status-bar-style"
        assert 'name="apple-mobile-web-app-title"' in content, "Missing apple-mobile-web-app-title"
        assert 'rel="manifest"' in content, "Missing manifest link"
        assert "serviceWorker" in content, "Missing service worker registration"
        print("index.html: All PWA meta tags present")
    
    def test_icon_files_accessible(self):
        """Verify PWA icon files are accessible"""
        icon_sizes = ["72x72", "96x96", "192x192", "512x512"]
        
        for size in icon_sizes:
            response = requests.get(f"{BASE_URL}/icon-{size}.png")
            assert response.status_code == 200, f"icon-{size}.png not accessible"
        print(f"All {len(icon_sizes)} icon files accessible")


class TestPushNotificationAPIs:
    """Test push notification API endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vanguard.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def revendedor_token(self):
        """Get revendedor authentication token"""
        # First try to login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "revendedor@teste.com",
            "password": "teste123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # Create if doesn't exist
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "revendedor@teste.com",
            "password": "teste123",
            "name": "Revendedor Teste",
            "access_level": 4
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not get revendedor token")
    
    def test_notification_status_unauthenticated(self):
        """Verify notification status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/status")
        assert response.status_code == 401, "Should require authentication"
        print("GET /api/notifications/status requires auth (401)")
    
    def test_notification_status_authenticated(self, auth_token):
        """Get notification subscription status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "subscribed" in data, "Response missing 'subscribed' field"
        assert "vapid_public_key" in data, "Response missing 'vapid_public_key' field"
        
        print(f"GET /api/notifications/status: subscribed={data['subscribed']}, vapid_key_present={len(data['vapid_public_key']) > 0}")
    
    def test_notification_subscribe_valid_subscription(self, revendedor_token):
        """Test subscribing to push notifications"""
        headers = {"Authorization": f"Bearer {revendedor_token}"}
        
        # Mock subscription data (similar to what browser would provide)
        subscription_data = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-subscription-endpoint-12345",
                "keys": {
                    "p256dh": "test_p256dh_key_base64_encoded",
                    "auth": "test_auth_key_base64"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            headers=headers,
            json=subscription_data
        )
        
        assert response.status_code == 200, f"Subscribe failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "Subscribed" in data["message"]
        print("POST /api/notifications/subscribe: Success")
    
    def test_notification_subscribe_unauthenticated(self):
        """Verify subscription requires authentication"""
        subscription_data = {
            "subscription": {
                "endpoint": "https://test.endpoint.com/test",
                "keys": {
                    "p256dh": "test_key",
                    "auth": "test_auth"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json=subscription_data
        )
        assert response.status_code == 401
        print("POST /api/notifications/subscribe requires auth (401)")
    
    def test_notification_unsubscribe(self, revendedor_token):
        """Test unsubscribing from push notifications"""
        headers = {"Authorization": f"Bearer {revendedor_token}"}
        
        unsubscribe_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-subscription-endpoint-12345"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/unsubscribe",
            headers=headers,
            json=unsubscribe_data
        )
        
        assert response.status_code == 200, f"Unsubscribe failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "Unsubscribed" in data["message"]
        print("POST /api/notifications/unsubscribe: Success")
    
    def test_admin_send_notification_requires_admin(self, revendedor_token):
        """Verify send-notification is admin only"""
        headers = {"Authorization": f"Bearer {revendedor_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/send-notification",
            headers=headers,
            json={"title": "Test", "body": "Test message"}
        )
        
        assert response.status_code == 403, "Should be admin only"
        print("POST /api/admin/send-notification requires admin access (403)")
    
    def test_admin_send_notification_success(self, auth_token):
        """Test admin can send notifications"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/send-notification",
            headers=headers,
            json={
                "title": "Test Notification",
                "body": "This is a test notification from backend tests"
            }
        )
        
        assert response.status_code == 200, f"Send notification failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "message" in data
        print("POST /api/admin/send-notification: Success (admin)")


class TestResellerNotificationStatus:
    """Test notification status for resellers"""
    
    @pytest.fixture
    def revendedor_token(self):
        """Get revendedor authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "revendedor@teste.com",
            "password": "teste123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "revendedor@teste.com",
            "password": "teste123",
            "name": "Revendedor Teste",
            "access_level": 4
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not get revendedor token")
    
    def test_revendedor_notification_status(self, revendedor_token):
        """Revendedor can check notification status"""
        headers = {"Authorization": f"Bearer {revendedor_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "subscribed" in data
        assert "vapid_public_key" in data
        print(f"Revendedor notification status: subscribed={data['subscribed']}")


class TestHealthEndpoint:
    """Test health endpoint"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
