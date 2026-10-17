import { prisma } from './prisma'
import { canManageGroup, canViewGroup, isManager, isOperator } from './roles'

type AuthUser = { userId: number; role: string }

export const findProgramForAccess = (programId: string | number) => {
  const id = typeof programId === 'number' ? programId : parseInt(programId)
  if (Number.isNaN(id)) return Promise.resolve(null)
  return prisma.program.findUnique({
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

type ProgramForAccess = {
  createdById: number | null
  picId: number | null
  group: { adminId: number; members: { userId: number; role: string }[] } | null
}

// Program lembaga terbuka untuk semua user; program halaqoh untuk anggota halaqoh
export const canViewProgram = (program: ProgramForAccess, user: AuthUser): boolean =>
  !program.group || isManager(user.role) || canViewGroup(program.group, user)

export const canManageProgram = (program: ProgramForAccess, user: AuthUser): boolean =>
  isManager(user.role) ||
  (!program.group && isOperator(user.role)) ||
  program.createdById === user.userId ||
  program.picId === user.userId ||
  (!!program.group && canManageGroup(program.group, user))
