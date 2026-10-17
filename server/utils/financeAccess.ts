import { prisma } from './prisma'
import { canManageGroup, canViewGroup, isFinanceManager } from './roles'

type AuthUser = { userId: number; roles: readonly string[] }

export const findAccountForAccess = (accountId: string | number) => {
  const id = typeof accountId === 'number' ? accountId : parseInt(accountId)
  if (Number.isNaN(id)) return Promise.resolve(null)
  return prisma.financeAccount.findUnique({
    where: { id },
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
  })
}

type AccountForAccess = NonNullable<Awaited<ReturnType<typeof findAccountForAccess>>>

// Kas halaqoh: terbuka untuk anggota halaqoh (transparansi) dan pengurus keuangan.
// Kas lembaga: hanya pengurus keuangan.
export const canViewAccount = (account: AccountForAccess, user: AuthUser): boolean =>
  isFinanceManager(user.roles) || (!!account.group && canViewGroup(account.group, user))

// Kas halaqoh dikelola murabbi halaqoh (dan admin); kas lembaga oleh pengurus keuangan
export const canManageAccount = (account: AccountForAccess, user: AuthUser): boolean =>
  account.group ? canManageGroup(account.group, user) : isFinanceManager(user.roles)
