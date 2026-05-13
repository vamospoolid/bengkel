import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const mechanics = [
    { name: 'Budi Santoso', username: 'budi', password: 'password123', role: 'MECHANIC', commissionRate: 10 },
    { name: 'Agus Salim', username: 'agus', password: 'password123', role: 'MECHANIC', commissionRate: 10 },
    { name: 'Iwan Fals', username: 'iwan', password: 'password123', role: 'MECHANIC', commissionRate: 15 }
  ];

  for (const m of mechanics) {
    const hashedPassword = await bcrypt.hash(m.password, 10);
    await prisma.user.upsert({
      where: { username: m.username },
      update: { name: m.name, role: 'MECHANIC' as any },
      create: { 
        name: m.name,
        username: m.username,
        password: hashedPassword,
        role: 'MECHANIC' as any,
        commissionRate: m.commissionRate
      }
    });
  }

  console.log('Mechanics seeded successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
