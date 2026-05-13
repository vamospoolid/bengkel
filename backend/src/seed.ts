import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });
  console.log('Admin user ready:', admin.username);
  
  // Seed Products
  require('./seed_products');
  // Seed Services
  require('./seed_services');
  // Seed Mechanics
  require('./seed_mechanics');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
