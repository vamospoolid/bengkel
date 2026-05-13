import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, Barcode, Loader2, X, Trash2, Edit3, History, Bike, Car, Layers, MapPin, Package, Tag, ChevronDown, ChevronRight, Minus, TrendingUp, ShoppingCart, DollarSign, CheckCircle2, Printer, Download, AlertTriangle } from 'lucide-react';
import api from '../api';
import BarcodeLabel from '../components/BarcodeLabel';

interface Product {
  id: string;
  name: string;
  brand?: string;
  partNumber?: string;
  compatibility?: string; // Legacy
  vehicleType: 'MOTOR' | 'MOBIL' | 'UMUM';
  category: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  priceNormal: number;
  priceGrosir?: number;
  priceMitra?: number;
  location?: string;
  barcode: string;
}

interface StockLog {
  id: string;
  type: string;
  changeQty: number;
  previousStock: number;
  currentStock: number;
  description: string;
  createdAt: string;
  user?: { name: string };
}

const Inventory: React.FC = () => {
  const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'CASHIER';
  const isAdmin = userRole === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [parts, setParts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedProductLogs, setSelectedProductLogs] = useState<StockLog[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Quick Detail Panel
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [quickStockDelta, setQuickStockDelta] = useState(0);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSaved, setStockSaved] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Advanced Adjustment
  const [adjustmentReason, setAdjustmentReason] = useState('DAMAGED');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  // Settings Data
  const [categories, setCategories] = useState<string[]>([]);
  const [racks, setRacks] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<Product>>({ 
    name: '', category: '', purchasePrice: 0, priceNormal: 0, priceGrosir: 0, priceMitra: 0, 
    location: '', stock: 0, barcode: '', minStock: 5, brand: '', partNumber: '', vehicleType: 'UMUM' 
  });

  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'ALL' | 'MOTOR' | 'MOBIL' | 'UMUM'>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(() => {
    return localStorage.getItem('filter_low_stock') === 'true';
  });

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/products');
      setParts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const [catRes, rackRes] = await Promise.all([
        api.get('/app-settings/categories').catch(() => ({ data: { items: [] } })),
        api.get('/app-settings/etalase').catch(() => ({ data: { items: [] } }))
      ]);
      setCategories(catRes.data.items || []);
      setRacks(rackRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      localStorage.removeItem('filter_low_stock'); // Clear on unmount
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        purchasePrice: Number(formData.purchasePrice),
        priceNormal: Number(formData.priceNormal),
        priceGrosir: Number(formData.priceGrosir || 0),
        priceMitra: Number(formData.priceMitra || 0)
      };

      if (editingId) {
        await api.patch(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      fetchProducts();
      setShowModal(false);
      setEditingId(null);
    } catch (error: any) {
      alert('Gagal menyimpan data: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    } catch (error: any) {
      alert('Gagal menghapus item: ' + (error.response?.data?.error || 'Pastikan barang tidak memiliki riwayat transaksi/stok.'));
      console.error('Gagal menghapus item.', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (part: Product) => {
    setProductToDelete(part);
    setShowDeleteConfirm(true);
    setActiveMenuId(null);
  };

  const fetchLogs = async (product: Product) => {
    setIsLoadingLogs(true);
    setCurrentProduct(product);
    setShowLogsModal(true);
    setActiveMenuId(null);
    try {
      const res = await api.get(`/products/${product.id}/stock-logs`);
      setSelectedProductLogs(res.data);
    } catch (error) {
      console.error('Logs failed', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const openEditModal = (part: Product) => {
    setEditingId(part.id);
    setFormData(part);
    setShowModal(true);
    setActiveMenuId(null);
    setShowDetailPanel(false);
  };

  const handleRowClick = (part: Product) => {
    if (activeMenuId) { setActiveMenuId(null); return; }
    setSelectedProduct(part);
    setQuickStockDelta(0);
    setStockSaved(false);
    setShowDetailPanel(true);
  };

  const handleQuickStockSave = async () => {
    if (!selectedProduct || quickStockDelta === 0) return;
    setIsSavingStock(true);
    try {
      if (quickStockDelta < 0) {
        // Use the new advanced adjustment API for negative delta (loss/damage)
        await api.post('/inventory/adjustment', {
          productId: selectedProduct.id,
          quantity: quickStockDelta,
          reason: adjustmentReason,
          notes: adjustmentNotes
        });
      } else {
        // Use standard patch for positive delta (simple restock/correction)
        const newStock = selectedProduct.stock + quickStockDelta;
        await api.patch(`/products/${selectedProduct.id}`, { stock: newStock });
      }

      const newStock = selectedProduct.stock + quickStockDelta;
      const updated = { ...selectedProduct, stock: newStock };
      setSelectedProduct(updated);
      setParts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setQuickStockDelta(0);
      setAdjustmentNotes('');
      setStockSaved(true);
      setTimeout(() => setStockSaved(false), 2000);
    } catch (error: any) {
      alert('Gagal update stok: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSavingStock(false);
    }
  };

  const exportCSV = () => {
    if (parts.length === 0) return alert('Tidak ada data untuk diekspor');
    
    const headers = ['ID', 'Nama Barang', 'Kategori', 'Barcode', 'Stok', 'Min Stok', 'Harga Beli (Modal)', 'Harga Jual Normal', 'Tipe Kendaraan', 'Lokasi'];
    const csvRows = [headers.join(',')];
    
    parts.forEach(p => {
      const row = [
        p.id,
        `"${p.name}"`,
        `"${p.category}"`,
        `"${p.barcode}"`,
        p.stock,
        p.minStock,
        p.purchasePrice,
        p.priceNormal,
        p.vehicleType,
        `"${p.location || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `data_barang_bengkel_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.barcode.includes(searchTerm) ||
      part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = vehicleTypeFilter === 'ALL' || part.vehicleType === vehicleTypeFilter;
    const matchesLowStock = !showLowStockOnly || (part.stock <= part.minStock);
    
    return matchesSearch && matchesType && matchesLowStock;
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black tracking-tighter uppercase">Master Data Barang</h3>
          <p className="text-sm text-muted-foreground font-medium italic">Kelola stok, harga multi-level, dan lokasi gudang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-6 py-4 bg-card hover:bg-muted text-foreground border border-border/50 rounded-[1.5rem] shadow-sm transition-all font-black text-[11px] uppercase tracking-widest"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => { 
              setEditingId(null); 
              setFormData({ 
                name: '', 
                category: categories[0] || '', 
                purchasePrice: 0, 
                priceNormal: 0, 
                priceGrosir: 0, 
                priceMitra: 0, 
                location: racks[0] || '', 
                stock: 0, 
                barcode: '', 
                minStock: 5, 
                brand: '', 
                partNumber: '', 
                vehicleType: 'UMUM' 
              }); 
              setShowModal(true); 
            }} 
            className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all font-black text-sm uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" /> Tambah Item Baru
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-card/30 p-4 rounded-[2rem] border border-border/50 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cari nama, barcode, atau part number..." 
            className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-2xl border border-border/50">
          {(['ALL', 'MOTOR', 'MOBIL', 'UMUM'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setVehicleTypeFilter(type)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                vehicleTypeFilter === type 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {type === 'ALL' ? 'Semua' : type}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${
            showLowStockOnly 
              ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' 
              : 'bg-muted border-border text-muted-foreground hover:border-red-500/50'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${showLowStockOnly ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">Stok Minim</span>
        </button>
        <button className="p-3 bg-muted border border-border rounded-xl text-zinc-400 hover:text-primary hover:border-primary/50 transition-all">
          <Filter className="w-5 h-5" />
        </button>

        {selectedProductIds.length > 0 && (
          <button 
            onClick={() => setShowBarcodeModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-600/30 font-black text-[10px] uppercase tracking-widest animate-in zoom-in-95"
          >
            <Barcode className="w-4 h-4" /> Cetak Batch ({selectedProductIds.length})
          </button>
        )}
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border border-border/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="px-6 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    checked={selectedProductIds.length === filteredParts.length && filteredParts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(filteredParts.map(p => p.id));
                      } else {
                        setSelectedProductIds([]);
                      }
                    }}
                  />
                </th>
                <th className="px-8 py-5">Detail Produk & Spesifikasi</th>
                <th className="px-8 py-5">Kategori & Lokasi</th>
                <th className="px-8 py-5 text-right">Harga (Normal)</th>
                <th className="px-8 py-5">Status Stok</th>
                <th className="px-8 py-5 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">SINKRONISASI DATA BARANG...</p>
                  </div>
                </td></tr>
              ) : filteredParts.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-32 text-center italic text-muted-foreground">Tidak ada item ditemukan.</td></tr>
              ) : filteredParts.map((part) => (
                <tr 
                  key={part.id} 
                  onClick={() => handleRowClick(part)}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-all group cursor-pointer ${
                    selectedProductIds.includes(part.id) ? 'bg-primary/5' : ''
                  } ${
                    selectedProduct?.id === part.id && showDetailPanel ? 'bg-primary/10 border-l-2 border-primary' : ''
                  }`}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      checked={selectedProductIds.includes(part.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(prev => [...prev, part.id]);
                        } else {
                          setSelectedProductIds(prev => prev.filter(id => id !== part.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-2 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center font-black text-xl text-muted-foreground uppercase group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all">
                        {part.vehicleType === 'MOTOR' ? <Bike className="w-6 h-6" /> : 
                         part.vehicleType === 'MOBIL' ? <Car className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-base tracking-tight leading-none mb-1">{part.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border/50">BC: {part.barcode}</span>
                          {part.partNumber && <span className="text-[10px] text-primary/70 font-bold">PN: {part.partNumber}</span>}
                        </div>
                        {part.brand && <p className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest">{part.brand}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <span className="px-2.5 py-1 bg-muted rounded-lg text-[9px] font-black uppercase tracking-widest border border-border/50 block w-fit">{part.category || 'UMUM'}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold">{part.location || 'Area Gudang'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="font-black text-lg text-primary">Rp {part.priceNormal.toLocaleString('id-ID')}</p>
                    {isAdmin && (
                      <p className="text-[9px] text-muted-foreground font-bold">Modal: Rp {part.purchasePrice.toLocaleString('id-ID')}</p>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-muted/40 rounded-xl border border-border/50">
                      <div className={`w-2.5 h-2.5 rounded-full ${part.stock <= part.minStock ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'}`} />
                      <span className={`font-black text-base ${part.stock <= part.minStock ? 'text-red-500' : ''}`}>{part.stock}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">PCS</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right relative">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === part.id ? null : part.id); }} className="p-3 hover:bg-muted rounded-xl transition-all"><MoreVertical className="w-5 h-5 text-muted-foreground" /></button>
                    <ChevronRight className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-all text-primary ${
                      selectedProduct?.id === part.id && showDetailPanel ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                    }`} />
                    {activeMenuId === part.id && (
                      <div className="absolute right-8 top-16 w-52 bg-card border border-border/50 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => fetchLogs(part)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-muted flex items-center gap-3 text-blue-500 border-b border-border/30"><History className="w-4 h-4" /> Kartu Stok</button>
                        <button onClick={(e) => { e.stopPropagation(); setBarcodeProduct(part); setShowBarcodeModal(true); setActiveMenuId(null); }} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-muted flex items-center gap-3 text-orange-500 border-b border-border/30"><Printer className="w-4 h-4" /> Print Label</button>
                        <button onClick={() => openEditModal(part)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-muted flex items-center gap-3"><Edit3 className="w-4 h-4" /> Edit Item</button>
                        <button onClick={() => confirmDelete(part)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 text-red-500 flex items-center gap-3"><Trash2 className="w-4 h-4" /> Hapus</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== QUICK DETAIL PANEL ===== */}
      {showDetailPanel && selectedProduct && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDetailPanel(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full z-[95] w-full max-w-md bg-card border-l border-border/50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-primary/5 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {selectedProduct.vehicleType === 'MOTOR' ? <Bike className="w-5 h-5" /> : 
                   selectedProduct.vehicleType === 'MOBIL' ? <Car className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base leading-none tracking-tight">{selectedProduct.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{selectedProduct.barcode}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailPanel(false)} className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50">{selectedProduct.category || 'UMUM'}</span>
                {selectedProduct.brand && <span className="px-3 py-1 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest">{selectedProduct.brand}</span>}
                <span className="px-3 py-1 bg-muted rounded-xl text-[10px] font-bold flex items-center gap-1.5 border border-border/50">
                  <MapPin className="w-3 h-3 text-primary" />{selectedProduct.location || 'Area Gudang'}
                </span>
              </div>

              {/* STOK SECTION */}
              <div className="bg-muted/40 rounded-[1.5rem] p-5 border border-border/50 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status Stok</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-5xl font-black tabular-nums ${
                      selectedProduct.stock <= selectedProduct.minStock ? 'text-red-500' : 'text-foreground'
                    }`}>
                      {quickStockDelta !== 0 
                        ? selectedProduct.stock + quickStockDelta 
                        : selectedProduct.stock}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold mt-1">PCS tersedia{quickStockDelta !== 0 && <span className={`ml-2 font-black ${quickStockDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>({quickStockDelta > 0 ? '+' : ''}{quickStockDelta})</span>}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-bold">Stok Minimal</p>
                    <p className="text-2xl font-black text-red-500/70">{selectedProduct.minStock}</p>
                  </div>
                </div>

                {/* Quick Adjust */}
                <div className="pt-3 border-t border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Sesuaikan Stok</p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setQuickStockDelta(d => d - 1)}
                      disabled={selectedProduct.stock + quickStockDelta <= 0}
                      className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center font-black text-xl hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input 
                      type="number"
                      className="flex-1 bg-card border-2 border-border rounded-2xl px-4 py-3 font-black text-center text-xl focus:outline-none focus:border-primary transition-all"
                      value={quickStockDelta}
                      onChange={e => setQuickStockDelta(Number(e.target.value))}
                    />
                    <button 
                      onClick={() => setQuickStockDelta(d => d + 1)}
                      className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center font-black text-xl hover:bg-green-500/20 transition-all active:scale-95"
                    >
                      <span className="text-2xl leading-none">+</span>
                    </button>
                  </div>

                  {quickStockDelta < 0 && (
                    <div className="mt-4 space-y-3 p-3 bg-red-500/5 border border-red-500/20 rounded-2xl animate-in slide-in-from-top-2">
                      <div>
                        <label className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">Alasan Pengurangan</label>
                        <select 
                          className="w-full bg-card border border-red-500/30 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-red-500 text-red-600"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                        >
                          <option value="DAMAGED">Barang Rusak / Pecah</option>
                          <option value="DEFECTIVE">Cacat Pabrik</option>
                          <option value="LOST">Barang Hilang</option>
                          <option value="OTHER">Lainnya (Koreksi Biasa)</option>
                        </select>
                      </div>
                      <div>
                        <input 
                          type="text"
                          placeholder="Catatan tambahan (opsional)"
                          className="w-full bg-card border border-red-500/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-foreground"
                          value={adjustmentNotes}
                          onChange={(e) => setAdjustmentNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleQuickStockSave}
                    disabled={quickStockDelta === 0 || isSavingStock}
                    className={`w-full mt-3 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      stockSaved 
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                        : 'bg-primary text-white shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
                    }`}
                  >
                    {isSavingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                     stockSaved ? <><CheckCircle2 className="w-4 h-4" /> Stok Tersimpan!</> :
                     'Simpan Perubahan Stok'}
                  </button>
                </div>
              </div>

              {/* HARGA SECTION */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Skema Harga</p>
                <div className="grid grid-cols-2 gap-3">
                  {isAdmin && (
                    <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><ShoppingCart className="w-3 h-3" />Harga Beli</p>
                      <p className="font-black text-lg">Rp {selectedProduct.purchasePrice.toLocaleString('id-ID')}</p>
                    </div>
                  )}
                  <div className={`bg-primary/5 rounded-2xl p-4 border border-primary/20 ${!isAdmin ? 'col-span-2' : ''}`}>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" />Harga Normal</p>
                    <p className="font-black text-lg text-primary">Rp {selectedProduct.priceNormal.toLocaleString('id-ID')}</p>
                  </div>
                  {(selectedProduct.priceGrosir || 0) > 0 && (
                    <div className="bg-orange-500/5 rounded-2xl p-4 border border-orange-500/20">
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Harga Grosir</p>
                      <p className="font-black text-base">Rp {(selectedProduct.priceGrosir || 0).toLocaleString('id-ID')}</p>
                    </div>
                  )}
                  {(selectedProduct.priceMitra || 0) > 0 && (
                    <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/20">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Harga Bengkel</p>
                      <p className="font-black text-base">Rp {(selectedProduct.priceMitra || 0).toLocaleString('id-ID')}</p>
                    </div>
                  )}
                </div>
                {/* Margin - Admin Only */}
                {isAdmin && (
                  <div className="bg-green-500/5 rounded-2xl p-4 border border-green-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Margin Keuntungan</span>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-green-500">Rp {(selectedProduct.priceNormal - selectedProduct.purchasePrice).toLocaleString('id-ID')}</p>
                      <p className="text-[9px] text-muted-foreground font-bold">
                        {selectedProduct.purchasePrice > 0 ? Math.round(((selectedProduct.priceNormal - selectedProduct.purchasePrice) / selectedProduct.purchasePrice) * 100) : 0}% margin
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Part Number */}
              {selectedProduct.partNumber && (
                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Part Number</p>
                  <p className="font-mono font-black">{selectedProduct.partNumber}</p>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 space-y-2 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setCurrentProduct(selectedProduct); fetchLogs(selectedProduct); }}
                  className="py-2.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <History className="w-3.5 h-3.5" /> Kartu Stok
                </button>
                <button 
                  onClick={() => openEditModal(selectedProduct)}
                  className="py-2.5 bg-muted text-foreground border border-border/50 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Lengkap
                </button>
              </div>
              <button 
                onClick={() => { setBarcodeProduct(selectedProduct); setShowBarcodeModal(true); }}
                className="w-full py-3 bg-orange-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Label Barcode
              </button>
            </div>
          </div>
        </>
      )}

      {/* Barcode Label Modal */}
      {showBarcodeModal && (
        <BarcodeLabel 
          products={parts.filter(p => selectedProductIds.includes(p.id))}
          product={barcodeProduct || undefined}
          onClose={() => {
            setShowBarcodeModal(false);
            setBarcodeProduct(null);
            setSelectedProductIds([]);
          }}
        />
      )}

      {/* Stock Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[85vh] border border-border/50">
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-blue-500/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20"><History className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Kartu Stok Barang</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">{currentProduct?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isLoadingLogs ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Menarik Data Gudang...</p>
                </div>
              ) : selectedProductLogs.length > 0 ? (
                <div className="space-y-4">
                  {selectedProductLogs.map((log) => (
                    <div key={log.id} className="bg-muted/30 rounded-[1.5rem] p-5 border border-border/50 flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${
                          log.type === 'RESTOCK' ? 'bg-green-500/10 text-green-500' : 
                          log.type === 'SALE' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {log.changeQty >= 0 ? '+' : ''}{log.changeQty}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-foreground text-xs uppercase tracking-widest">{log.type}</span>
                            <span className="text-[10px] text-muted-foreground font-bold px-2 py-0.5 bg-muted rounded border border-border/50">
                              {new Date(log.createdAt).toLocaleDateString('id-ID')} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 font-medium italic">{log.description || 'Pencatatan Otomatis System'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Stok Akhir</p>
                        <p className="text-xl font-black text-foreground">{log.currentStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center opacity-30 italic font-black uppercase tracking-[0.2em]">Belum ada riwayat stok barang ini</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal - ENHANCED */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <form onSubmit={handleSubmit} className="bg-card w-full max-w-5xl rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] border border-border/50 animate-in zoom-in duration-300">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-3 bg-muted/50 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all z-20"><X className="w-6 h-6" /></button>
            
            {/* LEFT: SPECS & STOCK */}
            <div className="md:w-1/2 p-10 bg-primary/5 border-r border-border/30 flex flex-col">
              <div className="mb-10 shrink-0">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-1">{editingId ? 'Edit Data Barang' : 'Tambah Data Barang Baru'}</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Spesifikasi teknis & detail stok barang.</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2 block">Identitas Barang</label>
                    <input required type="text" placeholder="NAMA BARANG (CONTOH: BAN LUAR IRC 80/90-14)" className="w-full bg-card border-2 border-border/50 rounded-2xl px-6 py-4 font-black text-lg focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/20" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                        <input required type="text" placeholder="BARCODE / SKU" className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 font-mono font-bold text-sm focus:outline-none" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="relative group">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                        <input type="text" placeholder="PART NUMBER" className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 font-mono font-bold text-sm focus:outline-none" value={formData.partNumber || ''} onChange={e => setFormData({...formData, partNumber: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2 block">Merk / Brand</label>
                      <input type="text" placeholder="ASPUIRA, IRC, FEDERAL..." className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold text-sm" value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2 block">Kategori</label>
                      <div className="relative">
                        <select 
                          required 
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50" 
                          value={formData.category || ''} 
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                          <option value="" disabled>-- Pilih Kategori --</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          {categories.length === 0 && <option value="UMUM">UMUM</option>}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compatibility */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2 block">Jenis Kendaraan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['MOTOR', 'MOBIL', 'UMUM'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, vehicleType: type})}
                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                          formData.vehicleType === type 
                            ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' 
                            : 'bg-card border-border/50 text-muted-foreground grayscale opacity-50 hover:opacity-100 hover:grayscale-0'
                        }`}
                      >
                        {type === 'MOTOR' ? <Bike className="w-5 h-5" /> : 
                         type === 'MOBIL' ? <Car className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock & Location */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Stok Saat Ini</label>
                    <input required type="number" className="w-full bg-muted border-2 border-border/50 rounded-2xl px-4 py-3 font-black text-center" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-red-500/70 uppercase tracking-widest ml-1">Stok Minimal</label>
                    <input required type="number" className="w-full bg-muted border-2 border-border/50 rounded-2xl px-4 py-3 font-black text-center text-red-500" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Lokasi / Rak</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-muted border-2 border-border/50 rounded-2xl px-4 py-3 font-black text-center appearance-none focus:outline-none focus:border-primary" 
                        value={formData.location || ''} 
                        onChange={e => setFormData({...formData, location: e.target.value})}
                      >
                        <option value="">-- Rak --</option>
                        {racks.map(r => <option key={r} value={r}>{r}</option>)}
                        {racks.length === 0 && <option value="GUDANG">GUDANG</option>}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: PRICING */}
            <div className="md:w-1/2 p-10 flex flex-col justify-between">
              <div className="space-y-10">
                <div className="shrink-0">
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Skema Harga</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Multi-level pricing untuk berbagai tipe pelanggan.</p>
                </div>

                <div className="space-y-8">
                  {/* Purchase Price - Admin Only */}
                  {isAdmin && (
                    <div className="p-6 bg-muted/50 rounded-[2rem] border border-border/50 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-focus-within:bg-primary/10 transition-all" />
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 block">Harga Beli (Modal)</label>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-muted-foreground opacity-30">Rp</span>
                        <input required type="number" className="bg-transparent border-0 font-black text-3xl focus:ring-0 w-full outline-none" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                      </div>
                    </div>
                  )}

                  {/* Normal Price */}
                  <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 group-focus-within:scale-150 transition-all duration-700" />
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 block">Harga Jual Normal (Umum)</label>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-black text-primary/30">Rp</span>
                      <input required type="number" className="bg-transparent border-0 font-black text-5xl focus:ring-0 w-full outline-none text-primary" value={formData.priceNormal} onChange={e => setFormData({...formData, priceNormal: Number(e.target.value)})} />
                    </div>
                  </div>

                  {/* Multi Level Prices */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 bg-orange-500/5 rounded-[2rem] border border-orange-500/20">
                      <label className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2 block text-center">Harga Grosir</label>
                      <input type="number" min="0" className="bg-transparent border-0 font-black text-xl text-center focus:ring-0 w-full outline-none" placeholder="0" value={formData.priceGrosir ?? 0} onChange={e => setFormData({...formData, priceGrosir: e.target.value === '' ? 0 : Number(e.target.value)})} />
                    </div>
                    <div className="p-5 bg-blue-500/5 rounded-[2rem] border border-blue-500/20">
                      <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 block text-center">Harga Bengkel</label>
                      <input type="number" min="0" className="bg-transparent border-0 font-black text-xl text-center focus:ring-0 w-full outline-none" placeholder="0" value={formData.priceMitra ?? 0} onChange={e => setFormData({...formData, priceMitra: e.target.value === '' ? 0 : Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-border/50">
                <button type="submit" className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                  <Package className="w-6 h-6" /> SIMPAN DATA BARANG
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-border/50">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                <Trash2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Konfirmasi Hapus</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Apakah Anda yakin ingin menghapus <span className="text-foreground font-black">"{productToDelete.name}"</span>?
                </p>
                <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-muted text-foreground rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-muted/80 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={() => handleDelete(productToDelete.id)}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
