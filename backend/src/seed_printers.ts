import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.appSetting.upsert({
    where: { key: 'thermal_printer' },
    update: { value: 'POS80' },
    create: { key: 'thermal_printer', value: 'POS80' }
  });
  console.log('✅ thermal_printer set to: POS80');

  await prisma.appSetting.upsert({
    where: { key: 'label_printer' },
    update: { value: 'Xprinter' },
    create: { key: 'label_printer', value: 'Xprinter' }
  });
  console.log('✅ label_printer set to: Xprinter');
}

main()
  .catch((e) => { console.error(e); })
  .finally(async () => { await prisma.$disconnect(); });
