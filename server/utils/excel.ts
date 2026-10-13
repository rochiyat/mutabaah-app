import ExcelJS from 'exceljs'
import { Response } from 'express'

export type SheetSpec = {
  name: string
  title?: string[] // baris judul di atas tabel
  columns: { header: string; key: string; width?: number; percent?: boolean; money?: boolean }[]
  rows: Record<string, string | number | null>[]
}

export const sendWorkbook = async (
  res: Response,
  filename: string,
  sheets: SheetSpec[]
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Mutaba'ah App"
  workbook.created = new Date()

  for (const spec of sheets) {
    // Nama sheet Excel maksimal 31 karakter dan tidak boleh berisi : \ / ? * [ ]
    const sheet = workbook.addWorksheet(spec.name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31))
    const titleRows = spec.title ?? []
    titleRows.forEach((text, i) => {
      const row = sheet.getRow(i + 1)
      row.getCell(1).value = text
      row.font = { bold: i === 0, size: i === 0 ? 13 : 11 }
    })

    const headerRowIndex = titleRows.length ? titleRows.length + 2 : 1
    spec.columns.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width ?? Math.max(10, col.header.length + 2)
    })

    const header = sheet.getRow(headerRowIndex)
    spec.columns.forEach((col, i) => {
      const cell = header.getCell(i + 1)
      cell.value = col.header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1FA' } }
      cell.border = { bottom: { style: 'thin' } }
    })

    spec.rows.forEach((data, r) => {
      const row = sheet.getRow(headerRowIndex + 1 + r)
      spec.columns.forEach((col, i) => {
        const cell = row.getCell(i + 1)
        const value = data[col.key]
        if (col.percent && typeof value === 'number') {
          cell.value = Math.round(value * 10) / 1000
          cell.numFmt = '0.0%'
        } else {
          cell.value = value ?? ''
          if (col.money && typeof value === 'number') cell.numFmt = '#,##0'
        }
      })
    })

    sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }]
  }

  const safeName = filename.replace(/[^\w.-]+/g, '_')
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
  await workbook.xlsx.write(res)
  res.end()
}
