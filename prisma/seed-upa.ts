import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const dateKeyToDb = (key: string): Date => new Date(`${key}T00:00:00.000Z`);

async function main() {
  console.log('🚀 Starting Opus Data Ops: Seeding Kelompok UPA Akhwat...');

  const defaultPassword = process.env.DEFAULT_MEMBER_PASSWORD || 'Mutabaah2026!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Data User (10 Anggota dengan CamelCase / Title Case)
  const usersData = [
    { name: 'Umi Lisa', email: 'umi.lisa@mutabaah.com', role: 'murabbi', groupRole: 'murabbi' },
    { name: 'Rizka Ardhiyana', email: 'rizka.ardhiyana@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Vivy Ramayanti', email: 'vivy.ramayanti@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Nurul Fitriyah', email: 'nurul.fitriyah@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Rani Dwi', email: 'rani.dwi@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Umiyati', email: 'umiyati@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Yuli Widiastutik', email: 'yuli.widiastutik@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Hartutik', email: 'hartutik@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Rilyanti', email: 'rilyanti@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
    { name: 'Lusi Prabawati', email: 'lusi.prabawati@mutabaah.com', role: 'user', groupRole: 'mutarabbi' },
  ];

  const userMap = new Map<string, number>();

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        isActive: true,
      },
    });
    userMap.set(u.email, user.id);
    userMap.set(u.name, user.id);
    console.log(`  👤 User ready: ${user.name} (${user.email}) - ID: ${user.id}`);
  }

  const umiLisaId = userMap.get('Umi Lisa')!;
  const yuliId = userMap.get('Yuli Widiastutik')!;
  const raniId = userMap.get('Rani Dwi')!;
  const vivyId = userMap.get('Vivy Ramayanti')!;
  const fifiId = userMap.get('Nurul Fitriyah')!;
  const rilyantiId = userMap.get('Rilyanti')!;
  const rizkaId = userMap.get('Rizka Ardhiyana')!;
  const lusiId = userMap.get('Lusi Prabawati')!;
  const hartutikId = userMap.get('Hartutik')!;
  const umiyatiId = userMap.get('Umiyati')!;

  // 2. Group: Kelompok UPA Akhwat
  let group = await prisma.group.findFirst({
    where: { name: 'Kelompok UPA Akhwat' },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: 'Kelompok UPA Akhwat',
        description: 'Kelompok pembinaan UPA rutin pekanan',
        level: 'Kader',
        schedule: 'Setiap pekan (Ahad / Sabtu)',
        location: 'Bergiliran di rumah anggota',
        adminId: umiLisaId,
        isActive: true,
      },
    });
    console.log(`  🏢 Group created: ${group.name} (ID: ${group.id})`);
  } else {
    group = await prisma.group.update({
      where: { id: group.id },
      data: {
        adminId: umiLisaId,
        description: 'Kelompok pembinaan UPA rutin pekanan',
        schedule: 'Setiap pekan (Ahad / Sabtu)',
        location: 'Bergiliran di rumah anggota',
      },
    });
    console.log(`  🏢 Group updated: ${group.name} (ID: ${group.id})`);
  }

  // 3. GroupMember
  for (const u of usersData) {
    const userId = userMap.get(u.email)!;
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId,
        },
      },
      update: {
        role: u.groupRole,
      },
      create: {
        groupId: group.id,
        userId,
        role: u.groupRole,
      },
    });
  }
  console.log(`  👥 10 Members linked to group.`);

  // 4. Activities (Amalan Yaumiyah)
  const activitiesData = [
    { name: 'Sholat Tahajud', category: 'Ibadah', target: 1, unit: 'kali' },
    { name: 'Sholat Dhuha', category: 'Ibadah', target: 4, unit: 'rakaat' },
    { name: 'Sholat Rawatib', category: 'Ibadah', target: 1, unit: 'waktu' },
    { name: 'Dzikir Al-Ma\'tsurat', category: 'Dzikir', target: 1, unit: 'kali' },
    { name: 'Zikir Harian', category: 'Dzikir', target: 100, unit: 'kali' },
    { name: 'Tilawah Al-Qur\'an', category: 'Al-Qur\'an', target: 1, unit: 'juz' },
    { name: 'Hafalan Juz 29 (Surat Al-Mulk)', category: 'Al-Qur\'an', target: 1, unit: 'kali' },
    { name: 'Saum Sunnah', category: 'Ibadah', target: 3, unit: 'hari' },
    { name: 'Olahraga', category: 'Kesehatan', target: 3, unit: 'kali' },
  ];

  for (const act of activitiesData) {
    let activity = await prisma.activity.findFirst({
      where: { name: act.name, userId: null },
    });

    if (!activity) {
      activity = await prisma.activity.create({
        data: {
          name: act.name,
          category: act.category,
          target: act.target,
          unit: act.unit,
          isActive: true,
          userId: null,
        },
      });
    } else {
      activity = await prisma.activity.update({
        where: { id: activity.id },
        data: {
          target: act.target,
          unit: act.unit,
          category: act.category,
          isActive: true,
        },
      });
    }

    // Link ke group via GroupActivity
    await prisma.groupActivity.upsert({
      where: {
        groupId_activityId: {
          groupId: group.id,
          activityId: activity.id,
        },
      },
      update: { isRequired: true },
      create: {
        groupId: group.id,
        activityId: activity.id,
        isRequired: true,
      },
    });
  }
  console.log(`  📖 9 Activities created and linked to group.`);

  // 5. Meetings & Attendances
  // Pertemuan 1: Sabtu, 10 Oktober 2026
  const dateMeeting1 = dateKeyToDb('2026-10-10');
  let meeting1 = await prisma.meeting.findFirst({
    where: { groupId: group.id, date: dateMeeting1 },
  });

  const notesMeeting1 = `Notulensi Pertemuan UPA:
1. Ketentuan Pertemuan:
   - Petugas MC: Menggunakan teks yang sudah ditentukan.
   - Pembaca Doa Robitoh.
   - Hafalan: Dimulai dari Juz 29 Surat Al-Mulk (penambahan setiap pekan).
2. Info DPD:
   - Laporan program kegiatan UPA maksimal 17 Oktober 2026.
   - Kegiatan Latansa pada Ahad, 8 November 2026 (wajib bagi anggota).
3. Program Kegiatan UPA (4 Divisi):
   - Dakwah Eksternal: Parenting (26 Des 2026), Penyuluhan Kesehatan (Awal Feb 2027).
   - Dakwah Internal: Amalan Yaumiyah, Bedah Buku Syarah Risalah Taklim.
   - Aliyah: Riyadhoh, Masak Bersama, Family Gathering, Kunjungan Tokoh, BBR, Buka Bersama.
   - APM: Pendataan Anak Anggota & Anak Disabilitas, Support Pelajar.
4. Infaq Anggota:
   - Infaq Pekanan: Sukarela
   - Infaq Palestina: Sukarela
   - Infaq Tetap Bulanan (ITP): Rp 50.000 / bulan
   - Infaq DPD: Rp 60.000 / bulan.`;

  if (!meeting1) {
    meeting1 = await prisma.meeting.create({
      data: {
        groupId: group.id,
        date: dateMeeting1,
        startTime: '13:30',
        location: 'Rumah Rani Dwi',
        topic: 'Penyusunan Program Kegiatan UPA & Ketentuan Pertemuan',
        speaker: 'Umi Lisa',
        notes: notesMeeting1,
        createdById: umiLisaId,
      },
    });
  } else {
    meeting1 = await prisma.meeting.update({
      where: { id: meeting1.id },
      data: {
        startTime: '13:30',
        location: 'Rumah Rani Dwi',
        topic: 'Penyusunan Program Kegiatan UPA & Ketentuan Pertemuan',
        speaker: 'Umi Lisa',
        notes: notesMeeting1,
      },
    });
  }
  console.log(`  📅 Meeting 1 ready (10 Okt 2026) - ID: ${meeting1.id}`);

  // Presensi Pertemuan 1: Seluruh 10 anggota hadir
  for (const u of usersData) {
    const userId = userMap.get(u.email)!;
    await prisma.attendance.upsert({
      where: {
        meetingId_userId: {
          meetingId: meeting1.id,
          userId,
        },
      },
      update: {
        status: 'hadir',
        note: 'Kehadiran lengkap',
        recordedById: umiLisaId,
      },
      create: {
        meetingId: meeting1.id,
        userId,
        status: 'hadir',
        note: 'Kehadiran lengkap',
        recordedById: umiLisaId,
      },
    });
  }
  console.log(`  ✅ 10 Attendances recorded for Meeting 1.`);

  // Pertemuan 2: Ahad, 18 Oktober 2026
  const dateMeeting2 = dateKeyToDb('2026-10-18');
  let meeting2 = await prisma.meeting.findFirst({
    where: { groupId: group.id, date: dateMeeting2 },
  });

  const notesMeeting2 = 'Pertemuan rutin pekanan UPA, tindak lanjut program, setoran hafalan Al-Mulk, dan mutabaah yaumiyah.';

  if (!meeting2) {
    meeting2 = await prisma.meeting.create({
      data: {
        groupId: group.id,
        date: dateMeeting2,
        startTime: '13:30',
        location: 'Rumah Umi Lisa',
        topic: 'Pertemuan Rutin UPA & Pembahasan Program Lanjutan',
        speaker: 'Umi Lisa',
        notes: notesMeeting2,
        createdById: umiLisaId,
      },
    });
  } else {
    meeting2 = await prisma.meeting.update({
      where: { id: meeting2.id },
      data: {
        location: 'Rumah Umi Lisa',
        topic: 'Pertemuan Rutin UPA & Pembahasan Program Lanjutan',
        speaker: 'Umi Lisa',
        notes: notesMeeting2,
      },
    });
  }
  console.log(`  📅 Meeting 2 ready (18 Okt 2026) - ID: ${meeting2.id}`);

  // 6. FinanceAccount & DuesPlans
  let account = await prisma.financeAccount.findFirst({
    where: { groupId: group.id, name: 'Kas UPA' },
  });

  if (!account) {
    account = await prisma.financeAccount.create({
      data: {
        name: 'Kas UPA',
        description: 'Rekening Kas Operasional Kelompok UPA Akhwat',
        groupId: group.id,
        openingBalance: 0,
        isActive: true,
        createdById: umiLisaId,
      },
    });
  }
  console.log(`  💰 Finance Account ready: ${account.name} (ID: ${account.id})`);

  const duesPlansData = [
    { name: 'Infaq Tetap Bulanan (ITP)', amount: 50000 },
    { name: 'Infaq DPD', amount: 60000 },
    { name: 'Infaq Pekanan', amount: 0 },
    { name: 'Infaq Palestina', amount: 0 },
  ];

  for (const dp of duesPlansData) {
    const existing = await prisma.duesPlan.findFirst({
      where: { accountId: account.id, name: dp.name },
    });
    if (!existing) {
      await prisma.duesPlan.create({
        data: {
          accountId: account.id,
          name: dp.name,
          amount: dp.amount,
          isActive: true,
        },
      });
    } else {
      await prisma.duesPlan.update({
        where: { id: existing.id },
        data: { amount: dp.amount, isActive: true },
      });
    }
  }
  console.log(`  💳 4 Dues Plans ready.`);

  // 7. Programs & ProgramParticipants
  const programsData = [
    {
      name: 'Parenting',
      description: 'Program Dakwah Eksternal: Seminar dan edukasi parenting keluarga Muslim',
      startDate: '2026-12-26',
      endDate: '2026-12-26',
      picId: vivyId,
      participants: [
        { userId: vivyId, role: 'panitia' },
        { userId: fifiId, role: 'panitia' },
        { userId: rilyantiId, role: 'panitia' },
      ],
    },
    {
      name: 'Penyuluhan Kesehatan (Persiapan Fisik Ramadhan)',
      description: 'Program Dakwah Eksternal: Penyuluhan kesehatan persiapan fisik menjelang Ramadhan',
      startDate: '2027-02-01',
      endDate: '2027-02-01',
      picId: vivyId,
      participants: [
        { userId: vivyId, role: 'panitia' },
        { userId: fifiId, role: 'panitia' },
        { userId: rilyantiId, role: 'panitia' },
      ],
    },
    {
      name: 'Amalan Yaumiyah & Mutabaah Harian',
      description: 'Program Dakwah Internal: Pembiasaan dan pemantauan amalan yaumiyah harian anggota',
      startDate: null,
      endDate: null,
      picId: yuliId,
      participants: [
        { userId: yuliId, role: 'panitia' },
        { userId: lusiId, role: 'panitia' },
      ],
    },
    {
      name: 'Bedah Buku: Syarah Risalah Taklim',
      description: `Program Dakwah Internal: Bedah buku Syarah Risalah Taklim.
Pembagian materi pembahasan:
- Bagian 3-4: Rani Dwi
- Bagian 5-6: Vivy Ramayanti
- Bagian 7-8: Nurul Fitriyah
- Bagian 9-10: Rilyanti
- Bagian 11-12: Hartutik
- Bagian 13-14: Umiyati
- Bagian 15-16: Lusi Prabawati
- Bagian 17-18: Yuli Widiastutik
- Bagian 19-20: Rizka Ardhiyana`,
      startDate: null,
      endDate: null,
      picId: yuliId,
      participants: [
        { userId: yuliId, role: 'panitia' },
        { userId: lusiId, role: 'panitia' },
        { userId: raniId, role: 'peserta' },
        { userId: vivyId, role: 'peserta' },
        { userId: fifiId, role: 'peserta' },
        { userId: rilyantiId, role: 'peserta' },
        { userId: hartutikId, role: 'peserta' },
        { userId: umiyatiId, role: 'peserta' },
        { userId: rizkaId, role: 'peserta' },
      ],
    },
    {
      name: 'Riyadhoh Aliyah',
      description: 'Kegiatan fisik dan riyadhoh di Alun-Alun Kabupaten (pekan ke-4)',
      startDate: '2026-10-25',
      endDate: '2026-10-25',
      location: 'Alun-Alun Kabupaten',
      picId: raniId,
      participants: [{ userId: raniId, role: 'panitia' }],
    },
    {
      name: 'Keterampilan: Masak Bersama',
      description: 'Pelatihan keterampilan dan memasak bersama anggota (pekan ke-4)',
      startDate: '2026-11-22',
      endDate: '2026-11-22',
      picId: raniId,
      participants: [{ userId: raniId, role: 'panitia' }],
    },
    {
      name: 'Family Gathering',
      description: 'Family gathering melibatkan seluruh anggota keluarga (pekan ke-4)',
      startDate: '2026-12-27',
      endDate: '2026-12-27',
      picId: raniId,
      participants: [{ userId: raniId, role: 'panitia' }],
    },
    {
      name: 'Kunjungan Tokoh',
      description: 'Silaturahim dan kunjungan tokoh masyarakat/keagamaan (pekan ke-4)',
      startDate: '2027-01-24',
      endDate: '2027-01-24',
      picId: raniId,
      participants: [{ userId: raniId, role: 'panitia' }],
    },
    {
      name: 'Berbagi Berkah Ramadhan (BBR)',
      description: 'Kegiatan sosial berbagi berkah di bulan Ramadhan (pekan ke-4)',
      startDate: '2027-02-28',
      endDate: '2027-02-28',
      picId: raniId,
      participants: [{ userId: raniId, role: 'panitia' }],
    },
    {
      name: 'Buka Bersama',
      description: 'Buka puasa bersama anggota dan keluarga (pekan ke-4)',
      startDate: '2027-03-21',
      endDate: '2027-03-21',
      picId: raniId,
      participants: [{ userId: raniId, role: 'panitia' }],
    },
    {
      name: 'Pendataan Anak Anggota & Kader Disabilitas',
      description: 'Pendataan anak setiap anggota UPA (Format: Nama anggota/nama anak/P/L/usia/kelas-jenjang) dan anak kader disabilitas',
      startDate: null,
      endDate: null,
      picId: rizkaId,
      participants: [
        { userId: rizkaId, role: 'panitia' },
        { userId: rilyantiId, role: 'panitia' },
        { userId: hartutikId, role: 'panitia' },
      ],
    },
    {
      name: 'Support Kegiatan Pelajar',
      description: 'Dukungan kegiatan pelajar (disesuaikan dengan program sekolah)',
      startDate: null,
      endDate: null,
      picId: rizkaId,
      participants: [
        { userId: rizkaId, role: 'panitia' },
        { userId: rilyantiId, role: 'panitia' },
        { userId: hartutikId, role: 'panitia' },
      ],
    },
    {
      name: 'Kegiatan Latansa DPD',
      description: 'Kegiatan Latansa wajib bagi seluruh anggota UPA',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
      picId: umiLisaId,
      participants: usersData.map((u) => ({ userId: userMap.get(u.email)!, role: 'peserta' })),
    },
  ];

  for (const prog of programsData) {
    let program = await prisma.program.findFirst({
      where: { groupId: group.id, name: prog.name },
    });

    const start = prog.startDate ? dateKeyToDb(prog.startDate) : null;
    const end = prog.endDate ? dateKeyToDb(prog.endDate) : null;

    if (!program) {
      program = await prisma.program.create({
        data: {
          name: prog.name,
          description: prog.description,
          groupId: group.id,
          status: 'rencana',
          startDate: start,
          endDate: end,
          location: prog.location || null,
          picId: prog.picId,
          createdById: umiLisaId,
        },
      });
    } else {
      program = await prisma.program.update({
        where: { id: program.id },
        data: {
          description: prog.description,
          startDate: start,
          endDate: end,
          location: prog.location || null,
          picId: prog.picId,
        },
      });
    }

    // Participants
    for (const p of prog.participants) {
      await prisma.programParticipant.upsert({
        where: {
          programId_userId: {
            programId: program.id,
            userId: p.userId,
          },
        },
        update: { role: p.role },
        create: {
          programId: program.id,
          userId: p.userId,
          role: p.role,
        },
      });
    }
  }
  console.log(`  🎯 13 Programs and their participants ready.`);

  console.log('✨ All seed data executed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
