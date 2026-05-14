import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './db';
import { authenticate, authorize } from './middleware/auth';
import { ThermalPrinter, PrinterTypes, CharacterSet } from "node-thermal-printer";
import { printRaw } from './utils/printer';
import WhatsAppService from './services/whatsapp';
import { startReminderScheduler, getReminderConfig, saveReminderConfig, sendServiceReminders, scheduleReminder } from './services/reminder';
import { startBackupScheduler } from './services/backup';
import { getHardwareInfo } from './utils/hardware';

dotenv.config();
console.log('Backend starting...');

// --- ERROR BOUNDARY: PROCESS LEVEL ---
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception!', err);
  // Optional: Send to a log file or notification service
});

const execAsync = promisify(exec);

// Helper to get single string from query/params
const s = (val: any): string => (Array.isArray(val) ? String(val[0]) : String(val || ''));

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Real-time events
io.on('connection', (socket) => {
  console.log('User connected to Socket.io:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Ensure uploads directories exist
const BASE_UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/var/www/bengkel/uploads' : path.join(__dirname, '../../uploads');
const uploadInvoicesDir = path.join(BASE_UPLOAD_DIR, 'invoices');
const uploadServicesDir = path.join(BASE_UPLOAD_DIR, 'services');

[BASE_UPLOAD_DIR, uploadInvoicesDir, uploadServicesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer Configuration for Invoices
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadInvoicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer Configuration for Service Photos
const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadServicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadInvoice = multer({ storage: invoiceStorage });
const uploadService = multer({ storage: serviceStorage });

app.use(cors());
app.use(express.json());
// Serve static files
app.use('/uploads', express.static(BASE_UPLOAD_DIR));

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- AUDIT & STOCK LOGS (PRIORITY) ---
app.get('/api/stock-logs', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  console.log('--- FETCHING GLOBAL STOCK LOGS ---');
  try {
    const logs = await prisma.stockLog.findMany({
      include: {
        product: { select: { name: true, barcode: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.get('/api/products/:id/stock-logs', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await prisma.stockLog.findMany({
      where: { productId: id as string },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product logs' });
  }
});

// --- AUTH ROUTES ---

// Register User (Admin Only or First User)
app.post('/api/auth/register', async (req, res) => {
  const { name, username, password, role, commissionRate, specialty } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: role || 'CASHIER',
        commissionRate: commissionRate ? parseFloat(commissionRate) : 0,
        specialty: specialty || 'ALL'
      }
    });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.isActive) {
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get All Users (Admin Only)
app.get('/api/auth/users', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        commissionRate: true,
        specialty: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Toggle User Status (Admin Only)
app.patch('/api/auth/users/:id/toggle-status', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: s(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.username === 'admin') return res.status(400).json({ error: 'Akun super admin tidak bisa dinonaktifkan' });

    const updated = await prisma.user.update({
      where: { id: s(id) },
      data: { isActive: !user.isActive }
    });
    res.json({ message: 'Status user berhasil diubah', isActive: updated.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengubah status user' });
  }
});

// Delete User (Admin Only)
app.delete('/api/auth/users/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    // Prevent deleting the main admin
    const user = await prisma.user.findUnique({ where: { id: s(id) } });
    if (user?.username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete the main admin account' });
    }

    await prisma.user.delete({ where: { id: s(id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user. They might have related data (transactions/tasks).' });
  }
});



// Bulk Restock Products
app.post('/api/products/bulk-restock', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const { items } = req.body; // Array of { id, quantity, purchasePrice? }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedProducts = [];

      for (const item of items) {
        const product = await tx.product.update({
          where: { id: item.id },
          data: {
            stock: { increment: item.quantity },
            // Optionally update purchase price if provided
            ...(item.purchasePrice && { purchasePrice: item.purchasePrice })
          }
        });

        // Create Stock Log
        await tx.stockLog.create({
          data: {
            productId: item.id,
            userId: (req as any).user?.id || null,
            type: 'RESTOCK',
            changeQty: item.quantity,
            previousStock: product.stock - item.quantity,
            currentStock: product.stock,
            description: `Restok Massal (Batch Restock)`
          }
        });

        updatedProducts.push(product);
      }

      return updatedProducts;
    });

    res.json({ message: 'Bulk restock successful', products: result });
  } catch (error) {
    console.error('Bulk restock failed:', error);
    res.status(500).json({ error: 'Failed to process bulk restock' });
  }
});

// Update User
app.patch('/api/users/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, role, status, commissionRate, username, password } = req.body;
  try {
    const updateData: any = { name, role, status, commissionRate };

    if (username) {
      // Check if username is taken by another user
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: id as string } }
      });
      if (existing) return res.status(400).json({ error: 'Username sudah digunakan' });
      updateData.username = username;
    }

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: id as string },
      data: updateData
    });
    res.json(user);
  } catch (error) {
    console.error('User Update Error:', error);
    res.status(400).json({ error: 'Update failed' });
  }
});

// Delete User
app.delete('/api/users/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: id as string } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

// --- ATTENDANCE SYSTEM ---

// Get Today's Attendance
app.get('/api/attendance/today', authenticate, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const logs = await prisma.attendance.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd }
      },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: { clockIn: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data absensi hari ini' });
  }
});

// Log Attendance (Clock In/Out via Fingerprint ID or User ID)
// This endpoint is designed to be called by the Hardware Relay Service or Local UI
app.post('/api/attendance/log', async (req, res) => {
  const { fingerprintId, userId, location } = req.body;

  try {
    let user;
    if (fingerprintId) {
      user = await prisma.user.findUnique({ where: { fingerprintId } });
    } else if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!user) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find existing log for today
    const existingLog = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      }
    });

    const now = new Date();

    if (existingLog) {
      // Clock Out
      if (existingLog.clockOut) {
        return res.status(400).json({ error: 'Sudah melakukan absen pulang hari ini.' });
      }
      const updated = await prisma.attendance.update({
        where: { id: existingLog.id },
        data: { clockOut: now }
      });
      return res.json({
        type: 'CLOCK_OUT',
        user: user.name,
        time: updated.clockOut,
        message: `Selamat beristirahat, ${user.name}!`
      });
    } else {
      // Clock In
      const lateThreshold = new Date();
      lateThreshold.setHours(8, 30, 0, 0); // Standard threshold 08:30 AM

      const status = now > lateThreshold ? 'LATE' : 'PRESENT';

      const newLog = await prisma.attendance.create({
        data: {
          userId: user.id,
          date: today,
          clockIn: now,
          status: status,
          location: location || 'STATION'
        }
      });
      return res.status(201).json({
        type: 'CLOCK_IN',
        user: user.name,
        time: newLog.clockIn,
        status,
        message: status === 'LATE' ? `Terlambat! Semangat bekerja, ${user.name}.` : `Selamat pagi, ${user.name}!`
      });
    }
  } catch (error) {
    console.error('Attendance log failed:', error);
    res.status(500).json({ error: 'Server error during attendance log' });
  }
});

// Update Fingerprint ID for a user (Enrollment)
app.patch('/api/users/:id/fingerprint', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { fingerprintId } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: s(id) },
      data: { fingerprintId }
    });
    res.json({ message: 'Fingerprint ID updated', user: updated.name });
  } catch (error) {
    res.status(400).json({ error: 'Fingerprint ID already used by another user.' });
  }
});

// Get Attendance Report (Monthly)
app.get('/api/attendance/report', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { month, year } = req.query;
  try {
    const m = month ? parseInt(String(month)) : new Date().getMonth() + 1;
    const y = year ? parseInt(String(year)) : new Date().getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

    const logs = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: [{ date: 'desc' }, { clockIn: 'desc' }]
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil laporan absensi' });
  }
});

// Get All Mechanics
app.get('/api/mechanics', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  try {
    const mechanics = await prisma.user.findMany({
      where: { role: 'MECHANIC' },
      select: {
        id: true,
        name: true,
        username: true,
        commissionRate: true,
        specialty: true,
        _count: {
          select: {
            assignedTasks: {
              where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : undefined
            }
          }
        }
      }
    });
    res.json(mechanics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch mechanics' });
  }
});

// Get Mechanic Performance Detail
app.get('/api/mechanics/:id/performance', authenticate, async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const mechanic = await prisma.user.findUnique({
      where: { id: s(id) },
      include: {
        _count: { select: { assignedTasks: true } }
      }
    });

    if (!mechanic) return res.status(404).json({ error: 'Mechanic not found' });

    // Date filtering logic
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Fetch all service items handled by this mechanic with date filter
    const serviceItems = await prisma.transactionItem.findMany({
      where: {
        mechanicId: s(id),
        type: 'SERVICE',
        transaction: {
          status: 'COMPLETED',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        }
      },
      include: { transaction: true }
    });

    const totalRevenue = serviceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalCommission = (totalRevenue * (mechanic.commissionRate || 0)) / 100;

    // Fetch work history with date filter
    const history = await prisma.workOrder.findMany({
      where: {
        mechanicId: s(id),
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { transaction: { select: { totalAmount: true, createdAt: true } } }
    });

    res.json({
      mechanic,
      stats: {
        totalRevenue,
        totalCommission,
        totalUnits: (mechanic as any)._count.assignedTasks
      },
      history: history.map((h: any) => ({
        id: h.id,
        plate: h.plateNumber,
        model: h.model,
        date: h.createdAt,
        status: h.status,
        revenue: h.transaction?.totalAmount || 0
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Add New Mechanic
app.post('/api/mechanics', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { name, username, password, commissionRate } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const mechanic = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: 'MECHANIC',
        commissionRate: Number(commissionRate) || 0
      }
    });
    res.status(201).json(mechanic);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add mechanic. Username might be taken.' });
  }
});

// --- INVENTORY MANAGEMENT ---

// Process Stock Adjustment (Barang Rusak/Hilang)
app.post('/api/inventory/adjustment', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { productId, quantity, reason, notes } = req.body;
  const userId = (req as any).user?.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: Number(quantity) } } // quantity is negative for loss
      });

      // Log stock adjustment
      await tx.stockLog.create({
        data: {
          productId,
          userId,
          type: 'ADJUSTMENT',
          changeQty: Number(quantity),
          previousStock: product.stock,
          currentStock: updatedProduct.stock,
          description: `Penyesuaian: [${reason}] ${notes || ''}`
        }
      });

      // Record financial loss if it's negative quantity and it's a loss reason
      if (Number(quantity) < 0 && (reason === 'DAMAGED' || reason === 'LOST' || reason === 'DEFECTIVE')) {
        const lossAmount = Math.abs(Number(quantity)) * (product.purchasePrice || 0);
        if (lossAmount > 0) {
          await tx.cashflow.create({
            data: {
              type: 'EXPENSE',
              category: 'Kerugian Barang',
              amount: lossAmount,
              description: `Barang ${reason}: ${product.name} (${Math.abs(Number(quantity))}x) - ${notes || ''}`,
              userId
            }
          });
        }
      }

      return updatedProduct;
    });

    res.json({ message: 'Stock adjusted successfully', product: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Stock adjustment failed' });
  }
});

