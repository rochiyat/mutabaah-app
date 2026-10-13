import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import {
  canManageAccount,
  canViewAccount,
  findAccountForAccess,
} from '../utils/financeAccess';
import { findGroupForAccess } from '../utils/groupAccess';
import { canViewProgram, findProgramForAccess } from '../utils/programAccess';
import { canManageGroup, isFinanceManager, TRANSACTION_TYPES } from '../utils/roles';
import { amountSchema, sumByType, toNumber } from '../utils/money';
import { dateKeyToDb, isDateKey, localDateKey, toDateKey } from '../utils/date';
import { parsePeriod } from '../utils/reportPeriod';
import { sendValidationError } from '../utils/meetingSchema';
import { sendWorkbook } from '../utils/excel';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v));

const accountSchema = z.object({
  name: z.string().trim().min(1, 'Nama kas wajib diisi').max(191),
  description: optionalText(5000),
  groupId: z.number().int().positive().nullable().optional(),
  openingBalance: z
    .number({ invalid_type_error: 'Saldo awal harus berupa angka' })
    .min(-9_999_999_999_999)
    .max(9_999_999_999_999)
    .optional(),
});

const accountUpdateSchema = accountSchema
  .omit({ groupId: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, {
    errorMap: () => ({ message: 'Jenis transaksi harus masuk atau keluar' }),
  }),
  category: z.string().trim().min(1, 'Kategori wajib diisi').max(50),
  amount: amountSchema,
  date: z.string().refine(isDateKey, 'Format tanggal harus yyyy-MM-dd'),
  description: optionalText(191),
  memberId: z.number().int().positive().nullable().optional(),
  programId: z.number().int().positive().nullable().optional(),
});

const duesPlanSchema = z.object({
  name: z.string().trim().min(1, 'Nama iuran wajib diisi').max(191),
  amount: amountSchema,
});

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const userSelect = { id: true, name: true } as const;

const serializeTransaction = <T extends { amount: Prisma.Decimal; date: Date }>(t: T) => ({
  ...t,
  amount: toNumber(t.amount),
  date: toDateKey(t.date),
});

const getBalances = async (accountIds: number[]) => {
  const rows = accountIds.length
    ? await prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: { accountId: { in: accountIds } },
        _sum: { amount: true },
      })
    : [];
  return (accountId: number) => sumByType(rows.filter((r) => r.accountId === accountId));
};

const loadAccount = async (
  req: Request,
  res: Response,
  id: string | number,
  mode: 'view' | 'manage'
) => {
  const account = await findAccountForAccess(id);
  if (!account || !canViewAccount(account, req.user!)) {
    res.status(404).json({ message: 'Kas tidak ditemukan' });
    return null;
  }
  if (mode === 'manage' && !canManageAccount(account, req.user!)) {
    res.status(403).json({ message: 'Hanya pengelola kas yang bisa mengubah data ini' });
    return null;
  }
  return account;
};

// Validasi anggota & program yang ditautkan ke transaksi
const checkLinks = async (
  req: Request,
  res: Response,
  memberId: number | null | undefined,
  programId: number | null | undefined
): Promise<boolean> => {
  if (memberId) {
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      res.status(400).json({ message: 'Anggota tidak ditemukan' });
      return false;
    }
  }
  if (programId) {
    const program = await findProgramForAccess(programId);
    if (!program || !canViewProgram(program, req.user!)) {
      res.status(400).json({ message: 'Program tidak ditemukan' });
      return false;
    }
  }
  return true;
};

// ===== Kas =====

