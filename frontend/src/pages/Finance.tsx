import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Loader2, X, Search, Calendar, Filter, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Tag, FileText } from 'lucide-react';
import api from '../api';

interface CashflowRecord {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  description?: string;
  loggedBy: string;
}

interface FinanceProps {
  activeTab?: 'income' | 'expense' | 'finance';
}

const COMMON_INCOME_CATEGORIES = ['Penjualan Suku Cadang', 'Jasa Servis', 'Jual Barang Bekas', 'Lainnya'];
const COMMON_EXPENSE_CATEGORIES = ['Listrik & Air', 'Sewa Tempat', 'Gaji Karyawan', 'Alat Tulis Kantor', 'Konsumsi', 'Transportasi', 'Lainnya'];

const Finance: React.FC<FinanceProps> = ({ activeTab = 'finance' }) => {
  const [records, setRecords] = useState<CashflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [newRecord, setNewRecord] = useState<Partial<CashflowRecord>>({
    type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchRecords();
  }, [activeTab]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await api.get('/finance');
      setRecords(res.data);
    } catch (error: any) {
      console.error('Failed to fetch finance records', error);
      const msg = error?.response?.data?.error || error?.message || 'Gagal memuat data keuangan.';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRecord.amount! <= 0) return alert('Nominal harus lebih dari 0');
    
    setIsSaving(true);
    try {
      await api.post('/finance', newRecord);
      setShowAddModal(false);
      setNewRecord({ 
        type: activeTab === 'income' ? 'INCOME' : 'EXPENSE', 
        category: '', 
        amount: 0, 
        description: '', 
        date: new Date().toISOString().split('T')[0] 
      });
      fetchRecords();
    } catch (error) {
      alert('Gagal menyimpan transaksi.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesTab = activeTab === 'finance' || 
                      (activeTab === 'income' && r.type === 'INCOME') || 
                      (activeTab === 'expense' && r.type === 'EXPENSE');
    
    const matchesSearch = r.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;

    // Date Filtering
    let matchesDate = true;
    const recDate = new Date(r.date);
    const now = new Date();
    
    if (dateFilter === 'TODAY') {
      matchesDate = recDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      matchesDate = recDate >= weekAgo;
    } else if (dateFilter === 'MONTH') {
      matchesDate = recDate.getMonth() === now.getMonth() && recDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'CUSTOM') {
      const s = startDate ? new Date(startDate) : null;
      const e = endDate ? new Date(endDate) : null;
      if (s) { s.setHours(0,0,0,0); matchesDate = matchesDate && recDate >= s; }
      if (e) { e.setHours(23,59,59,999); matchesDate = matchesDate && recDate <= e; }
    }

    return matchesTab && matchesSearch && matchesCategory && matchesDate;
  });

  // Bug #7 fix: use filteredRecords for summary so the cards reflect active date/category filter
  // Previously was using raw `records` — cards showed ALL-TIME totals even when filter was "Hari Ini"
  const totalIncome = filteredRecords.filter(r => r.type === 'INCOME').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = filteredRecords.filter(r => r.type === 'EXPENSE').reduce((sum, r) => sum + r.amount, 0);
  
  // Keep all-time totals for the "HARI INI" sub-label (always uses records, not filtered)
  const today = new Date().toISOString().split('T')[0];
  const incomeToday = records.filter(r => r.type === 'INCOME' && r.date.split('T')[0] === today).reduce((sum, r) => sum + r.amount, 0);
  const expenseToday = records.filter(r => r.type === 'EXPENSE' && r.date.split('T')[0] === today).reduce((sum, r) => sum + r.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const isStrictIncome = activeTab === 'income';
  const isStrictExpense = activeTab === 'expense';

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-1">
            {activeTab === 'finance' ? 'Arus Kas Bengkel' : activeTab === 'income' ? 'Data Pemasukan' : 'Data Pengeluaran'}
          </h2>
          <p className="text-sm text-muted-foreground font-medium italic">
            {activeTab === 'finance' ? 'Monitoring seluruh arus kas masuk dan keluar.' : activeTab === 'income' ? 'Catat dan kelola seluruh pendapatan operasional.' : 'Catat dan kelola seluruh biaya & pengeluaran.'}
          </p>
        </div>
        <button 
          onClick={() => {
            setNewRecord(prev => ({ ...prev, type: activeTab === 'income' ? 'INCOME' : 'EXPENSE' }));
            setShowAddModal(true);
          }}
          className={`flex items-center gap-3 px-8 py-4 text-white rounded-[1.5rem] shadow-xl transition-all font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 ${
            activeTab === 'expense' ? 'bg-red-500 shadow-red-500/30' : 'bg-primary shadow-primary/30'
          }`}
        >
          <Plus className="w-6 h-6" />
          {activeTab === 'income' ? 'Catat Pemasukan' : activeTab === 'expense' ? 'Catat Pengeluaran' : 'Tambah Catatan'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`glass-card p-8 rounded-[2.5rem] relative overflow-hidden group transition-all border ${activeTab === 'income' ? 'border-green-500/50 bg-green-500/[0.02]' : 'border-border/50'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
          <div className="flex items-center gap-5 mb-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Pemasukan</p>
              <h3 className="text-2xl font-black text-green-500 font-mono tracking-tighter">Rp {totalIncome.toLocaleString('id-ID')}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-[10px] font-black px-2 py-0.5 bg-green-500/20 text-green-600 rounded-md">HARI INI</span>
            <span className="text-xs font-bold text-muted-foreground font-mono">Rp {incomeToday.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className={`glass-card p-8 rounded-[2.5rem] relative overflow-hidden group transition-all border ${activeTab === 'expense' ? 'border-red-500/50 bg-red-500/[0.02]' : 'border-border/50'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16" />
          <div className="flex items-center gap-5 mb-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
              <TrendingDown className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Pengeluaran</p>
              <h3 className="text-2xl font-black text-red-500 font-mono tracking-tighter">Rp {totalExpense.toLocaleString('id-ID')}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-[10px] font-black px-2 py-0.5 bg-red-500/20 text-red-600 rounded-md">HARI INI</span>
            <span className="text-xs font-bold text-muted-foreground font-mono">Rp {expenseToday.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-primary/50 transition-all border border-border/50 bg-primary/[0.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="flex items-center gap-5 mb-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Saldo Akhir</p>
              <h3 className={`text-2xl font-black font-mono tracking-tighter ${netBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                {netBalance < 0 ? '-' : ''} Rp {Math.abs(netBalance).toLocaleString('id-ID')}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4 bg-card/30 p-6 rounded-[2rem] border border-border/50 backdrop-blur-sm">
        <div className="flex flex-col xl:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder={`Cari ${activeTab === 'income' ? 'pemasukan' : activeTab === 'expense' ? 'pengeluaran' : 'transaksi'}...`}
              className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border w-full xl:w-fit overflow-x-auto whitespace-nowrap">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'TODAY', label: 'Hari Ini' },
              { id: 'WEEK', label: '7 Hari' },
              { id: 'MONTH', label: 'Bulan Ini' },
              { id: 'CUSTOM', label: 'Custom' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  dateFilter === f.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="w-full xl:w-64">
            <select
              className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-sm appearance-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">SEMUA KATEGORI</option>
              {Array.from(new Set(records.filter(r => activeTab === 'finance' || (activeTab === 'income' ? r.type === 'INCOME' : r.type === 'EXPENSE')).map(r => r.category))).map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/20 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dari:</label>
              <input 
                type="date" 
                className="bg-muted/50 border border-border rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:border-primary transition-all"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sampai:</label>
              <input 
                type="date" 
                className="bg-muted/50 border border-border rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:border-primary transition-all"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-card/40 rounded-[2.5rem] border border-border/50 shadow-xl overflow-hidden backdrop-blur-sm">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse italic">Menganalisis Buku Kas...</p>
          </div>
        ) : fetchError ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <X className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-black text-sm uppercase tracking-widest text-red-500 mb-1">Gagal Memuat Data</p>
              <p className="text-xs text-muted-foreground italic max-w-xs">{fetchError}</p>
            </div>
            <button
              onClick={fetchRecords}
              className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-32 text-center text-muted-foreground flex flex-col items-center gap-4 opacity-50">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="font-bold text-lg uppercase tracking-widest">Belum ada catatan {activeTab === 'income' ? 'pemasukan' : activeTab === 'expense' ? 'pengeluaran' : 'keuangan'}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black border-b border-border">
                  <th className="px-10 py-6">Waktu & Info</th>
                  <th className="px-10 py-6">Kategori</th>
                  <th className="px-10 py-6">Deskripsi Transaksi</th>
                  <th className="px-10 py-6 text-right">Nominal Arus Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                          record.type === 'INCOME' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {record.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-sm">{new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</p>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{record.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-xl border border-border w-fit group-hover:border-primary/30 transition-all">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] font-black uppercase tracking-tight">{record.category}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-medium text-muted-foreground italic leading-relaxed max-w-md">
                        {record.description || 'Tanpa keterangan tambahan'}
                      </p>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <p className={`text-xl font-black font-mono tracking-tighter ${record.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                        {record.type === 'INCOME' ? '+' : '-'} Rp {record.amount.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Dicatat Oleh: {record.loggedBy || 'System'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refined Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-border/50 animate-in zoom-in duration-300">
            <div className={`p-8 border-b border-border/50 flex items-center justify-between ${newRecord.type === 'INCOME' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shadow-lg ${newRecord.type === 'INCOME' ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                  {newRecord.type === 'INCOME' ? <TrendingUp className="text-white w-6 h-6" /> : <TrendingDown className="text-white w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">
                    {newRecord.type === 'INCOME' ? 'Catat Pemasukan Baru' : 'Catat Pengeluaran Baru'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Simpan data transaksi kas Jakarta Motor.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="p-10 space-y-8">
              {/* Type Switcher - HIDDEN IF IN STRICT TAB */}
              {activeTab === 'finance' && (
                <div className="flex p-2 bg-muted rounded-[2rem] border border-border">
                  <button 
                    type="button" 
                    onClick={() => setNewRecord({...newRecord, type: 'INCOME'})}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${
                      newRecord.type === 'INCOME' ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Pemasukan
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewRecord({...newRecord, type: 'EXPENSE'})}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${
                      newRecord.type === 'EXPENSE' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" /> Pengeluaran
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Pilih Kategori</label>
                    <div className="flex flex-wrap gap-2">
                      {(newRecord.type === 'INCOME' ? COMMON_INCOME_CATEGORIES : COMMON_EXPENSE_CATEGORIES).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewRecord({...newRecord, category: cat})}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${
                            newRecord.category === cat 
                              ? (newRecord.type === 'INCOME' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500')
                              : 'bg-muted border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Kategori Custom</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-muted border-2 border-border/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all font-bold text-sm"
                      placeholder="Input kategori jika tidak ada di atas..."
                      value={newRecord.category}
                      onChange={e => setNewRecord({...newRecord, category: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 block mb-3 ${newRecord.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                      Nominal {newRecord.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} (RP)
                    </label>
                    <input
                      required
                      type="number"
                      className={`w-full bg-zinc-900 border-2 rounded-[1.5rem] px-6 py-5 focus:outline-none transition-all font-black text-3xl font-mono shadow-inner ${
                        newRecord.type === 'INCOME' ? 'border-green-500/30 text-green-500 focus:border-green-500' : 'border-red-500/30 text-red-500 focus:border-red-500'
                      }`}
                      placeholder="0"
                      value={newRecord.amount || ''}
                      onChange={e => setNewRecord({...newRecord, amount: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Keterangan / Memo</label>
                    <textarea
                      className="w-full bg-muted border-2 border-border/50 rounded-[1.2rem] px-5 py-4 focus:outline-none focus:border-primary transition-all font-medium text-sm min-h-[120px]"
                      placeholder="Detail transaksi untuk audit..."
                      value={newRecord.description}
                      onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border/50">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 bg-muted hover:bg-red-500/10 hover:text-red-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex-[2] py-5 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 ${
                    newRecord.type === 'INCOME' ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'
                  }`}
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> SIMPAN {newRecord.type === 'INCOME' ? 'PEMASUKAN' : 'PENGELUARAN'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;

