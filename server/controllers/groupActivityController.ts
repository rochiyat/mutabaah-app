import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { findGroupForAccess as findGroup } from '../utils/groupAccess';
import { canManageGroup, canViewGroup } from '../utils/roles';

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
    const group = await findGroup(groupId);

    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canViewGroup(group, req.user)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const activities = await prisma.groupActivity.findMany({
      where: { groupId: group.id },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil aktivitas grup' });
  }
};

// Body: { activityId, isRequired } untuk memakai amalan grup yang sudah ada,
// atau { name, category, target, unit, isRequired } untuk membuat amalan grup baru.
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
    const { activityId, isRequired, name, category, target, unit } = req.body;

    const group = await findGroup(groupId);

    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya murabbi halaqoh yang bisa menambah aktivitas' });
      return;
    }

    let targetActivityId: number;

    if (activityId !== undefined) {
      const existing = await prisma.activity.findUnique({
        where: { id: Number(activityId) },
      });
      // Amalan pribadi milik user tidak boleh dijadikan amalan grup
      if (!existing || existing.userId !== null) {
        res.status(404).json({ message: 'Amalan halaqoh tidak ditemukan' });
        return;
      }
      targetActivityId = existing.id;
    } else {
      if (typeof name !== 'string' || !name.trim() || typeof category !== 'string') {
        res
          .status(400)
          .json({ message: 'Isi activityId, atau name dan category untuk amalan baru' });
        return;
      }
      const created = await prisma.activity.create({
        data: {
          name: name.trim(),
          category,
          target: Number.isInteger(target) && target > 0 ? target : 1,
          unit: typeof unit === 'string' && unit ? unit : 'kali',
          userId: null,
        },
      });
      targetActivityId = created.id;
    }

    const groupActivity = await prisma.groupActivity.create({
      data: {
        groupId: group.id,
        activityId: targetActivityId,
        isRequired: isRequired === true,
      },
      include: { activity: true },
    });

    res.status(201).json(groupActivity);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Amalan sudah ada di halaqoh ini' });
    } else {
      res.status(500).json({ message: 'Gagal menambah aktivitas ke grup' });
    }
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
    const group = await findGroup(groupId);

    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya murabbi halaqoh yang bisa menghapus aktivitas' });
      return;
    }

    // Hanya melepas dari grup; amalan & catatan anggota tetap tersimpan sebagai riwayat
    await prisma.groupActivity.delete({
      where: {
        groupId_activityId: {
          groupId: group.id,
          activityId: parseInt(activityId),
        },
      },
    });

    res.json({ message: 'Aktivitas berhasil dihapus dari grup' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus aktivitas dari grup' });
  }
};

// Body: { isRequired?, name?, category?, target?, unit?, isActive? }
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
    const { isRequired, name, category, target, unit, isActive } = req.body;

    const group = await findGroup(groupId);

    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canManageGroup(group, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya murabbi halaqoh yang bisa mengupdate aktivitas' });
      return;
    }

    const where = {
      groupId_activityId: {
        groupId: group.id,
        activityId: parseInt(activityId),
      },
    };

    const link = await prisma.groupActivity.findUnique({
      where,
      include: { activity: true },
    });
    if (!link) {
      res.status(404).json({ message: 'Aktivitas tidak ada di halaqoh ini' });
      return;
    }

    // Detail amalan hanya bisa diubah jika amalan itu milik grup (bukan amalan pribadi)
    if (link.activity.userId === null) {
      await prisma.activity.update({
        where: { id: link.activityId },
        data: { name, category, target, unit, isActive },
      });
    }

    const updated = await prisma.groupActivity.update({
      where,
      data: { isRequired },
      include: { activity: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate aktivitas' });
  }
};
