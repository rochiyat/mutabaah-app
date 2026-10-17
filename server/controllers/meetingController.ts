import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { findGroupForAccess } from '../utils/groupAccess';
import {
  canManageMeeting,
  canViewMeeting,
  findMeetingForAccess,
} from '../utils/meetingAccess';
import {
  attendanceSchema,
  meetingSchema,
  meetingUpdateSchema,
  sendValidationError,
} from '../utils/meetingSchema';
import { canManageGroup, canViewGroup } from '../utils/roles';
import { dateKeyToDb, localDateKey, toDateKey } from '../utils/date';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  roles: true,
  isActive: true,
} satisfies Prisma.UserSelect;

// Ringkasan jumlah per status untuk sekumpulan pertemuan
export const getAttendanceCounts = async (meetingIds: number[]) => {
  const rows = meetingIds.length
    ? await prisma.attendance.groupBy({
        by: ['meetingId', 'status'],
        where: { meetingId: { in: meetingIds } },
        _count: { _all: true },
      })
    : [];

  const counts = new Map<number, Record<string, number>>();
  for (const row of rows) {
    const entry = counts.get(row.meetingId) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    entry[row.status] = row._count._all;
    counts.set(row.meetingId, entry);
  }
  return (meetingId: number) =>
    counts.get(meetingId) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
};

const serializeMeeting = <T extends { date: Date }>(meeting: T) => ({
  ...meeting,
  date: toDateKey(meeting.date),
});

// ===== Pertemuan halaqoh =====