export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const accounts = await prisma.financeAccount.findMany({
      where: isFinanceManager(user.role)
        ? undefined
        : {
            group: {
              OR: [{ adminId: user.userId }, { members: { some: { userId: user.userId } } }],
            },
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
      },
      orderBy: [{ isActive: 'desc' }, { groupId: 'asc' }, { name: 'asc' }],
    });
    const balanceOf = await getBalances(accounts.map((a) => a.id));

    res.json(
      accounts.map(({ group, ...a }) => {
        const totals = balanceOf(a.id);
        return {
          ...a,
          openingBalance: toNumber(a.openingBalance),
          group: group ? { id: group.id, name: group.name } : null,
          totals,
          balance: toNumber(a.openingBalance) + totals.masuk - totals.keluar,
          canManage: canManageAccount({ ...a, group }, user),
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil daftar kas' });
  }
};

export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { groupId, openingBalance, ...data } = parsed.data;

    if (groupId) {
      const group = await findGroupForAccess(groupId);
      if (!group || !canManageGroup(group, req.user!)) {
        res.status(403).json({ message: 'Hanya murabbi halaqoh yang bisa membuat kas halaqoh' });
        return;
      }
    } else if (!isFinanceManager(req.user!.role)) {
      res.status(403).json({ message: 'Hanya bendahara atau pengurus yang bisa membuat kas lembaga' });
      return;
    }

    const account = await prisma.financeAccount.create({
      data: {
        ...data,
        groupId: groupId ?? null,
        openingBalance: openingBalance ?? 0,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json({ ...account, openingBalance: toNumber(account.openingBalance) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat kas' });
  }
};

export const getAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await loadAccount(req, res, req.params.id, 'view');
    if (!account) return;

    const totals = (await getBalances([account.id]))(account.id);
    const duesPlans = await prisma.duesPlan.findMany({
      where: { accountId: account.id },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    const { group, ...rest } = account;

    res.json({
      ...rest,
      openingBalance: toNumber(account.openingBalance),
      group: group ? { id: group.id, name: group.name } : null,
      totals,
      balance: toNumber(account.openingBalance) + totals.masuk - totals.keluar,
      duesPlans: duesPlans.map((d) => ({ ...d, amount: toNumber(d.amount) })),
      canManage: canManageAccount(account, req.user!),
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil kas' });
  }
};

export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await loadAccount(req, res, req.params.id, 'manage');
    if (!account) return;

    const parsed = accountUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const updated = await prisma.financeAccount.update({
      where: { id: account.id },
      data: parsed.data,
    });
    res.json({ ...updated, openingBalance: toNumber(updated.openingBalance) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah kas' });
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await loadAccount(req, res, req.params.id, 'manage');
    if (!account) return;

    // Jangan hilangkan riwayat keuangan; kas yang sudah punya transaksi cukup dinonaktifkan
    const count = await prisma.transaction.count({ where: { accountId: account.id } });
    if (count > 0) {
      res.status(409).json({
        message: `Kas ini punya ${count} transaksi. Nonaktifkan saja agar riwayat tetap tersimpan.`,
      });
      return;
    }

    await prisma.financeAccount.delete({ where: { id: account.id } });
    res.json({ message: 'Kas berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus kas' });
  }
};

// ===== Transaksi =====

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await loadAccount(req, res, req.params.id, 'view');
    if (!account) return;

    const parsedPeriod = parsePeriod(req.query);
    if ('error' in parsedPeriod) {
      res.status(400).json({ message: parsedPeriod.error });
      return;
    }
    const { start, end } = parsedPeriod.period;
    const type = TRANSACTION_TYPES.find((t) => t === req.query.type);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const where: Prisma.TransactionWhereInput = {
      accountId: account.id,
      date: { gte: dateKeyToDb(start), lte: dateKeyToDb(end) },
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
    };

    const [transactions, before, byCategory] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          member: { select: userSelect },
          program: { select: { id: true, name: true } },
          createdBy: { select: userSelect },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 1000,
      }),
      // Saldo sebelum periode (semua transaksi, tanpa filter jenis/kategori)
      prisma.transaction.groupBy({
        by: ['type'],
        where: { accountId: account.id, date: { lt: dateKeyToDb(start) } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['type', 'category'],
        where: { accountId: account.id, date: { gte: dateKeyToDb(start), lte: dateKeyToDb(end) } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const beforeTotals = sumByType(before);
    const periodTotals = sumByType(byCategory);
    const openingForPeriod = toNumber(account.openingBalance) + beforeTotals.masuk - beforeTotals.keluar;
    const summary = {
      openingForPeriod,
      masuk: periodTotals.masuk,
      keluar: periodTotals.keluar,
      closing: openingForPeriod + periodTotals.masuk - periodTotals.keluar,
      byCategory: byCategory
        .map((r) => ({
          type: r.type,
          category: r.category,
          total: toNumber(r._sum.amount),
          count: r._count._all,
        }))
        .sort((a, b) => a.type.localeCompare(b.type) || b.total - a.total),
    };
    const rows = transactions.map(serializeTransaction);

    if (req.query.format !== 'xlsx') {
      res.json({ period: { start, end }, summary, transactions: rows });
      return;
    }

    const title = [
      `Laporan Kas - ${account.name}${account.group ? ` (${account.group.name})` : ''}`,
      `Periode ${start} s.d. ${end}`,
    ];
    await sendWorkbook(res, `kas-${account.name}-${start}-${end}.xlsx`, [
      {
        name: 'Ringkasan',
        title,
        columns: [
          { header: 'Keterangan', key: 'label', width: 30 },
          { header: 'Jumlah (Rp)', key: 'value', width: 18, money: true },
        ],
        rows: [
          { label: 'Saldo awal periode', value: summary.openingForPeriod },
          { label: 'Total pemasukan', value: summary.masuk },
          { label: 'Total pengeluaran', value: summary.keluar },
          { label: 'Saldo akhir periode', value: summary.closing },
          { label: '', value: null },
          ...summary.byCategory.map((c) => ({
            label: `${c.type === 'masuk' ? 'Masuk' : 'Keluar'} - ${c.category} (${c.count}x)`,
            value: c.total,
          })),
        ],
      },
      {
        name: 'Transaksi',
        title,
        columns: [
          { header: 'Tanggal', key: 'date', width: 12 },
          { header: 'Jenis', key: 'type', width: 9 },
          { header: 'Kategori', key: 'category', width: 14 },
          { header: 'Keterangan', key: 'description', width: 32 },
          { header: 'Anggota', key: 'member', width: 18 },
          { header: 'Program', key: 'program', width: 18 },
          { header: 'Masuk (Rp)', key: 'in', width: 15, money: true },
          { header: 'Keluar (Rp)', key: 'out', width: 15, money: true },
          { header: 'Dicatat oleh', key: 'createdBy', width: 18 },
        ],
        rows: [...rows].reverse().map((t) => ({
          date: t.date,
          type: t.type,
          category: t.category,
          description: t.description,
          member: t.member?.name ?? null,
          program: t.program?.name ?? null,
          in: t.type === 'masuk' ? t.amount : null,
          out: t.type === 'keluar' ? t.amount : null,
          createdBy: t.createdBy?.name ?? null,
        })),
      },
    ]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil transaksi' });
  }
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await loadAccount(req, res, req.params.id, 'manage');
    if (!account) return;
    if (!account.isActive) {
      res.status(400).json({ message: 'Kas sudah dinonaktifkan' });
      return;
    }

    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const data = parsed.data;
    if (!(await checkLinks(req, res, data.memberId, data.programId))) return;

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: dateKeyToDb(data.date),
        accountId: account.id,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json(serializeTransaction(transaction));
  } catch (error) {
    res.status(500).json({ message: 'Gagal mencatat transaksi' });
  }
};

const loadTransaction = async (req: Request, res: Response) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(req.params.id) || 0 },
  });
  if (!transaction) {
    res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    return null;
  }
  const account = await loadAccount(req, res, transaction.accountId, 'manage');
  return account ? transaction : null;
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await loadTransaction(req, res);
    if (!transaction) return;

    const parsed = transactionSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { date, ...data } = parsed.data;
    if (!(await checkLinks(req, res, data.memberId, data.programId))) return;

    const updated = await prisma.transaction.update({
      where: { id: transaction.id },
      data: { ...data, ...(date ? { date: dateKeyToDb(date) } : {}) },
    });
    res.json(serializeTransaction(updated));
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah transaksi' });
  }
};

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await loadTransaction(req, res);
    if (!transaction) return;

    await prisma.transaction.delete({ where: { id: transaction.id } });
    res.json({ message: 'Transaksi dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus transaksi' });
  }
};

