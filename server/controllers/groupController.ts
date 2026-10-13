import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { canCreateGroup, canManageGroup, isManager } from '../utils/roles';

// Jangan pernah ikut mengirim hash password user di respons
const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  groupId: true,
  isActive: true,
} as const;

const groupInclude = {
  admin: { select: publicUserSelect },
  members: { select: publicUserSelect },
  activities: { include: { activity: true } },
} as const;

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    let groups;

    // Superadmin & admin bisa lihat semua group
    if (isManager(req.user.role)) {
      groups = await prisma.group.findMany({
        include: groupInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // User biasa hanya lihat group mereka
      groups = await prisma.group.findMany({
        where: {
          OR: [
            { adminId: req.user.userId },
            { members: { some: { id: req.user.userId } } },
          ],
        },
        include: groupInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil grup' });
  }
};

export const getGroupById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { id } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: parseInt(id) },
      include: groupInclude,
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    // Check if user is admin, member, or superadmin
    const currentUser = req.user;
    const isMember = group.members.some((m) => m.id === currentUser.userId);

    if (!isMember && !canManageGroup(group, currentUser)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil detail grup' });
  }
};

export const createGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    if (!canCreateGroup(req.user.role)) {
      res.status(403).json({
        message: 'Hanya murabbi, admin, atau superadmin yang bisa membuat grup',
      });
      return;
    }

    const { name, description } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Nama grup wajib diisi' });
      return;
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description,
        adminId: req.user.userId,
      },
      include: groupInclude,
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat grup' });
  }
};

export const updateGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(id) },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res.status(403).json({
        message: 'Hanya admin atau superadmin yang bisa mengupdate grup',
      });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: parseInt(id) },
      data: { name, description, isActive },
      include: groupInclude,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate grup' });
  }
};

export const deleteGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { id } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: parseInt(id) },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res.status(403).json({
        message: 'Hanya admin atau superadmin yang bisa menghapus grup',
      });
      return;
    }

    await prisma.group.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Grup berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus grup' });
  }
};

export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya admin grup yang bisa menambah member' });
      return;
    }

    const member = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!member || !member.isActive) {
      res.status(404).json({ message: 'User tidak ditemukan atau tidak aktif' });
      return;
    }

    // Saat ini satu user hanya bisa di satu grup; jangan pindahkan diam-diam
    if (member.groupId && member.groupId !== group.id) {
      res.status(409).json({
        message: 'User sudah terdaftar di grup lain, keluarkan dulu dari grup tersebut',
      });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: parseInt(groupId) },
      data: {
        members: {
          connect: { id: member.id },
        },
      },
      include: groupInclude,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah member' });
  }
};

export const removeMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { groupId, userId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya admin grup yang bisa menghapus member' });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: parseInt(groupId) },
      data: {
        members: {
          disconnect: { id: parseInt(userId) },
        },
      },
      include: groupInclude,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus member' });
  }
};

export const getMembers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { groupId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
      include: { members: { select: publicUserSelect } },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    // Check if user is admin, member, or superadmin
    const currentUser = req.user;
    const isMember = group.members.some((m) => m.id === currentUser.userId);

    if (!isMember && !canManageGroup(group, currentUser)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    res.json(group.members);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil member' });
  }
};
