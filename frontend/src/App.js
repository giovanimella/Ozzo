import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/toast';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProductsPage from './pages/ProductsPage';
import WalletPage from './pages/WalletPage';
import SettingsPage from './pages/SettingsPage';
import NetworkPage from './pages/NetworkPage';
import StorePage from './pages/StorePage';
import ProfilePage from './pages/ProfilePage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import WithdrawalsAdminPage from './pages/WithdrawalsAdminPage';
import LogsPage from './pages/LogsPage';
import ReportsPage from './pages/ReportsPage';

// Protected Route Component
function ProtectedRoute({ children, minAccessLevel = 99 }) {
  const { isAuthenticated, loading, accessLevel } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (accessLevel > minAccessLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// App Router
function AppRouter() {
  const location = useLocation();

  // Handle OAuth callback - check URL fragment for session_id
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/store" element={<StorePage />} />

      {/* Protected Routes - All authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute>
          <WalletPage />
        </ProtectedRoute>
      } />
      <Route path="/my-orders" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      {/* Reseller/Leader Routes */}
      <Route path="/network" element={
        <ProtectedRoute minAccessLevel={4}>
          <NetworkPage />
        </ProtectedRoute>
      } />

      {/* Supervisor Routes */}
      <Route path="/my-portfolio" element={
        <ProtectedRoute minAccessLevel={2}>
          <UsersPage />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/users" element={
        <ProtectedRoute minAccessLevel={2}>
          <UsersPage />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute minAccessLevel={1}>
          <ProductsPage />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute minAccessLevel={1}>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/withdrawals" element={
        <ProtectedRoute minAccessLevel={1}>
          <WalletPage />
        </ProtectedRoute>
      } />
      <Route path="/logs" element={
        <ProtectedRoute minAccessLevel={1}>
          <DashboardPage />
        </ProtectedRoute>
      } />

      {/* Admin Técnico Only */}
      <Route path="/settings" element={
        <ProtectedRoute minAccessLevel={0}>
          <SettingsPage />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