// ===== Iuran =====

export const createDuesPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await loadAccount(req, res, req.params.id, 'manage');
    if (!account) return;

    const parsed = duesPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const plan = await prisma.duesPlan.create({
      data: { ...parsed.data, accountId: account.id },
    });
    res.status(201).json({ ...plan, amount: toNumber(plan.amount) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat iuran' });
  }
};

const loadDuesPlan = async (req: Request, res: Response, mode: 'view' | 'manage') => {
  const plan = await prisma.duesPlan.findUnique({
    where: { id: parseInt(req.params.planId) || 0 },
  });
  if (!plan) {
    res.status(404).json({ message: 'Iuran tidak ditemukan' });
    return null;
  }
  const account = await loadAccount(req, res, plan.accountId, mode);
  return account ? { plan, account } : null;
};

export const updateDuesPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const loaded = await loadDuesPlan(req, res, 'manage');
    if (!loaded) return;

    const parsed = duesPlanSchema
      .partial()
      .extend({ isActive: z.boolean().optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const plan = await prisma.duesPlan.update({
      where: { id: loaded.plan.id },
      data: parsed.data,
    });
    res.json({ ...plan, amount: toNumber(plan.amount) });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah iuran' });
  }
};

export const deleteDuesPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const loaded = await loadDuesPlan(req, res, 'manage');
    if (!loaded) return;

    // Transaksi pembayaran tetap tersimpan di kas (duesPlanId menjadi null)
    await prisma.duesPlan.delete({ where: { id: loaded.plan.id } });
    res.json({ message: 'Iuran dihapus, transaksi pembayaran tetap tersimpan di kas' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus iuran' });
  }
};

