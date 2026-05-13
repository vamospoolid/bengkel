import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Download, Calendar, TrendingUp, DollarSign, Package, Wrench, ChevronDown, 
  AlertTriangle, ArrowRight, Loader2, FileText, Activity, CreditCard, 
  ArrowUpRight, ArrowDownRight, Filter, RefreshCw, Printer, Search, Star, Zap, ShoppingBag
} from 'lucide-react';
import api from '../api';
import ProfitLossReport from '../components/reports/ProfitLossReport';
import TransactionReport from '../components/reports/TransactionReport';
import InventoryReport from '../components/reports/InventoryReport';


const COLORS = ['#FF4500', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

interface FinancialSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  partsRevenue: number;
  servicesRevenue: number;
  partsMotorRevenue: number;
  partsMobilRevenue: number;
  servicesMotorRevenue: number;
  servicesMobilRevenue: number;
  partsPercentage: number;
  servicesPercentage: number;
  totalInventoryValue: number;
  lowStockCount: number;
}

interface ChartData {
  date: string;
  revenue: number;
  profit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  reference: string;
  description: string;
  amount: number;
}

interface TopItem {
  name: string;
  quantity?: number;
  count?: number;
  revenue: number;
  profit?: number;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pl' | 'performance' | 'inventory' | 'journal' | 'payable'>('overview');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all' | 'custom'>('30d');
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    summary: FinancialSummary;
    chartData: ChartData[];
    topProducts: TopItem[];
    topServices: TopItem[];
    lowStockList: any[];
    recentTransactions: any[];
  } | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [isLoadingJournal, setIsLoadingJournal] = useState(false);
  const [dueInvoices, setDueInvoices] = useState<any[]>([]);
  const [isLoadingPayable, setIsLoadingPayable] = useState(false);
  const [workshopProfile, setWorkshopProfile] = useState({ 
    name: 'JAKARTA MOTOR', 
    address: 'Jl. Raya No. 123, Jakarta', 
    phone: '0812-3456-7890',
    taxRate: 11
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printContent, setPrintContent] = useState<React.ReactNode>(null);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setReportError(null);
      let startDate: Date;
      let endDate: Date = new Date();

      if (dateRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === '30d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === 'custom') {
        startDate = new Date(customDates.start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDates.end);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5); // 5 years for 'all'
      }
      
      const res = await api.get('/reports/financial', { 
        params: { 
          startDate: startDate.toISOString(),
          endDate: dateRange === 'all' ? '' : endDate.toISOString()
        } 
      });
      setReportData(res.data);
    } catch (error: any) {
      console.error('Failed to fetch financial reports', error);
      const msg = error?.response?.data?.error || error?.message || 'Gagal memuat laporan keuangan.';
      setReportError(msg);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJournal = async () => {
    try {
      setIsLoadingJournal(true);
      let startDate: Date;
      let endDate: Date = new Date();

      if (dateRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === '30d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === 'custom') {
        startDate = new Date(customDates.start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDates.end);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
      }
      
      const res = await api.get('/reports/journal', { 
        params: { 
          startDate: startDate.toISOString(),
          endDate: dateRange === 'all' ? '' : endDate.toISOString()
        } 
      });
      setJournal(res.data);
    } catch (error) {
      console.error('Failed to fetch journal', error);
    } finally {
      setIsLoadingJournal(false);
    }
  };

  const fetchPayables = async () => {
    try {
      setIsLoadingPayable(true);
      const res = await api.get('/suppliers/purchases');
      const hutangList = res.data.filter((p: any) => p.status === 'HUTANG').sort((a: any, b: any) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      setDueInvoices(hutangList);
    } catch (error) {
      console.error('Failed to fetch payables', error);
    } finally {
      setIsLoadingPayable(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchWorkshopProfile();
    if (activeTab === 'journal') fetchJournal();
    if (activeTab === 'payable') fetchPayables();
  }, [dateRange, customDates, activeTab]);

  const fetchWorkshopProfile = async () => {
    try {
      const res = await api.get('/app-settings/workshop_profile');
      if (res.data && res.data.items && res.data.items.length > 0) {
        const data = JSON.parse(res.data.items[0]);
        setWorkshopProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch workshop profile', error);
    }
  };

  const exportPDF = () => {
    if (!reportData) return;

    let content = null;
    const periodText = 
      dateRange === 'today' ? 'Hari Ini' :
      dateRange === '7d' ? '7 Hari Terakhir' : 
      dateRange === '30d' ? '30 Hari Terakhir' : 
      dateRange === 'custom' ? `${customDates.start} s/d ${customDates.end}` :
      'Semua Waktu';

    if (activeTab === 'pl' || activeTab === 'overview') {
      const plData = {
        revenue: summary.totalRevenue,
        cogs: summary.totalCOGS,
        grossProfit: summary.grossProfit,
        expenses: summary.totalExpenses,
        netProfit: summary.netProfit,
        details: {
          serviceRevenue: summary.servicesRevenue,
          partRevenue: summary.partsRevenue,
          expenseDetails: [] // Optional: fetch deeper details if needed
        }
      };
      content = <ProfitLossReport data={plData} period={periodText} workshop={workshopProfile} />;
    } else if (activeTab === 'journal') {
      const transactionData = journal.map(j => ({
        id: j.id,
        invoiceNo: j.reference,
        date: j.date,
        customerName: j.description.replace('Penjualan Kasir - ', ''),
        paymentType: 'TRANSFER/TUNAI',
        totalAmount: j.amount,
        status: 'COMPLETED'
      }));
      content = <TransactionReport data={transactionData} period={periodText} workshop={workshopProfile} />;
    } else if (activeTab === 'inventory') {
      const inventoryData = lowStockList.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand || '-',
        category: item.category,
        stock: item.stock,
        purchasePrice: item.purchasePrice || 0,
        priceNormal: item.priceNormal || 0
      }));
      content = <InventoryReport data={inventoryData} workshop={workshopProfile} />;
    }

    if (content) {
      setPrintContent(content);
      setIsPrinting(true);
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
        setPrintContent(null);
      }, 500);
    } else {
      alert('Fitur cetak untuk tab ini segera hadir.');
    }
  };

  if (isLoading && !reportData) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyusun Laporan Keuangan...</p>
      </div>
    );
  }

  // Handle API error state — prevent crash when reportData is null after loading completes
  if (!reportData) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Gagal Memuat Laporan</h3>
          <p className="text-sm text-muted-foreground italic max-w-sm">
            {reportError || 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan coba lagi.'}
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
        >
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </div>
    );
  }

  const { summary, chartData, topProducts, topServices, lowStockList } = reportData;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Main Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-4xl font-black tracking-tighter uppercase leading-none mb-1">Analisis Bengkel</h3>
          <p className="text-sm text-muted-foreground font-medium italic">Sistem pelaporan akuntabel & performa bisnis Jakarta Motor.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-muted p-1 rounded-xl border border-border">
            {(['today', '7d', '30d', 'all', 'custom'] as const).map(r => (
              <button 
                key={r} 
                onClick={() => setDateRange(r)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${dateRange === r ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {r === 'today' ? 'Hari Ini' : r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : r === 'all' ? 'Semua' : 'Custom'}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border animate-in slide-in-from-right-2">
              <input 
                type="date" 
                value={customDates.start} 
                onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                className="bg-card border-none rounded-lg px-2 py-1 text-[10px] font-black focus:outline-none"
              />
              <span className="text-[10px] font-black text-muted-foreground">s/d</span>
              <input 
                type="date" 
                value={customDates.end} 
                onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                className="bg-card border-none rounded-lg px-2 py-1 text-[10px] font-black focus:outline-none"
              />
            </div>
          )}
          <button onClick={exportPDF} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl shadow-xl shadow-primary/20 text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/50 gap-8 overflow-x-auto no-scrollbar">
        {(['overview', 'pl', 'performance', 'inventory', 'journal', 'payable'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
              activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'overview' ? 'Ringkasan' : tab === 'pl' ? 'Laba Rugi' : tab === 'performance' ? 'Top Performa' : tab === 'inventory' ? 'Analisis Stok' : tab === 'journal' ? 'Jurnal Umum' : 'Hutang Jatuh Tempo'}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-in slide-in-from-left-full" />}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 rounded-3xl border-b-4 border-green-500/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-500/10 rounded-2xl text-green-500"><TrendingUp className="w-6 h-6" /></div>
                <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">Real-time</span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Pendapatan</p>
              <h4 className="text-2xl font-black">Rp {summary.totalRevenue.toLocaleString('id-ID')}</h4>
            </div>

            <div className="glass-card p-6 rounded-3xl border-b-4 border-primary/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Activity className="w-6 h-6" /></div>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">Net</span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Laba Bersih</p>
              <h4 className="text-2xl font-black">Rp {summary.netProfit.toLocaleString('id-ID')}</h4>
            </div>

            <div className="glass-card p-6 rounded-3xl border-b-4 border-red-500/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><CreditCard className="w-6 h-6" /></div>
                <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-lg">{summary.lowStockCount} Alert</span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Biaya Operasional</p>
              <h4 className="text-2xl font-black">Rp {summary.totalExpenses.toLocaleString('id-ID')}</h4>
            </div>

            <div className="glass-card p-6 rounded-3xl border-b-4 border-blue-500/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><Package className="w-6 h-6" /></div>
                <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">Assets</span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Nilai Inventaris</p>
              <h4 className="text-2xl font-black">Rp {summary.totalInventoryValue.toLocaleString('id-ID')}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Area Chart */}
            <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] min-h-[450px] flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tight">Performa Pendapatan</h4>
                  <p className="text-xs text-muted-foreground italic">Tren harian omzet & laba bersih.</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_#FF4500]" /><span className="text-[10px] font-bold text-muted-foreground uppercase">Pendapatan</span></div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_#2563EB]" /><span className="text-[10px] font-bold text-muted-foreground uppercase">Laba</span></div>
                </div>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF4500" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF4500" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 9, fontWeight: 'bold' }}
                      tickFormatter={(value) => `Rp ${value / 1000000} Jt`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '20px', padding: '15px' }}
                      itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#FF4500" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="profit" stroke="#2563EB" strokeWidth={4} fillOpacity={1} fill="url(#colorProf)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source Distribution */}
            <div className="glass-card p-8 rounded-[2.5rem] flex flex-col">
              <h4 className="text-xl font-black uppercase tracking-tight mb-2">Sumber Omzet</h4>
              <p className="text-xs text-muted-foreground italic mb-6">Distribusi Pendapatan.</p>
              
              <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Motor</p>
                    <p className="text-xl font-black text-primary">Rp {(summary.partsMotorRevenue + summary.servicesMotorRevenue).toLocaleString()}</p>
                    <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${((summary.partsMotorRevenue + summary.servicesMotorRevenue) / summary.totalRevenue) * 100}%` }} />
                    </div>
                  </div>
                  <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Mobil</p>
                    <p className="text-xl font-black text-blue-500">Rp {(summary.partsMobilRevenue + summary.servicesMobilRevenue).toLocaleString()}</p>
                    <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${((summary.partsMobilRevenue + summary.servicesMobilRevenue) / summary.totalRevenue) * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-xs font-black uppercase text-muted-foreground">Detail Suku Cadang</span>
                       <span className="text-[10px] font-bold text-primary">TOTAL: Rp {summary.partsRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
                       <div className="bg-primary" style={{ width: `${(summary.partsMotorRevenue / summary.partsRevenue) * 100}%` }} />
                       <div className="bg-blue-500" style={{ width: `${(summary.partsMobilRevenue / summary.partsRevenue) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">
                       <span>Motor: Rp {summary.partsMotorRevenue.toLocaleString()}</span>
                       <span>Mobil: Rp {summary.partsMobilRevenue.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-xs font-black uppercase text-muted-foreground">Detail Jasa Servis</span>
                       <span className="text-[10px] font-bold text-blue-500">TOTAL: Rp {summary.servicesRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
                       <div className="bg-primary" style={{ width: `${(summary.servicesMotorRevenue / summary.servicesRevenue) * 100}%` }} />
                       <div className="bg-blue-500" style={{ width: `${(summary.servicesMobilRevenue / summary.servicesRevenue) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">
                       <span>Motor: Rp {summary.servicesMotorRevenue.toLocaleString()}</span>
                       <span>Mobil: Rp {summary.servicesMobilRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TOP PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-8 duration-500">
          <div className="glass-card p-8 rounded-[3rem] space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-xl shadow-orange-500/20"><ShoppingBag className="w-6 h-6" /></div>
              <div>
                <h4 className="text-xl font-black uppercase tracking-tight">Suku Cadang Terlaris</h4>
                <p className="text-xs text-muted-foreground italic">Berdasarkan volume penjualan unit.</p>
              </div>
            </div>
            <div className="space-y-4">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50 group hover:border-orange-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center font-black text-orange-500">{idx+1}</div>
                    <div>
                      <p className="font-bold text-sm uppercase">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-black tracking-widest">{p.quantity} UNIT TERJUAL</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-primary">Rp {p.revenue.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-green-500 uppercase">Profit: Rp {p.profit?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8 rounded-[3rem] space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-xl shadow-blue-500/20"><Star className="w-6 h-6" /></div>
              <div>
                <h4 className="text-xl font-black uppercase tracking-tight">Jasa Servis Favorit</h4>
                <p className="text-xs text-muted-foreground italic">Layanan paling banyak diminta pelanggan.</p>
              </div>
            </div>
            <div className="space-y-4">
              {topServices.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50 group hover:border-blue-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center font-black text-blue-500">{idx+1}</div>
                    <div>
                      <p className="font-bold text-sm uppercase">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground font-black tracking-widest">{s.count} KALI DIKERJAKAN</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-blue-500">Rp {s.revenue.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Aliran Pendapatan</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INVENTORY ANALYSIS */}
      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-10 rounded-[3rem] bg-red-500/[0.02] border-red-500/20">
                <div className="flex items-center gap-4 mb-8 text-red-500">
                   <AlertTriangle className="w-8 h-8" />
                   <h4 className="text-2xl font-black uppercase tracking-tighter italic">Peringatan Stok Kritis</h4>
                </div>
                <div className="space-y-4">
                  {lowStockList.map((item, idx) => (
                    <div key={idx} className="p-4 bg-card rounded-2xl border border-red-500/10 flex items-center justify-between">
                       <div>
                         <p className="font-black text-xs uppercase">{item.name}</p>
                         <p className="text-[10px] text-muted-foreground font-bold">{item.brand} • {item.category}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xl font-black text-red-500">{item.stock}</p>
                         <p className="text-[9px] font-black text-muted-foreground uppercase">Min: {item.minStock}</p>
                       </div>
                    </div>
                  ))}
                  {lowStockList.length === 0 && <p className="text-center py-10 italic opacity-40">Semua stok aman!</p>}
                </div>
              </div>

              <div className="glass-card p-10 rounded-[3rem] bg-blue-500/[0.02] border-blue-500/20">
                <div className="flex items-center gap-4 mb-8 text-blue-500">
                   <Zap className="w-8 h-8" />
                   <h4 className="text-2xl font-black uppercase tracking-tighter italic">Valuasi Aset Gudang</h4>
                </div>
                <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Nilai Persediaan</p>
                    <h3 className="text-4xl font-black text-white font-mono">Rp {summary.totalInventoryValue.toLocaleString()}</h3>
                    <p className="text-[10px] text-zinc-600 mt-2 font-medium italic">*Berdasarkan Harga Beli (Modal) semua item di inventaris.</p>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex items-center gap-4">
                     <div className="flex-1 p-4 bg-white/5 rounded-2xl">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Item Menipis</p>
                        <p className="text-xl font-black text-red-500">{summary.lowStockCount}</p>
                     </div>
                     <div className="flex-1 p-4 bg-white/5 rounded-2xl">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Kesehatan Stok</p>
                        <p className="text-xl font-black text-green-500">92%</p>
                     </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* TAB CONTENT: LABA RUGI (P&L) */}
      {activeTab === 'pl' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
          <div className="glass-card p-12 rounded-[3.5rem] border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
            
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary rounded-3xl text-white shadow-xl shadow-primary/30"><FileText className="w-8 h-8" /></div>
                <div>
                  <h4 className="text-3xl font-black uppercase tracking-tighter italic">Laporan Laba Rugi</h4>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">Laporan Laba Rugi Bengkel</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Periode Laporan</p>
                <div className="flex items-center gap-2 text-sm font-bold bg-muted px-4 py-2 rounded-xl border border-border">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>30 Hari Terakhir</span>
                </div>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Revenue Section */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] ml-2">I. PENDAPATAN OPERASIONAL</p>
                <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-zinc-400">
                    <span>Penjualan Suku Cadang</span>
                    <span>Rp {summary.partsRevenue.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-zinc-400 pb-4 border-b border-white/5">
                    <span>Pendapatan Jasa Servis</span>
                    <span>Rp {summary.servicesRevenue.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-white uppercase">TOTAL PENDAPATAN</span>
                    <span className="text-3xl font-black text-white font-mono">Rp {summary.totalRevenue.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* COGS Section */}
              <div className="space-y-3 pt-4">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] ml-2">II. HARGA POKOK PENJUALAN (HPP)</p>
                <div className="p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-black text-zinc-300 uppercase tracking-tight">Total Modal Terpakai</span>
                    <p className="text-[10px] text-zinc-500 italic mt-1">Berdasarkan purchasePrice saat transaksi</p>
                  </div>
                  <span className="text-2xl font-black text-red-500 font-mono">- Rp {summary.totalCOGS.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Gross Profit */}
              <div className="p-8 bg-primary/10 rounded-[2.5rem] border-2 border-primary/30 border-dashed flex justify-between items-center">
                <span className="text-lg font-black text-primary uppercase tracking-tighter italic">LABA KOTOR (GROSS PROFIT)</span>
                <span className="text-3xl font-black text-primary font-mono">Rp {summary.grossProfit.toLocaleString('id-ID')}</span>
              </div>

              {/* Expenses Section */}
              <div className="space-y-3 pt-4">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] ml-2">III. BEBAN OPERASIONAL & BIAYA</p>
                <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-zinc-400">
                    <span>Biaya Umum & Administrasi</span>
                    <span>Rp {summary.totalExpenses.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-sm font-black text-white uppercase tracking-tight">TOTAL BEBAN OPERASIONAL</span>
                    <span className="text-xl font-black text-orange-500 font-mono">Rp {summary.totalExpenses.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit Final */}
              <div className="mt-12 p-10 bg-primary text-white rounded-[3rem] shadow-2xl shadow-primary/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-[0.3em] mb-1">LABA BERSIH (NET PROFIT)</h2>
                    <p className="text-xs text-white/70 italic font-medium">Laba akhir setelah pajak & semua biaya operasional.</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-5xl font-black italic font-mono tracking-tighter">Rp {summary.netProfit.toLocaleString('id-ID')}</h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: JURNAL UMUM */}
      {activeTab === 'journal' && (
        <div className="space-y-6 animate-in slide-in-from-left-8 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-black uppercase tracking-tight">Jurnal Umum & Audit Trail</h4>
              <p className="text-xs text-muted-foreground italic">Catatan kronologis seluruh arus masuk dan keluar dana.</p>
            </div>
            <div className="relative max-w-xs w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <input type="text" placeholder="Cari referensi atau deskripsi..." className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none" />
            </div>
          </div>

          <div className="glass-card rounded-[2rem] overflow-hidden border border-border/50 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-8 py-5">Tanggal & Jam</th>
                    <th className="px-8 py-5">Referesi / No. Faktur</th>
                    <th className="px-8 py-5">Keterangan Akuntansi</th>
                    <th className="px-8 py-5">Kategori</th>
                    <th className="px-8 py-5 text-right">Debit (Masuk)</th>
                    <th className="px-8 py-5 text-right">Kredit (Keluar)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingJournal ? (
                    <tr><td colSpan={6} className="px-8 py-32 text-center flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Sinkronisasi Jurnal...</p>
                    </td></tr>
                  ) : journal.length === 0 ? (
                    <tr><td colSpan={6} className="px-8 py-32 text-center text-muted-foreground italic">Belum ada catatan jurnal pada periode ini.</td></tr>
                  ) : journal.map((entry) => (
                    <tr key={entry.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-8 py-5 font-bold text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('id-ID')}
                        <span className="block text-[9px] font-black uppercase opacity-50">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-2 py-1 bg-muted rounded font-mono font-bold text-[10px] border border-border/50">{entry.reference}</span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-foreground uppercase tracking-tight">{entry.description}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                          entry.type === 'INCOME' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-green-500">
                        {entry.type === 'INCOME' ? `Rp ${entry.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-8 py-5 text-right font-black text-red-500">
                        {entry.type === 'EXPENSE' ? `Rp ${entry.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PAYABLE (HUTANG JATUH TEMPO) */}
      {activeTab === 'payable' && (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-black uppercase tracking-tight">Hutang Supplier Jatuh Tempo</h4>
              <p className="text-xs text-muted-foreground italic">Daftar invoice pembelian ke supplier yang berstatus HUTANG.</p>
            </div>
            <div className="glass-card px-6 py-3 rounded-2xl border-orange-500/30 flex items-center gap-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Hutang</p>
                 <p className="text-lg font-black text-orange-500 font-mono">Rp {dueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] overflow-hidden border border-border/50 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-8 py-5">Jatuh Tempo</th>
                    <th className="px-8 py-5">No. Invoice</th>
                    <th className="px-8 py-5">Supplier</th>
                    <th className="px-8 py-5">Tgl Pembelian</th>
                    <th className="px-8 py-5 text-right">Total Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingPayable ? (
                    <tr><td colSpan={5} className="px-8 py-32 text-center flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Memuat Data Hutang...</p>
                    </td></tr>
                  ) : dueInvoices.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-32 text-center text-muted-foreground italic">Tidak ada hutang supplier saat ini.</td></tr>
                  ) : dueInvoices.map((inv) => {
                    const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < new Date().getTime();
                    return (
                      <tr key={inv.id} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-8 py-5">
                          {inv.dueDate ? (
                            <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest ${isOverdue ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                              {new Date(inv.dueDate).toLocaleDateString('id-ID')}
                              {isOverdue && ' (TERLEWAT)'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-8 py-5 font-bold text-foreground">
                          {inv.invoiceNo}
                        </td>
                        <td className="px-8 py-5 uppercase font-bold text-muted-foreground">
                          {inv.supplier?.name || 'Unknown'}
                        </td>
                        <td className="px-8 py-5 text-muted-foreground font-medium">
                          {new Date(inv.purchaseDate).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-8 py-5 text-right font-black text-orange-500 text-sm">
                          Rp {inv.totalAmount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Print Area */}
      {isPrinting && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
          {printContent}
        </div>
      )}
    </div>
  );
};

export default Reports;
