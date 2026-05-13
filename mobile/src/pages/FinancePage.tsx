import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Loader2, CheckCircle2, DollarSign, Tag, FileText, ChevronRight } from 'lucide-react';
import api from '../api';

const COMMON_INCOME_CATEGORIES = ['Penjualan Suku Cadang', 'Jasa Servis', 'Jual Barang Bekas', 'Lainnya'];
const COMMON_EXPENSE_CATEGORIES = ['Listrik & Air', 'Sewa Tempat', 'Gaji Karyawan', 'Alat Tulis Kantor', 'Konsumsi', 'Transportasi', 'Lainnya'];

export const FinancePage: React.FC = () => {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return alert('Nominal harus lebih dari 0');
    if (!category) return alert('Pilih atau isi kategori');

    setIsSaving(true);
    try {
      await api.post('/cashflow', {
        type,
        category,
        amount,
        description,
        date
      });
      setIsSuccess(true);
      // Reset form after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setAmount('');
        setCategory('');
        setDescription('');
      }, 2000);
    } catch (error) {
      alert('Gagal menyimpan data keuangan');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-green-500/20 rounded-[2.5rem] flex items-center justify-center border-2 border-green-500/30 mb-6 shadow-2xl shadow-green-500/20">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-center">Berhasil Disimpan!</h1>
        <p className="text-sm text-muted-foreground mt-2 text-center">Catatan keuangan telah masuk ke sistem pusat.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Input Keuangan</h1>
        <p className="text-xs text-muted-foreground">Catat pemasukan & pengeluaran dari HP</p>
      </div>

      {/* Type Selector */}
      <div className="flex p-1.5 bg-muted rounded-2xl border border-border">
        <button 
          onClick={() => { setType('INCOME'); setCategory(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            type === 'INCOME' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" /> Pemasukan
        </button>
        <button 
          onClick={() => { setType('EXPENSE'); setCategory(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            type === 'EXPENSE' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" /> Pengeluaran
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
            Nominal Transaksi (Rp)
          </label>
          <div className="relative">
            <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 ${type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`} />
            <input 
              required
              type="number"
              placeholder="0"
              className={`w-full bg-card border-2 rounded-2xl pl-12 pr-6 py-5 font-black text-3xl focus:outline-none transition-all ${
                type === 'INCOME' ? 'border-green-500/20 focus:border-green-500' : 'border-red-500/20 focus:border-red-500'
              }`}
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        {/* Date Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tanggal</label>
          <input 
            type="date"
            className="w-full bg-card border border-border rounded-2xl px-5 py-4 font-bold text-sm focus:outline-none focus:border-primary"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Category Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pilih Kategori</label>
          <div className="flex flex-wrap gap-2">
            {(type === 'INCOME' ? COMMON_INCOME_CATEGORIES : COMMON_EXPENSE_CATEGORIES).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  category === cat 
                    ? (type === 'INCOME' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500')
                    : 'bg-card border-border text-muted-foreground active:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Kategori lainnya..."
              className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-primary"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Keterangan (Memo)</label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
            <textarea 
              placeholder="Contoh: Beli oli mesin, Bayar listrik..."
              className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-primary min-h-[100px]"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={isSaving}
          className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 ${
            type === 'INCOME' ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-red-500 text-white shadow-red-500/30'
          }`}
        >
          {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>SIMPAN {type === 'INCOME' ? 'PEMASUKAN' : 'PENGELUARAN'} <ChevronRight className="w-5 h-5" /></>
          )}
        </button>
      </form>
    </div>
  );
};
