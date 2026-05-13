export interface Part {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  hargaBeli: number;
  hargaJualNormal: number;
  hargaJualGrosir: number;
  hargaJualBengkel: number;
  etalase: string;
  supplier?: string;
  barcode: string;
  brand?: string;          // Merk barang (Brembo, Honda Genuine, dll)
  partNumber?: string;     // Kode Part Pabrik (OEM)
  compatibility?: string;  // Peruntukan kendaraan (Vario 150, NMAX, Universal)
  image?: string;
}

export type CustomerType = 'Umum' | 'Grosir' | 'Bengkel';

export interface CashflowRecord {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  loggedBy: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'kasir';
}
export interface Service {
  id: string;
  name: string;
  price: number;
  estimatedTime: string;
}

export interface Mechanic {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'away';
  tasks: number;
}

export interface VehicleHistoryItem {
  id: string;
  date: string;
  odometer: number;
  serviceType: string;
  totalAmount: number;
  mechanic: string;
  notes: string;
}

export interface Vehicle {
  plateNumber: string;
  model: string;
  owner: string;
  phone: string;
  lastService: string;
  totalVisits: number;
  history: VehicleHistoryItem[];
}

export const MOCK_CATEGORIES: string[] = [
  'Lubricants', 'Tires', 'Ignition', 'Braking', 'Battery', 'Filters', 'Body Parts', 'Accessories'
];

export const MOCK_ETALASE: string[] = [
  'Rak A1', 'Rak A2', 'Rak B1', 'Rak B2', 'Rak C1', 'Rak C2', 'Gudang Belakang', 'Display Depan'
];

export const MOCK_PARTS: Part[] = [
  { id: '1', name: 'Oli Mesin 10W-40', brand: 'Motul 5100', partNumber: 'MTL-5100-1L', compatibility: 'Universal (Motor Sport)', category: 'Lubricants', stock: 24, minStock: 10, hargaBeli: 110000, hargaJualNormal: 150000, hargaJualGrosir: 140000, hargaJualBengkel: 135000, etalase: 'Rak A1', supplier: 'PT Motul Indo', barcode: '899123456701' },
  { id: '2', name: 'Ban Luar Exato 90/80-14', brand: 'IRC', partNumber: 'IRC-EXT-908014', compatibility: 'Matic (Vario, Beat, Mio)', category: 'Tires', stock: 8, minStock: 5, hargaBeli: 220000, hargaJualNormal: 285000, hargaJualGrosir: 270000, hargaJualBengkel: 260000, etalase: 'Gudang Belakang', supplier: 'Distributor IRC JKT', barcode: '899123456702' },
  { id: '3', name: 'Busi Iridium CPR9EAIX-9', brand: 'NGK', partNumber: 'CPR9EAIX-9', compatibility: 'Vario 150, PCX 150, ADV', category: 'Ignition', stock: 15, minStock: 20, hargaBeli: 75000, hargaJualNormal: 95000, hargaJualGrosir: 85000, hargaJualBengkel: 80000, etalase: 'Rak B1', supplier: 'Astra Otoparts', barcode: '899123456703' },
  { id: '4', name: 'Kampas Rem Depan', brand: 'Brembo', partNumber: 'BRB-PAD-01', compatibility: 'NMAX, Aerox, Lexi', category: 'Braking', stock: 3, minStock: 5, hargaBeli: 250000, hargaJualNormal: 350000, hargaJualGrosir: 330000, hargaJualBengkel: 320000, etalase: 'Rak C2', supplier: 'Mitra Aksesoris', barcode: '899123456704' },
  { id: '5', name: 'Aki Kering GTZ5S', brand: 'GS Astra', partNumber: 'GTZ5S', compatibility: 'Beat, Vario 110, Mio J', category: 'Battery', stock: 12, minStock: 10, hargaBeli: 180000, hargaJualNormal: 220000, hargaJualGrosir: 205000, hargaJualBengkel: 200000, etalase: 'Rak A2', supplier: 'Astra Otoparts', barcode: '899123456705' },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Budi (Admin)', role: 'admin' },
  { id: 'u2', name: 'Siti (Kasir)', role: 'kasir' }
];

export const MOCK_CASHFLOW: CashflowRecord[] = [
  { id: 'c1', date: '2024-05-01', type: 'expense', category: 'Ekspedisi', amount: 50000, description: 'Ongkir sparepart dari Jakarta', loggedBy: 'Budi' },
  { id: 'c2', date: '2024-05-02', type: 'income', category: 'Limbah', amount: 120000, description: 'Jual oli bekas 4 jerigen', loggedBy: 'Budi' },
  { id: 'c3', date: '2024-05-03', type: 'expense', category: 'Gaji/Mekanik', amount: 200000, description: 'Gaji mingguan mekanik Agus', loggedBy: 'Budi' },
];

export const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'Service Rutin (Tune Up)', price: 75000, estimatedTime: '45m' },
  { id: 's2', name: 'Ganti Oli & Filter', price: 25000, estimatedTime: '15m' },
  { id: 's3', name: 'Service Besar', price: 250000, estimatedTime: '180m' },
  { id: 's4', name: 'Press Velg', price: 150000, estimatedTime: '60m' },
];

export const MOCK_MECHANICS: Mechanic[] = [
  { id: 'm1', name: 'Budi Santoso', status: 'busy', tasks: 2 },
  { id: 'm2', name: 'Agus Wijaya', status: 'available', tasks: 0 },
  { id: 'm3', name: 'Dedi Kurniawan', status: 'available', tasks: 1 },
];

export const MOCK_VEHICLES: Vehicle[] = [
  {
    plateNumber: 'B 1234 ABC',
    model: 'Honda Vario 160',
    owner: 'Rian Perdana',
    phone: '08123456789',
    lastService: '2024-04-15',
    totalVisits: 5,
    history: [
      { id: 'h1', date: '2024-04-15', odometer: 12500, serviceType: 'Ganti Oli + Filter', totalAmount: 175000, mechanic: 'Agus', notes: 'Saran ganti ban depan bulan depan' },
      { id: 'h2', date: '2024-02-10', odometer: 10200, serviceType: 'Service Rutin', totalAmount: 75000, mechanic: 'Budi', notes: 'Normal' },
    ]
  },
  {
    plateNumber: 'B 5678 XYZ',
    model: 'Toyota Avanza',
    owner: 'Siti Aminah',
    phone: '08556677889',
    lastService: '2024-05-01',
    totalVisits: 3,
    history: [
      { id: 'h3', date: '2024-05-01', odometer: 45000, serviceType: 'Service Berkala 40k', totalAmount: 1250000, mechanic: 'Dedi', notes: 'Ganti kampas rem depan' },
    ]
  }
];
