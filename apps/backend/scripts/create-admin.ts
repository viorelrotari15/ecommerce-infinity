import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  const firstName = process.argv[4] || 'Admin';
  const lastName = process.argv[5] || 'User';

  console.log(`Creating admin account: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      firstName,
      lastName,
    },
    create: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin account created/updated successfully!');
  console.log(`Email: ${admin.email}`);
  console.log(`Name: ${admin.firstName} ${admin.lastName}`);
  console.log(`Role: ${admin.role}`);
  console.log(`Password: ${password}`);
}

createAdmin()
  .catch((e) => {
    console.error('❌ Error creating admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

