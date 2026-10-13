import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { findGroupForAccess } from '../utils/groupAccess';
import { getUserActivities } from '../utils/activityAccess';
import { canManageGroup, canManageKajian } from '../utils/roles';
import {
  dateKeyToDb,
  eachDateKey,
  localDateKey,
  minDateKey,
  toDateKey,
} from '../utils/date';
import { parsePeriod, percent, ReportPeriod } from '../utils/reportPeriod';
import { sendWorkbook, SheetSpec } from '../utils/excel';

type ReportActivity = {
  id: number;
  name: string;
  unit: string;
  target: number;
  isRequired: boolean;
};

const STATUS_CODES: Record<string, string> = { hadir: 'H', izin: 'I', sakit: 'S', alpa: 'A' };
const MEMBER_ROLE_LABEL: Record<string, string> = { murabbi: 'Murabbi', mutarabbi: 'Mutarabbi' };

const wantsExcel = (req: Request): boolean => req.query.format === 'xlsx';

const periodLabel = (p: ReportPeriod): string => `Periode ${p.start} s.d. ${p.end}`;

// Target hanya dihitung sampai hari ini, hari yang belum terjadi tidak dihitung
const targetDays = (period: ReportPeriod): string[] => {
  const end = minDateKey(period.end, localDateKey());
  return end < period.start ? [] : eachDateKey(period.start, end);
};

// Jumlahkan capaian per user per amalan; kelebihan dari target harian tidak dihitung
const summarizeRecords = (
  records: { userId: number; activityId: number; date: Date; completed: number }[],
  activities: ReportActivity[]
) => {
  const targetOf = new Map(activities.map((a) => [a.id, a.target]));
  const completed = new Map<string, number>(); // `${userId}:${activityId}`
  const filledDays = new Map<number, Set<string>>();
  const daily = new Map<string, number>(); // `${userId}:${activityId}:${date}` (nilai asli)

  for (const r of records) {
    const target = targetOf.get(r.activityId);
    if (target === undefined) continue;
    const key = `${r.userId}:${r.activityId}`;
    completed.set(key, (completed.get(key) ?? 0) + Math.min(r.completed, target));
    daily.set(`${key}:${toDateKey(r.date)}`, r.completed);
    if (r.completed > 0) {
      const set = filledDays.get(r.userId) ?? new Set<string>();
      set.add(toDateKey(r.date));
      filledDays.set(r.userId, set);
    }
  }

  return {
    completedFor: (userId: number, activityId: number) =>
      completed.get(`${userId}:${activityId}`) ?? 0,
    dailyFor: (userId: number, activityId: number, date: string) =>
      daily.get(`${userId}:${activityId}:${date}`) ?? 0,
    daysFilledFor: (userId: number) => filledDays.get(userId)?.size ?? 0,
  };
};

const loadGroupActivities = async (groupId: number): Promise<ReportActivity[]> => {
  const links = await prisma.groupActivity.findMany({
    where: { groupId, activity: { isActive: true } },
    include: { activity: true },
    orderBy: { createdAt: 'asc' },
  });
  return links.map((l) => ({
    id: l.activity.id,
    name: l.activity.name,
    unit: l.activity.unit,
    target: l.activity.target,
    isRequired: l.isRequired,
  }));
};

// Hasil umum: grup ditemukan & boleh dikelola, atau respons error sudah dikirim
const loadManagedGroup = async (req: Request, res: Response) => {
  const group = await findGroupForAccess(req.params.groupId);
  if (!group) {
    res.status(404).json({ message: 'Halaqoh tidak ditemukan' });
    return null;
  }
  if (!canManageGroup(group, req.user!)) {
    res.status(403).json({ message: 'Hanya murabbi halaqoh atau pengurus yang bisa melihat laporan' });
    return null;
  }
  return group;
};

const readPeriod = (req: Request, res: Response): ReportPeriod | null => {
  const parsed = parsePeriod(req.query);
  if ('error' in parsed) {
    res.status(400).json({ message: parsed.error });
    return null;
  }
  return parsed.period;
};

// ===== Rekap mutabaah halaqoh =====

