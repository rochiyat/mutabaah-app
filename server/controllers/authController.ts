import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { parseRoles } from '../utils/roles';

const passwordField = z.string().min(8, 'Password minimal 8 karakter').max(100);

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  password: passwordField,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: passwordField,
});

// Kunci akun sementara setelah MAX_FAILED_LOGINS kali password salah berturut-turut
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const minutesUntil = (date: Date): number => Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60000));

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: parsed.error.issues[0].message,
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const { email, name, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email sudah terdaftar' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword, roles: [] },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ user: { ...userWithoutPassword, roles: parseRoles(user.roles) }, token });
  } catch (error) {
    res.status(500).json({ message: 'Registrasi gagal' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Email atau password salah' });
      return;
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Email atau password salah' });
      return;
    }

    // Selama terkunci password tidak dicek, agar tebakan tetap tidak berguna
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(429).json({
        message: `Akun dikunci sementara karena terlalu banyak percobaan login. Coba lagi dalam ${minutesUntil(user.lockedUntil)} menit.`,
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const { failedLoginAttempts } = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });

      if (failedLoginAttempts >= MAX_FAILED_LOGINS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) },
        });
        res.status(429).json({
          message: `Password salah ${MAX_FAILED_LOGINS} kali. Akun dikunci selama ${LOCK_MINUTES} menit.`,
        });
        return;
      }

      res.status(401).json({ message: 'Email atau password salah' });
      return;
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Akun dinonaktifkan, hubungi pengurus' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: { ...userWithoutPassword, roles: parseRoles(user.roles) }, token });
  } catch (error) {
    res.status(500).json({ message: 'Login gagal' });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      res.status(404).json({ message: 'User tidak ditemukan' });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, roles: parseRoles(user.roles) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
};

// Ganti password sendiri. Sesi lain ikut berakhir; sesi ini dapat token baru.
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ message: 'User tidak ditemukan' });
      return;
    }

    // 400, bukan 401: 401 membuat frontend logout otomatis
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ message: 'Password lama salah' });
      return;
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      res.status(400).json({ message: 'Password baru harus berbeda dari password lama' });
      return;
    }

    // Dibulatkan ke detik agar token baru (iat dalam detik) tetap berlaku
    const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        mustChangePassword: false,
        passwordChangedAt: changedAt,
      },
    });

    const token = generateToken({ userId: updated.id, email: updated.email });
    const { password: _, ...userWithoutPassword } = updated;
    res.json({ user: { ...userWithoutPassword, roles: parseRoles(updated.roles) }, token });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengganti password' });
  }
};