// Peserta iuran: anggota halaqoh untuk kas halaqoh, semua user aktif untuk kas lembaga
const getDuesMembers = async (account: { group: { id: number } | null }) => {
  if (account.group) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: account.group.id },
      include: { user: { select: userSelect } },
      orderBy: { user: { name: 'asc' } },
    });
    return members.map((m) => m.user);
  }
  return prisma.user.findMany({
    where: { isActive: true },
    select: userSelect,
    orderBy: { name: 'asc' },
    take: 500,
  });
};

export const getDuesStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const loaded = await loadDuesPlan(req, res, 'view');
    if (!loaded) return;
    const { plan, account } = loaded;

    const year = Number(req.query.year) || new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    const [members, payments] = await Promise.all([
      getDuesMembers(account),
      prisma.transaction.groupBy({
        by: ['memberId', 'duesPeriod'],
        where: { duesPlanId: plan.id, duesPeriod: { in: months } },
        _sum: { amount: true },
      }),
    ]);

    const planAmount = toNumber(plan.amount);
    const paidOf = new Map(
      payments.map((p) => [`${p.memberId}:${p.duesPeriod}`, toNumber(p._sum.amount)])
    );

    // Anggota yang sudah keluar tapi pernah membayar tetap ditampilkan
    const memberIds = new Set(members.map((m) => m.id));
    const formerIds = [
      ...new Set(payments.map((p) => p.memberId).filter((id): id is number => !!id && !memberIds.has(id))),
    ];
    const former = formerIds.length
      ? await prisma.user.findMany({ where: { id: { in: formerIds } }, select: userSelect })
      : [];

    const rows = [...members.map((m) => ({ ...m, isMember: true })), ...former.map((m) => ({ ...m, isMember: false }))].map(
      (m) => {
        const perMonth = Object.fromEntries(months.map((mo) => [mo, paidOf.get(`${m.id}:${mo}`) ?? 0]));
        const paidMonths = months.filter((mo) => perMonth[mo] >= planAmount).length;
        const total = months.reduce((s, mo) => s + perMonth[mo], 0);
        return { userId: m.id, name: m.name, isMember: m.isMember, perMonth, paidMonths, total };
      }
    );

    res.json({
      plan: { ...plan, amount: planAmount },
      year,
      months,
      members: rows,
      totals: {
        collected: rows.reduce((s, r) => s + r.total, 0),
        perMonth: Object.fromEntries(months.map((mo) => [mo, rows.reduce((s, r) => s + r.perMonth[mo], 0)])),
      },
      canManage: canManageAccount(account, req.user!),
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil status iuran' });
  }
};

// Body: { userId, period: 'yyyy-MM', amount?, date? }
export const payDues = async (req: Request, res: Response): Promise<void> => {
  try {
    const loaded = await loadDuesPlan(req, res, 'manage');
    if (!loaded) return;
    const { plan, account } = loaded;

    const parsed = z
      .object({
        userId: z.number().int().positive(),
        period: z.string().regex(PERIOD_REGEX, 'Format periode harus yyyy-MM'),
        amount: amountSchema.optional(),
        date: z.string().refine(isDateKey, 'Format tanggal harus yyyy-MM-dd').optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const { userId, period, amount, date } = parsed.data;

    if (!plan.isActive || !account.isActive) {
      res.status(400).json({ message: 'Iuran atau kas sudah dinonaktifkan' });
      return;
    }

    const member = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!member) {
      res.status(404).json({ message: 'Anggota tidak ditemukan' });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: 'masuk',
        category: 'iuran',
        amount: amount ?? plan.amount,
        date: dateKeyToDb(date ?? localDateKey()),
        description: `${plan.name} ${period} - ${member.name}`,
        memberId: member.id,
        duesPlanId: plan.id,
        duesPeriod: period,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json(serializeTransaction(transaction));
  } catch (error) {
    res.status(500).json({ message: 'Gagal mencatat pembayaran iuran' });
  }
};

// Query: ?userId=&period=yyyy-MM — hapus pembayaran iuran untuk bulan tersebut
export const cancelDuesPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const loaded = await loadDuesPlan(req, res, 'manage');
    if (!loaded) return;

    const userId = Number(req.query.userId);
    const period = String(req.query.period ?? '');
    if (!userId || !PERIOD_REGEX.test(period)) {
      res.status(400).json({ message: 'userId dan period (yyyy-MM) wajib diisi' });
      return;
    }

    const result = await prisma.transaction.deleteMany({
      where: { duesPlanId: loaded.plan.id, memberId: userId, duesPeriod: period },
    });
    res.json({ message: 'Pembayaran dibatalkan', deleted: result.count });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membatalkan pembayaran' });
  }
};
