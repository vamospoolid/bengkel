import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, Camera, Truck, FileText, 
  Calendar, Plus, Minus, 
  Loader2, Save, ShoppingCart, ScanLine 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
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
  quantity: number;
  purchasePrice: number;
}

export const PurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'LUNAS' | 'HUTANG'>('LUNAS');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchInitialData();
    return () => { stopScanner(); };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products')
      ]);
      setSuppliers(supRes.data);
      setAllProducts(prodRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 150));
    try {
      const qr = new Html5Qrcode('purchase-reader');
      scannerRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 130 } },
        (decoded) => {
          stopScanner();
          handleBarcodeResult(decoded);
        },
        () => {}
      );
    } catch (err: any) {
      console.error(err);
      alert('Camera Error: ' + err);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleBarcodeResult = (barcode: string) => {
    const product = allProducts.find(p => p.barcode === barcode);
    if (product) {
      openItemModal(product);
    } else {
      alert('Barang tidak ditemukan di database. Mohon daftarkan barang terlebih dahulu di menu Stok.');
    }
  };

  const openItemModal = (product: Product) => {
    setSelectedProduct(product);
    setTempQty(1);
    setTempPrice(product.purchasePrice || 0);
    setShowItemModal(true);
  };

  const addItem = () => {
    if (!selectedProduct) return;
    
    setItems(prev => {
      const existing = prev.find(i => i.productId === selectedProduct.id);
      if (existing) {
        return prev.map(i => i.productId === selectedProduct.id 
          ? { ...i, quantity: i.quantity + tempQty, purchasePrice: tempPrice } 
          : i
        );
      }
      return [...prev, {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        barcode: selectedProduct.barcode,
        quantity: tempQty,
        purchasePrice: tempPrice
      }];
    });
    
    setShowItemModal(false);
    setSelectedProduct(null);
    setSearchTerm('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.productId !== id));
  };

  const handleSave = async () => {
    if (!supplierId || !invoiceNo || items.length === 0) {
      alert('Lengkapi data supplier, invoice, dan barang.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        supplierId,
        invoiceNo,
        purchaseDate,
        status,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice
        }))
      };

      await api.post('/suppliers/purchases', payload);
      alert('Pembelian berhasil disimpan!');
      navigate('/');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menyimpan pembelian');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = searchTerm.length > 1 
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm)).slice(0, 5)
    : [];

  const totalAmount = items.reduce((s, i) => s + (i.quantity * i.purchasePrice), 0);

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="pb-32 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-muted rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Input Pembelian</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Stok Masuk & Nota Supplier</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Step 1: Supplier & Invoice */}
        <div className="glass-card rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest">Informasi Nota</h2>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-bold appearance-none focus:ring-2 focus:ring-primary/40 outline-none"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="No. Invoice"
                  className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none uppercase"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="date"
                  className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex bg-muted rounded-xl p-1">
              {(['LUNAS', 'HUTANG'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                    status === s ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Add Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Barang yang Dibeli</h2>
            <p className="text-[10px] font-black text-primary">{items.length} Macam</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="Cari nama atau scan..."
                className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/40 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={isScanning ? stopScanner : startScanner}
              className={`p-3 rounded-xl border-2 transition-all ${isScanning ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-primary/10 border-primary/50 text-primary'}`}>
              <Camera className="w-6 h-6" />
            </button>
          </div>

          {/* Camera View */}
          {isScanning && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-black aspect-video">
              <div id="purchase-reader" className="w-full h-full" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-16 border-2 border-primary rounded-lg opacity-50" />
              </div>
              <p className="absolute bottom-2 w-full text-center text-[10px] font-bold text-white/70 uppercase tracking-widest">
                <ScanLine className="w-3 h-3 inline mr-1" />Arahkan ke barcode
              </p>
            </div>
          )}

          {/* Search Results */}
          {filtered.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50 shadow-xl">
              {filtered.map(p => (
                <button key={p.id} onClick={() => openItemModal(p)} className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-all text-left">
                  <div>
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.barcode}</p>
                  </div>
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              ))}
            </div>
          )}

          {/* Selected Items List */}
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.productId} className="glass-card p-4 rounded-2xl border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs">
                  {item.quantity}x
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate uppercase tracking-tight">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">Rp {item.purchasePrice.toLocaleString('id-ID')} / pcs</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xs">Rp {(item.quantity * item.purchasePrice).toLocaleString('id-ID')}</p>
                  <button onClick={() => removeItem(item.productId)} className="text-[10px] font-bold text-red-400 mt-1 uppercase">Hapus</button>
                </div>
              </div>
            ))}

            {items.length === 0 && !isScanning && (
              <div className="py-12 flex flex-col items-center gap-4 opacity-30 text-center">
                <ShoppingCart className="w-12 h-12" />
                <p className="text-xs font-black uppercase tracking-widest">Belum ada barang dipilih</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-xl border-t border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Pembelian</p>
            <p className="text-2xl font-black text-primary font-mono italic">Rp {totalAmount.toLocaleString('id-ID')}</p>
          </div>
          <button onClick={handleSave} disabled={isSaving || items.length === 0 || !supplierId || !invoiceNo}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan
          </button>
        </div>
      </div>

      {/* Item Config Modal */}
      {showItemModal && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowItemModal(false)} />
          <div className="relative w-full bg-card rounded-t-[2.5rem] border-t border-border p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Atur Jumlah & Harga</p>
              <h3 className="text-xl font-black uppercase tracking-tight">{selectedProduct.name}</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block text-center">Jumlah Beli</label>
                <div className="flex items-center justify-center gap-6">
                  <button onClick={() => setTempQty(q => Math.max(1, q - 1))} className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Minus /></button>
                  <span className="text-4xl font-black font-mono w-20 text-center">{tempQty}</span>
                  <button onClick={() => setTempQty(q => q + 1)} className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Plus /></button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Harga Beli Baru (Satuan)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Rp</span>
                  <input 
                    type="number"
                    className="w-full bg-muted border border-border rounded-2xl pl-12 pr-4 py-4 font-black text-lg focus:ring-2 focus:ring-primary/40 outline-none"
                    value={tempPrice}
                    onChange={e => setTempPrice(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex justify-between items-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Subtotal Item</p>
                <p className="font-black text-primary">Rp {(tempQty * tempPrice).toLocaleString('id-ID')}</p>
              </div>

              <button onClick={addItem} className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">
                Tambahkan Ke Daftar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
