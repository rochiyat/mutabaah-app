import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { findGroupForAccess } from '../utils/groupAccess';
import { canManageProgram, canViewProgram, findProgramForAccess } from '../utils/programAccess';
import {
  canCreateLembagaProgram,
  canManageGroup,
  isManager,
  PROGRAM_PARTICIPANT_ROLES,
  PROGRAM_STATUSES,
} from '../utils/roles';
import { sumByType, toNumber } from '../utils/money';
import { dateKeyToDb, isDateKey, toDateKey } from '../utils/date';
import { sendValidationError } from '../utils/meetingSchema';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v));

const optionalDate = z
  .string()
  .refine((v) => v === '' || isDateKey(v), 'Format tanggal harus yyyy-MM-dd')
  .nullable()
  .optional()
  .transform((v) => (v ? v : v === undefined ? undefined : null));

const programSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama program wajib diisi').max(191),
    description: optionalText(5000),
    groupId: z.number().int().positive().nullable().optional(),
    status: z
      .enum(PROGRAM_STATUSES, {
        errorMap: () => ({ message: 'Status harus rencana, berjalan, selesai, atau batal' }),
      })
      .optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    location: optionalText(191),
    budget: z.number().min(0, 'Anggaran tidak boleh negatif').max(9_999_999_999_999).nullable().optional(),
    picId: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.startDate <= d.endDate, {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['endDate'],
  });

const publicUserSelect = { id: true, name: true, email: true } as const;

const toDbDate = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : dateKeyToDb(v);

const serializeProgram = <
  T extends { startDate: Date | null; endDate: Date | null; budget: Prisma.Decimal | null }
>(
  p: T
) => ({
  ...p,
  startDate: p.startDate ? toDateKey(p.startDate) : null,
  endDate: p.endDate ? toDateKey(p.endDate) : null,
  budget: p.budget === null ? null : toNumber(p.budget),
});

const checkPic = async (res: Response, picId: number | null | undefined): Promise<boolean> => {
  if (!picId) return true;
  const pic = await prisma.user.findUnique({ where: { id: picId } });
  if (!pic || !pic.isActive) {
    res.status(400).json({ message: 'Penanggung jawab tidak ditemukan atau tidak aktif' });
    return false;
  }
  return true;
};

