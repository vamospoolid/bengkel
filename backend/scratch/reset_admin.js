const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function resetAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  try {
    const user = await prisma.user.update({
      where: { username: 'admin' },
      data: { 
        password: hashedPassword,
        isActive: true 
      }
    });
    console.log('SUCCESS: Admin password reset to "admin123" and status set to ACTIVE');
  } catch (e) {
    console.log('ERROR: User "admin" not found. Creating new admin...');
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN',
        isActive: true
      }
    });
    console.log('SUCCESS: New admin created with password "admin123"');
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
