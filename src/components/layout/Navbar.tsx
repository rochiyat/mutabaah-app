import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/dashboard">Mutaba'ah App</Link>
      </div>
      <div className="nav-links">
        {user && (
          <>
            <span className="user-name">{user.name}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
