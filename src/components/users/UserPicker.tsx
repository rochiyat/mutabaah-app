import React, { useEffect, useState } from 'react'
import type { User } from '@/types'
import { userAPI } from '@/services/api'

interface UserPickerProps {
  excludeIds: number[]
  onSelect: (user: User) => void
}

// Cari user berdasarkan nama/email lalu pilih satu
export const UserPicker: React.FC<UserPickerProps> = ({ excludeIds, onSelect }) => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await userAPI.getUsers(search.trim())
        setResults(response.data.filter((u) => u.isActive))
      } catch (error) {
        console.error('Failed to search users:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const visible = results.filter((u) => !excludeIds.includes(u.id))

  return (
    <div className="user-picker">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari nama atau email (min. 2 huruf)"
      />
      {isLoading && <p className="muted">Mencari...</p>}
      {!isLoading && search.trim().length >= 2 && visible.length === 0 && (
        <p className="muted">Tidak ada user yang cocok</p>
      )}
      {visible.length > 0 && (
        <ul className="picker-results">
          {visible.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(u)
                  setSearch('')
                  setResults([])
                }}
              >
                <strong>{u.name}</strong> <span className="muted">{u.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
