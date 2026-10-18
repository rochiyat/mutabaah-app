import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'
import { formatRoles } from '@/utils/labels'
import { MOBILE_PRIMARY_PATHS, isActivePath, menuFor } from './menu'

// Menu bawah untuk HP: 4 menu utama + panel "Lainnya" untuk sisanya
export const MobileNav: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  // Tutup panel setiap pindah halaman
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    window.addEventListener('keydown', onKey)
    // Kunci scroll halaman selama panel terbuka
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!user) return null

  const items = menuFor(user.roles)
  const primary = MOBILE_PRIMARY_PATHS.map((p) => items.find((i) => i.path === p)!).filter(Boolean)
  const more = items.filter((i) => !MOBILE_PRIMARY_PATHS.includes(i.path))
  const accountPaths = ['/profil', '/ganti-password']
  const moreActive =
    more.some((i) => isActivePath(location.pathname, i.path)) ||
    accountPaths.some((p) => isActivePath(location.pathname, p))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="mobile-nav" aria-label="Menu utama">
        {primary.map((item) => {
          const active = isActivePath(location.pathname, item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={22} />
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className={moreActive || isOpen ? 'active' : ''}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="mobile-more-sheet"
        >
          <Icon name="more" size={22} />
          <span>Lainnya</span>
        </button>
      </nav>

      {isOpen && (
        <div className="mobile-sheet-backdrop" onClick={() => setIsOpen(false)}>
          <div
            id="mobile-more-sheet"
            className="mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-handle" />

            <Link to="/profil" className="mobile-sheet-profile">
              <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
              <span>
                <strong>{user.name}</strong>
                <span className="muted">{formatRoles(user.roles)}</span>
              </span>
              <Icon name="user" size={18} />
            </Link>

            <div className="mobile-sheet-grid">
              {more.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={isActivePath(location.pathname, item.path) ? 'active' : ''}
                >
                  <Icon name={item.icon} size={22} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mobile-sheet-actions">
              <Link to="/ganti-password">
                <Icon name="key" size={18} />
                Ganti Password
              </Link>
              <button type="button" onClick={handleLogout} className="danger">
                <Icon name="logout" size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
