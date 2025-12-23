import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create superadmin user
  const hashedPassword = await bcrypt.hash('superadmin123', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@mutabaah.com' },
    update: {},
    create: {
      email: 'superadmin@mutabaah.com',
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
