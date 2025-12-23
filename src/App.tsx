import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { Login } from '@/components/auth/Login'
import { Register } from '@/components/auth/Register'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { StatsPage } from '@/pages/StatsPage'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = React.useContext(AuthContext)
  
  if (!context) {
    return <Navigate to="/login" />
  }
  
  const { user, isLoading } = context
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />
}

const AppContent: React.FC = () => {
  const context = React.useContext(AuthContext)
  const isAuthenticated = context?.user !== null && !context?.isLoading

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
          </Routes>
        </main>
      </div>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
