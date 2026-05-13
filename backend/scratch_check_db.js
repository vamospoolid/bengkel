const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  const users = await prisma.user.count();
  console.log(`Products: ${count}`);
  console.log(`Users: ${users}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
