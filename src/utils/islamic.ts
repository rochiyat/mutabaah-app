// Tanggal & motivasi harian bernuansa Islami untuk dashboard

export const formatGregorian = (date: Date) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

export const formatHijri = (date: Date) => {
  try {
    return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch (err) {
    console.error('Kalender Hijriah tidak didukung browser:', err)
    return ''
  }
}

export const greetingByHour = (hour: number) => {
  if (hour < 4) return 'Selamat malam'
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

const REMINDERS = [
  {
    text: 'Amalan yang paling dicintai Allah adalah yang paling kontinu, meskipun sedikit.',
    source: 'HR. Bukhari & Muslim',
  },
  {
    text: 'Hai orang-orang yang beriman, bertakwalah kepada Allah dan hendaklah setiap diri memperhatikan apa yang telah diperbuatnya untuk hari esok.',
    source: "QS. Al-Hasyr: 18",
  },
  {
    text: 'Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.',
    source: "QS. Ar-Ra'd: 28",
  },
  {
    text: 'Maka sesungguhnya bersama kesulitan ada kemudahan.',
    source: 'QS. Al-Insyirah: 5',
  },
  {
    text: "Sebaik-baik kalian adalah orang yang mempelajari Al-Qur'an dan mengajarkannya.",
    source: 'HR. Bukhari',
  },
  {
    text: 'Dan bersegeralah kamu kepada ampunan dari Tuhanmu dan kepada surga yang luasnya seluas langit dan bumi.',
    source: "QS. Ali 'Imran: 133",
  },
]

export const dailyReminder = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return REMINDERS[dayOfYear % REMINDERS.length]
}

// ===== Kalender Hijriah (Umm al-Qura) =====

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabiul Awal',
  'Rabiul Akhir',
  'Jumadil Awal',
  'Jumadil Akhir',
  'Rajab',
  "Sya'ban",
  'Ramadhan',
  'Syawal',
  "Dzulqa'dah",
  'Dzulhijjah',
]

export interface HijriDate {
  day: number
  month: number // 1-12
  year: number
}

let hijriFormatter: Intl.DateTimeFormat | null | undefined

export const toHijri = (date: Date): HijriDate | null => {
  if (hijriFormatter === undefined) {
    try {
      hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      })
    } catch (err) {
      console.error('Kalender Hijriah tidak didukung browser:', err)
      hijriFormatter = null
    }
  }
  if (!hijriFormatter) return null
  const parts = hijriFormatter.formatToParts(date)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '')
  const result = { day: get('day'), month: get('month'), year: get('year') }
  return Object.values(result).every(Number.isFinite) ? result : null
}

export type IslamicDayKind = 'hari-besar' | 'puasa-sunnah' | 'haram-puasa'

export interface IslamicDay {
  label: string
  kind: IslamicDayKind
}

const FIXED_DAYS: Record<string, IslamicDay> = {
  '1-1': { label: 'Tahun Baru Hijriah', kind: 'hari-besar' },
  '1-9': { label: "Puasa Tasu'a", kind: 'puasa-sunnah' },
  '1-10': { label: 'Puasa Asyura', kind: 'puasa-sunnah' },
  '3-12': { label: 'Maulid Nabi ﷺ', kind: 'hari-besar' },
  '7-27': { label: "Isra Mi'raj", kind: 'hari-besar' },
  '8-15': { label: "Nisfu Sya'ban", kind: 'hari-besar' },
  '9-1': { label: 'Awal Ramadhan', kind: 'hari-besar' },
  '9-17': { label: "Nuzulul Qur'an", kind: 'hari-besar' },
  '10-1': { label: 'Idul Fitri', kind: 'haram-puasa' },
  '12-9': { label: 'Puasa Arafah', kind: 'puasa-sunnah' },
  '12-10': { label: 'Idul Adha', kind: 'haram-puasa' },
  '12-11': { label: 'Hari Tasyrik', kind: 'haram-puasa' },
  '12-12': { label: 'Hari Tasyrik', kind: 'haram-puasa' },
  '12-13': { label: 'Hari Tasyrik', kind: 'haram-puasa' },
}

// Hari-hari istimewa pada tanggal tersebut (hari besar, puasa sunnah, larangan puasa)
export const islamicDaysOf = (date: Date, hijri: HijriDate | null): IslamicDay[] => {
  const days: IslamicDay[] = []
  if (hijri) {
    const fixed = FIXED_DAYS[`${hijri.month}-${hijri.day}`]
    if (fixed) days.push(fixed)
    // Ayyamul Bidh 13-15 setiap bulan, kecuali 13 Dzulhijjah (hari Tasyrik)
    if (hijri.day >= 13 && hijri.day <= 15 && !(hijri.month === 12 && hijri.day === 13)) {
      days.push({ label: 'Ayyamul Bidh', kind: 'puasa-sunnah' })
    }
  }
  // Senin & Kamis, kecuali saat Ramadhan atau hari dilarang puasa
  const weekday = date.getDay()
  const forbidden = days.some((d) => d.kind === 'haram-puasa')
  if ((weekday === 1 || weekday === 4) && hijri?.month !== 9 && !forbidden) {
    days.push({ label: weekday === 1 ? 'Puasa Senin' : 'Puasa Kamis', kind: 'puasa-sunnah' })
  }
  return days
}
