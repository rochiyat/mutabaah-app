import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types'

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      res.status(401).json({ message: 'Token tidak ditemukan' })
      return
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload

    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: 'Token tidak valid' })
  }
}
