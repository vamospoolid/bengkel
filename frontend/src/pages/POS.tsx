import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, SearchIcon, History, X, Calendar, Wrench, Loader2, CheckCircle2, User as UserIcon, AlertCircle, RefreshCw, DollarSign, Printer, FileText, Smartphone, ScanLine } from 'lucide-react';
import api from '../api';
import Receipt from '../components/Receipt';
import { type CustomerType } from '../data/mock';

interface Product {
  id: string;
  name: string;
  brand?: string;
  partNumber?: string;
  category: string;
  stock: number;
  minStock: number;
  priceNormal: number;
  priceGrosir?: number;
  priceMitra?: number;
  barcode: string;
  compatibility?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  estimatedTime: string;
}

interface Customer {
  id: string;
  name: string;
  type: string;
}

interface Mechanic {
  id: string;
  name: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'part' | 'service';
  priceTier?: 'normal' | 'grosir' | 'bengkel';
  mechanicId?: string;
  isMechanicFault?: boolean;
}

interface WorkshopProfile {
  name: string;
  address: string;
  phone: string;
  taxRate: number;
  footerMessage: string;
  qrisImage?: string;
  bankAccount?: string;
}

const POS: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [parts, setParts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'parts' | 'services'>('parts');
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerType, setCustomerType] = useState<CustomerType>('Umum');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'qris' | 'transfer' | 'hutang'>('tunai');
  const [cashReceived, setCashReceived] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [pulledWorkOrder, setPulledWorkOrder] = useState<any | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerWA, setCustomerWA] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [workshopProfile, setWorkshopProfile] = useState<WorkshopProfile>({ 
    name: 'JAKARTA MOTOR', 
    address: '', 
    phone: '', 
    taxRate: 11,
    footerMessage: '',
    qrisImage: '',
    bankAccount: ''
  });
  const [autoPrint, setAutoPrint] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [onlyShopping, setOnlyShopping] = useState(false);
  const [doneOrders, setDoneOrders] = useState<any[]>([]);
  const [showDonePanel, setShowDonePanel] = useState(true);
  const [isFetchingDone, setIsFetchingDone] = useState(false);

  useEffect(() => {
    fetchData();
    fetchWorkshopProfile();
    fetchDoneOrders();
    const interval = setInterval(fetchDoneOrders, 30000); // auto-refresh every 30s
    // Check if plate is in URL
    const params = new URLSearchParams(window.location.search);
    const plate = params.get('plate');
    if (plate) {
      setPlateNumber(plate.toUpperCase());
    }
    return () => clearInterval(interval);
  }, []);

  const fetchDoneOrders = async () => {
    setIsFetchingDone(true);
    try {
      const res = await api.get('/work-orders?status=DONE');
      console.log('API CALL: /work-orders?status=DONE', res.data);
      setDoneOrders(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch done orders:', err);
    } finally {
      setIsFetchingDone(false);
    }
  };

  // Auto-pull workshop data when plate number is typed (debounce 800ms)
  useEffect(() => {
    if (customerType !== 'Umum') return;
    if (!plateNumber || plateNumber.trim().length < 6) {
      setPullError(null);
      return;
    }
    if (pulledWorkOrder) return; // already pulled, don't re-trigger

    const timer = setTimeout(() => {
      pullFromWorkshopAuto(plateNumber.trim());
    }, 800);

    return () => clearTimeout(timer);
  }, [plateNumber]);

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const bufferTimeout = useRef<any>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Reset timeout on every key
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current);

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 2) {
          // Find product by barcode
          const product = parts.find(p => p.barcode === barcodeBuffer);
          if (product) {
            addToCart(product, 'part');
          }
        }
        setBarcodeBuffer('');
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        
        // If not completed with Enter within 100ms, it's likely manual typing or junk
        bufferTimeout.current = setTimeout(() => {
          setBarcodeBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
    };
  }, [barcodeBuffer, parts]);

  const fetchWorkshopProfile = async () => {
    try {
      const res = await api.get('/app-settings/workshop_profile');
      if (res.data && res.data.items && res.data.items.length > 0) {
        const data = JSON.parse(res.data.items[0]) as WorkshopProfile;
        setWorkshopProfile({
          ...workshopProfile,
          ...data
        });
      }
    } catch (error) {
      console.warn('Workshop profile not found, using defaults');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch parts separately to ensure they show up even if others fail
      const pRes = await api.get('/products').catch(e => { console.error('Parts fail', e); return { data: [] }; });
      setParts(pRes.data || []);

      const cRes = await api.get('/customers').catch(e => { console.error('Cust fail', e); return { data: [] }; });
      setCustomers(cRes.data || []);

      const mRes = await api.get('/mechanics').catch(e => { console.error('Mech fail', e); return { data: [] }; });
      setMechanics(mRes.data || []);

      const sRes = await api.get('/services').catch(e => { console.error('Serv fail', e); return { data: [] }; });
      setServices(sRes.data || []);

      if (pRes.data.length === 0) {
        console.warn('No parts returned from server');
      }
    } catch (err) {
      setError('Gagal menghubungi server. Pastikan backend di port 3002 menyala.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPrice = (item: any, type: 'part' | 'service', tier: 'normal' | 'grosir' | 'bengkel') => {
    if (type === 'service') return item.price;
    if (tier === 'grosir') return item.priceGrosir || item.priceNormal;
    if (tier === 'bengkel') return item.priceMitra || item.priceNormal;
    return item.priceNormal;
  };

  const getTierFromCustomerType = (type: CustomerType): 'normal' | 'grosir' | 'bengkel' => {
    if (type === 'Grosir') return 'grosir';
    if (type === 'Bengkel') return 'bengkel';
    return 'normal';
  };

  const handleCustomerTypeChange = (newType: CustomerType) => {
    setCustomerType(newType);
    const newTier = getTierFromCustomerType(newType);
    if (newType === 'Umum') setSelectedCustomerId(null);
    setCart(prev => prev.map(i => {
      if (i.type === 'service') return i;
      const part = parts.find(p => p.id === i.id);
      if (!part) return i;
      return { ...i, priceTier: newTier, price: getPrice(part, 'part', newTier) };
    }));
  };

  const addToCart = (item: any, type: 'part' | 'service') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      const tier = getTierFromCustomerType(customerType);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: getPrice(item, type, tier), quantity: 1, type, priceTier: tier }];
    });
  };

  const updatePriceTier = (id: string, tier: 'normal' | 'grosir' | 'bengkel') => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.type === 'part') {
        const part = parts.find(p => p.id === item.id);
        if (!part) return item;
        return { ...item, priceTier: tier, price: getPrice(part, 'part', tier) };
      }
      return item;
    }));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updatePrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, price: newPrice } : item
    ));
  };

  const updateMechanic = (itemId: string, mechanicId: string) => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, mechanicId } : item
    ));
  };

  const toggleMechanicFault = (itemId: string) => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, isMechanicFault: !item.isMechanicFault } : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.isMechanicFault ? 0 : item.price * item.quantity), 0);
  const tax = subtotal * (workshopProfile.taxRate / 100);
  const total = subtotal + tax - discount;

  const filteredParts = parts.filter(p => {
    const s = searchTerm.toLowerCase();
    return (p.name?.toLowerCase().includes(s) || p.barcode?.toLowerCase().includes(s));
  });

  const doWorkshopSearch = async (plate: string) => {
    setIsSearching(true);
    setPullError(null);
    try {
      const encoded = encodeURIComponent(plate);
      const res = await api.get(`/workshop/search/${encoded}`);
      const task = res.data;

      const serviceItems: CartItem[] = (task.serviceDetails || []).map((svc: any) => ({
        id: svc.id,
        name: svc.name,
        price: svc.price,
        quantity: 1,
        type: 'service' as const,
        mechanicId: task.mechanic?.id
      }));

      setWorkOrderId(task.id);
      setPulledWorkOrder(task);

      // If it's a workshop order (DONE), fill the cart with services
      if (task.mode === 'WORKSHOP') {
        if (serviceItems.length === 0) {
          setPullError('Unit ditemukan tapi belum ada jasa yang dipilih di bengkel.');
          setCart([]);
        } else {
          setCart(serviceItems);
        }
      } else {
        // If it's just a vehicle record (Option A), just clear cart and show it's recognized
        setCart([]);
        setPullError(null); // Clear error since vehicle IS found
      }
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 404) {
        setPullError('Data plat nomor tidak terdaftar.');
      } else {
        setPullError('Gagal menghubungi server.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const pullFromWorkshopAuto = (plate: string) => doWorkshopSearch(plate);

  const pullFromWorkshop = () => {
    if (!plateNumber.trim()) return;
    clearWorkshopData();
    doWorkshopSearch(plateNumber.trim());
  };

  const clearWorkshopData = () => {
    setWorkOrderId(null);
    setPulledWorkOrder(null);
    setCart([]);
    setPlateNumber('');
    setCustomerSearchTerm('');
    setSelectedCustomerId(null);
  };
  
  const processPayment = async () => {
    setIsCheckoutProcessing(true);
    try {
      let finalCustomerId = selectedCustomerId;

      // Handle new customer creation if name is typed but no customer selected
      if (!finalCustomerId && customerSearchTerm.trim() && customerType !== 'Umum') {
        const mappedType = customerType === 'Grosir' ? 'GROSIR' : 'MITRA';
        try {
          const newCustRes = await api.post('/customers', { 
            name: customerSearchTerm.trim().toUpperCase(), 
            type: mappedType,
            whatsapp: customerWA.trim() || null
          });
          finalCustomerId = newCustRes.data.id;
        } catch (err) {
          console.error('Failed to create customer automatically', err);
        }
      }

      const res = await api.post('/pos/checkout', {
        cart,
        plateNumber: (customerType === 'Umum' && plateNumber.trim()) ? plateNumber.trim() : null,
        customerId: finalCustomerId || null,
        totalAmount: Number(total),
        tax: Number(tax),
        discount: Number(discount),
        paymentType: paymentMethod.toUpperCase(),
        workOrderId: workOrderId || null
      });
      
      const transaction = res.data.transaction;
      if (!transaction) throw new Error('Backend tidak mengembalikan data transaksi.');

      setLastTransaction({
        ...transaction,
        items: cart,
        customer: customers.find(c => c.id === selectedCustomerId),
        vehicle: pulledWorkOrder?.vehicle || (plateNumber ? { plateNumber, model: pulledWorkOrder?.model } : null),
        cashReceived: paymentMethod === 'tunai' ? Number(cashReceived) : null
      });
      
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      setCart([]);
      setPlateNumber('');
      setCashReceived(0);
      setWorkOrderId(null);
      setPulledWorkOrder(null);
      fetchData();

      // SILENT PRINT TRIGGER
      if (autoPrint && transaction.id) {
        handleSilentPrint(transaction.id);
      }
    } catch (error: any) {
      console.error('Checkout error detail:', error);
      const msg = error.response?.data?.error || error.message || 'Gagal memproses pembayaran.';
      alert(`ERROR: ${msg}`);
    } finally {
      setIsCheckoutProcessing(false);
    }
  };

  const handleSilentPrint = async (transactionId: string) => {
    setIsPrinting(true);
    try {
      await api.post('/print/receipt', { transactionId });
    } catch (err: any) {
      console.error('Silent print failed', err);
      const errorMsg = err.response?.data?.error || err.message;
      alert(`Gagal mencetak otomatis: ${errorMsg}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-print');
    if (!printContent) return;
    
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html>
        <head>
          <title>Nota - ${lastTransaction?.invoiceNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              #receipt-print { width: 80mm; box-shadow: none !important; border: none !important; }
            }
          </style>
        </head>
        <body class="bg-white">
          ${printContent.outerHTML}
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

  return (
    <div className="h-full flex gap-8 relative">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex bg-muted p-1 rounded-xl shadow-inner border border-border/30">
            <button onClick={() => setActiveTab('parts')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'parts' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Suku Cadang</button>
            <button onClick={() => setActiveTab('services')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Layanan</button>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cari Barang / Barcode..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  const exactMatch = parts.find(p => p.barcode === searchTerm.trim() || p.name.toLowerCase() === searchTerm.trim().toLowerCase());
                  if (exactMatch) {
                    addToCart(exactMatch, 'part');
                    setSearchTerm('');
                  } else if (filteredParts.length === 1) {
                    addToCart(filteredParts[0], 'part');
                    setSearchTerm('');
                  }
                }
              }}
              className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" 
            />
          </div>
        </div>

        {/* ─── READY FOR CHECKOUT BAR ─── */}
        {doneOrders.length > 0 && (
          <div className="animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="p-1 bg-green-500/20 rounded-md">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              </div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unit Siap Checkout</label>
              <button onClick={fetchDoneOrders} className={`text-muted-foreground hover:text-primary transition-colors ${isFetchingDone ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {doneOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => {
                    setPlateNumber(order.plateNumber);
                    setOnlyShopping(false);
                    setPullError(null);
                    setTimeout(() => pullFromWorkshopAuto(order.plateNumber), 100);
                  }}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-card border border-green-500/20 rounded-2xl hover:bg-green-500/5 hover:border-green-500 transition-all group shadow-sm active:scale-95"
                >
                  <div className="w-7 h-7 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-all">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[13px] tracking-widest group-hover:text-green-400 transition-colors leading-none">{order.plateNumber}</p>
                    <p className="text-[9px] text-muted-foreground truncate mt-1">{order.model || 'Unit'}</p>
                  </div>
                  <div className="ml-1 pl-2 border-l border-border/50">
                    <span className="text-[8px] font-black text-primary uppercase">BAYAR ›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-card rounded-2xl border border-border shadow-sm">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-bold italic text-muted-foreground">Menghubungkan ke database...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-10">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="font-bold text-red-500">{error}</p>
              <button onClick={fetchData} className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <RefreshCw className="w-4 h-4" /> COBA LAGI
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-muted/80 sticky top-0 backdrop-blur-md z-10 border-b border-border">
                <tr className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Nama Item</th>
                  <th className="px-4 py-3 font-bold">Kategori</th>
                  <th className="px-4 py-3 font-bold">Stok</th>
                  <th className="px-4 py-3 font-bold text-right">Harga</th>
                  <th className="px-4 py-3 font-bold w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeTab === 'parts' ? (
                  parts.length > 0 ? (
                    filteredParts.map(part => (
                      <tr key={part.id} className="hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => addToCart(part, 'part')}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-sm group-hover:text-primary transition-colors">{part.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">BC: {part.barcode}</p>
                        </td>
                        <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-1 bg-muted rounded-md uppercase">{part.category}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs font-bold ${part.stock <= part.minStock ? 'text-red-500' : 'text-green-500'}`}>{part.stock}</span></td>
                        <td className="px-4 py-3 text-right"><p className="text-primary font-black text-sm">Rp {getPrice(part, 'part', getTierFromCustomerType(customerType)).toLocaleString()}</p></td>
                        <td className="px-4 py-3 text-right"><button className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"><Plus className="w-4 h-4" /></button></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-4 py-20 text-center text-muted-foreground italic text-sm">Database suku cadang kosong. Cek server Anda.</td></tr>
                  )
                ) : (
                  services.map(service => (
                    <tr key={service.id} className="hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => addToCart(service, 'service')}>
                      <td className="px-4 py-3" colSpan={2}><p className="font-bold text-sm group-hover:text-primary transition-colors">{service.name}</p></td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md uppercase">Layanan</span></td>
                      <td className="px-4 py-3 text-right"><p className="text-primary font-black text-sm">Rp {service.price.toLocaleString()}</p></td>
                      <td className="px-4 py-3 text-right"><button className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"><Plus className="w-4 h-4" /></button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="w-[450px] flex flex-col h-full overflow-hidden">
        <div className="glass-card p-6 rounded-2xl flex flex-col h-full shadow-xl overflow-hidden border border-border">
          <div className="flex items-center justify-between mb-6 border-b border-border pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><ShoppingCart className="text-primary w-5 h-5" /></div>
              <h3 className="font-bold text-lg">Pesanan Saat Ini</h3>
            </div>
            {doneOrders.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full animate-in fade-in zoom-in duration-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{doneOrders.length} Siap Bayar</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 mb-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase mb-2 block tracking-widest">Jenis Pelanggan</label>
              <div className="flex bg-muted p-1 rounded-xl">
                {(['Umum', 'Grosir', 'Bengkel'] as CustomerType[]).map(type => (
                  <button key={type} onClick={() => handleCustomerTypeChange(type)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${customerType === type ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>{type}</button>
                ))}
              </div>
            </div>
            {customerType === 'Umum' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                   <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" checked={onlyShopping} onChange={(e) => {
                          setOnlyShopping(e.target.checked);
                          if (e.target.checked) {
                            setPlateNumber('');
                            clearWorkshopData();
                          }
                        }} className="sr-only peer" />
                        <div className="w-7 h-3.5 bg-zinc-700 rounded-full peer-checked:bg-primary transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full peer-checked:translate-x-3.5 transition-transform"></div>
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">Hanya Belanja (Tanpa Plat)</span>
                   </label>
                </div>

                {!onlyShopping && (
                  <div className="flex gap-2 animate-in slide-in-from-top-2">
                    <input
                      type="text"
                      placeholder="B 1234 ABC"
                      value={plateNumber}
                      onChange={(e) => {
                        setPlateNumber(e.target.value.toUpperCase());
                        setPullError(null);
                        if (pulledWorkOrder) {
                          setWorkOrderId(null);
                          setPulledWorkOrder(null);
                          setCart([]);
                        }
                      }}
                      className={`flex-1 bg-muted border rounded-xl px-4 py-3 font-mono font-black text-center tracking-widest focus:outline-none focus:ring-2 transition-all ${
                        pulledWorkOrder ? 'border-green-500/50 focus:ring-green-500/30' :
                        pullError ? 'border-orange-500/30 focus:ring-orange-500/20' :
                        'border-border focus:ring-primary/50'
                      }`}
                    />
                    <button
                      onClick={pullFromWorkshop}
                      disabled={isSearching}
                      className="px-3 py-3 bg-muted border border-border text-zinc-400 rounded-xl hover:text-primary hover:border-primary/50 transition-all flex items-center"
                      title="Cari ulang"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Wrench className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                
                {onlyShopping && (
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300">
                     <div className="p-2 bg-primary/10 rounded-lg"><ShoppingCart className="w-4 h-4 text-primary" /></div>
                     <p className="text-[10px] font-bold text-muted-foreground leading-tight uppercase tracking-wider">Mode Retail Aktif:<br/><span className="text-primary">Pelanggan Umum (Walk-in)</span></p>
                  </div>
                )}
                {isSearching && (
                  <p className="text-[10px] text-zinc-500 text-center animate-pulse">Mencari data di bengkel...</p>
                )}
                {pulledWorkOrder && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                          {pulledWorkOrder.mode === 'WORKSHOP' ? '✓ Data Bengkel Terambil' : '✓ Pelanggan Terdaftar'}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold mt-0.5">{pulledWorkOrder.customerName}</p>
                          <button 
                            onClick={() => {
                              const newName = prompt('Ubah Nama Pelanggan:', pulledWorkOrder.customerName);
                              const newPlate = prompt('Ubah Plat Nomor:', plateNumber);
                              if (newName !== null) setPulledWorkOrder({...pulledWorkOrder, customerName: newName});
                              if (newPlate !== null) setPlateNumber(newPlate.toUpperCase());
                            }}
                            className="p-1 hover:bg-green-500/20 rounded-md transition-colors"
                            title="Edit data pelanggan"
                          >
                            <UserIcon className="w-3 h-3 text-green-500" />
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {pulledWorkOrder.mode === 'WORKSHOP' 
                            ? `Mekanik: ${pulledWorkOrder.mechanic?.name || 'Tidak ditunjuk'}`
                            : `Unit: ${pulledWorkOrder.model || 'Motor Umum'}`
                          }
                        </p>
                      </div>
                      <button onClick={clearWorkshopData} className="text-zinc-500 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
                {pullError && !pulledWorkOrder && plateNumber.length >= 6 && (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <p className="text-[10px] font-bold text-orange-400">⚠ {pullError}</p>
                    {pullError.includes('terdaftar') && (
                      <p className="text-[10px] text-zinc-500 mt-1 italic">Daftarkan pelanggan baru di menu Pelanggan jika ini kunjungan pertama.</p>
                    )}
                    {!pullError.includes('terdaftar') && (
                      <p className="text-[10px] text-zinc-500 mt-1">Pastikan unit sudah berstatus <span className="font-bold text-green-500">SELESAI</span> di Kontrol Bengkel.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative group">
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Ketik Nama Pelanggan..." 
                      className="w-full bg-muted border border-border rounded-xl pl-12 pr-10 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setSelectedCustomerId(null);
                        setShowCustomerSuggestions(true);
                      }}
                      onFocus={() => setShowCustomerSuggestions(true)}
                    />
                    {customerSearchTerm && (
                      <button 
                        onClick={() => { setCustomerSearchTerm(''); setSelectedCustomerId(null); setCustomerWA(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-foreground/10 rounded-full text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {showCustomerSuggestions && customerSearchTerm.length >= 2 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                      {customers
                        .filter(c => 
                          c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) && 
                          c.type !== 'UMUM'
                        )
                        .map(c => (
                          <button
                            key={c.id}
                            className="w-full px-5 py-3 text-left hover:bg-primary/5 border-b border-border/30 last:border-0 flex items-center justify-between group"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearchTerm(c.name);
                              setCustomerWA((c as any).whatsapp || (c as any).phone || '');
                              setShowCustomerSuggestions(false);
                              
                              // Auto-switch tab based on customer type for correct pricing
                              const targetType = c.type === 'GROSIR' ? 'Grosir' : 'Bengkel';
                              if (customerType !== targetType) {
                                handleCustomerTypeChange(targetType);
                              }
                            }}
                          >
                            <div>
                              <p className="text-sm font-black uppercase tracking-tight text-green-500 transition-colors">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{c.type === 'GROSIR' ? 'GROSIR' : 'BENGKEL'}</p>
                            </div>
                            {selectedCustomerId === c.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </button>
                        ))
                      }
                      {customerSearchTerm.trim() && !customers.find(c => c.name.toLowerCase() === customerSearchTerm.toLowerCase()) && (
                        <button
                          className="w-full px-5 py-4 text-left hover:bg-primary/10 bg-primary/5 flex items-center gap-3 transition-all"
                          onClick={() => setShowCustomerSuggestions(false)}
                        >
                          <div className="p-2 bg-primary rounded-lg text-white shadow-lg"><Plus className="w-3 h-3" /></div>
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Tambah Baru</p>
                            <p className="text-sm font-black uppercase tracking-tight">"{customerSearchTerm.toUpperCase()}"</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                  {/* Backdrop to close suggestions */}
                  {showCustomerSuggestions && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowCustomerSuggestions(false)} />
                  )}
                </div>

                {/* WhatsApp Input for Customer */}
                <div className="relative animate-in slide-in-from-top-2">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  <input 
                    type="text" 
                    placeholder="No. WhatsApp (0812...)" 
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all text-xs"
                    value={customerWA}
                    onChange={(e) => setCustomerWA(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-3 mb-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center opacity-40 py-20">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-sm font-bold">Keranjang Masih Kosong</p>
                <p className="text-[10px]">Klik tombol (+) untuk menambah barang</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex flex-col gap-3 p-3 bg-muted/40 rounded-xl border border-border/50 hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold group-hover:text-primary transition-colors">{item.name}</h5>
                    <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  {item.type === 'service' && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3 h-3 text-primary" />
                      <select value={item.mechanicId || ''} onChange={(e) => updateMechanic(item.id, e.target.value)} className="flex-1 bg-card border border-border rounded-md text-[10px] font-bold p-1 outline-none focus:border-primary">
                        <option value="">-- Pilih Mekanik --</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-1">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-muted rounded"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-muted rounded"><Plus className="w-3 h-3" /></button>
                      </div>

                      {item.type === 'part' && (
                        <div className="flex bg-card rounded-lg border border-border p-0.5">
                          {(['normal', 'grosir', 'bengkel'] as const).map(tier => (
                            <button
                              key={tier}
                              onClick={() => updatePriceTier(item.id, tier)}
                              className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${
                                item.priceTier === tier 
                                  ? tier === 'normal' ? 'bg-zinc-500 text-white' :
                                    tier === 'grosir' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {tier.substring(0, 1)}
                            </button>
                          ))}
                        </div>
                      )}

                      {item.type === 'part' && (
                        <button 
                          onClick={() => toggleMechanicFault(item.id)}
                          title="Tandai rusak oleh mekanik (Ganti stok tanpa menagih pelanggan)"
                          className={`p-1.5 rounded-lg border text-[10px] font-black transition-all ${item.isMechanicFault ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted border-transparent text-muted-foreground hover:text-red-500'}`}
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {item.isMechanicFault ? (
                      <p className="text-xs font-black text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">FREE (RUSAK)</p>
                    ) : (
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-card/80 border border-border/50 rounded-lg px-2 py-1 focus-within:border-primary transition-all">
                          <span className="text-[10px] font-black text-muted-foreground">Rp</span>
                          <input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                            className="w-20 bg-transparent text-right text-sm font-black text-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground/40 mt-1 uppercase tracking-tighter">Sub: Rp {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-6 space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">Rp {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-lg font-black pt-2 border-t border-border/50"><span>Total Tagihan</span><span className="text-primary">Rp {total.toLocaleString()}</span></div>
          </div>

          <div className="flex items-center gap-3 mt-4 px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} className="sr-only peer" />
                <div className="w-8 h-4 bg-zinc-700 rounded-full peer-checked:bg-primary transition-colors"></div>
                <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">Cetak Otomatis</span>
            </label>
          </div>

          <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="w-full mt-4 py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">BAYAR SEKARANG</button>
        </div>
      </div>

      {/* Modals follow ... */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-5xl rounded-[3.5rem] overflow-hidden shadow-2xl relative border border-border/50 animate-in zoom-in duration-300 flex flex-col md:flex-row max-h-[90vh]">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-8 right-8 p-3 bg-muted/50 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all z-20"><X className="w-6 h-6" /></button>
            
            {/* LEFT COLUMN: ORDER SUMMARY */}
            <div className="md:w-1/2 p-10 bg-primary/5 border-r border-border/30 flex flex-col">
              <div className="mb-10 shrink-0">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Ringkasan Pesanan</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Silakan verifikasi item pelanggan.</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-4 mb-10">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-card/50 rounded-2xl border border-border/30 group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'part' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {item.type === 'part' ? <ShoppingCart className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{item.quantity} x Rp {item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    {item.isMechanicFault ? (
                      <p className="font-black text-sm text-red-500 whitespace-nowrap">FREE</p>
                    ) : (
                      <p className="font-black text-sm whitespace-nowrap">Rp {(item.price * item.quantity).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto space-y-4 pt-8 border-t border-border/50">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Subtotal Jasa & Part</span>
                  <span>Rp {subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4 py-3 bg-card/40 px-5 rounded-2xl border border-border/30">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Discount (Potongan)</span>
                  <div className="relative w-32">
                    <input 
                      type="number" 
                      value={discount || ''} 
                      onChange={(e) => setDiscount(Number(e.target.value))} 
                      className="w-full bg-transparent border-0 text-right font-black text-primary focus:ring-0 outline-none p-0 text-lg"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 relative z-10">Total Yang Harus Dibayar</p>
                  <h2 className="text-4xl font-black text-white font-mono leading-none relative z-10">Rp {total.toLocaleString()}</h2>
                  <p className="text-[9px] text-zinc-600 mt-2 italic relative z-10">*Sudah termasuk pajak {workshopProfile.taxRate}%</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PAYMENT PROCESSING */}
            <div className="md:w-1/2 p-10 flex flex-col">
              <div className="mb-10 shrink-0">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Pembayaran</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Pilih metode dan selesaikan transaksi.</p>
              </div>

              <div className="space-y-10 flex-1 flex flex-col justify-center">
                {/* Method Selector */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Metode Pembayaran</h4>
                  <div className={`grid ${customerType !== 'Umum' ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                    {([...(['tunai', 'qris', 'transfer'] as const), ...(customerType !== 'Umum' ? ['hutang' as const] : [])]).map(m => (
                      <button 
                        key={m} 
                        onClick={() => setPaymentMethod(m)} 
                        className={`py-5 rounded-3xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                          paymentMethod === m 
                            ? m === 'hutang' ? 'bg-red-500/10 border-red-500 text-red-500 shadow-xl shadow-red-500/10 scale-105' : 'bg-primary/10 border-primary text-primary shadow-xl shadow-primary/10 scale-105' 
                            : 'bg-muted border-transparent text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted/80'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Logic */}
                {paymentMethod === 'tunai' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between ml-2">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Tunai Diterima</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCashReceived(total)} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-lg text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all">Uang Pas</button>
                        <button type="button" onClick={() => setCashReceived(50000)} className="px-3 py-1.5 bg-muted border border-border rounded-lg text-[9px] font-black uppercase hover:border-primary/50 transition-all">50rb</button>
                        <button type="button" onClick={() => setCashReceived(100000)} className="px-3 py-1.5 bg-muted border border-border rounded-lg text-[9px] font-black uppercase hover:border-primary/50 transition-all">100rb</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative group">
                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input 
                          type="number" 
                          autoFocus 
                          id="cash-input"
                          value={cashReceived || ''} 
                          onChange={e => setCashReceived(Number(e.target.value))} 
                          className="w-full bg-muted border-2 border-border/50 rounded-3xl pl-16 pr-8 py-7 text-5xl font-black text-center focus:outline-none focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all font-mono" 
                          placeholder="0" 
                        />
                      </div>

                      {cashReceived >= total && (
                        <div className="p-8 bg-green-500/10 rounded-[2.5rem] border-2 border-green-500/30 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Kembalian Pelanggan</p>
                          <p className="text-4xl font-black text-green-600 font-mono">Rp {(cashReceived - total).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* QRIS Logic */}
                {paymentMethod === 'qris' && (
                  <div className="p-8 bg-blue-500/5 rounded-[2.5rem] border-2 border-blue-500/20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                     {workshopProfile.qrisImage ? (
                       <img src={workshopProfile.qrisImage} alt="QRIS" className="w-40 h-40 object-contain bg-white rounded-2xl border-2 border-border p-2 mb-4 shadow-lg shadow-blue-500/10" />
                     ) : (
                       <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                         <ScanLine className="w-8 h-8 text-blue-500" />
                       </div>
                     )}
                     <h4 className="text-lg font-black text-blue-500 uppercase tracking-widest mb-2">Arahkan Scan QRIS</h4>
                     <p className="text-xs text-muted-foreground font-medium">Silakan minta pelanggan untuk scan QRIS dari mesin EDC atau akrilik kasir. <br/><strong className="text-foreground">Pastikan notifikasi dana masuk sudah diterima</strong> sebelum klik Konfirmasi.</p>
                  </div>
                )}

                {/* Transfer Logic */}
                {paymentMethod === 'transfer' && (
                  <div className="p-8 bg-orange-500/5 rounded-[2.5rem] border-2 border-orange-500/20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                     <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                       <Smartphone className="w-8 h-8 text-orange-500" />
                     </div>
                     <h4 className="text-lg font-black text-orange-500 uppercase tracking-widest mb-2">Transfer Bank</h4>
                     <div className="bg-card px-4 py-4 rounded-xl border border-border/50 mb-3 w-full max-w-sm">
                        <p className="text-sm font-black font-mono leading-relaxed">{workshopProfile.bankAccount || 'BCA 123-456-7890 a/n Jakarta Motor'}</p>
                     </div>
                     <p className="text-xs text-muted-foreground font-medium"><strong className="text-foreground">Cek mutasi rekening Anda terlebih dahulu.</strong> Pastikan transfer sebesar <strong>Rp {total.toLocaleString()}</strong> sudah masuk sebelum klik Konfirmasi.</p>
                  </div>
                )}
              </div>

              <div className="mt-10 pt-10 border-t border-border/50 shrink-0">
                <button 
                  onClick={processPayment} 
                  disabled={isCheckoutProcessing || (paymentMethod === 'tunai' && cashReceived < total)} 
                  className={`w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 ${
                    isCheckoutProcessing || (paymentMethod === 'tunai' && cashReceived < total) 
                      ? 'bg-muted-foreground/30 text-white cursor-not-allowed grayscale' 
                      : paymentMethod === 'hutang' ? 'bg-red-500 text-white shadow-red-500/40 hover:scale-[1.02]' : 'bg-primary text-white shadow-primary/40 hover:scale-[1.02]'
                  }`}
                >
                  {isCheckoutProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> KONFIRMASI {paymentMethod === 'hutang' ? 'KASBON' : 'PEMBAYARAN'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-card w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl border border-border flex flex-col md:flex-row animate-in zoom-in duration-500 max-h-[90vh]">
            {/* Left: Receipt Preview */}
            <div className="md:w-1/2 p-10 bg-white overflow-y-auto custom-scrollbar flex items-center justify-center border-r border-border">
               <Receipt workshop={workshopProfile} transaction={lastTransaction} />
            </div>
            
            {/* Right: Actions */}
            <div className="md:w-1/2 p-12 flex flex-col justify-center items-center text-center space-y-8 bg-card">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Transaksi Selesai!</h3>
                <p className="text-muted-foreground text-sm font-medium italic">Pembayaran berhasil diproses dan stok telah diperbarui.</p>
              </div>
              
              <div className="w-full space-y-4">
                <button 
                  onClick={() => handleSilentPrint(lastTransaction?.id)}
                  disabled={isPrinting}
                  className="w-full py-5 bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-500/30 hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  {isPrinting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Printer className="w-6 h-6" /> CETAK ULANG (THERMAL)</>}
                </button>
                <button 
                  onClick={handlePrint}
                  className="w-full py-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl font-black hover:bg-primary/20 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <FileText className="w-4 h-4" /> CETAK VIA BROWSER (A4/PDF)
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)} 
                  className="w-full py-5 bg-muted border border-border text-muted-foreground rounded-2xl font-black hover:bg-muted/70 transition-all"
                >
                  LANJUT KE TRANSAKSI BARU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