// Get All Products (Inventory)
app.get('/api/products', authenticate, async (req, res) => {
  const { vehicleType } = req.query;
  try {
    const products = await prisma.product.findMany({
      where: {
        vehicleType: vehicleType ? (vehicleType as any) : undefined
      },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get Single Product
app.get('/api/products/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({ where: { id: s(id) } });
    res.json(product);
  } catch (error) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Add New Product
app.post('/api/products', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const data = req.body;
  try {
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (error) {
    console.error('Product Creation Error:', error);
    res.status(400).json({ error: 'Failed to create product. Barcode must be unique.' });
  }
});

app.patch('/api/products/:id', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const userId = (req as any).user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productId = id as string;
      const oldProduct = await tx.product.findUnique({ where: { id: productId } });
      if (!oldProduct) throw new Error('Product not found');

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data
      });

      // If stock changed, create a log
      if (data.stock !== undefined && Number(data.stock) !== oldProduct.stock) {
        // Verify user exists for log safety
        const logUser = await tx.user.findUnique({ where: { id: (req as any).user.id } });

        await tx.stockLog.create({
          data: {
            productId: productId,
            userId: logUser ? logUser.id : null,
            type: Number(data.stock) > oldProduct.stock ? 'RESTOCK' : 'ADJUSTMENT',
            changeQty: Math.round(Number(data.stock) - oldProduct.stock),
            previousStock: Math.round(oldProduct.stock),
            currentStock: Math.round(Number(data.stock))
          }
        });
      }

      return updatedProduct;
    });

    io.emit('product-updated', result);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Update failed' });
  }
});

// Delete Product
app.delete('/api/products/:id', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const { id } = req.params;
  try {
    const productId = id as string;
    await prisma.$transaction([
      prisma.stockLog.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } })
    ]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product Deletion Error:', error);
    res.status(400).json({ error: 'Gagal menghapus. Pastikan barang tidak memiliki riwayat penjualan di nota.' });
  }
});

// --- CUSTOMER & VEHICLE MANAGEMENT ---

// Get All Customers (Mitra/Grosir) with transaction stats
app.get('/api/customers', authenticate, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { transactions: true } },
        transactions: {
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const result = customers.map(c => {
      const totalSpend = c.transactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const lastVisit = c.transactions[0]?.createdAt || null;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        phone: c.phone,
        whatsapp: c.whatsapp,
        email: c.email,
        address: c.address,
        creditLimit: c.creditLimit,
        currentDebt: c.currentDebt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        plateNumber: c.plateNumber,
        totalTransactions: c._count.transactions,
        totalSpend,
        lastVisit
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get Specific Customer History
app.get('/api/customers/:id/transactions', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const transactions = await prisma.transaction.findMany({
      where: { customerId: s(id) },
      include: {
        items: true,
        vehicle: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});


// Add New Customer
app.post('/api/customers', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const { plateNumber, ...data } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the customer
      const customer = await tx.customer.create({
        data: {
          ...data,
          plateNumber: plateNumber ? plateNumber.toUpperCase() : undefined
        }
      });

      // 2. If plateNumber is provided, create a vehicle and link to this customer (by name/phone)
      if (plateNumber) {
        await tx.vehicle.upsert({
          where: { plateNumber: plateNumber.toUpperCase() },
          update: {
            owner: customer.name,
            phone: customer.phone,
            model: 'General Service' // Default model
          },
          create: {
            plateNumber: plateNumber.toUpperCase(),
            owner: customer.name,
            phone: customer.phone,
            model: 'General Service',
            vehicleType: 'MOTOR'
          }
        });
      }

      return customer;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Customer Creation Error:', error);
    res.status(400).json({ error: error.message || 'Failed to create customer' });
  }
});

// Update Customer
app.patch('/api/customers/:id', authenticate, authorize(['ADMIN', 'CASHIER']), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.customer.update({
      where: { id: s(id) },
      data
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: 'Gagal memperbarui data pelanggan' });
  }
});

// Delete Customer (Soft Delete)
app.delete('/api/customers/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    // We check if customer has transactions
    const txCount = await prisma.transaction.count({ where: { customerId: s(id) } });

    if (txCount > 0) {
      // If has transactions, only soft delete
      await prisma.customer.update({
        where: { id: s(id) },
        data: { isActive: false }
      });
      res.json({ message: 'Pelanggan dinonaktifkan (Soft Delete) karena memiliki riwayat transaksi.' });
    } else {
      // If no transactions, we can physically delete
      await prisma.customer.delete({ where: { id: s(id) } });
      res.json({ message: 'Pelanggan berhasil dihapus permanen.' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Gagal menghapus pelanggan.' });
  }
});

// Pay Customer Debt
app.post('/api/customers/:id/pay-debt', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount, paymentType, notes } = req.body;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const customer = await tx.customer.findUnique({ where: { id } });
      if (!customer) throw new Error('Pelanggan tidak ditemukan');
      if (amount <= 0) throw new Error('Jumlah pelunasan harus lebih dari 0');

      const newDebt = Math.max(0, customer.currentDebt - amount);
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: { currentDebt: newDebt }
      });

      await tx.cashflow.create({
        data: {
          type: 'INCOME',
          category: 'Pelunasan Piutang',
          amount: amount,
          description: `Pelunasan Piutang - ${customer.name} (${paymentType}) ${notes ? '- ' + notes : ''}`,
          userId: (req as any).user?.id || null
        }
      });

      return updatedCustomer;
    });

    res.json({ message: 'Piutang berhasil dilunasi', customer: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Gagal melunasi piutang' });
  }
});

