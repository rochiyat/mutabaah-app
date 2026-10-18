import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { findGroupForAccess } from '../utils/groupAccess';
import { logError } from '../utils/logger'
import {
  canCreateGroup,
  canManageGroup,
  canViewGroup,
  isGroupMemberRole,
  isManager,
} from '../utils/roles';

// Jangan pernah ikut mengirim hash password user di respons
const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  roles: true,
  isActive: true,
} satisfies Prisma.UserSelect;

const groupDetailInclude = Prisma.validator<Prisma.GroupInclude>()({
  admin: { select: publicUserSelect },
  members: {
    include: { user: { select: publicUserSelect } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  },
  activities: { include: { activity: true }, orderBy: { createdAt: 'desc' } },
});

const optionalText = z
  .string()
  .trim()
  .max(191)
  .nullable()
  .optional()
  .transform((v) => (v === '' ? null : v));

const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Nama halaqoh wajib diisi').max(191),
  description: z.string().trim().max(5000).nullable().optional(),
  level: optionalText,
  schedule: optionalText,
  location: optionalText,
});

const updateGroupSchema = createGroupSchema.partial().extend({
  isActive: z.boolean().optional(),
  adminId: z.number().int().positive().optional(),
});

const sendValidationError = (res: Response, error: z.ZodError): void => {
  res.status(400).json({
    message: error.issues[0].message,
    errors: error.flatten().fieldErrors,
  });
};

const getGroupDetail = (id: number) =>
  prisma.group.findUnique({ where: { id }, include: groupDetailInclude });

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const userId = req.user.userId;

    // Pengurus (superadmin & admin) melihat semua halaqoh, user lain hanya halaqoh yang diikuti
    const groups = await prisma.group.findMany({
      where: isManager(req.user.roles)
        ? undefined
        : { OR: [{ adminId: userId }, { members: { some: { userId } } }] },
      include: {
        admin: { select: publicUserSelect },
        members: { where: { userId }, select: { role: true } },
        _count: { select: { members: true, activities: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    res.json(
      groups.map(({ members, _count, ...group }) => ({
        ...group,
        memberCount: _count.members,
        activityCount: _count.activities,
        myRole: members[0]?.role ?? null,
      }))
    );
  } catch (error) {
    logError('groupController.getGroups', error)
    res.status(500).json({ message: 'Gagal mengambil daftar halaqoh' });
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

    const access = await findGroupForAccess(req.params.id);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canViewGroup(access, req.user)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const group = await getGroupDetail(access.id);
    res.json({ ...group, canManage: canManageGroup(access, req.user) });
  } catch (error) {
    logError('groupController.getGroupById', error)
    res.status(500).json({ message: 'Gagal mengambil detail halaqoh' });
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

    if (!canCreateGroup(req.user.roles)) {
      res.status(403).json({
        message: 'Hanya murabbi, admin, atau superadmin yang bisa membuat halaqoh',
      });
      return;
    }

    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    // Pembuat otomatis menjadi murabbi penanggung jawab
    const group = await prisma.group.create({
      data: {
        ...parsed.data,
        adminId: req.user.userId,
        members: { create: { userId: req.user.userId, role: 'murabbi' } },
      },
      include: groupDetailInclude,
    });

    res.status(201).json({ ...group, canManage: true });
  } catch (error) {
    logError('groupController.createGroup', error)
    res.status(500).json({ message: 'Gagal membuat halaqoh' });
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

    const access = await findGroupForAccess(req.params.id);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canManageGroup(access, req.user)) {
      res.status(403).json({
        message: 'Hanya murabbi halaqoh atau pengurus yang bisa mengubah halaqoh',
      });
      return;
    }

    const parsed = updateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { adminId, ...data } = parsed.data;

    if (adminId !== undefined && adminId !== access.adminId) {
      // Mengganti penanggung jawab hanya oleh penanggung jawab saat ini atau pengurus
      if (access.adminId !== req.user.userId && !isManager(req.user.roles)) {
        res.status(403).json({
          message: 'Hanya penanggung jawab atau pengurus yang bisa mengganti penanggung jawab',
        });
        return;
      }
      const newAdmin = await prisma.user.findUnique({ where: { id: adminId } });
      if (!newAdmin || !newAdmin.isActive) {
        res.status(404).json({ message: 'User penanggung jawab tidak ditemukan' });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id: access.id },
        data: { ...data, adminId },
      });
      if (adminId !== undefined) {
        await tx.groupMember.upsert({
          where: { groupId_userId: { groupId: access.id, userId: adminId } },
          create: { groupId: access.id, userId: adminId, role: 'murabbi' },
          update: { role: 'murabbi' },
        });
      }
    });

    const group = await getGroupDetail(access.id);
    res.json({ ...group, canManage: true });
  } catch (error) {
    logError('groupController.updateGroup', error)
    res.status(500).json({ message: 'Gagal mengubah halaqoh' });
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

    const access = await findGroupForAccess(req.params.id);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    // Murabbi pendamping tidak boleh menghapus halaqoh
    if (access.adminId !== req.user.userId && !isManager(req.user.roles)) {
      res.status(403).json({
        message: 'Hanya penanggung jawab atau pengurus yang bisa menghapus halaqoh',
      });
      return;
    }

    await prisma.group.delete({ where: { id: access.id } });
    res.json({ message: 'Halaqoh berhasil dihapus' });
  } catch (error) {
    logError('groupController.deleteGroup', error)
    res.status(500).json({ message: 'Gagal menghapus halaqoh' });
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

    const access = await findGroupForAccess(req.params.groupId);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canViewGroup(access, req.user)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: access.id },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    res.json(members);
  } catch (error) {
    logError('groupController.getMembers', error)
    res.status(500).json({ message: 'Gagal mengambil anggota' });
  }
};

