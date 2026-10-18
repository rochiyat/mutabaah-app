import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { findGroupForAccess } from '../utils/groupAccess'
import { canManageGroup } from '../utils/roles'
import { dateKeyToDb, isDateKey, localDateKey, toDateKey } from '../utils/date'
import { logError } from '../utils/logger'

export const NOTE_CATEGORIES = ['catatan', 'evaluasi', 'apresiasi'] as const
export const NOTE_VISIBILITIES = ['private', 'shared'] as const

const noteSchema = z.object({
  date: z.string().refine(isDateKey, 'Format tanggal harus yyyy-MM-dd').optional(),
  category: z.enum(NOTE_CATEGORIES).default('catatan'),
  content: z.string().trim().min(1, 'Isi catatan wajib diisi').max(5000),
  visibility: z.enum(NOTE_VISIBILITIES).default('private'),
})

const noteInclude = {
  author: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
} as const

type NoteRow = { date: Date; authorId: number | null }

const serialize = <T extends NoteRow>(note: T, canEdit: boolean) => ({
  ...note,
  date: toDateKey(note.date),
  canEdit,
})

// Murabbi halaqoh & pengurus melihat semua catatan; anggota hanya melihat catatan "shared" untuk dirinya
export const getGroupNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await findGroupForAccess(req.params.groupId)
    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' })
      return
    }

    const memberId = req.query.memberId ? parseInt(String(req.query.memberId)) : undefined
    const manage = canManageGroup(group, req.user!)

    if (!manage && memberId !== req.user!.userId) {
      res.status(403).json({ message: 'Akses ditolak' })
      return
    }

    const notes = await prisma.murabbiNote.findMany({
      where: {
        groupId: group.id,
        ...(memberId ? { memberId } : {}),
        ...(manage ? {} : { visibility: 'shared' }),
      },
      include: noteInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    res.json({ canManage: manage, notes: notes.map((n) => serialize(n, manage)) })
  } catch (error) {
    logError('noteController.getGroupNotes', error)
    res.status(500).json({ message: 'Gagal mengambil catatan murabbi' })
  }
}

// Body: { memberId, date?, category, content, visibility }
export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await findGroupForAccess(req.params.groupId)
    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' })
      return
    }
    if (!canManageGroup(group, req.user!)) {
      res.status(403).json({ message: 'Hanya murabbi halaqoh yang bisa menulis catatan' })
      return
    }

    const parsed = noteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message })
      return
    }

    const memberId = Number(req.body.memberId)
    if (!group.members.some((m) => m.userId === memberId)) {
      res.status(400).json({ message: 'Anggota tidak terdaftar di halaqoh ini' })
      return
    }

    const { date, category, content, visibility } = parsed.data
    const note = await prisma.murabbiNote.create({
      data: {
        groupId: group.id,
        memberId,
        authorId: req.user!.userId,
        date: dateKeyToDb(date ?? localDateKey()),
        category,
        content,
        visibility,
      },
      include: noteInclude,
    })

    res.status(201).json(serialize(note, true))
  } catch (error) {
    logError('noteController.createNote', error)
    res.status(500).json({ message: 'Gagal menyimpan catatan' })
  }
}

// Catatan boleh diubah/dihapus oleh murabbi halaqoh tersebut atau pengurus
const loadEditableNote = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const note = Number.isNaN(id) ? null : await prisma.murabbiNote.findUnique({ where: { id } })
  if (!note) {
    res.status(404).json({ message: 'Catatan tidak ditemukan' })
    return null
  }
  const group = await findGroupForAccess(note.groupId)
  if (!group || !canManageGroup(group, req.user!)) {
    res.status(403).json({ message: 'Anda tidak berwenang mengubah catatan ini' })
    return null
  }
  return note
}

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const note = await loadEditableNote(req, res)
    if (!note) return

    const parsed = noteSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message })
      return
    }

    const { date, category, content, visibility } = parsed.data
    const updated = await prisma.murabbiNote.update({
      where: { id: note.id },
      data: {
        category,
        content,
        visibility,
        ...(date ? { date: dateKeyToDb(date) } : {}),
      },
      include: noteInclude,
    })

    res.json(serialize(updated, true))
  } catch (error) {
    logError('noteController.updateNote', error)
    res.status(500).json({ message: 'Gagal mengubah catatan' })
  }
}

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const note = await loadEditableNote(req, res)
    if (!note) return

    await prisma.murabbiNote.delete({ where: { id: note.id } })
    res.json({ message: 'Catatan dihapus' })
  } catch (error) {
    logError('noteController.deleteNote', error)
    res.status(500).json({ message: 'Gagal menghapus catatan' })
  }
}

// Catatan yang dibagikan murabbi kepada user yang sedang login
export const getMyNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const notes = await prisma.murabbiNote.findMany({
      where: { memberId: req.user!.userId, visibility: 'shared' },
      include: noteInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })
    res.json(notes.map((n) => serialize(n, false)))
  } catch (error) {
    logError('noteController.getMyNotes', error)
    res.status(500).json({ message: 'Gagal mengambil catatan murabbi' })
  }
}