// Search Vehicle by Plate Number (for POS Autofill)
app.get('/api/vehicles/search', authenticate, async (req, res) => {
  const { q } = req.query;
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        plateNumber: { contains: String(q), mode: 'insensitive' }
      },
      take: 5
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- POS ENGINE (The Heavy Lifter) ---

// Process Checkout
app.post('/api/pos/checkout', authenticate, async (req, res) => {
  const {
    cart,
    plateNumber,
    customerId,
    totalAmount,
    tax,
    discount,
    paymentType,
    notes,
    workOrderId  // Optional: link to work order for auto-archive
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Handle Vehicle (find or create)
      let vehicleId = null;
      if (plateNumber) {
        // Try to get info from WorkOrder if available
        let workOrderInfo: any = null;
        if (workOrderId) {
          workOrderInfo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
        }

        const vehicle = await tx.vehicle.upsert({
          where: { plateNumber },
          update: {
            // Update model/owner/type if currently "Unknown"
            model: workOrderInfo?.model || undefined,
            owner: workOrderInfo?.customerName || undefined,
            vehicleType: workOrderInfo?.vehicleType || undefined
          },
          create: {
            plateNumber,
            model: workOrderInfo?.model || 'Unknown',
            owner: workOrderInfo?.customerName || 'Customer',
            vehicleType: workOrderInfo?.vehicleType || 'MOTOR'
          }
        });
        vehicleId = vehicle.id;
      }

      // 2. Create Transaction Header
      const invoiceNo = `INV-${new Date().getTime()}`;
      
      // Check if this ID already exists (Sync protection)
      if (req.body.id) {
        const existing = await tx.transaction.findUnique({ 
          where: { id: req.body.id },
          include: { items: true }
        });
        if (existing) return existing;
      }

      const transaction = await tx.transaction.create({
        data: {
          id: req.body.id || undefined, // Use provided UUID from frontend
          invoiceNo,
          vehicleId,
          customerId,
          totalAmount,
          tax,
          discount,
          paymentType,
          notes,
          status: 'COMPLETED'
        }
      });

      // 3. Process Cart Items
      for (const item of cart) {
        // Use mechanicId from cart item if provided, otherwise fallback to WorkOrder mechanic
        let itemMechanicId = item.mechanicId || null;

        if (!itemMechanicId && workOrderId) {
          const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
          itemMechanicId = wo?.mechanicId;
        }

        // If it's a Part, fetch purchasePrice, update stock and log it
        let purchasePrice = 0;
        if (item.type === 'part' || item.type === 'PART') {
          const product = await tx.product.findUnique({ where: { id: item.id } });
          if (!product) {
            throw new Error(`Produk dengan ID ${item.id} tidak ditemukan.`);
          }
          if (product.stock < item.quantity) {
            throw new Error(`Stok tidak cukup untuk ${item.name}. Tersisa: ${product.stock}`);
          }
          purchasePrice = product.purchasePrice || 0;

          const updatedProduct = await tx.product.update({
            where: { id: item.id },
            data: { stock: { decrement: item.quantity } }
          });

          io.emit('product-updated', updatedProduct);

          // Verify if user exists to prevent foreign key violation with stale sessions
          const logUser = await tx.user.findUnique({ where: { id: (req as any).user.id } });

          await tx.stockLog.create({
            data: {
              productId: item.id,
              type: item.isMechanicFault ? 'ADJUSTMENT' : 'SALE',
              changeQty: -item.quantity,
              previousStock: product.stock,
              currentStock: updatedProduct.stock,
              reference: item.isMechanicFault ? `MECHANIC FAULT - ${invoiceNo}` : invoiceNo,
              userId: logUser ? logUser.id : null
            }
          });

          // Jika barang rusak oleh mekanik, catat kerugian finansialnya
          if (item.isMechanicFault) {
            const lossAmount = item.quantity * purchasePrice;
            if (lossAmount > 0) {
              await tx.cashflow.create({
                data: {
                  type: 'EXPENSE',
                  category: 'Kerugian Barang',
                  amount: lossAmount,
                  description: `Barang Rusak (Mekanik Fault): ${item.name} (${item.quantity}x) - ${invoiceNo}`,
                  userId: (req as any).user?.id || null
                }
              });
            }
          }
        }

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            type: (item.type === 'part' || item.type === 'PART') ? 'PART' : 'SERVICE',
            itemId: item.id,
            name: item.name,
            price: item.price,
            purchasePrice,
            quantity: item.quantity,
            mechanicId: itemMechanicId || undefined
          }
        });
      }

      // 4. Record to Cashflow (Hanya jika bukan hutang)
      if (paymentType !== 'HUTANG') {
        await tx.cashflow.create({
          data: {
            type: 'INCOME',
            category: 'Sales',
            amount: totalAmount,
            description: `Penjualan Kasir (${paymentType}) - ${invoiceNo}`,
            referenceId: transaction.id,
            userId: (req as any).user?.id || null
          }
        });
      }

      // 5. Update Piutang Pelanggan jika HUTANG
      if (paymentType === 'HUTANG') {
        if (!customerId) throw new Error('Pelanggan harus dipilih untuk kasbon/hutang.');
        await tx.customer.update({
          where: { id: customerId },
          data: { currentDebt: { increment: totalAmount } }
        });
      }

      // 6. Auto-archive Work Order if linked
      if (workOrderId) {
        await tx.workOrder.update({
          where: { id: workOrderId },
          data: {
            status: 'ARCHIVED',
            transactionId: transaction.id
          }
        });
      } else if (plateNumber) {
        // Find the latest DONE work order for this plate and link it
        const latestWO = await tx.workOrder.findFirst({
          where: { plateNumber: plateNumber.toUpperCase(), status: 'DONE' },
          orderBy: { updatedAt: 'desc' }
        });

        if (latestWO) {
          await tx.workOrder.update({
            where: { id: latestWO.id },
            data: {
              status: 'ARCHIVED',
              transactionId: transaction.id
            }
          });
        }
      }

      // Send WhatsApp Notification if customer has number
      if (customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        const waNumber = customer?.whatsapp || customer?.phone;
        if (waNumber) {
          const message = `Halo ${customer?.name},\n\nTerima kasih telah mempercayakan kendaraan Anda pada *Jakarta Motor*.\n\n*Detail Transaksi:*\nNo. Invoice: ${invoiceNo}\nTotal: Rp ${totalAmount.toLocaleString('id-ID')}\n\nSampai jumpa di servis berikutnya! 🙏`;
          WhatsAppService.sendMessage(waNumber, message).catch(err =>
            console.error('Failed to send WA notification:', err)
          );
        }
      }

      return transaction;
    });

    res.json({ message: 'Checkout successful', transaction: result });
  } catch (error: any) {
    console.error('CHECKOUT ERROR:', error);
    res.status(400).json({ error: error.message || 'Checkout failed' });
  }
});

// Process Total Return (Full)
app.post('/api/pos/return/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const { reason } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: s(id) },
        include: { items: true }
      });

      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status === 'RETURNED') throw new Error('Transaction already returned');

      // 1. Restore Stock for all PART items
      for (const item of (transaction as any).items) {
        // Calculate remaining qty to return (total - already returned)
        const qtyToReturn = item.quantity - item.returnedQty;
        if (qtyToReturn <= 0) continue;

        if (item.type === 'PART') {
          const product = await tx.product.findUnique({ where: { id: item.itemId } });
          if (product) {
            const updatedProduct = await tx.product.update({
              where: { id: item.itemId },
              data: { stock: { increment: qtyToReturn } }
            });

            await tx.stockLog.create({
              data: {
                productId: item.itemId,
                type: 'RETURN',
                changeQty: qtyToReturn,
                previousStock: product.stock,
                currentStock: updatedProduct.stock,
                description: `Retur Seluruh: ${transaction.invoiceNo}${reason ? ' [' + reason + ']' : ''}`,
                userId: (req as any).user?.id || null
              }
            });
          }
        }

        // Update item returnedQty
        await tx.transactionItem.update({
          where: { id: item.id },
          data: { returnedQty: item.quantity }
        });
      }

      // 2. Update Transaction Status
      await tx.transaction.update({
        where: { id: s(id) },
        data: { status: 'RETURNED' }
      });

      // 3. Record Refund to Cashflow
      await tx.cashflow.create({
        data: {
          type: 'EXPENSE',
          category: 'Refund',
          amount: transaction.totalAmount,
          description: `Refund Total Penjualan - ${transaction.invoiceNo}`,
          userId: (req as any).user?.id || null
        }
      });

      return { refund: transaction.totalAmount };
    });

    res.json({ message: 'Return processed successfully', result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Return failed' });
  }
});

// Process Partial Return
app.post('/api/pos/return-partial', authenticate, async (req, res) => {
  const { transactionId, itemsToReturn, reason } = req.body; // itemsToReturn: [{ id: transactionItemId, qty: number }]

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify user exists (prevent stale session FK violations)
      const logUser = await tx.user.findUnique({ where: { id: (req as any).user?.id } });
      const safeUserId = logUser ? logUser.id : null;

      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { items: true }
      });

      if (!transaction) throw new Error('Transaksi tidak ditemukan.');

      let totalRefund = 0;

      for (const ret of itemsToReturn) {
        const item = transaction.items.find(i => i.id === ret.id);
        if (!item) continue;

        // Validation: cannot return more than remaining qty
        const remainingQty = item.quantity - item.returnedQty;
        if (ret.qty > remainingQty) {
          throw new Error(`Item ${item.name} hanya bisa diretur maksimal ${remainingQty}.`);
        }

        // 1. Restore Stock if Part
        if (item.type === 'PART') {
          const product = await tx.product.findUnique({ where: { id: item.itemId } });
          if (product) {
            const updatedProduct = await tx.product.update({
              where: { id: item.itemId },
              data: { stock: { increment: ret.qty } }
            });

            await tx.stockLog.create({
              data: {
                productId: item.itemId,
                type: 'RETURN',
                changeQty: ret.qty,
                previousStock: product.stock,
                currentStock: updatedProduct.stock,
                description: `Retur Sebagian: ${transaction.invoiceNo}${reason ? ' [' + reason + ']' : ''}`,
                userId: safeUserId
              }
            });
          }
        }

        // 2. Update TransactionItem returnedQty
        await tx.transactionItem.update({
          where: { id: item.id },
          data: { returnedQty: { increment: ret.qty } }
        });

        totalRefund += item.price * ret.qty;
      }

      // Check if this makes the whole transaction returned
      const updatedItems = await tx.transactionItem.findMany({ where: { transactionId } });
      const isAllReturned = updatedItems.every(i => i.returnedQty >= i.quantity);

      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: isAllReturned ? 'RETURNED' : 'PARTIAL_RETURNED' }
      });

      // 3. Record Refund to Cashflow
      await tx.cashflow.create({
        data: {
          type: 'EXPENSE',
          category: 'Refund',
          amount: totalRefund,
          description: `Refund Parsial ${itemsToReturn.length} Item - ${transaction.invoiceNo}`,
          userId: safeUserId
        }
      });

      return { totalRefund };
    });

    res.json({ message: 'Retur parsial berhasil', result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Gagal memproses retur parsial.' });
  }
});

// --- FINANCIAL & REPORTS ---

// Get Cashflow History with Filters
app.get('/api/finance', authenticate, async (req, res) => {
  const { startDate, endDate, type } = req.query;
  try {
    const cashflow = await prisma.cashflow.findMany({
      where: {
        type: type ? String(type) : undefined,
        date: {
          gte: startDate ? new Date(String(startDate)) : undefined,
          lte: endDate ? new Date(String(endDate)) : undefined
        }
      },
      include: {
        user: { select: { name: true } } // Include user name for 'Dicatat Oleh' display
      },
      orderBy: { date: 'desc' }
    });
    // Map to include loggedBy field for frontend compatibility
    const result = cashflow.map((c: any) => ({
      ...c,
      loggedBy: c.user?.name || 'System'
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch finance logs' });
  }
});


// Manual Income/Expense
app.post('/api/finance', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { type, category, amount, description, date } = req.body;
  try {
    const logUser = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
    const entry = await prisma.cashflow.create({
      data: {
        type,
        category,
        amount,
        description,
        date: date ? new Date(date) : new Date(),
        userId: logUser ? logUser.id : null
      }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Failed to record entry' });
  }
});

// Report: Profit & Loss Summary
app.get('/api/reports/profit-loss', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const income = await prisma.cashflow.aggregate({
      where: { type: 'INCOME' },
      _sum: { amount: true }
    });
    const expense = await prisma.cashflow.aggregate({
      where: { type: 'EXPENSE' },
      _sum: { amount: true }
    });

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;

    res.json({
      revenue: totalIncome,
      expenses: totalExpense,
      netProfit: totalIncome - totalExpense
    });
  } catch (error) {
    res.status(500).json({ error: 'Report generation failed' });
  }
});

// Report: Low Stock Alerts
app.get('/api/reports/low-stock', authenticate, async (req, res) => {
  try {
    const lowStockItems = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.minStock }
      }
    });
    res.json(lowStockItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
});

