import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUsers() {
  console.log('Creating admin and regular users...\n');

  // Create admin user
  const adminEmail = process.argv[2] || 'admin@example.com';
  const adminPassword = process.argv[3] || 'admin123';
  const adminFirstName = process.argv[4] || 'Admin';
  const adminLastName = process.argv[5] || 'User';

  console.log(`Creating admin account: ${adminEmail}`);
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      role: 'ADMIN',
      firstName: adminFirstName,
      lastName: adminLastName,
    },
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin account created/updated successfully!');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Password: ${adminPassword}\n`);

  // Create regular user
  const userEmail = process.argv[6] || 'user@example.com';
  const userPassword = process.argv[7] || 'user123';
  const userFirstName = process.argv[8] || 'Regular';
  const userLastName = process.argv[9] || 'User';

  console.log(`Creating regular user account: ${userEmail}`);
  const hashedUserPassword = await bcrypt.hash(userPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: hashedUserPassword,
      role: 'USER',
      firstName: userFirstName,
      lastName: userLastName,
    },
    create: {
      email: userEmail,
      password: hashedUserPassword,
      firstName: userFirstName,
      lastName: userLastName,
      role: 'USER',
    },
  });

  console.log('✅ Regular user account created/updated successfully!');
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.firstName} ${user.lastName}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Password: ${userPassword}\n`);

  console.log('✅ All users created successfully!');
}

createUsers()
  .catch((e) => {
    console.error('❌ Error creating users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