export const groupMutabaah = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = readPeriod(req, res);
    if (!period) return;
    const group = await loadManagedGroup(req, res);
    if (!group) return;

    const days = targetDays(period);
    const activities = await loadGroupActivities(group.id);
    const members = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const records =
      days.length && activities.length && members.length
        ? await prisma.record.findMany({
            where: {
              userId: { in: members.map((m) => m.userId) },
              activityId: { in: activities.map((a) => a.id) },
              date: { gte: dateKeyToDb(days[0]), lte: dateKeyToDb(days[days.length - 1]) },
            },
          })
        : [];
    const summary = summarizeRecords(records, activities);

    const memberRows = members
      .map((m) => {
        const perActivity: Record<number, { completed: number; target: number; percent: number | null }> = {};
        let totalCompleted = 0;
        let totalTarget = 0;
        for (const a of activities) {
          const completed = summary.completedFor(m.userId, a.id);
          const target = a.target * days.length;
          perActivity[a.id] = { completed, target, percent: percent(completed, target) };
          totalCompleted += completed;
          totalTarget += target;
        }
        return {
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          daysFilled: summary.daysFilledFor(m.userId),
          totalCompleted,
          totalTarget,
          percent: percent(totalCompleted, totalTarget),
          perActivity,
        };
      })
      .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || a.name.localeCompare(b.name));

    const average = (values: (number | null)[]) => {
      const nums = values.filter((v): v is number => v !== null);
      return nums.length ? Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10 : null;
    };

    const activityRows = activities.map((a) => ({
      ...a,
      avgPercent: average(memberRows.map((m) => m.perActivity[a.id].percent)),
    }));

    const report = {
      group: { id: group.id, name: group.name },
      period: { ...period, daysCounted: days.length },
      activities: activityRows,
      members: memberRows,
      summary: {
        memberCount: memberRows.length,
        avgPercent: average(memberRows.map((m) => m.percent)),
      },
    };

    if (!wantsExcel(req)) {
      res.json(report);
      return;
    }

    const title = [`Rekap Mutabaah - ${group.name}`, periodLabel(period), `Hari dihitung: ${days.length}`];
    const sheets: SheetSpec[] = [
      {
        name: 'Rekap',
        title,
        columns: [
          { header: 'No', key: 'no', width: 5 },
          { header: 'Nama', key: 'name', width: 24 },
          { header: 'Peran', key: 'role', width: 12 },
          { header: 'Hari mengisi', key: 'daysFilled', width: 13 },
          ...activities.map((a) => ({ header: a.name, key: `a${a.id}`, width: 14, percent: true })),
          { header: 'Total', key: 'percent', width: 10, percent: true },
        ],
        rows: memberRows.map((m, i) => ({
          no: i + 1,
          name: m.name,
          role: MEMBER_ROLE_LABEL[m.role] ?? m.role,
          daysFilled: m.daysFilled,
          percent: m.percent,
          ...Object.fromEntries(activities.map((a) => [`a${a.id}`, m.perActivity[a.id].percent])),
        })),
      },
      {
        name: 'Detail',
        title,
        columns: [
          { header: 'Nama', key: 'name', width: 24 },
          { header: 'Amalan', key: 'activity', width: 20 },
          { header: 'Capaian', key: 'completed', width: 10 },
          { header: 'Target', key: 'target', width: 10 },
          { header: 'Satuan', key: 'unit', width: 10 },
          { header: '%', key: 'percent', width: 10, percent: true },
        ],
        rows: memberRows.flatMap((m) =>
          activities.map((a) => ({
            name: m.name,
            activity: a.name,
            completed: m.perActivity[a.id].completed,
            target: m.perActivity[a.id].target,
            unit: a.unit,
            percent: m.perActivity[a.id].percent,
          }))
        ),
      },
    ];
    await sendWorkbook(res, `mutabaah-${group.name}-${period.start}-${period.end}.xlsx`, sheets);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat laporan mutabaah' });
  }
};

// ===== Rekap kehadiran (halaqoh & kajian) =====

