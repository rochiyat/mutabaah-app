import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'
import { isActivePath, menuFor } from './menu'

// Sidebar untuk layar lebar; di HP diganti MobileNav (menu bawah)
export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <ul>
        {menuFor(user?.roles).map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={isActivePath(location.pathname, item.path) ? 'active' : ''}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <p className="sidebar-quote">"Sedikit tapi istiqamah."</p>
      </div>
    </aside>
  )
}
