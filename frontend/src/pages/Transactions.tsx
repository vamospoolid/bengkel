import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, ChevronRight, X, RotateCcw, AlertCircle, 
  CheckCircle2, User, Calendar, CreditCard, Loader2, 
  ShoppingCart, Filter, RefreshCw, ChevronDown, Printer, Wrench,
  Minus, Plus, MessageSquare
} from 'lucide-react';
import api from '../api';
import Receipt from '../components/Receipt';


interface TransactionItem {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  type: 'PART' | 'SERVICE';
  returnedQty?: number;
}

interface Transaction {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  discount: number;
  tax: number;
  paymentType: string;
  status: string;
  createdAt: string;
  vehicle?: {
    plateNumber: string;
    model: string;
  };
  customer?: {
    name: string;
  };
  items: TransactionItem[];
  reprintCount: number;
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');

  // Filters State
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workshopProfile, setWorkshopProfile] = useState({ 
    name: 'JAKARTA MOTOR', 
    address: '', 
    phone: '', 
    taxRate: 11,
    footerMessage: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchWorkshopProfile();
  }, [dateFilter, methodFilter, statusFilter]);

  const fetchWorkshopProfile = async () => {
    try {
      const res = await api.get('/app-settings/workshop_profile');
      if (res.data && res.data.items && res.data.items.length > 0) {
        const data = JSON.parse(res.data.items[0]);
        setWorkshopProfile(data);
      }
    } catch (error) {
      console.warn('Workshop profile not found');
    }
  };


  // Reset return quantities when modal opens
  useEffect(() => {
    if (isReturnModalOpen && selectedTx) {
      setReturnReason('');
      const initial: Record<string, number> = {};
      selectedTx.items.forEach(item => {
        // Default to 0, user will increment
        initial[item.id] = 0;
      });
      setReturnQuantities(initial);
    }
  }, [isReturnModalOpen, selectedTx]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      
      if (dateFilter !== 'all') {
        const start = new Date();
        if (dateFilter === 'today') start.setHours(0, 0, 0, 0);
        if (dateFilter === 'week') start.setDate(start.getDate() - 7);
        if (dateFilter === 'month') start.setMonth(start.getMonth() - 1);
        params.startDate = start.toISOString();
      }

      if (methodFilter !== 'all') params.paymentType = methodFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get('/transactions', { params });
      setTransactions(res.data);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedTx) return;

    // Filter only items with qty > 0
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty }));

    if (itemsToReturn.length === 0) {
      alert('Pilih minimal 1 item untuk diretur.');
      return;
    }

    const isFullReturn = itemsToReturn.length === selectedTx.items.length && 
      itemsToReturn.every(ret => {
        const original = selectedTx.items.find(i => i.id === ret.id);
        return ret.qty === ((original?.quantity || 0) - (original?.returnedQty || 0));
      });

    if (!window.confirm(isFullReturn ? 'Return seluruh transaksi ini?' : 'Return item yang dipilih?')) return;

    setIsProcessingReturn(true);
    try {
      await api.post('/pos/return-partial', {
        transactionId: selectedTx.id,
        itemsToReturn,
        reason: returnReason
      });
      alert('Return berhasil diproses!');
      setIsReturnModalOpen(false);
      setSelectedTx(null);
      fetchTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal memproses return.');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  const updateReturnQty = (itemId: string, delta: number, max: number) => {
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(max, (prev[itemId] || 0) + delta))
    }));
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.vehicle?.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (tx: Transaction) => {
    // We need to wait for the hidden receipt to render with the selected tx
    // Or just create a temporary div to render it
    const printContent = document.getElementById('receipt-print-hidden');
    if (!printContent) return;
    
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html>
        <head>
          <title>Nota - ${tx.invoiceNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              #receipt-print { width: 80mm; box-shadow: none !important; border: none !important; }
            }
          </style>
        </head>
        <body class="bg-white">
          ${printContent.outerHTML.replace('receipt-print-hidden', 'receipt-print')}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
  };

  const sendWA = (tx: Transaction) => {
    const phone = (tx as any).customer?.phone || (tx as any).customer?.whatsapp || '';
    if (!phone) return alert('No. HP pelanggan tidak tersedia.');

    const itemsStr = tx.items.map(i => `- ${i.name} (${i.quantity}x)`).join('%0A');
    const message = `Halo Pak/Bu ${tx.customer?.name || ''}, ini nota dari Jakarta Motor.%0A%0ANo: ${tx.invoiceNo}%0ADate: ${new Date(tx.createdAt).toLocaleDateString()}%0A%0AItems:%0A${itemsStr}%0A%0ATotal: Rp ${tx.totalAmount.toLocaleString()}%0A%0ATerima kasih telah servis di Jakarta Motor!`;
    
    let formatted = phone.replace(/[^0-9]/g, '');
    if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1);
    else if (!formatted.startsWith('62')) formatted = '62' + formatted;

    const url = `https://wa.me/${formatted}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Riwayat Transaksi</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Audit & kelola seluruh aktivitas kasir Jakarta Motor.</p>
        </div>
        
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="relative group">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="appearance-none bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Method Filter */}
          <div className="relative group">
            <select 
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="appearance-none bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="all">Semua Metode</option>
              <option value="TUNAI">Tunai</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative group">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="COMPLETED">Berhasil</option>
              <option value="PARTIAL_RETURNED">Retur Sebagian</option>
              <option value="RETURNED">Diretur Total</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <button onClick={fetchTransactions} className="p-2.5 bg-muted rounded-xl hover:bg-muted/70 transition-all text-muted-foreground hover:text-primary">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden glass-card rounded-[2.5rem] border border-border/50 shadow-sm flex flex-col">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari No. Invoice atau Plat Nomor..."
              className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6">{filteredTransactions.length} Transaksi Ditemukan</p>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sinkronisasi Data...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                <tr className="text-muted-foreground text-[10px] uppercase tracking-widest font-black">
                  <th className="px-8 py-5">Invoice & Waktu</th>
                  <th className="px-8 py-5">Pelanggan / Plat</th>
                  <th className="px-8 py-5 text-center">Metode</th>
                  <th className="px-8 py-5 text-right">Total Akhir</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => (
                  <tr 
                    key={tx.id} 
                    className="hover:bg-primary/[0.02] transition-colors cursor-pointer group"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="px-8 py-6">
                      <p className="font-black text-sm group-hover:text-primary transition-colors">{tx.invoiceNo}</p>
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </td>
                    <td className="px-8 py-6">
                      {tx.vehicle ? (
                        <div className="flex items-center gap-2">
                           <span className="font-mono font-black text-xs bg-muted px-2 py-1 rounded border border-border/50 uppercase">
                            {tx.vehicle.plateNumber}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{tx.vehicle.model}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-foreground uppercase">
                          {tx.customer?.name || 'Walk-in Customer'}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 bg-muted rounded-lg text-[9px] font-black uppercase tracking-widest border border-border/50 text-muted-foreground">
                        {tx.paymentType}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-black text-base text-primary">Rp {tx.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase border ${
                        tx.status === 'RETURNED' 
                          ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                          : tx.status === 'PARTIAL_RETURNED'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in duration-300 border border-border/50">
            {/* Left: Summary & Stats */}
            <div className="md:w-72 p-8 bg-primary/5 border-r border-border/30 flex flex-col">
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tighter">{selectedTx.invoiceNo}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Catatan Invoice Digital</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Informasi Pelanggan</span>
                    <div className="bg-card p-5 rounded-2xl border border-border/50">
                      <p className="text-sm font-black uppercase">{selectedTx.customer?.name || 'Walk-in / Umum'}</p>
                      {selectedTx.vehicle && (
                        <p className="text-xs font-mono font-bold text-primary mt-1">{selectedTx.vehicle.plateNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Metode & Status</span>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-card p-4 rounded-2xl border border-border/50 text-center">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Metode</p>
                          <p className="text-xs font-black text-primary">{selectedTx.paymentType}</p>
                       </div>
                       <div className="bg-card p-4 rounded-2xl border border-border/50 text-center">
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Status</p>
                          <p className={`text-xs font-black ${selectedTx.status === 'RETURNED' ? 'text-red-500' : selectedTx.status === 'PARTIAL_RETURNED' ? 'text-orange-500' : 'text-green-500'}`}>{selectedTx.status}</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-border/20">
                <div className="p-6 bg-primary rounded-3xl text-white shadow-xl shadow-primary/20">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Total Pembayaran</p>
                  <p className="text-2xl font-black italic tracking-tighter">Rp {selectedTx.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Right: Items List */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/10">
                <h4 className="text-xs font-black uppercase tracking-widest">Detail Item</h4>
                <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="space-y-4">
                  {selectedTx.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 hover:bg-muted/30 rounded-2xl transition-all border border-border/30 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${item.type === 'PART' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {item.type === 'PART' ? <ShoppingCart className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground font-bold">
                            {item.quantity} {(item.returnedQty || 0) > 0 && <span className="text-red-500">(Retur: {item.returnedQty})</span>} x Rp {item.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-foreground">Rp {((item.quantity - (item.returnedQty || 0)) * item.price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-muted/40 rounded-3xl border border-border/50 space-y-3">
                  {selectedTx.reprintCount > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-orange-500/20 pb-2 mb-2">
                      <span>Riwayat Cetak</span>
                      <span>{selectedTx.reprintCount}x Dicetak</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Subtotal</span>
                    <span>Rp {(selectedTx.totalAmount - selectedTx.tax + selectedTx.discount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Pajak (11%)</span>
                    <span>Rp {selectedTx.tax.toLocaleString()}</span>
                  </div>
                  {selectedTx.discount > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-green-500 uppercase tracking-widest">
                      <span>Diskon</span>
                      <span>- Rp {selectedTx.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest">Total Invoice</span>
                      <span className="text-lg font-black text-foreground italic">Rp {selectedTx.totalAmount.toLocaleString()}</span>
                    </div>
                    {selectedTx.items.reduce((acc, item) => acc + (item.returnedQty || 0), 0) > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-2xl border border-red-500/20 animate-pulse">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Dana Diretur (Refund)</span>
                        <span className="text-sm font-black text-red-500">- Rp {selectedTx.items.reduce((acc, item) => acc + ((item.returnedQty || 0) * item.price), 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                      <span className="text-xs font-black uppercase tracking-widest text-primary">Saldo Akhir</span>
                      <span className="text-xl font-black text-primary italic">Rp {(selectedTx.totalAmount - selectedTx.items.reduce((acc, item) => acc + ((item.returnedQty || 0) * item.price), 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/20 border-t border-border/50 flex gap-3">
                {selectedTx.status !== 'RETURNED' && (
                  <button 
                    onClick={() => setIsReturnModalOpen(true)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-3"
                  >
                    <RotateCcw className="w-5 h-5" /> Kelola Retur
                  </button>
                )}
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    const originalText = btn.innerHTML;
                    try {
                      btn.disabled = true;
                      btn.innerHTML = '<span class="animate-spin">⏳</span> Mengirim...';
                      await api.post('/print/receipt', { transactionId: selectedTx.id });
                      btn.innerHTML = '✅ Berhasil';
                      setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                      }, 2000);
                      fetchTransactions(); 
                    } catch (err: any) {
                      btn.disabled = false;
                      btn.innerHTML = originalText;
                      alert('Gagal cetak thermal: ' + (err.response?.data?.error || err.message));
                    }
                  }}
                  className="flex-1 bg-primary text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  title="Cetak Silent ke Printer Kasir"
                >
                  <Printer className="w-5 h-5" /> CETAK ULANG (SILENT)
                </button>
                <button 
                  onClick={() => handlePrint(selectedTx)}
                  className="bg-muted border border-border hover:bg-muted-foreground/10 p-5 rounded-[1.5rem] text-muted-foreground transition-all"
                  title="Cetak via Browser (A4/PDF)"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => sendWA(selectedTx)}
                  className="bg-green-500 hover:bg-green-600 text-white p-5 rounded-[1.5rem] shadow-lg shadow-green-500/20 transition-all flex items-center justify-center"
                  title="Kirim WhatsApp"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal (Enhanced for Partial) */}
      {isReturnModalOpen && selectedTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="bg-card w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-border/50 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                 <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Pilih Item Retur</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Tentukan jumlah barang yang akan dikembalikan.</p>
              </div>
            </div>

            <div className="space-y-4 mb-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {selectedTx.items.map((item) => {
                const max = item.quantity - (item.returnedQty || 0);
                if (max <= 0) return null;

                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border/30">
                    <div>
                      <p className="text-xs font-black uppercase">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">Tersedia: {max}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-1">
                      <button 
                        onClick={() => updateReturnQty(item.id, -1, max)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-black text-sm">
                        {returnQuantities[item.id] || 0}
                      </span>
                      <button 
                        onClick={() => updateReturnQty(item.id, 1, max)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 mb-8">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Alasan Retur (Opsional)</span>
              <textarea 
                placeholder="Contoh: Barang Pecah, Salah Ukuran, dll..."
                className="w-full bg-background border border-border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-sm h-24 resize-none"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsReturnModalOpen(false)} className="flex-1 py-4 bg-muted hover:bg-muted/70 rounded-2xl font-black text-xs uppercase transition-all">Batal</button>
              <button 
                type="button"
                onClick={handleReturn} 
                disabled={isProcessingReturn || !Object.values(returnQuantities).some(v => v > 0)} 
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingReturn ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Konfirmasi Retur'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        {selectedTx && (
          <div id="receipt-print-hidden">
            <Receipt workshop={workshopProfile} transaction={selectedTx as any} />
          </div>
        )}
      </div>
    </div>

  );
};

export default Transactions;
