import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'

export const HomePage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="home-page">
      <div className="hero">
        <p className="arabic hero-bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
        <span className="brand-mark brand-mark-lg">
          <Icon name="moon" size={30} />
        </span>
        <h1>Mutaba'ah</h1>
        <p>Teman santai untuk menjaga amal harian tetap istiqamah, bareng halaqoh Anda.</p>

        {!user ? (
          <div className="auth-links">
            <Link to="/login" className="btn-primary">Masuk</Link>
            <Link to="/register" className="btn-secondary">Daftar</Link>
          </div>
        ) : (
          <Link to="/dashboard" className="btn-primary">Ke Dashboard</Link>
        )}

        <div className="hero-features">
          <div>
            <Icon name="checklist" />
            <span>Checklist amal harian</span>
          </div>
          <div>
            <Icon name="users" />
            <span>Pantau bareng halaqoh</span>
          </div>
          <div>
            <Icon name="chart" />
            <span>Laporan & statistik</span>
          </div>
        </div>
      </div>
    </div>
  )
}
