import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}
