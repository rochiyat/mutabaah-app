import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    let groups;

    // Superadmin bisa lihat semua group
    if (req.user.role === 'superadmin') {
      groups = await prisma.group.findMany({
        include: {
          admin: true,
          members: true,
          activities: { include: { activity: true } },
        },
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
        include: {
          admin: true,
          members: true,
          activities: { include: { activity: true } },
        },
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
      include: {
        admin: true,
        members: true,
        activities: { include: { activity: true } },
      },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    // Check if user is admin, member, or superadmin
    const isAdmin = group.adminId === req.user.userId;
    const isMember = group.members.some((m: any) => m.id === req.user.userId);
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isAdmin && !isMember && !isSuperadmin) {
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

    const { name, description } = req.body;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        adminId: req.user.userId,
      },
      include: {
        admin: true,
        members: true,
        activities: { include: { activity: true } },
      },
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

    // Superadmin atau admin group bisa update
    const isAdmin = group.adminId === req.user.userId;
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isAdmin && !isSuperadmin) {
      res.status(403).json({
        message: 'Hanya admin atau superadmin yang bisa mengupdate grup',
      });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: parseInt(id) },
      data: { name, description, isActive },
      include: {
        admin: true,
        members: true,
        activities: { include: { activity: true } },
      },
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

    // Superadmin atau admin group bisa delete
    const isAdmin = group.adminId === req.user.userId;
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isAdmin && !isSuperadmin) {
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

    if (!group || group.adminId !== req.user.userId) {
      res
        .status(403)
        .json({ message: 'Hanya admin yang bisa menambah member' });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: parseInt(groupId) },
      data: {
        members: {
          connect: { id: userId },
        },
      },
      include: {
        admin: true,
        members: true,
        activities: { include: { activity: true } },
      },
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

    if (!group || group.adminId !== req.user.userId) {
      res
        .status(403)
        .json({ message: 'Hanya admin yang bisa menghapus member' });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: parseInt(groupId) },
      data: {
        members: {
          disconnect: { id: parseInt(userId) },
        },
      },
      include: {
        admin: true,
        members: true,
        activities: { include: { activity: true } },
      },
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
      include: { members: true },
    });

    if (!group) {
      res.status(404).json({ message: 'Grup tidak ditemukan' });
      return;
    }

    // Check if user is admin, member, or superadmin
    const isAdmin = group.adminId === req.user.userId;
    const isMember = group.members.some((m: any) => m.id === req.user.userId);
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isAdmin && !isMember && !isSuperadmin) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    res.json(group.members);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil member' });
  }
};
