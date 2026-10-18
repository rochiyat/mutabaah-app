import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma'
import { verifyToken } from '../utils/jwt'
import { Role, hasRole, parseRoles } from '../utils/roles'
import { logError, logWarn } from '../utils/logger'

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
    logWarn('auth.authenticate', `Token tidak valid: ${(error as Error).message}`)
    res.status(401).json({ message: 'Token tidak valid' })
    return
  }

  try {
    // Ambil role & status terbaru dari DB supaya perubahan role/nonaktif langsung berlaku
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        roles: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    })

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Akun tidak aktif atau tidak ditemukan' })
      return
    }

    // Token lama tidak berlaku lagi setelah password diganti atau di-reset
    if (
      user.passwordChangedAt &&
      (decoded.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      res.status(401).json({ message: 'Sesi berakhir karena password diganti, silakan login ulang' })
      return
    }

    // Setelah reset, hanya boleh melihat profil dan mengganti password
    const allowedWhileMustChange = ['/api/auth/me', '/api/auth/change-password']
    if (user.mustChangePassword && !allowedWhileMustChange.includes(req.originalUrl.split('?')[0])) {
      res.status(403).json({ message: 'Silakan ganti password terlebih dahulu', code: 'MUST_CHANGE_PASSWORD' })
      return
    }

    req.user = { userId: user.id, email: user.email, roles: parseRoles(user.roles) }
    next()
  } catch (error) {
    logError('auth.authenticate', error)
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
