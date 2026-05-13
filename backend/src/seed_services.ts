import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const services = [
    { name: 'Ganti Oli Ringan', price: 5000, estimatedTime: '15m' },
    { name: 'Ganti Oli + Filter', price: 10000, estimatedTime: '20m' },
    { name: 'Service Rutin (Tune Up)', price: 35000, estimatedTime: '45m' },
    { name: 'Ganti Ban Luar (Matic/Bebek)', price: 15000, estimatedTime: '20m' },
    { name: 'Ganti Ban Luar (Sport)', price: 25000, estimatedTime: '30m' },
    { name: 'Service Rem Depan/Belakang', price: 15000, estimatedTime: '20m' },
    { name: 'Ganti Aki', price: 5000, estimatedTime: '10m' },
    { name: 'Cuci Motor', price: 10000, estimatedTime: '30m' },
  ];

  console.log('--- SEEDING SERVICES ---');
  for (const s of services) {
    await prisma.service.upsert({
      where: { id: s.name }, // This is just a trick, we'll use name as unique for seeding
      update: {},
      create: s,
    }).catch(() => {
      // If ID trick fails, just create
      return prisma.service.create({ data: s });
    });
    console.log(`Added service: ${s.name}`);
  }
  console.log('--- SEEDING COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    // @ts-ignore
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