type AttendanceRow = {
  userId: number;
  name: string;
  role: string | null;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  belum: number;
  total: number;
  percent: number | null;
  perMeeting: Record<number, string | null>; // status, null = belum diisi, 'na' = tidak dihitung / tidak tercatat
};

const buildAttendanceReport = async (
  meetingWhere: { groupId: number } | { kajianId: number },
  period: ReportPeriod,
  // Peserta tetap (anggota halaqoh) beserta tanggal bergabung; kosong untuk kajian
  roster: { userId: number; name: string; role: string; joinedAt: Date }[]
) => {
  const meetings = await prisma.meeting.findMany({
    where: { ...meetingWhere, date: { gte: dateKeyToDb(period.start), lte: dateKeyToDb(period.end) } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    select: { id: true, date: true, topic: true, startTime: true },
  });
  const attendances = meetings.length
    ? await prisma.attendance.findMany({
        where: { meetingId: { in: meetings.map((m) => m.id) } },
        include: { user: { select: { id: true, name: true } } },
      })
    : [];

  const statusOf = new Map(attendances.map((a) => [`${a.userId}:${a.meetingId}`, a.status]));
  const people = new Map<number, { name: string; role: string | null; joinedKey: string | null }>();
  for (const r of roster) {
    people.set(r.userId, { name: r.name, role: r.role, joinedKey: localDateKey(r.joinedAt) });
  }
  for (const a of attendances) {
    // Mantan anggota / peserta kajian: hanya pertemuan yang ada catatannya
    if (!people.has(a.userId)) people.set(a.userId, { name: a.user.name, role: null, joinedKey: null });
  }

  const isKajian = 'kajianId' in meetingWhere;
  const rows: AttendanceRow[] = [...people.entries()].map(([userId, p]) => {
    const row: AttendanceRow = {
      userId,
      name: p.name,
      role: p.role,
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
      belum: 0,
      total: 0,
      percent: null,
      perMeeting: {},
    };
    for (const m of meetings) {
      const status = statusOf.get(`${userId}:${m.id}`);
      const meetingKey = toDateKey(m.date);
      // Kajian: semua sesi dihitung untuk peserta. Halaqoh: hanya sejak bergabung.
      const expected = isKajian || (p.joinedKey !== null && meetingKey >= p.joinedKey);
      if (status) {
        row[status as 'hadir' | 'izin' | 'sakit' | 'alpa']++;
        row.total++;
        row.perMeeting[m.id] = status;
      } else if (expected) {
        // Halaqoh: anggota yang belum diabsen. Kajian: tidak tercatat hadir di sesi itu.
        row.total++;
        if (isKajian) {
          row.perMeeting[m.id] = 'na';
        } else {
          row.belum++;
          row.perMeeting[m.id] = null;
        }
      } else {
        row.perMeeting[m.id] = 'na';
      }
    }
    row.percent = percent(row.hadir, row.total);
    return row;
  });

  rows.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || a.name.localeCompare(b.name));

  const countsFor = (meetingId: number) => {
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    for (const a of attendances) if (a.meetingId === meetingId) c[a.status as keyof typeof c]++;
    return c;
  };

  const percents = rows.map((r) => r.percent).filter((v): v is number => v !== null);
  return {
    meetings: meetings.map((m) => ({ ...m, date: toDateKey(m.date), counts: countsFor(m.id) })),
    members: rows,
    summary: {
      meetingCount: meetings.length,
      participantCount: rows.length,
      avgPercent: percents.length
        ? Math.round((percents.reduce((s, v) => s + v, 0) / percents.length) * 10) / 10
        : null,
    },
  };
};

