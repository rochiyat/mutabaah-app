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
  } catch {
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
