import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { password: hash }
  });
  console.log('Password lokal untuk admin berhasil di-reset ke: admin123');
}

resetPassword().finally(() => prisma.$disconnect());
