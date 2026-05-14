const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDashboard() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    console.log('1. Checking Transactions...');
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: 'COMPLETED'
      }
    });
    console.log('Count:', todayTransactions.length);

    console.log('2. Checking WorkOrders count...');
    const activeServicesCount = await prisma.workOrder.count({
      where: {
        status: { in: ['QUEUED', 'PROGRESS'] }
      }
    });
    console.log('Count:', activeServicesCount);

    console.log('3. Checking Products...');
    const products = await prisma.product.findMany();
    const lowStockItems = products.filter(p => p.stock <= p.minStock);
    console.log('Low Stock Count:', lowStockItems.length);

    console.log('4. Checking Mechanics...');
    const totalMechanics = await prisma.user.count({ where: { role: 'MECHANIC' } });
    console.log('Mechanic Count:', totalMechanics);

    console.log('5. Checking Supplier Purchases...');
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);
    const duePurchases = await prisma.supplierPurchase.findMany({
      where: {
        status: 'HUTANG',
        dueDate: { lte: dueSoonDate }
      },
      include: { supplier: { select: { name: true } } },
      orderBy: { dueDate: 'asc' }
    });
    console.log('Due Purchases:', duePurchases.length);

    console.log('6. Checking Recent Work Orders...');
    const recentTasks = await prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        mechanic: { select: { name: true } }
      }
    });
    
    const mapped = recentTasks.map(t => ({
      plate: t.plateNumber,
      vehicle: t.model || 'Unknown',
      service: (Array.isArray(t.services) && t.services.length > 0) ? (t.services[0]) : 'Servis Umum',
      mechanic: t.mechanic?.name || '-',
      status: t.status === 'QUEUED' ? 'Antrian' : t.status === 'PROGRESS' ? 'Berjalan' : 'Selesai'
    }));
    console.log('Mapped tasks:', mapped.length);

    console.log('SUCCESS: Dashboard logic is valid.');
  } catch (error) {
    console.error('FAILURE:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDashboard();
