const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const username = 'kasir';
  const password = 'kasir123';
  const name = 'Kasir Jakarta Motor';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        password: hashedPassword,
        role: 'CASHIER'
      },
      create: {
        username,
        password: hashedPassword,
        name,
        role: 'CASHIER'
      }
    });
    console.log(`User Kasir berhasil dibuat/diperbarui: ${user.username}`);
  } catch (error) {
    console.error('Gagal membuat user kasir:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
