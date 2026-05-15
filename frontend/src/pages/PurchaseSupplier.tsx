import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Trash2, Package, Save, 
  Loader2, AlertCircle, CheckCircle2, 
  X, Barcode, ArrowRight, Minus, Truck, Calendar, DollarSign, FileText, ChevronDown, Upload, Image as ImageIcon
} from 'lucide-react';
import api from '../api';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  purchasePrice: number;
}

interface PurchaseItem {
  productId: string;
  name: string;
  barcode: string;
  currentStock: number;
  quantity: number;
  purchasePrice: number;
}

const PurchaseSupplier: React.FC = () => {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Header Info
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [terms, setTerms] = useState('Net 30');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'LUNAS' | 'HUTANG'>('HUTANG');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const supplierRef = useRef<HTMLSelectElement>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchData();
    // Auto-focus supplier on mount
    setTimeout(() => {
      supplierRef.current?.focus();
    }, 500);
  }, []);

  // Auto-calculate Due Date based on Purchase Date and Terms
  useEffect(() => {
    if (status === 'LUNAS') {
      setDueDate('');
      return;
    }

    const date = new Date(purchaseDate);
    if (isNaN(date.getTime())) return;

    if (terms === 'Cash') {
      setDueDate(purchaseDate);
    } else if (terms.startsWith('Net ')) {
      const days = parseInt(terms.split(' ')[1]);
      if (!isNaN(days)) {
        date.setDate(date.getDate() + days);
        setDueDate(date.toISOString().split('T')[0]);
      }
    }
  }, [purchaseDate, terms, status]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [prodRes, supRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers')
      ]);
      console.log('Fetched products:', prodRes.data);
      console.log('Fetched suppliers:', supRes.data);
      setAllProducts(prodRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (error: any) {
      console.error('Failed to fetch data', error);
      alert('Gagal mengambil data produk/supplier. Pastikan backend sudah ter-update.');
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = (product: Product) => {
    if (items.find(i => i.productId === product.id)) {
      setItems(prev => prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        currentStock: product.stock,
        quantity: 1,
        purchasePrice: product.purchasePrice || 0
      }]);
    }
    setSearchTerm('');
    // Focus quantity input of the newly added item
    setTimeout(() => {
      qtyRefs.current[product.id]?.focus();
      qtyRefs.current[product.id]?.select();
    }, 100);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.productId !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(i => 
      i.productId === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ));
  };

  const updateItem = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(prev => prev.map(i => i.productId === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    if (!supplierId || !invoiceNo || items.length === 0) {
      alert('Mohon lengkapi data supplier, nomor nota, dan minimal 1 item barang.');
      return;
    }

    setIsSaving(true);
    try {
      const purchaseData = {
        supplierId,
        invoiceNo,
        purchaseDate,
        dueDate: status === 'HUTANG' ? (dueDate || null) : null,
        status,
        notes,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice
        }))
      };

      if (invoiceFile) {
        const formData = new FormData();
        formData.append('invoice', invoiceFile);
        formData.append('data', JSON.stringify(purchaseData));
        
        await api.post('/suppliers/purchases', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/suppliers/purchases', purchaseData);
      }
      
      alert('Pembelian berhasil dicatat dan stok telah diperbarui!');
      setItems([]);
      setInvoiceNo('');
      setSupplierId('');
      setDueDate('');
      setNotes('');
      setInvoiceFile(null);
      setPreviewUrl(null);
      fetchData();
    } catch (error: any) {
      alert('Gagal menyimpan pembelian: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = searchTerm.length > 1 
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm)).slice(0, 5)
    : [];

  const totalAmount = items.reduce((sum, i) => sum + (i.purchasePrice * i.quantity), 0);

  return (
    <div className="min-h-full flex flex-col gap-6 pb-10 relative">
      <div className="sticky top-0 z-[50] -mx-8 px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 mb-2">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Input Pembelian Supplier</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Catat nota pembelian barang dan update stok otomatis.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            disabled={items.length === 0 || isSaving}
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 transition-all flex items-center gap-3 disabled:opacity-30 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Transaksi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* LEFT: Header Info & Search */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Header Card */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-border/50 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2 block">Pilih Supplier</label>
              <div className="relative">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select 
                  ref={supplierRef}
                  className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-3 font-bold appearance-none focus:outline-none focus:border-primary"
                  value={supplierId}
                  onChange={e => {
                    setSupplierId(e.target.value);
                    if (e.target.value) invoiceRef.current?.focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && supplierId) invoiceRef.current?.focus();
                  }}
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 block">Nomor Nota</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    {/* Bug #8 fix: ref was declared but never attached to this input */}
                    <input 
                      ref={invoiceRef}
                      type="text" 
                      placeholder="INV-XXX" 
                      className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none focus:border-primary transition-all"
                      value={invoiceNo}
                      onChange={e => setInvoiceNo(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && invoiceNo) searchInputRef.current?.focus();
                      }}
                    />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 block">Tanggal Beli</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="date" 
                      className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none"
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 block">Status Bayar</label>
                  <div className="flex bg-muted rounded-xl p-1">
                    {(['LUNAS', 'HUTANG'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                          status === s ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-2 block ${status === 'HUTANG' ? 'text-primary' : 'text-muted-foreground opacity-30'}`}>Termin (Terms)</label>
                  <div className={`relative ${status !== 'HUTANG' && 'opacity-30 pointer-events-none'}`}>
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select 
                      className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none appearance-none"
                      value={terms}
                      disabled={status !== 'HUTANG'}
                      onChange={e => setTerms(e.target.value)}
                    >
                      <option value="Cash">Cash / COD</option>
                      <option value="Net 7">Net 7 Hari</option>
                      <option value="Net 15">Net 15 Hari</option>
                      <option value="Net 30">Net 30 Hari</option>
                      <option value="Net 45">Net 45 Hari</option>
                      <option value="Net 60">Net 60 Hari</option>
                      <option value="Net 90">Net 90 Hari</option>
                    </select>
                  </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className={`text-[10px] font-black uppercase tracking-widest ml-2 block ${status === 'HUTANG' ? 'text-red-500' : 'text-muted-foreground opacity-30'}`}>Estimasi Jatuh Tempo</label>
               <div className={`relative ${status !== 'HUTANG' && 'opacity-30 pointer-events-none'}`}>
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="date" 
                    disabled={status !== 'HUTANG'}
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
               </div>
            </div>

            {/* Upload Nota */}
            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 block">Upload Foto Nota / Bukti</label>
               <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    id="invoice-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setInvoiceFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label 
                    htmlFor="invoice-upload"
                    className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 border-2 border-dashed border-border rounded-[2rem] cursor-pointer group-hover:border-primary/50 transition-all overflow-hidden relative min-h-[160px]"
                  >
                    {previewUrl ? (
                      <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Preview" />
                    ) : null}
                    <div className="relative z-10 flex flex-col items-center gap-2">
                       <div className="p-3 bg-card rounded-2xl shadow-lg group-hover:scale-110 transition-all">
                          <Upload className="w-6 h-6 text-primary" />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-center">
                         {invoiceFile ? invoiceFile.name : 'Klik untuk Upload Foto'}
                       </p>
                    </div>
                  </label>
               </div>
            </div>
          </div>

          {/* Search Card */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-border/50 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2 block">Tambah Barang</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari nama atau scan barcode..."
                  className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-6 py-4 font-black focus:outline-none focus:border-primary transition-all"
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    
                    // Optional: Auto-add if exact match is found immediately (some scanners don't send Enter)
                    // We only do this if the length is significant to avoid false positives during typing
                    if (val.length >= 4) {
                      const exactMatch = allProducts.find(p => p.barcode === val);
                      if (exactMatch) {
                        addItem(exactMatch);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      const exactMatch = allProducts.find(p => p.barcode === searchTerm.trim() || p.name.toLowerCase() === searchTerm.trim().toLowerCase());
                      if (exactMatch) {
                        addItem(exactMatch);
                      } else if (filteredProducts.length === 1) {
                        addItem(filteredProducts[0]);
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-primary/10 rounded-2xl border border-border/30 transition-all group text-left"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Stok: {p.stock} | Rp {p.purchasePrice.toLocaleString()}</p>
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 bg-zinc-900 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
             <div className="relative z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Pembelian</p>
                <h3 className="text-4xl font-black italic">Rp {totalAmount.toLocaleString('id-ID')}</h3>
             </div>
             <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{items.length} Macam Barang</p>
                <DollarSign className="w-8 h-8 text-primary/30" />
             </div>
          </div>
        </div>

        {/* RIGHT: List Area */}
        <div className="lg:col-span-8 glass-card rounded-[2.5rem] border border-border/50 overflow-hidden flex flex-col shadow-sm">
          <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
             <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-4">Detail Item yang Dibeli</h4>
             <span className="text-[10px] font-black px-4 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">Checklist Belanja</span>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-30 italic p-20">
                <Package className="w-20 h-20" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">Pilih barang dari menu kiri</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr className="text-muted-foreground text-[9px] uppercase tracking-widest font-black">
                    <th className="px-8 py-5">Informasi Barang</th>
                    <th className="px-8 py-5 text-center">Jumlah Beli</th>
                    <th className="px-8 py-5 text-right">Harga Beli Baru</th>
                    <th className="px-8 py-5 text-right">Subtotal</th>
                    <th className="px-8 py-5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.productId} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-sm font-black uppercase tracking-tight">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">BC: {item.barcode}</span>
                          <span className="text-[9px] font-bold text-primary italic">Stok Gudang: {item.currentStock}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-4">
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.productId, -1)} 
                            className="p-2 bg-muted rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                            <input 
                              ref={el => qtyRefs.current[item.productId] = el}
                              type="number" 
                              min="1"
                              className="w-24 bg-background border-2 border-border rounded-xl px-3 py-2.5 text-center text-sm font-black focus:outline-none focus:border-primary transition-all text-foreground shadow-inner"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                updateItem(item.productId, 'quantity', isNaN(val) ? 0 : val);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  priceRefs.current[item.productId]?.focus();
                                  priceRefs.current[item.productId]?.select();
                                }
                              }}
                            />
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.productId, 1)} 
                            className="p-2 bg-muted rounded-xl hover:bg-green-500/10 hover:text-green-500 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="relative w-40 ml-auto">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-muted-foreground opacity-50">Rp</span>
                          <input 
                            ref={el => priceRefs.current[item.productId] = el}
                            type="number" 
                            className="w-full bg-background border-2 border-border rounded-xl pl-10 pr-4 py-2.5 text-right text-sm font-black focus:outline-none focus:border-primary transition-all text-foreground shadow-inner"
                            value={item.purchasePrice}
                            placeholder={String(allProducts.find(p => p.id === item.productId)?.purchasePrice || 0)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              updateItem(item.productId, 'purchasePrice', isNaN(val) ? 0 : val);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                searchInputRef.current?.focus();
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <p className="text-base font-black text-foreground">Rp {(item.purchasePrice * item.quantity).toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => removeItem(item.productId)} className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-8 border-t border-border/50 bg-muted/10">
             <div className="flex items-center gap-4 text-muted-foreground bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <p className="text-xs font-bold leading-relaxed italic">Catatan: Menyimpan transaksi ini akan otomatis menambah stok di menu Inventory dan mencatat pengeluaran di menu Finance (jika status LUNAS).</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSupplier;
