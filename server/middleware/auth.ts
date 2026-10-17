import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma'
import { verifyToken } from '../utils/jwt'
import { Role, hasRole, parseRoles } from '../utils/roles'

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    res.status(401).json({ message: 'Token tidak ditemukan' })
    return
  }

  let decoded
  try {
    decoded = verifyToken(token)
  } catch (error) {
    res.status(401).json({ message: 'Token tidak valid' })
    return
  }

  try {
    // Ambil role & status terbaru dari DB supaya perubahan role/nonaktif langsung berlaku
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, roles: true, isActive: true },
    })

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Akun tidak aktif atau tidak ditemukan' })
      return
    }

    req.user = { userId: user.id, email: user.email, roles: parseRoles(user.roles) }
    next()
  } catch (error) {
    next(error)
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }
    if (!hasRole(req.user.roles, ...roles)) {
      res.status(403).json({ message: 'Akses ditolak' })
      return
    }
    next()
  }
