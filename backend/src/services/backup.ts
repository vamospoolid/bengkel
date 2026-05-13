import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Automates database backup to JSON files.
 * Runs every day at 00:00 (Midnight).
 */
export const startBackupScheduler = () => {
  // Cron: '0 0 * * *' (Every midnight)
  // For testing, you can use '*/5 * * * *' (Every 5 minutes)
  cron.schedule('0 0 * * *', async () => {
    try {
      // 1. Check if auto backup is enabled in AppSettings
      const setting = await prisma.appSetting.findUnique({
        where: { key: 'auto_backup' }
      });

      const isEnabled = setting?.value === 'true';
      if (!isEnabled) {
        console.log('[Backup] Auto-backup is disabled. Skipping.');
        return;
      }

      console.log('[Backup] Starting scheduled auto-backup...');

      // 2. Fetch all data (consistent with /api/database/backup)
      const data = {
        users: await prisma.user.findMany(),
        products: await prisma.product.findMany(),
        customers: await prisma.customer.findMany(),
        transactions: await prisma.transaction.findMany(),
        workOrders: await prisma.workOrder.findMany(),
        cashflows: await prisma.cashflow.findMany(),
        stockLogs: await prisma.stockLog.findMany(),
        attendance: await prisma.attendance.findMany(),
        suppliers: await prisma.supplier.findMany(),
        supplierPurchases: await prisma.supplierPurchase.findMany(),
        services: await prisma.service.findMany(),
        appSettings: await prisma.appSetting.findMany(),
        vehicles: await prisma.vehicle.findMany(),
        purchaseItems: await prisma.purchaseItem.findMany(),
        transactionItems: await prisma.transactionItem.findMany()
      };

      // 3. Define backup directory
      const backupDir = path.join(__dirname, '../../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 4. Generate filename with date
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `autobackup_${timestamp}.json`;
      const filePath = path.join(backupDir, filename);

      // 5. Write to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`[Backup] Auto-backup successful: ${filename}`);

      // 6. Cleanup old backups (keep only last 7 days)
      const files = fs.readdirSync(backupDir);
      if (files.length > 7) {
        // Sort by name (which has timestamp) and remove oldest
        const sortedFiles = files.sort();
        const toDelete = sortedFiles.slice(0, files.length - 7);
        for (const f of toDelete) {
          fs.unlinkSync(path.join(backupDir, f));
        }
        console.log(`[Backup] Cleaned up ${toDelete.length} old backup files.`);
      }

    } catch (error) {
      console.error('[Backup] Scheduled auto-backup FAILED:', error);
    }
  });

  console.log('[Scheduler] Auto-backup job scheduled (Daily at 00:00)');
};
