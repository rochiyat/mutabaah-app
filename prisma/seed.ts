import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const email = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@mutabaah.com';
  const password = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error(
      'Atur SEED_SUPERADMIN_PASSWORD (minimal 8 karakter) di .env sebelum menjalankan seed'
    );
  }

  // Create superadmin user (jika sudah ada, password tidak diubah)
  const hashedPassword = await bcrypt.hash(password, 10);

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
    },
  });

  console.log(`✅ Superadmin created: ${superadmin.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seed completed!');
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