// --- TRANSACTIONS ---

// --- VEHICLES ---

// Get All Vehicles with basic stats
app.get('/api/vehicles', authenticate, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        _count: {
          select: { transactions: true }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      },
      orderBy: { plateNumber: 'asc' }
    });

    const formatted = vehicles.map(v => ({
      id: v.id,
      plateNumber: v.plateNumber,
      model: v.model,
      owner: v.owner,
      phone: v.phone,
      totalVisits: v._count.transactions,
      lastService: v.transactions[0]?.createdAt || null
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get Vehicle Detail & Full History
app.get('/api/vehicles/:id/history', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: s(id) },
      include: {
        transactions: {
          include: {
            items: true,
            workOrder: {
              include: { mechanic: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicle history' });
  }
});

app.get('/api/transactions', authenticate, async (req, res) => {
  const { startDate, endDate, paymentType, status } = req.query;

  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (paymentType) where.paymentType = String(paymentType);
  if (status) where.status = String(status);

  try {
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
        vehicle: true,
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// --- WORKSHOP / WORK ORDER ROUTES ---

// Get All Work Orders
app.get('/api/workshop/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.workOrder.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create New Work Order
app.post('/api/workshop/tasks', authenticate, async (req, res) => {
  const { plateNumber, customerName, complaint, services } = req.body;
  try {
    const task = await prisma.workOrder.create({
      data: {
        plateNumber,
        customerName,
        complaint,
        services: services || [],
        status: 'QUEUED'
      }
    });
    io.emit('task-created', task);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create task' });
  }
});

// Update Work Order (Status/Mechanic/Items)
app.patch('/api/workshop/tasks/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const task = await prisma.workOrder.update({
      where: { id: id as string },
      data
    });
    io.emit('task-updated', task);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

// Smart Workshop Search (For POS Option B Integration)
// Returns DONE work order with service details (including prices) or fallback to vehicle/customer info
app.get('/api/workshop/search/:plate', authenticate, async (req, res) => {
  const { plate } = req.params;
  try {
    // 1. First, check for a DONE work order (Option B)
    const task = await prisma.workOrder.findFirst({
      where: {
        plateNumber: (plate as string).toUpperCase(),
        status: 'DONE'
      },
      include: {
        mechanic: { select: { id: true, name: true } },
        vehicle: true
      }
    });

    if (task) {
      // Enrich services with price data from Service table
      const serviceDetails = await Promise.all(
        (Array.isArray(task.services) ? task.services : []).map(async (svcItem: any) => {
          const isObject = typeof svcItem === 'object' && svcItem !== null;
          const svcName = isObject ? svcItem.name : svcItem;
          const manualPrice = isObject ? svcItem.price : null;

          const svc = await prisma.service.findFirst({ where: { name: svcName } });
          return {
            id: svc?.id || `temp-${svcName}`,
            name: svcName,
            price: manualPrice ?? (svc?.price || 0),
            estimatedTime: svc?.estimatedTime || '-'
          };
        })
      );
      return res.json({ ...task, serviceDetails, mode: 'WORKSHOP' });
    }

    // 2. Fallback: If no DONE work order, check for Vehicle record (Option A)
    const vehicle = await prisma.vehicle.findUnique({
      where: { plateNumber: (plate as string).toUpperCase() }
    });

    if (vehicle) {
      return res.json({
        id: null,
        plateNumber: vehicle.plateNumber,
        customerName: vehicle.owner,
        model: vehicle.model,
        mode: 'VEHICLE',
        serviceDetails: [],
        vehicle: vehicle
      });
    }

    // 3. Not found anywhere
    res.status(404).json({ error: 'Data kendaraan tidak ditemukan.' });
  } catch (error) {
    console.error('SEARCH ERROR:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- WORK ORDER / WORKSHOP CONTROL ---

// Get All Work Orders
app.get('/api/work-orders', authenticate, async (req, res) => {
  const { status } = req.query;
  try {
    const orders = await prisma.workOrder.findMany({
      where: (status ? { status: status as any } : { status: { not: 'ARCHIVED' } }) as any,
      include: {
        mechanic: { select: { name: true } },
        vehicle: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// Create Work Order (Daftarkan Unit)
app.post('/api/work-orders', authenticate, async (req, res) => {
  const { plateNumber, customerName, model, vehicleType, complaint, mechanicId, services } = req.body;
  const creatorId = (req as any).user.id;

  try {
    // 1. Cari atau buat kendaraan
    let vehicle = await prisma.vehicle.findUnique({ where: { plateNumber } });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: { plateNumber, model, owner: customerName, vehicleType: vehicleType || 'MOTOR' }
      });
    }

    // 2. Buat Work Order
    const workOrder = await prisma.workOrder.create({
      data: {
        vehicleId: vehicle.id,
        plateNumber,
        customerName,
        model,
        vehicleType: vehicleType || 'MOTOR',
        complaint,
        services: services || [],
        mechanicId: mechanicId || null,
        creatorId,
        status: 'QUEUED'
      }
    });

    res.status(201).json(workOrder);
  } catch (error) {
    res.status(400).json({ error: 'Failed to register unit' });
  }
});

// Update Work Order Status/Mechanic
// Update status only
app.patch('/api/workshop/orders/:id/status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const existingOrder = await prisma.workOrder.findUnique({ where: { id: id as string } });
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

    let updateData: any = { status };

    // Set startTime when moving to PROGRESS
    if (status === 'PROGRESS' && !existingOrder.startTime) {
      updateData.startTime = new Date();
    }

    // Set endTime when moving to TESTING or COMPLETED
    if ((status === 'TESTING' || status === 'COMPLETED') && !existingOrder.endTime) {
      updateData.endTime = new Date();
    }

    const order = await prisma.workOrder.update({
      where: { id: id as string },
      data: updateData
    });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: 'Update status failed' });
  }
});

// Upload Service Photo
app.post('/api/workshop/orders/:id/photos', authenticate, uploadService.single('photo'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  try {
    const photoPath = `/uploads/services/${req.file.filename}`;
    const order = await prisma.workOrder.findUnique({ where: { id: id as string } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const currentPhotos = (order.photos as string[]) || [];
    const updatedPhotos = [...currentPhotos, photoPath];

    const updatedOrder = await prisma.workOrder.update({
      where: { id: id as string },
      data: { photos: updatedPhotos }
    });

    res.json({ message: 'Photo uploaded', path: photoPath, order: updatedOrder });
  } catch (error) {
    console.error('Upload photo failed:', error);
    res.status(500).json({ error: 'Failed to save photo' });
  }
});

app.patch('/api/work-orders/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status, mechanicId, services, partsUsed } = req.body;

  try {
    const existing = await prisma.workOrder.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    let updateData: any = { status, mechanicId, services, partsUsed };

    if (status === 'PROGRESS' && !existing.startTime) {
      updateData.startTime = new Date();
    }
    if ((status === 'DONE' || status === 'COMPLETED' || status === 'TESTING') && !existing.endTime) {
      updateData.endTime = new Date();
    }

    const updated = await prisma.workOrder.update({
      where: { id: id as string },
      data: updateData
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update work order' });
  }
});

// Delete Single Work Order
app.delete('/api/work-orders/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.workOrder.delete({ where: { id: id as string } });
    res.json({ message: 'Work order deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete work order' });
  }
});

// Bulk Clear All DONE Work Orders (Clean dashboard)
app.delete('/api/work-orders', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const result = await prisma.workOrder.deleteMany({
      where: { status: { in: ['DONE', 'ARCHIVED'] } }
    });
    res.json({ message: `${result.count} data berhasil dihapus` });
  } catch (error) {
    res.status(400).json({ error: 'Failed to clear work orders' });
  }
});

// --- SERVICES MANAGEMENT ---

// Get All Services
app.get('/api/services', authenticate, async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create Service
app.post('/api/services', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { name, price, estimatedTime } = req.body;
  try {
    const service = await prisma.service.create({
      data: { name, price: Number(price), estimatedTime: estimatedTime || '30m' }
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create service' });
  }
});

// Update Service
app.patch('/api/services/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, price, estimatedTime } = req.body;
  try {
    const updated = await prisma.service.update({
      where: { id: id as string },
      data: {
        name,
        price: price ? Number(price) : undefined,
        estimatedTime
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update service' });
  }
});

app.get('/api/work-orders/history/:plate', authenticate, async (req, res) => {
  const { plate } = req.params;
  try {
    const history = await prisma.workOrder.findMany({
      where: { plateNumber: (plate as string).toUpperCase() },
      orderBy: { createdAt: 'desc' },
      include: { mechanic: true }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work order history' });
  }
});

app.patch('/api/work-orders/complete/:plate', authenticate, async (req, res) => {
  const { plate } = req.params;
  try {
    await prisma.workOrder.updateMany({
      where: {
        plateNumber: (plate as string).toUpperCase(),
        status: 'DONE'
      },
      data: { status: 'ARCHIVED' }
    });
    res.json({ message: 'Work order archived' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to archive work order' });
  }
});

// Delete Service
app.delete('/api/services/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.service.delete({ where: { id: s(id) } });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete service' });
  }
});

// --- SUPPLIER MANAGEMENT ---

// Get All Suppliers
app.get('/api/suppliers', authenticate, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Add New Supplier
app.post('/api/suppliers', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const supplier = await prisma.supplier.create({
      data: { name, phone, address }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create supplier' });
  }
});

// --- SUPPLIER PURCHASES (RESTOCK) ---

// Get All Purchases
app.get('/api/suppliers/purchases', authenticate, async (req, res) => {
  try {
    const purchases = await prisma.supplierPurchase.findMany({
      include: {
        supplier: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, barcode: true } } }
        }
      },
      orderBy: { purchaseDate: 'desc' }
    });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Record New Purchase
app.post('/api/suppliers/purchases', authenticate, authorize(['ADMIN']), uploadInvoice.single('invoice'), async (req: any, res: any) => {
  // If it's multipart/form-data, the body fields will be strings and need parsing
  const body = req.file ? JSON.parse(req.body.data) : req.body;
  const { supplierId, invoiceNo, purchaseDate, dueDate, items, status, notes } = body;
  const invoiceImage = req.file ? req.file.path.replace(/\\/g, '/') : null;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array' });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Verify user exists for log safety (prevent stale session FK violations)
      const logUser = await tx.user.findUnique({ where: { id: (req as any).user.id } });
      const safeUserId = logUser ? logUser.id : null;

      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.purchasePrice * item.quantity), 0);

      // 1. Create Purchase record
      const purchase = await tx.supplierPurchase.create({
        data: {
          supplierId,
          invoiceNo,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          totalAmount,
          status: status || 'LUNAS',
          notes,
          invoiceImage,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice
            }))
          }
        },
        include: { items: true }
      });

      // 2. Update Stocks and Create Logs
      for (const item of items) {
        const currentProduct = await tx.product.findUnique({ where: { id: item.productId } });
        if (!currentProduct) throw new Error(`Product with ID ${item.productId} not found`);

        // Hitung HPP Rata-rata (Moving Average)
        const oldStock = Math.max(0, currentProduct.stock);
        const newStock = item.quantity;
        const oldTotalValue = oldStock * currentProduct.purchasePrice;
        const newTotalValue = newStock * item.purchasePrice;

        let newAveragePrice = currentProduct.purchasePrice;
        if (oldStock + newStock > 0) {
          newAveragePrice = (oldTotalValue + newTotalValue) / (oldStock + newStock);
        }

        const product = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            purchasePrice: Math.round(newAveragePrice) // Update dengan harga rata-rata
          }
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: 'RESTOCK',
            changeQty: item.quantity,
            previousStock: currentProduct.stock,
            currentStock: product.stock,
            reference: invoiceNo,
            userId: safeUserId
          }
        });
      }

      // 3. Record to Cashflow if LUNAS
      if (status === 'LUNAS') {
        await tx.cashflow.create({
          data: {
            type: 'EXPENSE',
            category: 'Pembelian Barang',
            amount: totalAmount,
            description: `Pembelian dari Supplier - ${invoiceNo}`,
            purchaseId: purchase.id,
            userId: safeUserId,
            date: purchaseDate ? new Date(purchaseDate) : new Date()
          }
        });
      }

      return purchase;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('PURCHASE ERROR:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: `Nomor nota "${invoiceNo}" sudah pernah diinput sebelumnya. Silakan gunakan nomor lain atau cek riwayat pembelian.` });
    }
    res.status(400).json({ error: error.message || 'Failed to record purchase' });
  }
});

// Pay Supplier Debt (Lunasin Hutang)
app.post('/api/suppliers/purchases/:id/pay', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const purchase = await tx.supplierPurchase.findUnique({ where: { id } });
      if (!purchase) throw new Error('Nota tidak ditemukan');
      if (purchase.status === 'LUNAS') throw new Error('Nota sudah lunas');

      // 1. Update Purchase Status
      const updated = await tx.supplierPurchase.update({
        where: { id },
        data: {
          status: 'LUNAS',
          notes: purchase.notes ? `${purchase.notes}\n(LUNAS - Pembayaran dicatat di Pengeluaran)` : '(LUNAS - Pembayaran dicatat di Pengeluaran)'
        }
      });

      // 2. Record to Cashflow as EXPENSE
      await tx.cashflow.create({
        data: {
          type: 'EXPENSE',
          category: 'Pembayaran Hutang Supplier',
          amount: purchase.totalAmount,
          description: `Pelunasan Hutang Supplier - ${purchase.invoiceNo}`,
          purchaseId: purchase.id,
          userId: userId || null,
          date: new Date() // Tanggal pembayaran adalah hari ini
        }
      });

      return updated;
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Payment failed' });
  }
});

// Process Supplier Return (Retur Pembelian)
app.post('/api/suppliers/purchases/:id/return', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { itemsToReturn } = req.body; // [{ purchaseItemId: string, qty: number }]
  const userId = (req as any).user?.id;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const purchase = await tx.supplierPurchase.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!purchase) throw new Error('Nota pembelian tidak ditemukan.');

      let totalRefundValue = 0;

      for (const ret of itemsToReturn) {
        if (!ret.qty || ret.qty <= 0) continue;

        const item = purchase.items.find((i: any) => i.id === ret.purchaseItemId);
        if (!item) continue;

        const availableToReturn = item.quantity - (item.returnedQty || 0);
        if (ret.qty > availableToReturn) {
          throw new Error(`Kuantitas retur melebihi yang bisa dikembalikan untuk barang ID ${item.productId}`);
        }

        // 1. Kurangi stok produk (karena dikembalikan ke supplier)
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: ret.qty } }
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              userId,
              type: 'ADJUSTMENT',
              changeQty: -ret.qty,
              previousStock: product.stock,
              currentStock: updatedProduct.stock,
              reference: `RET-SUPPLIER ${purchase.invoiceNo} ${ret.reason ? '- ' + ret.reason : ''}`.trim()
            }
          });
        }

        // 2. Update returnedQty pada PurchaseItem
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { returnedQty: { increment: ret.qty } }
        });

        totalRefundValue += (ret.qty * item.purchasePrice);
      }

      if (totalRefundValue > 0) {
        // 3. Update Status Keuangan Pembelian
        if (purchase.status === 'HUTANG') {
          // Kurangi nilai hutang di nota pembelian
          const newTotal = purchase.totalAmount - totalRefundValue;
          await tx.supplierPurchase.update({
            where: { id },
            data: {
              totalAmount: Math.max(0, newTotal),
              status: newTotal <= 0 ? 'LUNAS' : 'HUTANG'
            }
          });
        } else if (purchase.status === 'LUNAS') {
          // Jika sudah lunas, supplier mengembalikan uang tunai
          await tx.cashflow.create({
            data: {
              type: 'INCOME',
              category: 'Refund Pembelian',
              amount: totalRefundValue,
              description: `Retur Pembelian (Uang Kembali) - ${purchase.invoiceNo}`,
              userId
            }
          });
        }
      }

      return { refundedAmount: totalRefundValue };
    });

    res.json({ message: 'Retur pembelian berhasil diproses', result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Gagal memproses retur' });
  }
});

