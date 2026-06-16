import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Consignees from '../pages/Consignees';
import Collections from '../pages/Collections';
import Calendar from '../pages/Calendar';
import Revenue from '../pages/Revenue';
import Settings from '../pages/Settings';
import { useAuthStore } from '../store/authStore';

// Pages are accessible in view mode or when authenticated.
// If neither, auto-login as viewer first.
const AppRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isViewMode = useAuthStore(state => state.isViewMode);
  const loginAsViewer = useAuthStore(state => state.loginAsViewer);

  useEffect(() => {
    if (!isAuthenticated && !isViewMode) {
      loginAsViewer();
    }
  }, [isAuthenticated, isViewMode, loginAsViewer]);

  // Show pages as long as we have some form of access
  if (isAuthenticated || isViewMode) {
    return <>{children}</>;
  }

  // Brief loading state while auto-login is in progress
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#006B4D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-500 font-semibold">Loading...</p>
      </div>
    </div>
  );
};

export default function AppRoutes() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
      } />
      <Route path="/dashboard" element={<AppRoute><Dashboard /></AppRoute>} />
      <Route path="/consignees" element={<AppRoute><Consignees /></AppRoute>} />
      <Route path="/collections" element={<AppRoute><Collections /></AppRoute>} />
      <Route path="/calendar" element={<AppRoute><Calendar /></AppRoute>} />
      <Route path="/revenue" element={<AppRoute><Revenue /></AppRoute>} />
      <Route path="/settings" element={<AppRoute><Settings /></AppRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