// Body: { userId, role?: 'murabbi' | 'mutarabbi' }
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const access = await findGroupForAccess(req.params.groupId);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canManageGroup(access, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya murabbi halaqoh yang bisa menambah anggota' });
      return;
    }

    const role = req.body.role ?? 'mutarabbi';
    if (!isGroupMemberRole(role)) {
      res.status(400).json({ message: 'Peran anggota tidak valid' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(req.body.userId) },
    });
    if (!user || !user.isActive) {
      res.status(404).json({ message: 'User tidak ditemukan atau tidak aktif' });
      return;
    }

    if (access.members.some((m) => m.userId === user.id)) {
      res.status(409).json({ message: 'User sudah menjadi anggota halaqoh ini' });
      return;
    }

    const member = await prisma.groupMember.create({
      data: { groupId: access.id, userId: user.id, role },
      include: { user: { select: publicUserSelect } },
    });

    res.status(201).json(member);
  } catch (error) {
    logError('groupController.addMember', error)
    res.status(500).json({ message: 'Gagal menambah anggota' });
  }
};

// Body: { role: 'murabbi' | 'mutarabbi' }
export const updateMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' });
      return;
    }

    const access = await findGroupForAccess(req.params.groupId);
    const userId = parseInt(req.params.userId);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    if (!canManageGroup(access, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya murabbi halaqoh yang bisa mengubah peran anggota' });
      return;
    }

    const { role } = req.body;
    if (!isGroupMemberRole(role)) {
      res.status(400).json({ message: 'Peran anggota tidak valid' });
      return;
    }

    if (userId === access.adminId && role !== 'murabbi') {
      res.status(400).json({
        message: 'Penanggung jawab harus tetap murabbi; ganti penanggung jawab dulu',
      });
      return;
    }

    if (!access.members.some((m) => m.userId === userId)) {
      res.status(404).json({ message: 'Anggota tidak ditemukan' });
      return;
    }

    const member = await prisma.groupMember.update({
      where: { groupId_userId: { groupId: access.id, userId } },
      data: { role },
      include: { user: { select: publicUserSelect } },
    });

    res.json(member);
  } catch (error) {
    logError('groupController.updateMember', error)
    res.status(500).json({ message: 'Gagal mengubah peran anggota' });
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

    const access = await findGroupForAccess(req.params.groupId);
    const userId = parseInt(req.params.userId);

    if (!access) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }

    // Anggota boleh keluar sendiri; selain itu harus murabbi halaqoh / pengurus
    const isSelf = userId === req.user.userId;
    if (!isSelf && !canManageGroup(access, req.user)) {
      res
        .status(403)
        .json({ message: 'Hanya murabbi halaqoh yang bisa mengeluarkan anggota' });
      return;
    }

    if (userId === access.adminId) {
      res.status(400).json({
        message: 'Penanggung jawab tidak bisa dikeluarkan; ganti penanggung jawab dulu',
      });
      return;
    }

    if (!access.members.some((m) => m.userId === userId)) {
      res.status(404).json({ message: 'Anggota tidak ditemukan' });
      return;
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: access.id, userId } },
    });

    res.json({ message: 'Anggota berhasil dikeluarkan' });
  } catch (error) {
    logError('groupController.removeMember', error)
    res.status(500).json({ message: 'Gagal mengeluarkan anggota' });
  }
};
