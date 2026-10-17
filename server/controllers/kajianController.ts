import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { canCreateKajian, canManageKajian, canManageUsers } from '../utils/roles';
import { meetingSchema, sendValidationError } from '../utils/meetingSchema';
import { dateKeyToDb, toDateKey } from '../utils/date';
import { getAttendanceCounts } from './meetingController';

const optionalText = z
  .string()
  .trim()
  .max(191)
  .nullable()
  .optional()
  .transform((v) => (v === '' ? null : v));

const kajianSchema = z.object({
  title: z.string().trim().min(1, 'Judul kajian wajib diisi').max(191),
  speaker: optionalText,
  schedule: optionalText,
  location: optionalText,
  description: z.string().trim().max(5000).nullable().optional(),
});

const kajianUpdateSchema = kajianSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const findKajian = (id: string) => {
  const kajianId = parseInt(id);
  if (Number.isNaN(kajianId)) return Promise.resolve(null);
  return prisma.kajian.findUnique({ where: { id: kajianId } });
};

export const getKajianList = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    // Semua user melihat kajian aktif; pengurus & pembuat juga melihat yang nonaktif
    const list = await prisma.kajian.findMany({
      where: canManageUsers(user.roles)
        ? undefined
        : { OR: [{ isActive: true }, { createdById: user.userId }] },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { meetings: true } },
        meetings: { orderBy: { date: 'desc' }, take: 1, select: { date: true, topic: true } },
      },
      orderBy: [{ isActive: 'desc' }, { title: 'asc' }],
    });

    res.json(
      list.map(({ _count, meetings, ...kajian }) => ({
        ...kajian,
        meetingCount: _count.meetings,
        lastMeeting: meetings[0]
          ? { date: toDateKey(meetings[0].date), topic: meetings[0].topic }
          : null,
        canManage: canManageKajian(kajian, user),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil daftar kajian' });
  }
};

export const getKajian = async (req: Request, res: Response): Promise<void> => {
  try {
    const kajian = await findKajian(req.params.id);
    const user = req.user!;
    const canManage = !!kajian && canManageKajian(kajian, user);
    if (!kajian || (!kajian.isActive && !canManage)) {
      res.status(404).json({ message: 'Kajian tidak ditemukan' });
      return;
    }

    const meetings = await prisma.meeting.findMany({
      where: { kajianId: kajian.id },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: 100,
    });
    const countsFor = await getAttendanceCounts(meetings.map((m) => m.id));
    const createdBy = kajian.createdById
      ? await prisma.user.findUnique({
          where: { id: kajian.createdById },
          select: { id: true, name: true },
        })
      : null;

    res.json({
      ...kajian,
      createdBy,
      canManage,
      meetings: meetings.map((m) => ({
        ...m,
        date: toDateKey(m.date),
        counts: countsFor(m.id),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil kajian' });
  }
};

export const createKajian = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!canCreateKajian(req.user!.roles)) {
      res.status(403).json({ message: 'Hanya murabbi atau pengurus yang bisa membuat kajian' });
      return;
    }

    const parsed = kajianSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const kajian = await prisma.kajian.create({
      data: { ...parsed.data, createdById: req.user!.userId },
    });

    res.status(201).json({ ...kajian, canManage: true });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat kajian' });
  }
};

export const updateKajian = async (req: Request, res: Response): Promise<void> => {
  try {
    const kajian = await findKajian(req.params.id);
    if (!kajian) {
      res.status(404).json({ message: 'Kajian tidak ditemukan' });
      return;
    }
    if (!canManageKajian(kajian, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const parsed = kajianUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const updated = await prisma.kajian.update({
      where: { id: kajian.id },
      data: parsed.data,
    });

    res.json({ ...updated, canManage: true });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah kajian' });
  }
};

export const deleteKajian = async (req: Request, res: Response): Promise<void> => {
  try {
    const kajian = await findKajian(req.params.id);
    if (!kajian) {
      res.status(404).json({ message: 'Kajian tidak ditemukan' });
      return;
    }
    if (!canManageKajian(kajian, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    await prisma.kajian.delete({ where: { id: kajian.id } });
    res.json({ message: 'Kajian berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus kajian' });
  }
};

export const createKajianMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const kajian = await findKajian(req.params.id);
    if (!kajian) {
      res.status(404).json({ message: 'Kajian tidak ditemukan' });
      return;
    }
    if (!canManageKajian(kajian, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const parsed = meetingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    // Pemateri & tempat default diambil dari data kajian
    const meeting = await prisma.meeting.create({
      data: {
        ...parsed.data,
        speaker: parsed.data.speaker ?? kajian.speaker,
        location: parsed.data.location ?? kajian.location,
        date: dateKeyToDb(parsed.data.date),
        kajianId: kajian.id,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json({ ...meeting, date: toDateKey(meeting.date) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat sesi kajian' });
  }
};
