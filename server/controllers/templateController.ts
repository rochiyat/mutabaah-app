import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { findGroupForAccess } from '../utils/groupAccess'
import { Roles, canCreateGroup, canManageGroup, isManager } from '../utils/roles'
import { logError } from '../utils/logger'

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Nama amalan wajib diisi').max(100),
  category: z.string().trim().min(1).max(50).default('Lainnya'),
  target: z.number().int().min(1).max(10000).default(1),
  unit: z.string().trim().min(1).max(30).default('kali'),
  isRequired: z.boolean().default(false),
})

const templateSchema = z.object({
  name: z.string().trim().min(2, 'Nama template minimal 2 karakter').max(100),
  description: z.string().trim().max(1000).nullish(),
  items: z.array(itemSchema).min(1, 'Template minimal berisi 1 amalan').max(50),
})

type TemplateItem = z.infer<typeof itemSchema>

const creatorSelect = { createdBy: { select: { id: true, name: true } } } as const

// Template bawaan (tanpa pembuat) hanya bisa diubah pengurus
const canManageTemplate = (
  template: { createdById: number | null },
  user: { userId: number; roles: Roles }
): boolean => isManager(user.roles) || (template.createdById !== null && template.createdById === user.userId)

// Boleh membuat template: pengurus, murabbi, atau murabbi pendamping di salah satu halaqoh
const canCreateTemplate = async (user: { userId: number; roles: Roles }): Promise<boolean> =>
  canCreateGroup(user.roles) ||
  (await prisma.groupMember.count({ where: { userId: user.userId, role: 'murabbi' } })) > 0

const serialize = <T extends { createdById: number | null; items: unknown }>(
  template: T,
  user: { userId: number; roles: Roles }
) => ({
  ...template,
  items: (Array.isArray(template.items) ? template.items : []) as TemplateItem[],
  canManage: canManageTemplate(template, user),
})

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.activityTemplate.findMany({
      where: isManager(req.user!.roles) ? undefined : { isActive: true },
      include: creatorSelect,
      orderBy: { name: 'asc' },
    })
    res.json(templates.map((t) => serialize(t, req.user!)))
  } catch (error) {
    logError('templateController.getTemplates', error)
    res.status(500).json({ message: 'Gagal mengambil template amalan' })
  }
}

// Body: { name, description?, items } atau { name, description?, fromGroupId } untuk menyalin amalan halaqoh
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(await canCreateTemplate(req.user!))) {
      res.status(403).json({ message: 'Hanya murabbi atau pengurus yang bisa membuat template' })
      return
    }

    let items: unknown = req.body.items
    if (req.body.fromGroupId !== undefined) {
      const group = await findGroupForAccess(Number(req.body.fromGroupId))
      if (!group || !canManageGroup(group, req.user!)) {
        res.status(403).json({ message: 'Anda tidak berwenang menyalin amalan halaqoh ini' })
        return
      }
      const links = await prisma.groupActivity.findMany({
        where: { groupId: group.id, activity: { isActive: true } },
        include: { activity: true },
        orderBy: { createdAt: 'asc' },
      })
      items = links.map((l) => ({
        name: l.activity.name,
        category: l.activity.category,
        target: l.activity.target,
        unit: l.activity.unit,
        isRequired: l.isRequired,
      }))
    }

    const parsed = templateSchema.safeParse({ ...req.body, items })
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message })
      return
    }

    const template = await prisma.activityTemplate.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        items: parsed.data.items,
        createdById: req.user!.userId,
      },
      include: creatorSelect,
    })

    res.status(201).json(serialize(template, req.user!))
  } catch (error) {
    logError('templateController.createTemplate', error)
    res.status(500).json({ message: 'Gagal membuat template' })
  }
}

const loadManagedTemplate = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const template = Number.isNaN(id) ? null : await prisma.activityTemplate.findUnique({ where: { id } })
  if (!template) {
    res.status(404).json({ message: 'Template tidak ditemukan' })
    return null
  }
  if (!canManageTemplate(template, req.user!)) {
    res.status(403).json({ message: 'Anda tidak berwenang mengubah template ini' })
    return null
  }
  return template
}

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await loadManagedTemplate(req, res)
    if (!template) return

    const parsed = templateSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message })
      return
    }
    const { isActive } = req.body

    const updated = await prisma.activityTemplate.update({
      where: { id: template.id },
      data: {
        ...parsed.data,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: creatorSelect,
    })

    res.json(serialize(updated, req.user!))
  } catch (error) {
    logError('templateController.updateTemplate', error)
    res.status(500).json({ message: 'Gagal mengubah template' })
  }
}

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await loadManagedTemplate(req, res)
    if (!template) return

    // Amalan yang sudah dipasang ke halaqoh tetap ada; hanya templatenya yang dihapus
    await prisma.activityTemplate.delete({ where: { id: template.id } })
    res.json({ message: 'Template dihapus' })
  } catch (error) {
    logError('templateController.deleteTemplate', error)
    res.status(500).json({ message: 'Gagal menghapus template' })
  }
}

// Pasang semua amalan template ke halaqoh. Amalan dengan nama yang sudah ada di halaqoh dilewati.
export const applyTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await findGroupForAccess(req.params.groupId)
    if (!group) {
      res.status(404).json({ message: 'Halaqoh tidak ditemukan' })
      return
    }
    if (!canManageGroup(group, req.user!)) {
      res.status(403).json({ message: 'Hanya murabbi halaqoh yang bisa memasang template' })
      return
    }

    const template = await prisma.activityTemplate.findUnique({
      where: { id: Number(req.body.templateId) || 0 },
    })
    if (!template || !template.isActive) {
      res.status(404).json({ message: 'Template tidak ditemukan' })
      return
    }

    const items = z.array(itemSchema).safeParse(template.items)
    if (!items.success) {
      res.status(400).json({ message: 'Isi template tidak valid' })
      return
    }

    const existing = await prisma.groupActivity.findMany({
      where: { groupId: group.id },
      include: { activity: { select: { name: true } } },
    })
    const existingNames = new Set(existing.map((l) => l.activity.name.trim().toLowerCase()))
    const toAdd = items.data.filter((item) => !existingNames.has(item.name.trim().toLowerCase()))

    await prisma.$transaction(async (tx) => {
      for (const item of toAdd) {
        const activity = await tx.activity.create({
          data: {
            name: item.name,
            category: item.category,
            target: item.target,
            unit: item.unit,
            userId: null,
          },
        })
        await tx.groupActivity.create({
          data: { groupId: group.id, activityId: activity.id, isRequired: item.isRequired },
        })
      }
    })

    res.json({ added: toAdd.length, skipped: items.data.length - toAdd.length })
  } catch (error) {
    logError('templateController.applyTemplate', error)
    res.status(500).json({ message: 'Gagal memasang template' })
  }
}
