import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Trash2, Package, Save, 
  Printer, Loader2, AlertCircle, CheckCircle2, 
  X, Barcode, ArrowRight, Minus
} from 'lucide-react';
import api from '../api';

interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  purchasePrice: number;
}

interface RestockItem {
  id: string;
  name: string;
  barcode: string;
  currentStock: number;
  addQty: number;
  newPurchasePrice: number;
}

const Restock: React.FC = () => {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastRestockedItems, setLastRestockedItems] = useState<RestockItem[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchProducts();
    // Focus search on load
    searchInputRef.current?.focus();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/products');
      setAllProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToRestock = (product: Product) => {
    if (items.find(i => i.id === product.id)) {
      setItems(prev => prev.map(i => i.id === product.id ? { ...i, addQty: i.addQty + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        currentStock: product.stock,
        addQty: 1,
        newPurchasePrice: product.purchasePrice
      }]);
    }
    setSearchTerm('');
    // Focus quantity input of the newly added item
    setTimeout(() => {
      qtyRefs.current[product.id]?.focus();
      qtyRefs.current[product.id]?.select();
    }, 100);
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const product = allProducts.find(p => p.barcode === searchTerm);
    if (product) {
      addItemToRestock(product);
    } else if (searchTerm.length > 0) {
      alert('Produk tidak ditemukan!');
    }
  };

  const updateItem = (id: string, field: keyof RestockItem, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    try {
      await api.post('/products/bulk-restock', {
        items: items.map(i => ({
          id: i.id,
          quantity: i.addQty,
          purchasePrice: i.newPurchasePrice
        }))
      });
      
      setLastRestockedItems([...items]);
      setItems([]);
      alert('Stok berhasil diperbarui!');
      setShowPrintModal(true);
      fetchProducts();
    } catch (error) {
      alert('Gagal menyimpan restok.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintBarcodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeHtml = lastRestockedItems.map(item => {
      const labels = [];
      for (let i = 0; i < item.addQty; i++) {
        labels.push(`
          <div class="barcode-label">
            <div class="header">
              <div class="shop-name">JAKARTA MOTOR</div>
            </div>
            <div class="content">
              <div class="item-name">${item.name}</div>
              <div class="barcode-wrapper">
                <svg class="barcode" 
                  jsbarcode-value="${item.barcode}"
                  jsbarcode-format="CODE128"
                  jsbarcode-width="2"
                  jsbarcode-height="40"
                  jsbarcode-fontSize="14"
                  jsbarcode-fontoptions="bold"
                  jsbarcode-margin="0"
                  jsbarcode-displayValue="true">
                </svg>
              </div>
            </div>
          </div>
        `);
      }
      return labels.join('');
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Barcode Label</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: 40mm 30mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: 'Arial', sans-serif;
            }
            .barcode-label {
              width: 40mm;
              height: 30mm;
              padding: 1.5mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              page-break-after: always;
              border: 0.1mm solid #eee; /* Light border for preview, printer will ignore it usually */
            }
            .shop-name {
              font-size: 7pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5mm;
              border-bottom: 0.2mm solid black;
              padding-bottom: 0.5mm;
              margin-bottom: 1mm;
              text-align: center;
              width: 36mm;
            }
            .item-name {
              font-size: 8pt;
              font-weight: 700;
              text-align: center;
              line-height: 1.1;
              max-height: 2.2em;
              overflow: hidden;
              margin-bottom: 1mm;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            .barcode-wrapper {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              overflow: hidden;
            }
            .barcode {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${barcodeHtml}
          <script>
            window.onload = function() {
              JsBarcode(".barcode").init();
              setTimeout(() => {
                window.print();
                // window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredProducts = searchTerm.length > 1 
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm)).slice(0, 5)
    : [];

  const totalCost = items.reduce((sum, i) => sum + (i.newPurchasePrice * i.addQty), 0);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Batch Restock</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Input stok barang masuk dalam jumlah besar dengan cepat.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setItems([])}
            className="px-6 py-3 bg-muted border border-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted/70 transition-all"
          >
            Bersihkan
          </button>
          <button 
            disabled={items.length === 0 || isSaving}
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-3 disabled:opacity-30"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan & Update Stok
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        {/* Left: Entry Area */}
        <div className="lg:w-1/3 flex flex-col gap-6">
          <div className="glass-card p-8 rounded-[2.5rem] border border-border/50 flex flex-col gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2 block">Cari / Scan Barcode</label>
              <form onSubmit={handleBarcodeScan} className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode di sini..."
                  className="w-full bg-muted/30 border-2 border-border/50 rounded-3xl pl-16 pr-6 py-5 font-black text-lg focus:outline-none focus:border-primary transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>

            <div className="space-y-3">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addItemToRestock(p)}
                  className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-primary/10 rounded-2xl border border-border/30 transition-all group text-left"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Stok: {p.stock} | BC: {p.barcode}</p>
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
              {searchTerm.length > 1 && filteredProducts.length === 0 && (
                <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                  <p className="text-xs font-black text-muted-foreground uppercase">Barang tidak ditemukan</p>
                </div>
              )}
            </div>

            <div className="mt-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/20 border-dashed">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Barcode className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground leading-tight italic">Scan barcode barang secara berurutan untuk memasukkan data dengan cepat.</p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-zinc-900 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
             <div className="relative z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Estimasi Belanja</p>
                <h3 className="text-4xl font-black italic">Rp {totalCost.toLocaleString()}</h3>
             </div>
             <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{items.length} Item Terpilih</p>
                <Package className="w-8 h-8 text-primary/30" />
             </div>
          </div>
        </div>

        {/* Right: List Area */}
        <div className="flex-1 glass-card rounded-[2.5rem] border border-border/50 overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4">Daftar Barang Masuk</h4>
             <span className="text-[10px] font-black px-3 py-1 bg-muted rounded-full">{items.length} Barang</span>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-30 italic p-20">
                <Package className="w-20 h-20" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">Scan barang untuk mulai</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr className="text-muted-foreground text-[9px] uppercase tracking-widest font-black">
                    <th className="px-6 py-4">Barang</th>
                    <th className="px-6 py-4 text-center">Stok Lama</th>
                    <th className="px-6 py-4 text-center">Jumlah Baru</th>
                    <th className="px-6 py-4 text-center">Stok Akhir</th>
                    <th className="px-6 py-4 text-right">Harga Beli Baru</th>
                    <th className="px-6 py-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-xs font-black uppercase tracking-tight">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">BC: {item.barcode}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-muted-foreground">{item.currentStock}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => updateItem(item.id, 'addQty', Math.max(1, item.addQty - 1))} className="p-1 hover:bg-muted rounded"><Minus className="w-3 h-3" /></button>
                          <input 
                            ref={el => qtyRefs.current[item.id] = el}
                            type="number" 
                            className="w-16 bg-muted border border-border rounded-lg px-2 py-1.5 text-center text-xs font-black focus:outline-none focus:ring-1 focus:ring-primary"
                            value={item.addQty}
                            onChange={(e) => updateItem(item.id, 'addQty', parseInt(e.target.value) || 0)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                priceRefs.current[item.id]?.focus();
                                priceRefs.current[item.id]?.select();
                              }
                            }}
                          />
                          <button onClick={() => updateItem(item.id, 'addQty', item.addQty + 1)} className="p-1 hover:bg-muted rounded"><Plus className="w-3 h-3" /></button>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                         <div className="flex items-center justify-center gap-2">
                           <span className="text-xs font-bold text-muted-foreground">{item.currentStock}</span>
                           <ArrowRight className="w-3 h-3 text-primary" />
                           <span className="text-xs font-black text-primary">{item.currentStock + item.addQty}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">Rp</span>
                          <input 
                            ref={el => priceRefs.current[item.id] = el}
                            type="number" 
                            className="w-28 bg-muted border border-border rounded-lg px-3 py-1.5 text-right text-xs font-black focus:outline-none focus:ring-1 focus:ring-primary"
                            value={item.newPurchasePrice}
                            onChange={(e) => updateItem(item.id, 'newPurchasePrice', parseInt(e.target.value) || 0)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                searchInputRef.current?.focus();
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button onClick={() => removeItem(item.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Print Success Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-card w-full max-w-lg rounded-[3rem] p-12 text-center shadow-2xl border border-border animate-in zoom-in duration-500 flex flex-col items-center gap-8">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Restok Berhasil!</h3>
              <p className="text-muted-foreground text-sm font-medium italic">Stok telah diperbarui di database.</p>
            </div>
            
            <div className="w-full space-y-4">
              <button 
                onClick={handlePrintBarcodes}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-105 transition-all flex items-center justify-center gap-3"
              >
                <Printer className="w-6 h-6" /> CETAK BARCODE LABEL ({lastRestockedItems.reduce((s,i) => s + i.addQty, 0)})
              </button>
              <button 
                onClick={() => setShowPrintModal(false)} 
                className="w-full py-5 bg-muted border border-border text-muted-foreground rounded-2xl font-black hover:bg-muted/70 transition-all"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restock;