const attendanceSheets = (
  title: string[],
  report: Awaited<ReturnType<typeof buildAttendanceReport>>,
  withRole: boolean
): SheetSpec[] => [
  {
    name: 'Rekap',
    title,
    columns: [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama', key: 'name', width: 24 },
      ...(withRole ? [{ header: 'Peran', key: 'role', width: 12 }] : []),
      { header: 'Hadir', key: 'hadir', width: 8 },
      { header: 'Izin', key: 'izin', width: 8 },
      { header: 'Sakit', key: 'sakit', width: 8 },
      { header: 'Alpa', key: 'alpa', width: 8 },
      ...(withRole ? [{ header: 'Belum diisi', key: 'belum', width: 12 }] : []),
      { header: 'Pertemuan', key: 'total', width: 11 },
      { header: '% Hadir', key: 'percent', width: 10, percent: true },
    ],
    rows: report.members.map((m, i) => ({
      no: i + 1,
      name: m.name,
      role: m.role ? MEMBER_ROLE_LABEL[m.role] ?? m.role : 'Bukan anggota',
      hadir: m.hadir,
      izin: m.izin,
      sakit: m.sakit,
      alpa: m.alpa,
      belum: m.belum,
      total: m.total,
      percent: m.percent,
    })),
  },
  {
    name: 'Per Pertemuan',
    title: [...title, 'H = hadir, I = izin, S = sakit, A = alpa, ? = belum diisi, - = belum anggota / tidak tercatat'],
    columns: [
      { header: 'Nama', key: 'name', width: 24 },
      ...report.meetings.map((m) => ({ header: m.date, key: `m${m.id}`, width: 11 })),
    ],
    rows: report.members.map((r) => ({
      name: r.name,
      ...Object.fromEntries(
        report.meetings.map((m) => {
          const s = r.perMeeting[m.id];
          return [`m${m.id}`, s === null ? '?' : STATUS_CODES[s] ?? '-'];
        })
      ),
    })),
  },
  {
    name: 'Daftar Pertemuan',
    title,
    columns: [
      { header: 'Tanggal', key: 'date', width: 12 },
      { header: 'Jam', key: 'startTime', width: 8 },
      { header: 'Materi', key: 'topic', width: 32 },
      { header: 'Hadir', key: 'hadir', width: 8 },
      { header: 'Izin', key: 'izin', width: 8 },
      { header: 'Sakit', key: 'sakit', width: 8 },
      { header: 'Alpa', key: 'alpa', width: 8 },
    ],
    rows: report.meetings.map((m) => ({
      date: m.date,
      startTime: m.startTime,
      topic: m.topic,
      ...m.counts,
    })),
  },
];

export const groupAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = readPeriod(req, res);
    if (!period) return;
    const group = await loadManagedGroup(req, res);
    if (!group) return;

    const members = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: { select: { name: true } } },
    });
    const report = await buildAttendanceReport(
      { groupId: group.id },
      period,
      members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role, joinedAt: m.joinedAt }))
    );

    if (!wantsExcel(req)) {
      res.json({ group: { id: group.id, name: group.name }, period, ...report });
      return;
    }
    await sendWorkbook(
      res,
      `kehadiran-${group.name}-${period.start}-${period.end}.xlsx`,
      attendanceSheets([`Rekap Kehadiran - ${group.name}`, periodLabel(period)], report, true)
    );
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat laporan kehadiran' });
  }
};

export const kajianAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = readPeriod(req, res);
    if (!period) return;

    const kajian = await prisma.kajian.findUnique({ where: { id: parseInt(req.params.id) || 0 } });
    if (!kajian) {
      res.status(404).json({ message: 'Kajian tidak ditemukan' });
      return;
    }
    if (!canManageKajian(kajian, req.user!)) {
      res.status(403).json({ message: 'Hanya pengelola kajian yang bisa melihat laporan' });
      return;
    }

    // Persentase peserta kajian dihitung dari semua sesi dalam periode
    const report = await buildAttendanceReport({ kajianId: kajian.id }, period, []);

    if (!wantsExcel(req)) {
      res.json({ kajian: { id: kajian.id, title: kajian.title }, period, ...report });
      return;
    }
    await sendWorkbook(
      res,
      `kehadiran-kajian-${kajian.title}-${period.start}-${period.end}.xlsx`,
      attendanceSheets([`Rekap Kehadiran Kajian - ${kajian.title}`, periodLabel(period)], report, false)
    );
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat laporan kehadiran kajian' });
  }
};

// ===== Laporan mutabaah per anggota (harian) =====

