const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = [
    { key: 'thermal_printer', value: JSON.stringify("POS80") },
    { key: 'label_printer', value: JSON.stringify("Xprinter") }
  ];

  for (const s of settings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
    console.log(`Updated setting: ${s.key} = ${s.value}`);
  }
}

main().finally(() => prisma.$disconnect());
