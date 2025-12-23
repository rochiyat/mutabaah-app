import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export const HomePage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="home-page">
      <div className="hero">
        <h1>Mutaba'ah App</h1>
        <p>Aplikasi untuk memantau dan mencatat aktivitas harian Anda</p>
        
        {!user ? (
          <div className="auth-links">
            <Link to="/login" className="btn-primary">Login</Link>
            <Link to="/register" className="btn-secondary">Daftar</Link>
          </div>
        ) : (
          <Link to="/dashboard" className="btn-primary">Ke Dashboard</Link>
        )}
      </div>
    </div>
  )
}