const DEFAULT_SETTINGS: Record<string, string[]> = {
  categories: ['Oli', 'Ban', 'Aki', 'Busi', 'Rem', 'Kampas', 'Filter', 'Body', 'Aksesori', 'Lainnya'],
  etalase: ['Rak A1', 'Rak A2', 'Rak B1', 'Rak B2', 'Rak C1', 'Gudang', 'Display Depan']
};

// Get a setting by key
app.get('/api/app-settings/:key', authenticate, async (req, res) => {
  const { key } = req.params;
  try {
    let setting = await prisma.appSetting.findUnique({ where: { key: key as string } });
    if (!setting) {
      // Return default if not yet saved to DB
      const defaultVal = DEFAULT_SETTINGS[key as string] || [];
      return res.json({ key, items: defaultVal });
    }
    res.json({ key, items: JSON.parse(setting.value) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Save (upsert) a setting by key
app.put('/api/app-settings/:key', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { key } = req.params;
  const { items } = req.body; // array of strings
  try {
    const setting = await prisma.appSetting.upsert({
      where: { key: key as string },
      update: { value: JSON.stringify(items) },
      create: { key: key as string, value: JSON.stringify(items) }
    });
    res.json({ key, items: JSON.parse(setting.value) });
  } catch (error) {
    res.status(400).json({ error: 'Failed to save setting' });
  }
});

// --- DASHBOARD SUMMARY ---

app.get('/api/dashboard/summary', authenticate, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Revenue Today
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: 'COMPLETED'
      }
    });
    const revenueToday = todayTransactions.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // 2. Active Services (QUEUED or PROGRESS)
    const activeServicesCount = await prisma.workOrder.count({
      where: {
        status: { in: ['QUEUED', 'PROGRESS'] }
      }
    });

    // 3. Low Stock Items
    const products = await prisma.product.findMany();
    const lowStockItems = products.filter(p => p.stock <= p.minStock);
    const lowStockCount = lowStockItems.length;

    // 4. Mechanic Status
    const totalMechanics = await prisma.user.count({ where: { role: 'MECHANIC' } });

    // 5. Unpaid Supplier Purchases (Due Soon)
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

    // 6. Recent Work Orders (Last 5)
    const recentTasks = await prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        mechanic: { select: { name: true } }
      }
    });

    res.json({
      stats: [
        { label: 'Pendapatan Hari Ini', value: `Rp ${revenueToday.toLocaleString('id-ID')}`, trend: '+100%', icon: 'TrendingUp', color: 'text-green-500' },
        { label: 'Layanan Aktif', value: activeServicesCount.toString(), trend: 'Real-time', icon: 'Wrench', color: 'text-blue-500' },
        { label: 'Stok Suku Cadang Rendah', value: `${lowStockCount} Item`, trend: 'Peringatan', icon: 'Package', color: 'text-orange-500' },
        { label: 'Total Mekanik', value: totalMechanics.toString(), trend: 'Aktif', icon: 'Users', color: 'text-purple-500' },
      ],
      lowStockList: lowStockItems.slice(0, 5),
      duePurchases: duePurchases.map(p => ({
        id: p.id,
        invoiceNo: p.invoiceNo,
        supplier: p.supplier.name,
        amount: p.totalAmount,
        dueDate: p.dueDate
      })),
      recentTasks: recentTasks.map(t => ({
        plate: t.plateNumber,
        vehicle: t.model || 'Unknown',
        service: (Array.isArray(t.services) && t.services.length > 0) ? (t.services[0] as string) : 'Servis Umum',
        mechanic: t.mechanic?.name || '-',
        status: t.status === 'QUEUED' ? 'Antrian' : t.status === 'PROGRESS' ? 'Berjalan' : 'Selesai'
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// --- FINANCIAL REPORTS ENGINE ---

// 1. P&L Statement & Financial Summary
app.get('/api/reports/financial', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(String(startDate)) : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate ? new Date(String(endDate)) : new Date();
  // Ensure end date includes the full day
  end.setHours(23, 59, 59, 999);

  try {
    // Fetch Transactions with items in range
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED'
      },
      include: {
        items: true,
        vehicle: true
      }
    });

    // Fetch Expenses in range
    const expenses = await prisma.cashflow.findMany({
      where: {
        date: { gte: start, lte: end },
        type: 'EXPENSE'
      }
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    let partsRevenue = 0;
    let servicesRevenue = 0;

    let partsMotorRevenue = 0;
    let partsMobilRevenue = 0;
    let servicesMotorRevenue = 0;
    let servicesMobilRevenue = 0;

    transactions.forEach(t => {
      totalRevenue += t.totalAmount;
      const vehicleType = t.vehicle?.vehicleType || 'MOTOR'; // Default to MOTOR or could be UMUM

      t.items.forEach(item => {
        totalCOGS += (item.purchasePrice || 0) * item.quantity;
        const itemAmount = (item.price * item.quantity);

        if (item.type === 'PART') {
          partsRevenue += itemAmount;
          if (vehicleType === 'MOBIL') partsMobilRevenue += itemAmount;
          else partsMotorRevenue += itemAmount;
        } else {
          servicesRevenue += itemAmount;
          if (vehicleType === 'MOBIL') servicesMobilRevenue += itemAmount;
          else servicesMotorRevenue += itemAmount;
        }
      });
    });

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    // 4. Group by Day for Charts
    const dailyData: Record<string, { date: string, revenue: number, profit: number }> = {};
    const tempDate = new Date(start);
    while (tempDate <= end) {
      const d = tempDate.toISOString().split('T')[0];
      dailyData[d] = { date: d, revenue: 0, profit: 0 };
      tempDate.setDate(tempDate.getDate() + 1);
    }

    transactions.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      if (dailyData[day]) {
        dailyData[day].revenue += t.totalAmount;
        let dayCOGS = 0;
        t.items.forEach(i => dayCOGS += (i.purchasePrice || 0) * i.quantity);
        dailyData[day].profit += (t.totalAmount - dayCOGS);
      }
    });

    // 5. Product Performance (Top 5)
    const productStats: Record<string, { name: string, quantity: number, revenue: number, profit: number }> = {};
    const serviceStats: Record<string, { name: string, count: number, revenue: number }> = {};

    transactions.forEach(t => {
      t.items.forEach(item => {
        if (item.type === 'PART') {
          if (!productStats[item.itemId]) productStats[item.itemId] = { name: item.name, quantity: 0, revenue: 0, profit: 0 };
          productStats[item.itemId].quantity += item.quantity;
          productStats[item.itemId].revenue += item.price * item.quantity;
          productStats[item.itemId].profit += (item.price - (item.purchasePrice || 0)) * item.quantity;
        } else {
          if (!serviceStats[item.itemId]) serviceStats[item.itemId] = { name: item.name, count: 0, revenue: 0 };
          serviceStats[item.itemId].count += item.quantity;
          serviceStats[item.itemId].revenue += item.price * item.quantity;
        }
      });
    });

    const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const topServices = Object.values(serviceStats).sort((a, b) => b.count - a.count).slice(0, 5);

    // 6. Inventory Intelligence
    const allProducts = await prisma.product.findMany();
    const lowStockList = allProducts.filter(p => p.stock <= p.minStock).map(p => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      brand: p.brand,
      category: p.category
    }));
    const totalInventoryValue = allProducts.reduce((acc, curr) => acc + (curr.stock * curr.purchasePrice), 0);

    res.json({
      summary: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        partsRevenue,
        servicesRevenue,
        partsMotorRevenue,
        partsMobilRevenue,
        servicesMotorRevenue,
        servicesMobilRevenue,
        partsPercentage: totalRevenue > 0 ? (partsRevenue / totalRevenue) * 100 : 0,
        servicesPercentage: totalRevenue > 0 ? (servicesRevenue / totalRevenue) * 100 : 0,
        totalInventoryValue,
        lowStockCount: lowStockList.length
      },
      chartData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      topProducts,
      topServices,
      lowStockList,
      recentTransactions: transactions.slice(0, 10).map(t => ({
        id: t.id,
        invoiceNo: t.invoiceNo,
        date: t.createdAt,
        amount: t.totalAmount,
        method: t.paymentType
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

// 2. General Journal (Daily Audit Trail)
app.get('/api/reports/journal', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(String(startDate)) : new Date(new Date().setDate(new Date().getDate() - 7));
  const end = endDate ? new Date(String(endDate)) : new Date();
  end.setHours(23, 59, 59, 999);

  try {
    const transactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' }
    });

    const cashflows = await prisma.cashflow.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'desc' }
    });

    const journal = [
      ...transactions.map(t => ({
        id: t.id,
        date: t.createdAt,
        type: 'INCOME',
        category: 'PENJUALAN',
        reference: t.invoiceNo,
        description: `Checkout Transaksi ${t.invoiceNo}`,
        amount: t.totalAmount
      })),
      ...cashflows.map(c => ({
        id: c.id,
        date: c.date,
        type: c.type,
        category: c.category,
        reference: c.referenceId || '-',
        description: c.description || 'Pencatatan Manual',
        amount: c.amount
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// Get list of printers
app.get('/api/print/list', authenticate, async (req, res) => {
  try {
    // Improved PS script to be more robust
    const psScript = `Get-Printer | Select-Object Name, ShareName, Shared | ConvertTo-Json -Compress`;
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', psScript]);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error('PS List Printers Error:', errorOutput);
        return res.json([]);
      }
      try {
        if (!output.trim()) return res.json([]);
        const printers = JSON.parse(output);
        const list = Array.isArray(printers) ? printers : [printers];
        // Ensure each item has a Name property and include sharing info
        res.json(list.filter(p => p && p.Name).map(p => ({
          Name: p.Name,
          ShareName: p.ShareName,
          IsShared: p.Shared
        })));
      } catch (e) {
        console.error('Failed to parse printer JSON:', output);
        res.json([]);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list printers' });
  }
});

// Get Hardware Info
app.get('/api/system/hardware', authenticate, async (req, res) => {
  try {
    const info = await getHardwareInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hardware info' });
  }
});

// --- SILENT PRINTING ENGINE ---
app.post('/api/print/receipt', authenticate, async (req, res) => {
  const { transactionId } = req.body;
  let printerName = req.body.printerName;

  try {
    if (!printerName) {
      const printerSetting = await prisma.appSetting.findUnique({ where: { key: 'thermal_printer' } });
      if (printerSetting && printerSetting.value) {
        try {
          const parsed = JSON.parse(printerSetting.value);
          if (Array.isArray(parsed) && parsed.length > 0) printerName = parsed[0];
          else if (typeof parsed === 'string') printerName = parsed;
        } catch (e) {
          printerName = printerSetting.value;
        }
      }
    }
    printerName = printerName || "POS80";
    let transaction: any = null;

    if (String(transactionId).toLowerCase() === 'test') {
      // Create a dummy transaction for testing
      transaction = {
        invoiceNo: 'TEST-PRINTER',
        createdAt: new Date(),
        totalAmount: 1000,
        tax: 0,
        discount: 0,
        user: { name: 'ADMIN' },
        items: [{ name: 'TEST PRINT SUCCESS', quantity: 1, price: 1000 }]
      };
    } else {
      if (!transactionId) {
        return res.status(400).json({ error: 'ID Transaksi diperlukan' });
      }

      // Add a small delay to ensure DB transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        console.log('Printing for Transaction ID:', transactionId);
        transaction = await prisma.transaction.findUnique({
          where: { id: String(transactionId) },
          include: {
            items: {
              include: {
                mechanic: { select: { name: true } }
              }
            },
            customer: true,
            vehicle: true
          }
        });
      } catch (dbErr: any) {
        console.error('Prisma Lookup Error for ID:', transactionId, dbErr);
        return res.status(500).json({ error: `Database error saat mencari transaksi [${transactionId}]: ${dbErr.message}` });
      }
    }

    if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    // UPDATE REPRINT COUNT & LOG (If not a test)
    if (String(transactionId).toLowerCase() !== 'test') {
      try {
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transaction.id },
            data: { reprintCount: { increment: 1 } }
          }),
          prisma.reprintLog.create({
            data: {
              transactionId: transaction.id,
              userId: (req as any).user?.id || null,
              reason: req.body.reason || 'Cetak Ulang'
            }
          })
        ]);
        // Refresh local transaction object to get updated count
        transaction.reprintCount += 1;
      } catch (logErr) {
        console.error('Failed to log reprint:', logErr);
      }
    }

    // Fetch workshop profile
    let workshop = { name: 'JAKARTA MOTOR', address: '', phone: '', footer: 'Terima kasih atas kunjungan Anda' };
    const profileRes = await prisma.appSetting.findUnique({ where: { key: 'workshop_profile' } });
    if (profileRes) {
      try {
        const parsedValue = JSON.parse(profileRes.value);
        // The frontend saves it as an array of JSON strings
        const profileData = Array.isArray(parsedValue) ? JSON.parse(parsedValue[0]) : parsedValue;
        workshop = {
          name: profileData.name || workshop.name,
          address: profileData.address || workshop.address,
          phone: profileData.phone || workshop.phone,
          footer: profileData.footerMessage || workshop.footer
        };
      } catch (e) {
        console.error('Failed to parse workshop profile:', e);
      }
    }

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'printer:dummy',
      driver: {
        send: () => { },
        open: () => { },
        close: () => { }
      } as any,
      // Removed characterSet to avoid PC850 errors on generic printers
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: 42 // Standard for 80mm
    });

    const logoPath = path.join(__dirname, '..', 'logo.png');
    console.log('Printing with Workshop Data:', workshop);
    console.log('Logo file absolute path:', logoPath);
    console.log('Logo file exists:', fs.existsSync(logoPath));

    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.println(workshop.name);
    printer.setTextNormal();
    if (workshop.address) printer.println(workshop.address);
    if (workshop.phone) printer.println(`Telp: ${workshop.phone}`);
    printer.drawLine();

    printer.alignLeft();
    if (transaction.reprintCount > 1) {
      printer.setTextDoubleHeight();
      printer.println("       *** SALINAN ***");
      printer.println(`       Cetak Ke: ${transaction.reprintCount}`);
      printer.setTextNormal();
      printer.newLine();
    }
    printer.println(`No: ${transaction.invoiceNo}`);
    printer.println(`Tgl: ${new Date(transaction.createdAt).toLocaleString('id-ID')}`);
    const cashierName = transaction.user?.name || (req as any).user?.name || 'ADMIN';
    printer.println(`Ksr: ${cashierName}`);

    // Collect and print unique mechanics
    const mechanics = [...new Set(transaction.items.map((i: any) => i.mechanic?.name).filter(Boolean))];
    if (mechanics.length > 0) {
      printer.println(`Mek: ${mechanics.join(', ')}`);
    }

    if (transaction.customer) printer.println(`Plg: ${transaction.customer.name}`);
    if (transaction.vehicle) printer.println(`Unit: ${transaction.vehicle.plateNumber} (${transaction.vehicle.model})`);
    printer.drawLine();

    // Items
    transaction.items.forEach((item: any) => {
      printer.alignLeft();
      printer.println(`${item.name}`);
      const qtyStr = `${item.quantity} x ${item.price.toLocaleString('id-ID')}`;
      const totalStr = (item.price * item.quantity).toLocaleString('id-ID');
      const spaces = 42 - qtyStr.length - totalStr.length;
      printer.println(`${qtyStr}${" ".repeat(Math.max(0, spaces))}${totalStr}`);
    });

    printer.drawLine();

    // Summary
    const subtotal = transaction.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const printRow = (label: string, val: number) => {
      const vStr = val.toLocaleString();
      const spaces = 42 - label.length - vStr.length;
      printer.println(`${label}${" ".repeat(Math.max(0, spaces))}${vStr}`);
    };

    printRow("Subtotal", subtotal);
    if (transaction.tax > 0) printRow(`Pajak (${((transaction.tax / subtotal) * 100).toFixed(0)}%)`, transaction.tax);
    if (transaction.discount > 0) printRow("Diskon", -transaction.discount);

    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printRow("TOTAL", transaction.totalAmount);
    printer.setTextNormal();
    printer.drawLine();

    printer.alignCenter();
    printer.println(workshop.footer || "Terima kasih");
    printer.newLine();

    // Barcode for validation
    printer.printBarcode(transaction.invoiceNo, 73); // CODE39
    printer.newLine();
    printer.newLine();
    printer.newLine();
    // Manual Full Cut (GS V 66 0) to ensure 100% cut on Iware XS80
    // We add a few new lines first to ensure enough paper is fed past the cutter
    printer.newLine();
    printer.newLine();
    printer.newLine();
    printer.add(Buffer.from([0x1b, 0x69])); 
    printer.add(Buffer.from([0x1d, 0x56, 0x00])); 


    const buffer = printer.getBuffer();
    try {
      await printRaw(buffer, printerName);
      res.json({ message: 'Printing success' });
    } catch (printError: any) {
      console.error('Print Raw Error:', printError);
      res.status(500).json({ error: `Gagal mengirim data ke printer: ${printError.message}` });
    }
  } catch (error: any) {
    console.error('Print Preparation Error:', error);
    res.status(500).json({ error: `Gagal menyiapkan data cetak: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3002;

// WhatsApp QR
app.get('/api/whatsapp/qr', authenticate, async (req, res) => {
  try {
    const qrData = await WhatsAppService.getQRCode();
    res.json(qrData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// WhatsApp Status
app.get('/api/whatsapp/status', authenticate, async (req, res) => {
  res.json({ isReady: WhatsAppService.getStatus() });
});

// WhatsApp Logout
app.post('/api/whatsapp/logout', authenticate, async (req, res) => {
  try {
    const success = await WhatsAppService.logout();
    if (success) res.json({ message: 'Disconnected' });
    else res.status(500).json({ error: 'Failed to disconnect' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Mobile: Quick Stock Update
app.patch('/api/products/:id/stock', authenticate, async (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;
  if (typeof delta !== 'number') return res.status(400).json({ error: 'delta harus berupa angka' });
  try {
    const product = await prisma.product.findUnique({ where: { id: id as string } });
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const newStock = Math.max(0, product.stock + delta);
    const updated = await prisma.product.update({
      where: { id: id as string },
      data: { stock: newStock }
    });
    res.json({ message: 'Stok berhasil diperbarui', stock: updated.stock });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Reminder Config
app.get('/api/reminder/config', authenticate, async (req, res) => {
  try {
    const config = await getReminderConfig();
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/reminder/config', authenticate, async (req, res) => {
  try {
    await saveReminderConfig(req.body);
    const newConfig = await getReminderConfig();
    scheduleReminder(newConfig); // reschedule immediately
    res.json({ message: 'Reminder config saved', config: newConfig });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reminder/send-now', authenticate, async (req, res) => {
  try {
    const count = await sendServiceReminders();
    res.json({ message: `Reminder sent to ${count} customer(s)` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SILENT LABEL PRINTING (XPRINTER TSPL) ---
app.post('/api/print/labels', authenticate, async (req, res) => {
  const { product, qty, items, showPrice, sizeType } = req.body;
  let printerName = req.body.printerName;

  try {
    if (!printerName) {
      const printerSetting = await prisma.appSetting.findUnique({ where: { key: 'label_printer' } });
      if (printerSetting && printerSetting.value) {
        try {
          const parsed = JSON.parse(printerSetting.value);
          printerName = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) { printerName = printerSetting.value; }
      }
    }
    printerName = printerName || "Xprinter";

    // Fetch workshop name
    let workshopName = 'JAKARTA MOTOR';
    const profileRes = await prisma.appSetting.findUnique({ where: { key: 'workshop_profile' } });
    if (profileRes) {
      try {
        const parsedValue = JSON.parse(profileRes.value);
        const profileData = Array.isArray(parsedValue) ? JSON.parse(parsedValue[0]) : parsedValue;
        workshopName = profileData.name || workshopName;
      } catch (e) { }
    }

    // Prepare list of items to print
    let printItems = [];
    if (items && Array.isArray(items)) {
      printItems = items;
    } else if (product) {
      printItems = [{ product, qty: qty || 1 }];
    }

    if (printItems.length === 0) return res.status(400).json({ error: 'No items to print' });

    let commands = '';

    for (const item of printItems) {
      const p = item.product;
      const q = item.qty;

      for (let i = 0; i < q; i++) {
        if (sizeType === 'landscape100x70') {
          commands += `SIZE 100 mm, 70 mm\r\nGAP 3 mm, 0\r\nDIRECTION 1\r\nCLS\r\n`;
          commands += `TEXT 40,20,"3",0,1,1,"${workshopName}"\r\n`;
          commands += `TEXT 40,70,"2",0,1,1,"JENIS: ${p.category}"\r\n`;
          commands += `TEXT 40,110,"4",0,1,1,"${p.name.substring(0, 25)}"\r\n`;
          if (p.name.length > 25) commands += `TEXT 40,160,"4",0,1,1,"${p.name.substring(25, 50)}"\r\n`;
          commands += `BARCODE 40,230,"128",120,1,0,4,4,"${p.barcode}"\r\n`;
          commands += `TEXT 40,380,"2",0,1,1,"SKU: ${p.barcode}"\r\n`;
          if (showPrice) {
            const priceStr = `Rp ${Number(p.priceNormal).toLocaleString('id-ID')}`;
            commands += `TEXT 40,430,"4",0,1,1,"${priceStr}"\r\n`;
          }
          commands += `PRINT 1\r\n`;
        } else if (sizeType === 'large70x100') {
          // Designed for 70x100mm Portrait (actually 78mm width in some printers)
          commands += `SIZE 78 mm, 100 mm\r\nGAP 3 mm, 0\r\nDIRECTION 1\r\nCLS\r\n`;

          // Header: Inverted box
          commands += `BOX 10,10,614,80,10\r\nREVERSE 10,10,604,70\r\n`;
          commands += `TEXT 312,45,"3",0,1,1,2,"${workshopName.toUpperCase()}"\r\n`;

          // Category
          commands += `TEXT 40,110,"2",0,1,1,"JENIS: ${p.category}"\r\n`;
          commands += `BAR 40,140,544,2\r\n`;

          // Product Name (2 Lines)
          commands += `TEXT 312,180,"4",0,1,1,2,"${p.name.substring(0, 22)}"\r\n`;
          if (p.name.length > 22) {
            commands += `TEXT 312,240,"4",0,1,1,2,"${p.name.substring(22, 44)}"\r\n`;
          }

          // Barcode (Increased gap, height reduced slightly, human readable text turned OFF)
          commands += `BARCODE 312,380,"128",120,0,0,3,3,2,"${p.barcode}"\r\n`;

          // SKU Text (Manual)
          commands += `TEXT 312,520,"3",0,1,1,2,"SKU: ${p.barcode}"\r\n`;

          if (showPrice) {
            commands += `BAR 40,620,544,4\r\n`;
            const priceStr = `Rp ${Number(p.priceNormal).toLocaleString('id-ID')}`;
            commands += `TEXT 312,720,"5",0,1,1,2,"${priceStr}"\r\n`;
          }
          commands += `PRINT 1\r\n`;
        } else if (sizeType === 'label33x15') {
          // Optimized for 33x15mm (Small 3-column labels)
          commands += `SIZE 33 mm, 15 mm\r\nGAP 2 mm, 0\r\nDIRECTION 1\r\nCLS\r\n`;
          // Workshop Name (Very small)
          commands += `TEXT 132,10,"1",0,1,1,2,"${workshopName.substring(0, 20)}"\r\n`;
          // Product Name (Small)
          commands += `TEXT 132,25,"1",0,1,1,2,"${p.name.substring(0, 20)}"\r\n`;
          // Barcode (Narrow and Short)
          commands += `BARCODE 25,45,"128",45,0,0,2,2,"${p.barcode}"\r\n`;
          if (showPrice) {
            const priceStr = `Rp ${Number(p.priceNormal).toLocaleString('id-ID')}`;
            commands += `TEXT 132,100,"2",0,1,1,2,"${priceStr}"\r\n`;
          }
          commands += `PRINT 1\r\n`;
        } else if (sizeType === 'label40x30') {
          // Optimized for 40x30mm (1-column labels)
          commands += `SIZE 40 mm, 30 mm\r\nGAP 3 mm, 0\r\nDIRECTION 1\r\nCLS\r\n`;
          // Workshop Name (Small)
          commands += `TEXT 160,10,"2",0,1,1,2,"${workshopName}"\r\n`;
          // Product Name (Medium, centered)
          commands += `TEXT 160,40,"3",0,1,1,2,"${p.name.substring(0, 20)}"\r\n`;
          if (p.name.length > 20) {
            commands += `TEXT 160,75,"3",0,1,1,2,"${p.name.substring(20, 40)}"\r\n`;
          }
          // Barcode (Centered)
          commands += `BARCODE 160,120,"128",80,1,0,2,2,2,"${p.barcode}"\r\n`;
          if (showPrice) {
            const priceStr = `Rp ${Number(p.priceNormal).toLocaleString('id-ID')}`;
            commands += `TEXT 160,210,"4",0,1,1,2,"${priceStr}"\r\n`;
          }
          commands += `PRINT 1\r\n`;
        } else {
          // Default: 3 Column 32x19mm
          commands += `SIZE 32 mm, 19 mm\r\nGAP 2 mm, 0\r\nDIRECTION 1\r\nCLS\r\n`;
          commands += `TEXT 128,10,"1",0,1,1,2,"${workshopName}"\r\n`;
          commands += `TEXT 128,30,"1",0,1,1,2,"${p.name.substring(0, 18)}"\r\n`;
          commands += `BARCODE 20,50,"128",50,0,0,2,2,"${p.barcode}"\r\n`;
          if (showPrice) {
            const priceStr = `Rp ${Number(p.priceNormal).toLocaleString('id-ID')}`;
            commands += `TEXT 128,125,"2",0,1,1,2,"${priceStr}"\r\n`;
          }
          commands += `PRINT 1\r\n`;
        }
      }
    }

    await printRaw(Buffer.from(commands), printerName);
    res.json({ message: `Successfully sent labels to ${printerName}` });

  } catch (error: any) {
    console.error('Label Print Error:', error);
    res.status(500).json({ error: `Gagal cetak label: ${error.message}` });
  }
});

// --- DATABASE MANAGEMENT ROUTES ---

app.get('/api/database/backup', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
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

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_bengkel_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Gagal melakukan backup database (JSON)' });
  }
});

app.post('/api/database/import', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'No data provided' });

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Truncate all tables first (Cascade to handle dependencies)
      // We use $executeRaw instead of deleteMany to reset auto-increments if any
      const tableNames = [
        'Attendance', 'Cashflow', 'WorkOrder', 'StockLog',
        'TransactionItem', 'Transaction', 'PurchaseItem', 'SupplierPurchase',
        'Vehicle', 'Supplier', 'Customer', 'Service', 'Product', 'AppSetting', 'User'
      ];

      await tx.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
      for (const table of tableNames) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}"`);
      }
      await tx.$executeRawUnsafe('PRAGMA foreign_keys = ON');

      // 2. Insert data in correct order
      if (data.users?.length) await tx.user.createMany({ data: data.users });
      if (data.appSettings?.length) await tx.appSetting.createMany({ data: data.appSettings });
      if (data.products?.length) await tx.product.createMany({ data: data.products });
      if (data.services?.length) await tx.service.createMany({ data: data.services });
      if (data.customers?.length) await tx.customer.createMany({ data: data.customers });
      if (data.suppliers?.length) await tx.supplier.createMany({ data: data.suppliers });
      if (data.vehicles?.length) await tx.vehicle.createMany({ data: data.vehicles });

      if (data.supplierPurchases?.length) await tx.supplierPurchase.createMany({ data: data.supplierPurchases });
      if (data.purchaseItems?.length) await tx.purchaseItem.createMany({ data: data.purchaseItems });

      if (data.transactions?.length) await tx.transaction.createMany({ data: data.transactions });
      if (data.transactionItems?.length) await tx.transactionItem.createMany({ data: data.transactionItems });

      if (data.workOrders?.length) await tx.workOrder.createMany({ data: data.workOrders });
      if (data.stockLogs?.length) await tx.stockLog.createMany({ data: data.stockLogs });
      if (data.cashflows?.length) await tx.cashflow.createMany({ data: data.cashflows });
      if (data.attendance?.length) await tx.attendance.createMany({ data: data.attendance });
    });

    res.json({ message: 'Database imported successfully' });
  } catch (error: any) {
    console.error('Import Error:', error);
    res.status(500).json({ error: 'Gagal mengimpor database: ' + error.message });
  }
});