export const getPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const programs = await prisma.program.findMany({
      where: isManager(user.roles)
        ? undefined
        : {
            OR: [
              { groupId: null },
              { group: { adminId: user.userId } },
              { group: { members: { some: { userId: user.userId } } } },
            ],
          },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            adminId: true,
            members: { select: { userId: true, role: true } },
          },
        },
        pic: { select: { id: true, name: true } },
        participants: { where: { userId: user.userId }, select: { role: true } },
        _count: { select: { participants: true } },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(
      programs.map(({ group, participants, _count, ...p }) => ({
        ...serializeProgram(p),
        group: group ? { id: group.id, name: group.name } : null,
        participantCount: _count.participants,
        myRole: participants[0]?.role ?? null,
        canManage: canManageProgram({ ...p, group }, user),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil daftar program' });
  }
};

export const createProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = programSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { groupId, startDate, endDate, ...data } = parsed.data;

    if (groupId) {
      const group = await findGroupForAccess(groupId);
      if (!group || !canManageGroup(group, req.user!)) {
        res.status(403).json({ message: 'Hanya murabbi halaqoh yang bisa membuat program halaqoh' });
        return;
      }
    } else if (!canCreateLembagaProgram(req.user!.roles)) {
      res.status(403).json({ message: 'Hanya murabbi atau pengurus yang bisa membuat program' });
      return;
    }
    if (!(await checkPic(res, data.picId))) return;

    const program = await prisma.program.create({
      data: {
        ...data,
        groupId: groupId ?? null,
        startDate: toDbDate(startDate),
        endDate: toDbDate(endDate),
        picId: data.picId ?? req.user!.userId,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json(serializeProgram(program));
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat program' });
  }
};

export const getProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findProgramForAccess(req.params.id);
    if (!access || !canViewProgram(access, req.user!)) {
      res.status(404).json({ message: 'Program tidak ditemukan' });
      return;
    }
    const canManage = canManageProgram(access, req.user!);

    const [pic, createdBy, participants, financeRows, transactions] = await Promise.all([
      access.picId
        ? prisma.user.findUnique({ where: { id: access.picId }, select: publicUserSelect })
        : null,
      access.createdById
        ? prisma.user.findUnique({ where: { id: access.createdById }, select: { id: true, name: true } })
        : null,
      prisma.programParticipant.findMany({
        where: { programId: access.id },
        include: { user: { select: publicUserSelect } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: { programId: access.id },
        _sum: { amount: true },
      }),
      // Rincian transaksi hanya untuk pengelola program
      canManage
        ? prisma.transaction.findMany({
            where: { programId: access.id },
            include: { account: { select: { id: true, name: true } } },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: 200,
          })
        : [],
    ]);

    const finance = sumByType(financeRows);
    const { group, ...program } = access;

    res.json({
      ...serializeProgram(program),
      group: group ? { id: group.id, name: group.name } : null,
      pic,
      createdBy,
      participants,
      finance: {
        ...finance,
        budget: program.budget === null ? null : toNumber(program.budget),
        // Realisasi = pengeluaran yang ditautkan ke program
        realization: finance.keluar,
      },
      transactions: transactions.map((t) => ({
        ...t,
        amount: toNumber(t.amount),
        date: toDateKey(t.date),
      })),
      myParticipation: participants.find((p) => p.userId === req.user!.userId) ?? null,
      canManage,
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil program' });
  }
};

export const updateProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findProgramForAccess(req.params.id);
    if (!access || !canViewProgram(access, req.user!)) {
      res.status(404).json({ message: 'Program tidak ditemukan' });
      return;
    }
    if (!canManageProgram(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    // groupId tidak bisa dipindah setelah dibuat
    const parsed = programSchema.safeParse({ name: access.name, ...req.body, groupId: undefined });
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { groupId: _ignored, startDate, endDate, ...data } = parsed.data;

    // Cek ulang urutan tanggal terhadap nilai yang sudah tersimpan
    const finalStart = startDate !== undefined ? startDate : access.startDate && toDateKey(access.startDate);
    const finalEnd = endDate !== undefined ? endDate : access.endDate && toDateKey(access.endDate);
    if (finalStart && finalEnd && finalStart > finalEnd) {
      res.status(400).json({ message: 'Tanggal selesai harus setelah tanggal mulai' });
      return;
    }
    if (!(await checkPic(res, data.picId))) return;

    const program = await prisma.program.update({
      where: { id: access.id },
      data: { ...data, startDate: toDbDate(startDate), endDate: toDbDate(endDate) },
    });
    res.json(serializeProgram(program));
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah program' });
  }
};

export const deleteProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findProgramForAccess(req.params.id);
    if (!access || !canViewProgram(access, req.user!)) {
      res.status(404).json({ message: 'Program tidak ditemukan' });
      return;
    }
    if (!canManageProgram(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    // Transaksi yang ditautkan tetap ada di kas (programId menjadi null)
    await prisma.program.delete({ where: { id: access.id } });
    res.json({ message: 'Program dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus program' });
  }
};

// Body: { userId?, role? } — tanpa userId berarti mendaftarkan diri sendiri
export const addParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findProgramForAccess(req.params.id);
    if (!access || !canViewProgram(access, req.user!)) {
      res.status(404).json({ message: 'Program tidak ditemukan' });
      return;
    }

    const canManage = canManageProgram(access, req.user!);
    const userId = req.body.userId ? Number(req.body.userId) : req.user!.userId;
    const isSelf = userId === req.user!.userId;
    const role = req.body.role ?? 'peserta';

    if (!(PROGRAM_PARTICIPANT_ROLES as readonly string[]).includes(role)) {
      res.status(400).json({ message: 'Peran harus panitia atau peserta' });
      return;
    }
    if (!canManage && (!isSelf || role !== 'peserta')) {
      res.status(403).json({ message: 'Hanya pengelola yang bisa menambahkan orang lain atau panitia' });
      return;
    }
    if (!canManage && !['rencana', 'berjalan'].includes(access.status)) {
      res.status(400).json({ message: 'Pendaftaran program sudah ditutup' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      res.status(404).json({ message: 'User tidak ditemukan atau tidak aktif' });
      return;
    }

    const participant = await prisma.programParticipant.create({
      data: { programId: access.id, userId, role },
      include: { user: { select: publicUserSelect } },
    });
    res.status(201).json(participant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'Sudah terdaftar di program ini' });
    } else {
      res.status(500).json({ message: 'Gagal mendaftarkan peserta' });
    }
  }
};

export const updateParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findProgramForAccess(req.params.id);
    if (!access || !canViewProgram(access, req.user!)) {
      res.status(404).json({ message: 'Program tidak ditemukan' });
      return;
    }
    if (!canManageProgram(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const { role } = req.body;
    if (!(PROGRAM_PARTICIPANT_ROLES as readonly string[]).includes(role)) {
      res.status(400).json({ message: 'Peran harus panitia atau peserta' });
      return;
    }

    const result = await prisma.programParticipant.updateMany({
      where: { programId: access.id, userId: parseInt(req.params.userId) },
      data: { role },
    });
    if (result.count === 0) {
      res.status(404).json({ message: 'Peserta tidak ditemukan' });
      return;
    }
    res.json({ message: 'Peran diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah peran peserta' });
  }
};

export const removeParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findProgramForAccess(req.params.id);
    if (!access || !canViewProgram(access, req.user!)) {
      res.status(404).json({ message: 'Program tidak ditemukan' });
      return;
    }

    const userId = parseInt(req.params.userId);
    if (userId !== req.user!.userId && !canManageProgram(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const result = await prisma.programParticipant.deleteMany({
      where: { programId: access.id, userId },
    });
    if (result.count === 0) {
      res.status(404).json({ message: 'Peserta tidak ditemukan' });
      return;
    }
    res.json({ message: 'Peserta dikeluarkan' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengeluarkan peserta' });
  }
};
