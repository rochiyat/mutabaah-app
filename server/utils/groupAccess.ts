import { prisma } from './prisma'

// Ambil grup beserta daftar keanggotaan ringkas untuk pengecekan izin
export const findGroupForAccess = (groupId: string | number) => {
  const id = typeof groupId === 'number' ? groupId : parseInt(groupId)
  if (Number.isNaN(id)) return Promise.resolve(null)
  return prisma.group.findUnique({
    where: { id },
    include: { members: { select: { userId: true, role: true } } },
  })
}
