import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { AuthResponse, User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  // Simpan sesi baru (misal setelah ganti password)
  setSession: (session: AuthResponse) => void
  // Perbarui data user tanpa mengganti token (misal setelah edit profil)
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (!storedToken || !storedUser) {
      setIsLoading(false)
      return
    }

    setToken(storedToken)
    // Data lama di localStorage (sebelum multi-role) belum punya `roles`
    const parsed = JSON.parse(storedUser)
    setUser({ ...parsed, roles: parsed.roles ?? [] })

    // Segarkan data user (role bisa berubah sejak login terakhir)
    import('@/services/api')
      .then(({ authAPI }) => authAPI.getCurrentUser())
      .then((response) => {
        setUser(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
      })
      .catch((err) => {
        // Token tidak valid ditangani interceptor (redirect ke login)
        console.error('Gagal memuat data user:', err)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { authAPI } = await import('@/services/api')
    const response = await authAPI.login(email, password)
    
    setToken(response.data.token)
    setUser(response.data.user)
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }

  const register = async (email: string, name: string, password: string) => {
    const { authAPI } = await import('@/services/api')
    const response = await authAPI.register(email, name, password)
    
    setToken(response.data.token)
    setUser(response.data.user)
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }

  const setSession = ({ token: newToken, user: newUser }: AuthResponse) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const updateUser = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setSession, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