app.post('/api/database/reset', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password konfirmasi diperlukan' });

  try {
    // Verify admin password
    const user = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Password konfirmasi salah' });

    console.log('--- DATABASE RESET AUTHORIZED BY:', user.name, '---');
    // PRAGMA foreign_keys MUST run OUTSIDE of a Prisma transaction.
    // SQLite PRAGMA is a connection-level setting and does not work reliably inside transactions.
    console.log('Disabling foreign key checks (connection level)...');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

    const tablesToDelete = [
      'Attendance', 'Cashflow', 'WorkOrder', 'StockLog',
      'TransactionItem', 'Transaction', 'ReprintLog',
      'PurchaseItem', 'SupplierPurchase', 'Vehicle'
    ];

    for (const table of tablesToDelete) {
      try {
        console.log(`Clearing table: ${table}...`);
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (tableErr: any) {
        console.warn(`Warning: Could not clear table ${table}: ${tableErr.message}`);
        // Continue — table might not exist yet or already empty
      }
    }

    // Reset product stocks (keep master data like name, barcode, location)
    console.log('Resetting product stocks to 0...');
    await prisma.product.updateMany({
      data: {
        stock: 0,
        purchasePrice: 0
      }
    });

    console.log('Re-enabling foreign key checks...');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');

    // We KEEP: User, Service, AppSetting, Customer, Supplier, Product (master data)

    console.log('--- DATABASE RESET SUCCESSFUL ---');
    res.json({ message: 'Database reset berhasil! Data Master (User, Layanan, Barang, Rak, Pelanggan) tetap dipertahankan.' });
  } catch (error: any) {
    // Always re-enable foreign keys even on error
    try { await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON'); } catch { }
    console.error('--- DATABASE RESET FAILED:', error.message, '---');
    res.status(500).json({ error: 'Gagal mereset database: ' + error.message });
  }
});

// --- ERROR BOUNDARY: GLOBAL ERROR HANDLER ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('GLOBAL ERROR CAUGHT:', err);
  const status = err.status || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';
  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Backend server with Socket.io running on http://0.0.0.0:${PORT}`);

  // Protected Service Initialization
  try {
    WhatsAppService.initialize();
    startReminderScheduler();
    startBackupScheduler();
  } catch (err) {
    console.error('Failed to initialize background services:', err);
  }
});
