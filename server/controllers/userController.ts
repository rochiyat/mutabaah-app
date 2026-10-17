import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import {
  assignableRoles,
  canCreateGroup,
  canManageTarget,
  canManageUsers,
  isFinanceManager,
  isRole,
  parseRoles,
} from '../utils/roles'

const userSelect = {
  id: true,
  email: true,
  name: true,
  roles: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const toPublic = <T extends { roles: unknown }>(user: T) => ({ ...user, roles: parseRoles(user.roles) })

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Pengurus, operator, bendahara & murabbi, atau user yang menjadi murabbi di salah satu halaqoh
    const allowed =
      canCreateGroup(req.user!.roles) ||
      canManageUsers(req.user!.roles) ||
      isFinanceManager(req.user!.roles) ||
      (await prisma.groupMember.count({
        where: { userId: req.user!.userId, role: 'murabbi' },
      })) > 0
    if (!allowed) {
      res.status(403).json({ message: 'Akses ditolak' })
      return
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
        : undefined,
      select: userSelect,
      orderBy: { name: 'asc' },
      take: 100,
    })

    res.json(users.map(toPublic))
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil daftar user' })
  }
}

// Body: { roles: Role[] } menggantikan seluruh role tambahan user
export const updateRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id)
    const { roles } = req.body

    if (!Array.isArray(roles) || !roles.every(isRole)) {
      res.status(400).json({ message: 'Role tidak valid' })
      return
    }

    if (id === req.user!.userId) {
      res.status(400).json({ message: 'Tidak bisa mengubah role sendiri' })
      return
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { roles: true } })
    if (!target) {
      res.status(404).json({ message: 'User tidak ditemukan' })
      return
    }

    // Superadmin bebas; admin tidak bisa menyentuh superadmin; operator hanya murabbi/bendahara
    const allowed: readonly string[] = assignableRoles(req.user!.roles)
    if (
      !canManageTarget(req.user!.roles, parseRoles(target.roles)) ||
      !roles.every((r) => allowed.includes(r))
    ) {
      res.status(403).json({ message: 'Anda tidak berwenang mengatur role ini' })
      return
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roles: parseRoles(roles) },
      select: userSelect,
    })

    res.json(toPublic(updated))
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah role' })
  }
}

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id)
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ message: 'isActive harus boolean' })
      return
    }

    if (id === req.user!.userId) {
      res.status(400).json({ message: 'Tidak bisa mengubah status akun sendiri' })
      return
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { roles: true } })
    if (!target) {
      res.status(404).json({ message: 'User tidak ditemukan' })
      return
    }

    if (!canManageTarget(req.user!.roles, parseRoles(target.roles))) {
      res.status(403).json({ message: 'Anda tidak berwenang mengubah status user ini' })
      return
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    })

    res.json(toPublic(updated))
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah status user' })
  }
}
