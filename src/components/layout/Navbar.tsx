import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'

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
        <Link to="/dashboard">
          <span className="brand-mark">
            <Icon name="moon" size={18} />
          </span>
          <span>Mutaba'ah</span>
        </Link>
      </div>
      <div className="nav-links">
        {user && (
          <>
            <Link to="/profil" className="user-chip" title="Profil saya">
              <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
              <span className="user-name">{user.name}</span>
            </Link>
            <Link to="/ganti-password" className="nav-link desktop-only" title="Ganti Password">
              <Icon name="key" size={18} />
              <span className="nav-label">Ganti Password</span>
            </Link>
            <button onClick={handleLogout} className="btn-logout desktop-only" title="Logout">
              <Icon name="logout" size={18} />
              <span className="nav-label">Logout</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
