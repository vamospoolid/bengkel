import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Products:', await prisma.product.count());
  console.log('Services:', await prisma.service.count());
  console.log('Customers:', await prisma.customer.count());
}
main().finally(() => prisma.$disconnect());
