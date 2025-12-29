import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌍 Adding default languages...');

  const languages = [
    { code: 'en', name: 'English', isDefault: true, isActive: true },
    { code: 'ro', name: 'Romanian', isDefault: false, isActive: true },
    { code: 'ru', name: 'Russian', isDefault: false, isActive: true },
    { code: 'de', name: 'German', isDefault: false, isActive: true },
    { code: 'tr', name: 'Turkish', isDefault: false, isActive: true },
  ];

  for (const lang of languages) {
    const created = await prisma.language.upsert({
      where: { code: lang.code },
      update: {
        name: lang.name,
        isDefault: lang.isDefault,
        isActive: lang.isActive,
      },
      create: lang,
    });
    console.log(`✅ ${created.name} (${created.code}) - ${created.isDefault ? 'DEFAULT' : 'active'}`);
  }

  console.log('\n✨ Default languages added successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

