import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { isRole } from '../utils/roles'

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  groupId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
        : undefined,
      select: userSelect,
      orderBy: { name: 'asc' },
      take: 100,
    })

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil daftar user' })
  }
}

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id)
    const { role } = req.body

    if (!isRole(role)) {
      res.status(400).json({ message: 'Role tidak valid' })
      return
    }

    if (id === req.user!.userId) {
      res.status(400).json({ message: 'Tidak bisa mengubah role sendiri' })
      return
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      res.status(404).json({ message: 'User tidak ditemukan' })
      return
    }

    // Hanya superadmin yang boleh memberi atau mencabut role superadmin
    if (req.user!.role !== 'superadmin' && (role === 'superadmin' || target.role === 'superadmin')) {
      res.status(403).json({ message: 'Hanya superadmin yang bisa mengatur role superadmin' })
      return
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    })

    res.json(updated)
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

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      res.status(404).json({ message: 'User tidak ditemukan' })
      return
    }

    if (req.user!.role !== 'superadmin' && target.role === 'superadmin') {
      res.status(403).json({ message: 'Hanya superadmin yang bisa menonaktifkan superadmin' })
      return
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah status user' })
  }
}
