import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const settings = [
    { key: 'workshop_name', value: 'JAKARTA MOTOR' },
    { key: 'workshop_address', value: 'Jl. Sudirman No. 123, Jakarta Selatan' },
    { key: 'workshop_phone', value: '0812-3456-7890' }
  ];

  for (const s of settings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
  
  console.log('Workshop settings updated successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
