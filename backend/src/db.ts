import { PrismaClient } from '@prisma/client';

// Use DATABASE_URL from environment (set by Electron main process in prod)
// or default to local dev.db
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log(`[PRISMA] Using database at: ${dbUrl}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

export default prisma;
