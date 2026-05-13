const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const key = 'thermal_printer';
  const value = JSON.stringify('PrinterResi');
  
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  
  console.log('App setting "thermal_printer" updated to "PrinterResi"');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