export const getGroupMeetings = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await findGroupForAccess(req.params.groupId);
    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }
    if (!canViewGroup(group, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const meetings = await prisma.meeting.findMany({
      where: { groupId: group.id },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: 100,
    });
    const countsFor = await getAttendanceCounts(meetings.map((m) => m.id));

    res.json(
      meetings.map((m) => ({ ...serializeMeeting(m), counts: countsFor(m.id) }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil pertemuan' });
  }
};

export const createGroupMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await findGroupForAccess(req.params.groupId);
    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
      return;
    }
    if (!canManageGroup(group, req.user!)) {
      res.status(403).json({ message: 'Hanya murabbi halaqoh yang bisa membuat pertemuan' });
      return;
    }

    const parsed = meetingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const meeting = await prisma.meeting.create({
      data: {
        ...parsed.data,
        date: dateKeyToDb(parsed.data.date),
        groupId: group.id,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json(serializeMeeting(meeting));
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat pertemuan' });
  }
};

// ===== Pertemuan (halaqoh maupun kajian) =====

export const getMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findMeetingForAccess(req.params.id);
    if (!access) {
      res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
      return;
    }
    if (!canViewMeeting(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const canManage = canManageMeeting(access, req.user!);
    const { group, kajian, ...meeting } = access;

    const attendances = await prisma.attendance.findMany({
      where: { meetingId: meeting.id },
      include: { user: { select: publicUserSelect } },
      orderBy: { user: { name: 'asc' } },
    });

    // Untuk halaqoh: daftar hadir = semua anggota saat ini + yang sudah tercatat
    let roster: { user: unknown; attendance: unknown }[] = [];
    if (group) {
      const members = await prisma.groupMember.findMany({
        where: { groupId: group.id },
        include: { user: { select: publicUserSelect } },
        orderBy: { user: { name: 'asc' } },
      });
      const memberIds = new Set(members.map((m) => m.userId));
      roster = [
        ...members.map((m) => ({
          user: m.user,
          memberRole: m.role,
          attendance: attendances.find((a) => a.userId === m.userId) ?? null,
        })),
        // Mantan anggota yang sudah tercatat tetap ditampilkan
        ...attendances
          .filter((a) => !memberIds.has(a.userId))
          .map((a) => ({ user: a.user, memberRole: null, attendance: a })),
      ];
    }

    res.json({
      ...serializeMeeting(meeting),
      group: group ? { id: group.id, name: group.name } : null,
      kajian: kajian ? { id: kajian.id, title: kajian.title } : null,
      // Daftar lengkap kehadiran hanya untuk pengelola dan anggota halaqoh;
      // peserta kajian umum hanya melihat ringkasan dan kehadirannya sendiri
      attendances: canManage || group ? attendances : [],
      roster: canManage || group ? roster : [],
      counts: (await getAttendanceCounts([meeting.id]))(meeting.id),
      myAttendance: attendances.find((a) => a.userId === req.user!.userId) ?? null,
      canManage,
      // Absen mandiri: di hari pertemuan, untuk anggota halaqoh atau peserta kajian aktif
      canCheckIn:
        toDateKey(meeting.date) === localDateKey() &&
        (group
          ? group.members.some((m) => m.userId === req.user!.userId)
          : !!kajian?.isActive),
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil pertemuan' });
  }
};

export const updateMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findMeetingForAccess(req.params.id);
    if (!access) {
      res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
      return;
    }
    if (!canManageMeeting(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const parsed = meetingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { date, ...data } = parsed.data;

    const meeting = await prisma.meeting.update({
      where: { id: access.id },
      data: { ...data, ...(date ? { date: dateKeyToDb(date) } : {}) },
    });

    res.json(serializeMeeting(meeting));
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah pertemuan' });
  }
};

export const deleteMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findMeetingForAccess(req.params.id);
    if (!access) {
      res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
      return;
    }
    if (!canManageMeeting(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    await prisma.meeting.delete({ where: { id: access.id } });
    res.json({ message: 'Pertemuan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus pertemuan' });
  }
};

// Body: { entries: [{ userId, status, note? }] } — simpan banyak sekaligus
export const saveAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findMeetingForAccess(req.params.id);
    if (!access) {
      res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
      return;
    }
    if (!canManageMeeting(access, req.user!)) {
      res.status(403).json({ message: 'Hanya pengelola yang bisa mengisi absensi' });
      return;
    }

    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { entries } = parsed.data;
    const userIds = [...new Set(entries.map((e) => e.userId))];

    if (access.group) {
      // Halaqoh: hanya anggota, atau yang sudah tercatat sebelumnya (mantan anggota)
      const existing = await prisma.attendance.findMany({
        where: { meetingId: access.id },
        select: { userId: true },
      });
      const allowed = new Set([
        ...access.group.members.map((m) => m.userId),
        ...existing.map((a) => a.userId),
      ]);
      if (userIds.some((id) => !allowed.has(id))) {
        res.status(400).json({ message: 'Ada user yang bukan anggota halaqoh' });
        return;
      }
    } else {
      const found = await prisma.user.count({
        where: { id: { in: userIds }, isActive: true },
      });
      if (found !== userIds.length) {
        res.status(400).json({ message: 'Ada user yang tidak ditemukan atau tidak aktif' });
        return;
      }
    }

    const recordedById = req.user!.userId;
    await prisma.$transaction(
      entries.map((e) =>
        prisma.attendance.upsert({
          where: { meetingId_userId: { meetingId: access.id, userId: e.userId } },
          create: {
            meetingId: access.id,
            userId: e.userId,
            status: e.status,
            note: e.note || null,
            recordedById,
          },
          update: { status: e.status, note: e.note || null, recordedById },
        })
      )
    );

    res.json({ message: 'Absensi tersimpan', saved: entries.length });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan absensi' });
  }
};

export const removeAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findMeetingForAccess(req.params.id);
    if (!access) {
      res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
      return;
    }
    if (!canManageMeeting(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    await prisma.attendance.deleteMany({
      where: { meetingId: access.id, userId: parseInt(req.params.userId) },
    });
    res.json({ message: 'Data kehadiran dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus data kehadiran' });
  }
};

// Absen mandiri: hanya di hari pertemuan
export const checkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const access = await findMeetingForAccess(req.params.id);
    if (!access) {
      res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
      return;
    }
    if (!canViewMeeting(access, req.user!)) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }
    if (access.group && !access.group.members.some((m) => m.userId === req.user!.userId)) {
      res.status(403).json({ message: 'Hanya anggota halaqoh yang bisa absen' });
      return;
    }
    if (access.kajian && !access.kajian.isActive) {
      res.status(400).json({ message: 'Kajian sudah tidak aktif' });
      return;
    }
    if (toDateKey(access.date) !== localDateKey()) {
      res.status(400).json({ message: 'Absen mandiri hanya bisa di hari pertemuan' });
      return;
    }

    const userId = req.user!.userId;
    const attendance = await prisma.attendance.upsert({
      where: { meetingId_userId: { meetingId: access.id, userId } },
      create: { meetingId: access.id, userId, status: 'hadir', recordedById: userId },
      update: { status: 'hadir', note: null, recordedById: userId },
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Gagal absen' });
  }
};
