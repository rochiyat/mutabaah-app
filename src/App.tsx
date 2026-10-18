import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
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
import { KajianListPage } from '@/pages/KajianListPage';
import { KajianDetailPage } from '@/pages/KajianDetailPage';
import { MeetingDetailPage } from '@/pages/MeetingDetailPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { MemberReportPage } from '@/pages/MemberReportPage';
import { FinancePage } from '@/pages/FinancePage';
import { FinanceAccountPage } from '@/pages/FinanceAccountPage';
import { ProgramsPage } from '@/pages/ProgramsPage';
import { ProgramDetailPage } from '@/pages/ProgramDetailPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { HijriCalendarPage } from '@/pages/HijriCalendarPage';
import type { Role } from '@/types';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  roles?: Role[];
}> = ({ children, roles }) => {
  const context = React.useContext(AuthContext);
  const location = useLocation();

  if (!context) {
    return <Navigate to="/login" />;
  }

  const { user, isLoading } = context;

  if (isLoading) {
    return <div className="loading">Memuat...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Password baru di-reset pengurus: wajib diganti sebelum memakai aplikasi
  if (user.mustChangePassword && location.pathname !== '/ganti-password') {
    return <Navigate to="/ganti-password" />;
  }

  if (roles && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const context = React.useContext(AuthContext);
  const isAuthenticated = context?.user !== null && !context?.isLoading;

  return (
    <div className={`app ${isAuthenticated ? 'with-mobile-nav' : ''}`}>
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
              path="/kajian"
              element={
                <ProtectedRoute>
                  <KajianListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kajian/:id"
              element={
                <ProtectedRoute>
                  <KajianDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pertemuan/:id"
              element={
                <ProtectedRoute>
                  <MeetingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/laporan"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/laporan/anggota/:userId"
              element={
                <ProtectedRoute>
                  <MemberReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/keuangan"
              element={
                <ProtectedRoute>
                  <FinancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/keuangan/:id"
              element={
                <ProtectedRoute>
                  <FinanceAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/program"
              element={
                <ProtectedRoute>
                  <ProgramsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/program/:id"
              element={
                <ProtectedRoute>
                  <ProgramDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profil"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kalender"
              element={
                <ProtectedRoute>
                  <HijriCalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/template-amalan"
              element={
                <ProtectedRoute>
                  <TemplatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/log-aktivitas"
              element={
                <ProtectedRoute roles={['superadmin', 'admin']}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ganti-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['superadmin', 'admin', 'operator']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
      {isAuthenticated && <MobileNav />}
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
