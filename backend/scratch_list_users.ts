import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log("USERS IN LOCAL DB:");
  users.forEach(u => console.log(`- ${u.username} (Role: ${u.role})`));
}
check().finally(()=>prisma.$disconnect());
