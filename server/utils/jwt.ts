import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types'

const PLACEHOLDER_SECRETS = ['your-secret-key', 'your-super-secret-jwt-key']

// Dibaca saat dipakai (bukan saat import) agar selalu mengikuti .env yang sudah dimuat
const getSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET belum diatur di environment')
  }
  return secret
}

export const assertJwtSecret = (): void => {
  const secret = getSecret()
  if (PLACEHOLDER_SECRETS.includes(secret) || secret.length < 32) {
    const message =
      'JWT_SECRET masih contoh atau terlalu pendek (minimal 32 karakter). ' +
      'Buat dengan: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message)
    }
    console.warn(`⚠️  ${message}`)
  }
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, getSecret()) as JWTPayload
}