export const userMutabaah = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = readPeriod(req, res);
    if (!period) return;

    const viewer = req.user!;
    const userId = parseInt(req.params.userId);
    const groupId = req.query.groupId ? Number(req.query.groupId) : null;
    const isSelf = userId === viewer.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId || 0 },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      res.status(404).json({ message: 'User tidak ditemukan' });
      return;
    }

    let activities: ReportActivity[];
    let groupInfo: { id: number; name: string } | null = null;

    if (groupId) {
      const group = await findGroupForAccess(groupId);
      if (!group || !group.members.some((m) => m.userId === userId)) {
        res.status(404).json({ message: 'Anggota tidak ditemukan di halaqoh ini' });
        return;
      }
      if (!isSelf && !canManageGroup(group, viewer)) {
        res.status(403).json({ message: 'Akses ditolak' });
        return;
      }
      activities = await loadGroupActivities(group.id);
      groupInfo = { id: group.id, name: group.name };
    } else {
      // Tanpa halaqoh = semua amalan pribadi + halaqoh; hanya untuk diri sendiri
      if (!isSelf) {
        res.status(403).json({ message: 'Pilih halaqoh untuk melihat laporan anggota' });
        return;
      }
      activities = (await getUserActivities(userId, { onlyActive: true })).map((a) => ({
        id: a.id,
        name: a.name,
        unit: a.unit,
        target: a.target,
        isRequired: a.isRequired,
      }));
    }

    // Hari yang ditampilkan = hari yang dihitung (sampai hari ini)
    const counted = targetDays(period);
    const allDays = counted;
    const records =
      allDays.length && activities.length
        ? await prisma.record.findMany({
            where: {
              userId,
              activityId: { in: activities.map((a) => a.id) },
              date: { gte: dateKeyToDb(allDays[0]), lte: dateKeyToDb(allDays[allDays.length - 1]) },
            },
          })
        : [];
    const summary = summarizeRecords(records, activities);

    const activityRows = activities.map((a) => {
      const completed = summary.completedFor(userId, a.id);
      const target = a.target * counted.length;
      return { ...a, completed, targetTotal: target, percent: percent(completed, target) };
    });
    const totalCompleted = activityRows.reduce((s, a) => s + a.completed, 0);
    const totalTarget = activityRows.reduce((s, a) => s + a.targetTotal, 0);

    const report = {
      user,
      group: groupInfo,
      period: { ...period, daysCounted: counted.length },
      activities: activityRows,
      days: allDays.map((date) => ({
        date,
        values: Object.fromEntries(activities.map((a) => [a.id, summary.dailyFor(userId, a.id, date)])),
      })),
      summary: {
        percent: percent(totalCompleted, totalTarget),
        daysFilled: summary.daysFilledFor(userId),
      },
    };

    if (!wantsExcel(req)) {
      res.json(report);
      return;
    }

    const title = [
      `Laporan Mutabaah - ${user.name}`,
      `${groupInfo ? `Halaqoh ${groupInfo.name} · ` : ''}${periodLabel(period)}`,
    ];
    await sendWorkbook(res, `mutabaah-${user.name}-${period.start}-${period.end}.xlsx`, [
      {
        name: 'Ringkasan',
        title,
        columns: [
          { header: 'Amalan', key: 'name', width: 24 },
          { header: 'Target/hari', key: 'target', width: 12 },
          { header: 'Satuan', key: 'unit', width: 10 },
          { header: 'Capaian', key: 'completed', width: 10 },
          { header: 'Target periode', key: 'targetTotal', width: 15 },
          { header: '%', key: 'percent', width: 10, percent: true },
        ],
        rows: activityRows.map((a) => ({
          name: a.name,
          target: a.target,
          unit: a.unit,
          completed: a.completed,
          targetTotal: a.targetTotal,
          percent: a.percent,
        })),
      },
      {
        name: 'Harian',
        title,
        columns: [
          { header: 'Tanggal', key: 'date', width: 12 },
          ...activities.map((a) => ({ header: `${a.name} (${a.target} ${a.unit})`, key: `a${a.id}`, width: 16 })),
        ],
        rows: report.days.map((d) => ({
          date: d.date,
          ...Object.fromEntries(activities.map((a) => [`a${a.id}`, d.values[a.id]])),
        })),
      },
    ]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat laporan anggota' });
  }
};
