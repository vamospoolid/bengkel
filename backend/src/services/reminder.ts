import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import WhatsAppService from './whatsapp';

const prisma = new PrismaClient();

export interface ReminderConfig {
  enabled: boolean;
  monthsAfterService: number; // 1-6 months
  sendHour: number;           // 0-23
  sendMinute: number;         // 0 or 30
  serviceKeywords: string[];  // e.g. ['oli', 'tune up']
  messageTemplate: string;    // with {customerName}, {lastServiceDate}, etc.
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  monthsAfterService: 3,
  sendHour: 9,
  sendMinute: 0,
  serviceKeywords: ['oli', 'ganti oli', 'tune up', 'service', 'servis'],
  messageTemplate: `🔧 *PENGINGAT SERVIS - JAKARTA MOTOR*

Halo, *{customerName}*! 👋

Sudah {months} bulan sejak servis terakhir Anda:
📅 Terakhir servis: *{lastServiceDate}*
🏍️ Kendaraan: *{vehicleInfo}*
🔩 Jasa: *{serviceName}*

Sudah saatnya servis kembali agar kendaraan Anda tetap prima dan aman di jalan!

📍 *{workshopName}*
📞 {workshopPhone}
{workshopAddress}`
};

export async function getReminderConfig(): Promise<ReminderConfig> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'reminder_config' }
    });
    if (setting?.value) {
      return { ...DEFAULT_REMINDER_CONFIG, ...JSON.parse(setting.value) };
    }
  } catch (e) {
    console.error('[Reminder] Failed to load config:', e);
  }
  return DEFAULT_REMINDER_CONFIG;
}

export async function saveReminderConfig(config: Partial<ReminderConfig>): Promise<void> {
  const current = await getReminderConfig();
  const updated = { ...current, ...config };
  await prisma.appSetting.upsert({
    where: { key: 'reminder_config' },
    update: { value: JSON.stringify(updated) },
    create: { key: 'reminder_config', value: JSON.stringify(updated) }
  });
}

function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}

export async function sendServiceReminders(config?: ReminderConfig) {
  const cfg = config || await getReminderConfig();
  if (!cfg.enabled) {
    console.log('[Reminder] Disabled, skipping.');
    return;
  }

  console.log('[Reminder] Running service reminder job...');

  // Get workshop info
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ['workshop_name', 'workshop_phone', 'workshop_address'] } }
  });
  const workshopName = settings.find(s => s.key === 'workshop_name')?.value || 'Jakarta Motor';
  const workshopPhone = settings.find(s => s.key === 'workshop_phone')?.value || '0812-3456-7890';
  const workshopAddress = settings.find(s => s.key === 'workshop_address')?.value || '';

  // Calculate date window (±3 days around N months ago)
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() - cfg.monthsAfterService);
  const windowStart = new Date(targetDate);
  windowStart.setDate(windowStart.getDate() - 3);
  const windowEnd = new Date(targetDate);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: windowStart, lte: windowEnd },
      customerId: { not: null },
      status: 'COMPLETED'
    },
    include: { customer: true, vehicle: true, items: true }
  });

  let sentCount = 0;
  for (const trx of transactions) {
    if (!trx.customer) continue;

    const serviceItem = trx.items.find(item =>
      cfg.serviceKeywords.some(kw => item.name.toLowerCase().includes(kw.toLowerCase()))
    );
    if (!serviceItem) continue;

    const waNumber = (trx.customer as any).whatsapp || (trx.customer as any).phone;
    if (!waNumber) continue;

    const vehicleInfo = trx.vehicle
      ? `${(trx.vehicle as any).model} (${(trx.vehicle as any).plateNumber})`
      : 'Kendaraan Anda';

    const message = buildMessage(cfg.messageTemplate, {
      customerName: trx.customer.name,
      months: String(cfg.monthsAfterService),
      lastServiceDate: trx.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      vehicleInfo,
      serviceName: serviceItem.name,
      workshopName,
      workshopPhone,
      workshopAddress
    });

    try {
      await WhatsAppService.sendMessage(waNumber, message);
      console.log(`[Reminder] Sent to ${trx.customer.name} (${waNumber})`);
      sentCount++;
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[Reminder] Failed for ${trx.customer.name}:`, err);
    }
  }

  console.log(`[Reminder] Done. Sent ${sentCount} reminder(s).`);
  return sentCount;
}

let scheduledTask: any = null;

export function startReminderScheduler() {
  // Initial schedule from DB config
  getReminderConfig().then(cfg => {
    scheduleReminder(cfg);
  });
}

export function scheduleReminder(cfg: ReminderConfig) {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!cfg.enabled) {
    console.log('[Reminder] Scheduler disabled.');
    return;
  }

  const cronExpr = `${cfg.sendMinute} ${cfg.sendHour} * * *`;
  console.log(`[Reminder] Scheduling at ${cfg.sendHour}:${String(cfg.sendMinute).padStart(2,'0')} daily (cron: ${cronExpr})`);

  scheduledTask = cron.schedule(cronExpr, () => {
    sendServiceReminders(cfg);
  });
}
