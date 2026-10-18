import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'
import { getErrorMessage } from '@/utils/labels'

export const Register: React.FC = () => {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await register(email, name, password)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Registrasi gagal'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="auth-head">
          <span className="brand-mark brand-mark-lg">
            <Icon name="moon" size={28} />
          </span>
          <h1>Daftar Akun</h1>
          <p className="muted">Ahlan wa sahlan! Buat akun dan mulai catat amal harian.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Nama</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>
        <p className="auth-switch">
          Sudah punya akun? <Link to="/login">Login di sini</Link>
        </p>
      </div>
    </div>
  )
}
