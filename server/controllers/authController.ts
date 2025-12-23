import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma'
import { generateToken } from '../utils/jwt'
import { RegisterDTO, LoginDTO, UserWithoutPassword } from '../types'

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password } = req.body as RegisterDTO

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      res.status(400).json({ message: 'Email sudah terdaftar' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword }
    })

    const token = generateToken({ userId: user.id, email: user.email })
    const { password: _, ...userWithoutPassword } = user

    res.status(201).json({ user: userWithoutPassword, token })
  } catch (error) {
    res.status(500).json({ message: 'Registrasi gagal' })
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginDTO

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ message: 'Email atau password salah' })
      return
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      res.status(401).json({ message: 'Email atau password salah' })
      return
    }

    const token = generateToken({ userId: user.id, email: user.email })
    const { password: _, ...userWithoutPassword } = user

    res.json({ user: userWithoutPassword, token })
  } catch (error) {
    res.status(500).json({ message: 'Login gagal' })
  }
}

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user) {
      res.status(404).json({ message: 'User tidak ditemukan' })
      return
    }

    const { password: _, ...userWithoutPassword } = user
    res.json(userWithoutPassword)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user' })
  }
}
