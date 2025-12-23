import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getGroupActivities = async (
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

    // Check if user is admin or member
    const isAdmin = group.adminId === req.user.userId;
    const isMember = group.members.some((m) => m.id === req.user.userId);

    if (!isAdmin && !isMember) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const activities = await prisma.groupActivity.findMany({
      where: { groupId: parseInt(groupId) },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil aktivitas grup' });
  }
};

export const addActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { groupId } = req.params;
    const { activityId, isRequired } = req.body;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
    });

    if (!group || group.adminId !== req.user.userId) {
      res
        .status(403)
        .json({ message: 'Hanya admin yang bisa menambah aktivitas' });
      return;
    }

    const groupActivity = await prisma.groupActivity.create({
      data: {
        groupId: parseInt(groupId),
        activityId,
        isRequired: isRequired || false,
      },
      include: { activity: true },
    });

    res.status(201).json(groupActivity);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah aktivitas ke grup' });
  }
};

export const removeActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { groupId, activityId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
    });

    if (!group || group.adminId !== req.user.userId) {
      res
        .status(403)
        .json({ message: 'Hanya admin yang bisa menghapus aktivitas' });
      return;
    }

    await prisma.groupActivity.delete({
      where: {
        groupId_activityId: {
          groupId: parseInt(groupId),
          activityId: parseInt(activityId),
        },
      },
    });

    res.json({ message: 'Aktivitas berhasil dihapus dari grup' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus aktivitas dari grup' });
  }
};

export const updateActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const { groupId, activityId } = req.params;
    const { isRequired } = req.body;

    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) },
    });

    if (!group || group.adminId !== req.user.userId) {
      res
        .status(403)
        .json({ message: 'Hanya admin yang bisa mengupdate aktivitas' });
      return;
    }

    const updated = await prisma.groupActivity.update({
      where: {
        groupId_activityId: {
          groupId: parseInt(groupId),
          activityId: parseInt(activityId),
        },
      },
      data: { isRequired },
      include: { activity: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate aktivitas' });
  }
};
