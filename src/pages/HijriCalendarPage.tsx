import React, { useEffect, useMemo, useState } from 'react'
import { recordAPI } from '@/services/api'
import { shiftDateKey, todayKey } from '@/utils/labels'
import { HIJRI_MONTHS, IslamicDay, islamicDaysOf, toHijri } from '@/utils/islamic'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd']

const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const UPCOMING_DAYS = 60

export const HijriCalendarPage: React.FC = () => {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [filledDays, setFilledDays] = useState<Set<string>>(new Set())
  const today = todayKey()

  // Sel kalender: dimulai Senin, termasuk sisa hari bulan sebelum/sesudah
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(cursor.year, cursor.month, 1 - offset)
    const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const count = Math.ceil((offset + lastDay) / 7) * 7
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const hijri = toHijri(date)
      return {
        date,
        key: toKey(date),
        inMonth: date.getMonth() === cursor.month,
        hijri,
        events: islamicDaysOf(date, hijri),
      }
    })
  }, [cursor])

  useEffect(() => {
    const monthStart = toKey(new Date(cursor.year, cursor.month, 1))
    const monthEnd = toKey(new Date(cursor.year, cursor.month + 1, 0))
    recordAPI
      .getRecords(undefined, monthStart, monthEnd)
      .then((res) =>
        setFilledDays(new Set(res.data.filter((r) => r.completed > 0).map((r) => r.date.slice(0, 10))))
      )
      .catch((err) => console.error('Gagal memuat catatan mutabaah:', err))
  }, [cursor])

  const upcoming = useMemo(() => {
    const list: { key: string; date: Date; events: IslamicDay[] }[] = []
    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const key = shiftDateKey(today, i)
      const [y, m, d] = key.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      // Senin/Kamis tidak dimasukkan supaya daftarnya ringkas
      const events = islamicDaysOf(date, toHijri(date)).filter(
        (e) => !e.label.startsWith('Puasa Senin') && !e.label.startsWith('Puasa Kamis')
      )
      if (events.length) list.push({ key, date, events })
    }
    return list
  }, [today])

  const monthCells = cells.filter((c) => c.inMonth && c.hijri)
  const hijriTitle = (() => {
    if (!monthCells.length) return ''
    const a = monthCells[0].hijri!
    const b = monthCells[monthCells.length - 1].hijri!
    const name = (h: { month: number; year: number }) => `${HIJRI_MONTHS[h.month - 1]} ${h.year}`
    return a.month === b.month ? `${name(a)} H` : `${a.year === b.year ? HIJRI_MONTHS[a.month - 1] : name(a)} – ${name(b)} H`
  })()

  const move = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  const todayHijri = toHijri(now)

  return (
    <div className="activity-list hijri-calendar">
      <div className="page-header">
        <div>
          <h2>Kalender Hijriah</h2>
          {todayHijri && (
            <p className="muted">
              Hari ini {todayHijri.day} {HIJRI_MONTHS[todayHijri.month - 1]} {todayHijri.year} H
            </p>
          )}
        </div>
        <div className="actions">
          <button className="btn-small" onClick={() => move(-1)} aria-label="Bulan sebelumnya">
            &larr;
          </button>
          <button
            className="btn-small"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
          >
            Bulan ini
          </button>
          <button className="btn-small" onClick={() => move(1)} aria-label="Bulan berikutnya">
            &rarr;
          </button>
        </div>
      </div>

      <div className="calendar-title">
        <strong>
          {new Date(cursor.year, cursor.month, 1).toLocaleDateString('id-ID', {
            month: 'long',
            year: 'numeric',
          })}
        </strong>
        {hijriTitle && <span className="muted"> · {hijriTitle}</span>}
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className={`calendar-weekday ${w === 'Jum' ? 'friday' : ''}`}>
            {w}
          </div>
        ))}
        {cells.map((c) => (
          <div
            key={c.key}
            className={[
              'calendar-cell',
              c.inMonth ? '' : 'outside',
              c.key === today ? 'today' : '',
              c.events.some((e) => e.kind === 'hari-besar') ? 'has-feast' : '',
            ].join(' ')}
          >
            <div className="calendar-dates">
              <span className="gregorian">{c.date.getDate()}</span>
              {c.hijri && (
                <span className="hijri">
                  {c.hijri.day === 1 ? `1 ${HIJRI_MONTHS[c.hijri.month - 1]}` : c.hijri.day}
                </span>
              )}
            </div>
            <div className="calendar-events">
              {c.events.map((e) => (
                <span key={e.label} className={`calendar-event ${e.kind}`} title={e.label}>
                  {e.label}
                </span>
              ))}
            </div>
            {filledDays.has(c.key) && (
              <span className="calendar-filled" title="Mutabaah sudah diisi" />
            )}
          </div>
        ))}
      </div>

      <div className="calendar-legend muted">
        <span><i className="calendar-event hari-besar" /> Hari besar</span>
        <span><i className="calendar-event puasa-sunnah" /> Puasa sunnah</span>
        <span><i className="calendar-event haram-puasa" /> Hari raya / dilarang puasa</span>
        <span><i className="calendar-filled" /> Mutabaah terisi</span>
      </div>
      <p className="muted">
        Tanggal Hijriah memakai perhitungan Umm al-Qura dan bisa berbeda satu hari dengan
        penetapan Kemenag. Untuk awal Ramadhan dan hari raya, ikuti pengumuman resmi.
      </p>

      <div className="section">
        <h3>{UPCOMING_DAYS} hari ke depan</h3>
        {upcoming.length === 0 ? (
          <p className="muted">Tidak ada hari istimewa dalam waktu dekat.</p>
        ) : (
          <ul className="upcoming-list">
            {upcoming.map((u) => {
              const h = toHijri(u.date)
              return (
                <li key={u.key}>
                  <span className="upcoming-date">
                    {u.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                    {h && <span className="muted"> · {h.day} {HIJRI_MONTHS[h.month - 1]}</span>}
                  </span>
                  <span>
                    {u.events.map((e) => (
                      <span key={e.label} className={`calendar-event ${e.kind}`}>
                        {e.label}
                      </span>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
