import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, AuthContext } from '@/context/AuthContext';
import { Login } from '@/components/auth/Login';
import { Register } from '@/components/auth/Register';
import { HomePage } from '@/pages/HomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ActivitiesPage } from '@/pages/ActivitiesPage';
import { StatsPage } from '@/pages/StatsPage';
import { HalaqohListPage } from '@/pages/HalaqohListPage';
import { HalaqohDetailPage } from '@/pages/HalaqohDetailPage';
import { UsersPage } from '@/pages/UsersPage';
import type { Role } from '@/types';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  roles?: Role[];
}> = ({ children, roles }) => {
  const context = React.useContext(AuthContext);

  if (!context) {
    return <Navigate to="/login" />;
  }

  const { user, isLoading } = context;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const context = React.useContext(AuthContext);
  const isAuthenticated = context?.user !== null && !context?.isLoading;

  return (
    <div className="app">
      {isAuthenticated && <Navbar />}
      <div className="app-body">
        {isAuthenticated && <Sidebar />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activities"
              element={
                <ProtectedRoute>
                  <ActivitiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute>
                  <StatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/halaqoh"
              element={
                <ProtectedRoute>
                  <HalaqohListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/halaqoh/:id"
              element={
                <ProtectedRoute>
                  <HalaqohDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['superadmin', 'admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
