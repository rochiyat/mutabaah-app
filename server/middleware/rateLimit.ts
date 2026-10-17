import { Request, Response, NextFunction } from 'express'

type Options = {
  windowMs: number
  max: number
  message: string
}

// Pembatas request per IP (fixed window, disimpan di memori proses).
// Cukup untuk satu instance server; data hilang saat server restart.
export const rateLimit = ({ windowMs, max, message }: Options) => {
  const hits = new Map<string, { count: number; resetAt: number }>()

  // Bersihkan entri kedaluwarsa agar Map tidak terus membesar
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key)
    }
  }, windowMs).unref()

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count++

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      res.status(429).json({ message: `${message} Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.` })
      return
    }
    next()
  }
}
