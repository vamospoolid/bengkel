import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, SearchIcon, History, X, Calendar, Wrench, Loader2, CheckCircle2, User as UserIcon, AlertCircle, RefreshCw, DollarSign, Printer, FileText, Smartphone, ScanLine, Activity, AlertTriangle } from 'lucide-react';
import api from '../api';
import Receipt from '../components/Receipt';
import { toast } from 'react-hot-toast';
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
  currentStock?: number;
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
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Custom Service States
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState(0);

  useEffect(() => {
    fetchData();
    fetchWorkshopProfile();
    fetchDoneOrders();
    
    // Auto-focus search input on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);

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
      setDoneOrders(Array.isArray(res.data) ? res.data : []);
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

  // Bug #9 fix: reset barcode buffer whenever the active tab changes
  // Prevents stale scan data from a previous tab triggering wrong addToCart
  useEffect(() => {
    setBarcodeBuffer('');
    if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
  }, [activeTab]);

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

    // 1. Load dari Cache (Offline) dulu agar langsung tampil
    try {
      const cachedParts = localStorage.getItem('offline_parts');
      const cachedCust = localStorage.getItem('offline_customers');
      const cachedMech = localStorage.getItem('offline_mechanics');
      const cachedServ = localStorage.getItem('offline_services');
      
      if (cachedParts) {
        const parsed = JSON.parse(cachedParts);
        if (Array.isArray(parsed)) setParts(parsed);
      }
      if (cachedCust) {
        const parsed = JSON.parse(cachedCust);
        if (Array.isArray(parsed)) setCustomers(parsed);
      }
      if (cachedMech) {
        const parsed = JSON.parse(cachedMech);
        if (Array.isArray(parsed)) setMechanics(parsed);
      }
      if (cachedServ) {
        const parsed = JSON.parse(cachedServ);
        if (Array.isArray(parsed)) setServices(parsed);
      }
    } catch (e) {
      console.warn("Gagal membaca cache offline");
    }

    try {
      // 2. Fetch data terbaru dari VPS
      const pRes = await api.get('/products').catch(e => { console.error('Parts fail', e); return null; });
      if (pRes && Array.isArray(pRes.data)) {
        setParts(pRes.data);
        localStorage.setItem('offline_parts', JSON.stringify(pRes.data));
      }

      const cRes = await api.get('/customers').catch(e => { console.error('Cust fail', e); return null; });
      if (cRes && Array.isArray(cRes.data)) {
        setCustomers(cRes.data);
        localStorage.setItem('offline_customers', JSON.stringify(cRes.data));
      }

      const mRes = await api.get('/mechanics').catch(e => { console.error('Mech fail', e); return null; });
      if (mRes && Array.isArray(mRes.data)) {
        setMechanics(mRes.data);
        localStorage.setItem('offline_mechanics', JSON.stringify(mRes.data));
      }

      const sRes = await api.get('/services').catch(e => { console.error('Serv fail', e); return null; });
      if (sRes && Array.isArray(sRes.data)) {
        setServices(sRes.data);
        localStorage.setItem('offline_services', JSON.stringify(sRes.data));
      }

      if (pRes && pRes.data.length === 0) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Find matching part by EXACT barcode match
      const matchingPart = parts.find(p => p.barcode === searchTerm.trim() || p.id === searchTerm.trim());
      
      if (matchingPart) {
        addToCart(matchingPart, 'part');
        setSearchTerm(''); // Clear for next scan
        toast.success(`Ditambahkan: ${matchingPart.name}`, { duration: 1000 });
      } else {
        // Fallback: If only 1 result in the current filter, add that one
        const filteredParts = parts.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.barcode.includes(searchTerm)
        );
        
        if (filteredParts.length === 1) {
          addToCart(filteredParts[0], 'part');
          setSearchTerm('');
          toast.success(`Ditambahkan: ${filteredParts[0].name}`, { duration: 1000 });
        }
      }
    }
  };

  const addToCart = (item: any, type: 'part' | 'service') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      const tier = getTierFromCustomerType(customerType);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1, currentStock: type === 'part' ? item.stock : i.currentStock } : i);
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: getPrice(item, type, tier), 
        quantity: 1, 
        type, 
        priceTier: tier,
        currentStock: type === 'part' ? item.stock : undefined
      }];
    });
  };

  const addCustomService = () => {
    if (!customServiceName.trim() || customServicePrice <= 0) {
      toast.error('Nama dan harga layanan harus diisi!');
      return;
    }
    
    const customId = `custom-service-${Date.now()}`;
    setCart(prev => [...prev, { 
      id: customId, 
      name: customServiceName.trim().toUpperCase(), 
      price: customServicePrice, 
      quantity: 1, 
      type: 'service',
      priceTier: 'normal'
    }]);
    
    setCustomServiceName('');
    setCustomServicePrice(0);
    setShowCustomServiceModal(false);
    toast.success('Layanan custom ditambahkan!');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
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

      const partItems: CartItem[] = (task.partDetails || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: p.quantity || 1,
        type: 'part' as const,
        priceTier: 'normal'
      }));

      console.log('Workshop Search Success:', { serviceItems, partItems });
      setWorkOrderId(task.id);
      setPulledWorkOrder(task);

      if (task.mode === 'WORKSHOP') {
        // Auto-select customer if name matches
        if (task.customerName) {
          const found = customers.find(c => c.name.toLowerCase() === task.customerName.toLowerCase());
          if (found) setSelectedCustomerId(found.id);
        }

        if (serviceItems.length === 0 && partItems.length === 0) {
          console.warn('Workshop found but no items!');
          setPullError('Unit ditemukan tapi belum ada jasa/barang yang dipilih di bengkel.');
          setCart([]);
        } else {
          console.log('Setting cart with:', [...serviceItems, ...partItems]);
          setCart([...serviceItems, ...partItems]);
          toast.success(`Berhasil menarik ${serviceItems.length} Jasa & ${partItems.length} Part!`, { icon: '🔧' });
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      } else if (task.mode === 'VEHICLE') {
        // Also auto-select customer for existing vehicles
        if (task.customerName) {
          const found = customers.find(c => c.name.toLowerCase() === task.customerName.toLowerCase());
          if (found) setSelectedCustomerId(found.id);
        }
        setCart([]);
        setPullError(null);
      } else {
        setCart([]);
        setPullError(null);
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
  
  const handleCheckout = () => {
    // Check for stock availability before opening payment modal
    const outOfStockItems = cart.filter(item => 
      item.type === 'part' && 
      typeof item.currentStock === 'number' && 
      (item.currentStock <= 0 || item.quantity > item.currentStock)
    );

    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map(i => i.name).join(', ');
      toast.error(`Beberapa barang memiliki stok yang tidak mencukupi: ${names}`, {
        duration: 4000,
        position: 'top-center'
      });
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    setIsCheckoutProcessing(true);
    const localTransactionId = crypto.randomUUID();
    
    const checkoutData = {
      id: localTransactionId,
      cart,
      plateNumber: plateNumber.trim() || null,
      customerId: selectedCustomerId || null,
      customerName: pulledWorkOrder?.customerName || customerSearchTerm || null,
      customerWA: customerWA.trim() || null,
      totalAmount: Number(total),
      tax: Number(tax),
      discount: Number(discount),
      paymentType: paymentMethod.toUpperCase(),
      workOrderId: workOrderId || null
    };

    try {
      let finalCustomerId = selectedCustomerId;

      if (!finalCustomerId && customerSearchTerm.trim() && customerType !== 'Umum') {
        const mappedType = customerType === 'Grosir' ? 'GROSIR' : 'MITRA';
        try {
          const newCustRes = await api.post('/customers', { 
            name: customerSearchTerm.trim().toUpperCase(), 
            type: mappedType,
            whatsapp: customerWA.trim() || null
          });
          finalCustomerId = newCustRes.data.id;
          checkoutData.customerId = finalCustomerId;
        } catch (err) {
          console.error('Failed to create customer automatically', err);
        }
      }

      const res = await api.post('/pos/checkout', checkoutData);
      const transaction = res.data.transaction;
      if (!transaction) throw new Error('Backend tidak mengembalikan data transaksi.');
      completeLocalCheckout(transaction);
    } catch (error: any) {
      console.error('Checkout error detail:', error);
      if (!navigator.onLine || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        saveToSyncQueue('/pos/checkout', checkoutData);
        const offlineTransaction = {
          id: localTransactionId,
          invoiceNo: `OFFLINE-${localTransactionId.substring(0, 8)}`,
          createdAt: new Date().toISOString()
        };
        completeLocalCheckout(offlineTransaction, true);
      } else {
        const msg = error.response?.data?.error || error.message || 'Gagal memproses pembayaran.';
        alert(`ERROR: ${msg}`);
      }
    } finally {
      setIsCheckoutProcessing(false);
    }
  };

  const saveToSyncQueue = (url: string, data: any) => {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({ id: data.id || crypto.randomUUID(), url, data, timestamp: Date.now() });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  };

  const completeLocalCheckout = (transaction: any, isOffline = false) => {
    // Bug #4 fix: snapshot data BEFORE state is cleared.
    // handleSilentPrint runs in setTimeout — by that time React state
    // (cart, plateNumber, pulledWorkOrder) is already reset to empty.
    // We capture what we need NOW and embed it directly into the transaction object.
    const vehicleSnapshot = pulledWorkOrder?.vehicle || (plateNumber ? { plateNumber, model: pulledWorkOrder?.model } : null);
    const customerSnapshot = customers.find(c => c.id === selectedCustomerId);
    const cartSnapshot = [...cart];

    setLastTransaction({
      ...transaction,
      items: cartSnapshot,
      customer: customerSnapshot,
      vehicle: vehicleSnapshot,
      cashReceived: paymentMethod === 'tunai' ? Number(cashReceived) : null
    });
    
    setCart([]);
    setPlateNumber('');
    setCashReceived(0);
    setWorkOrderId(null);
    setPulledWorkOrder(null);
    
    // Move modal trigger to the end to ensure state is ready
    setShowPaymentModal(false);
    setShowSuccessModal(true);
    
    if (isOffline) {
      toast.success('Offline: Transaksi disimpan secara lokal!');
    } else {
    // Enrich transaction with snapshots for printing
    const enrichedTx = {
      ...transaction,
      items: (transaction.items && transaction.items.length > 0) ? transaction.items : cartSnapshot,
      customer: transaction.customer || customerSnapshot || { name: 'UMUM' },
      vehicle: transaction.vehicle || vehicleSnapshot,
      cashReceived: paymentMethod === 'tunai' ? Number(cashReceived) : null
    };

      if (autoPrint) {
        handleSilentPrint(enrichedTx);
      }
    }
  };

  const handleSilentPrint = async (tx: any) => {
    const defaultPrinter = localStorage.getItem('default_printer');

    // Bug #2 fix: use if/else so Electron and web API are mutually exclusive
    // Previously both paths always ran, causing double print on Electron
    if ((window as any).electron && defaultPrinter) {
      // === Electron path: direct hardware RAW print ===
      setIsPrinting(true);
      try {
        const currentCustomer = customers.find(c => c.id === selectedCustomerId);
        const printableTx = {
          invoiceNo: tx.invoiceNo || 'INV-TEMP',
          createdAt: tx.createdAt || new Date().toISOString(),
          items: (tx.items && tx.items.length > 0) ? tx.items : cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: tx.totalAmount || total,
          customer: tx.customer || currentCustomer || { name: 'UMUM' },
          vehicle: tx.vehicle || (pulledWorkOrder?.vehicle || (plateNumber ? { plateNumber } : null))
        };
        await (window as any).electron.invoke('print-raw', defaultPrinter, printableTx, workshopProfile);
      } catch (err) {
        console.error('Electron RAW print failed', err);
      } finally {
        setIsPrinting(false);
      }
    } else {
      // === Web/VPS path: trigger print via backend API ===
      setIsPrinting(true);
      try {
        await api.post('/print/receipt', { transactionId: tx.id });
      } catch (err: any) {
        console.error('Silent print failed', err);
      } finally {
        setIsPrinting(false);
      }
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-print');
    if (!printContent) return;
    
    const defaultPrinter = localStorage.getItem('default_printer');
    if ((window as any).electron && defaultPrinter) {
      (window as any).electron.printSilent({ silent: true, deviceName: defaultPrinter });
      return;
    }

    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html>
        <head>
          <title>Nota - ${lastTransaction?.invoiceNo}</title>
          <script src=\"https://cdn.tailwindcss.com\"></script>
        </head>
        <body>
          ${printContent.outerHTML}
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
  };

  return (
    <div className="h-full flex gap-8 relative overflow-hidden p-2">
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {/* HEADER: Search & Mode */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Cari sparepart atau layanan (nama/barcode)..." 
              className="w-full bg-card border-2 border-border/50 rounded-[2rem] pl-16 pr-6 py-5 font-bold focus:outline-none focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all text-lg shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border shrink-0">
            <button 
              onClick={() => setActiveTab('parts')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'parts' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Suku Cadang
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Layanan Jasa
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Work Orders Horizontal (if any) */}
          {doneOrders.length > 0 && showDonePanel && (
            <div className="shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Antrean Selesai</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {doneOrders.map(order => (
                  <button 
                    key={order.id}
                    onClick={() => {
                      setCustomerType('Umum');
                      pullFromWorkshopAuto(order.plateNumber);
                    }}
                    className="flex items-center gap-3 glass-card p-3 rounded-2xl border border-green-500/20 hover:border-green-500/50 transition-all shrink-0 animate-in fade-in"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-black text-[13px] tracking-widest leading-none">{order.plateNumber}</p>
                      <p className="text-[9px] text-muted-foreground truncate mt-1">{order.model || 'Unit'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-transparent custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-bold italic text-muted-foreground">Menghubungkan ke database...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-10">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <p className="font-bold text-red-500">${error}</p>
                <button onClick={fetchData} className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  <RefreshCw className="w-4 h-4" /> COBA LAGI
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-1 pb-10">
                {activeTab === 'parts' ? (
                  parts.length > 0 ? (
                    filteredParts.map(part => {
                      const cartItem = cart.find(i => i.id === part.id);
                      const inCartQty = cartItem?.quantity || 0;
                      
                      return (
                        <div 
                          key={part.id} 
                          onClick={() => addToCart(part, 'part')}
                          className={`group relative glass-card p-4 rounded-3xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                            inCartQty > 0 ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {inCartQty > 0 && (
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg shadow-primary/30 z-10 animate-in zoom-in duration-300">
                              {inCartQty}
                            </div>
                          )}
                          <div className="flex flex-col h-full justify-between gap-3">
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{part.category}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${part.stock <= part.minStock ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                  Stok: {part.stock}
                                </span>
                              </div>
                              <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">{part.name}</h3>
                            </div>
                            <div>
                              <p className="text-xs font-mono text-muted-foreground mb-2 truncate opacity-50">{part.barcode}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-primary">Rp {getPrice(part, 'part', getTierFromCustomerType(customerType)).toLocaleString()}</p>
                                <div className="p-2 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                  <Plus className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-20 text-center text-muted-foreground italic text-sm">Database suku cadang kosong.</div>
                  )
                ) : (
                  <>
                    <div 
                      onClick={() => setShowCustomServiceModal(true)}
                      className="group relative glass-card p-4 rounded-3xl border border-dashed border-primary/40 bg-primary/5 transition-all cursor-pointer hover:scale-[1.02] hover:bg-primary/10 active:scale-95 flex flex-col items-center justify-center text-center gap-3 min-h-[140px]"
                    >
                      <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-all">
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="font-black text-xs text-primary uppercase tracking-widest leading-tight">TAMBAH LAYANAN<br/>CUSTOM (DINAMIS)</p>
                    </div>
                    
                    {services.map(service => {
                      const cartItem = cart.find(i => i.id === service.id);
                      const inCartQty = cartItem?.quantity || 0;
                      
                      return (
                        <div 
                          key={service.id} 
                          onClick={() => addToCart(service, 'service')}
                          className={`group relative glass-card p-4 rounded-3xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                            inCartQty > 0 ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5' : 'border-border hover:border-blue-500/50'
                          }`}
                        >
                          {inCartQty > 0 && (
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/30 z-10 animate-in zoom-in duration-300">
                              {inCartQty}
                            </div>
                          )}
                          <div className="flex flex-col h-full justify-between gap-3">
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/60 italic">Service</span>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase bg-blue-500/10 text-blue-500">
                                  {service.estimatedTime || '-'}
                                </span>
                              </div>
                              <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-2 group-hover:text-blue-500 transition-colors">{service.name}</h3>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-blue-500 font-mono">Rp {service.price.toLocaleString()}</p>
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                  <Plus className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>      {/* RIGHT PANEL: CART (RECEIPT STYLE) */}
      <div className="w-[450px] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 flex flex-col border border-border/50 relative overflow-hidden shrink-0">
        {/* Receipt Top Pattern */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 px-4">
          {Array.from({length: 20}).map((_, i) => (
            <div key={i} className="flex-1 h-full bg-primary/20 rounded-b-full" />
          ))}
        </div>

        <div className="mb-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black uppercase tracking-tighter">Pesanan Saat Ini</h3>
            <button 
              onClick={() => setCart([])} 
              className="text-[10px] font-black text-red-500 hover:bg-red-500/10 px-3 py-1 rounded-full transition-all uppercase tracking-widest"
            >
              Hapus Semua
            </button>
          </div>
          
          <div className="space-y-4 shrink-0">
            <div className="flex bg-muted p-1 rounded-xl border border-border/50">
              {(['Umum', 'Grosir', 'Bengkel'] as const).map(type => (
                <button 
                  key={type} 
                  onClick={() => {
                    handleCustomerTypeChange(type);
                    if (type !== 'Umum') setOnlyShopping(true); // Hide plate for non-Umum
                    else setOnlyShopping(false);
                  }}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${customerType === type ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Input Section */}
            <div className="space-y-3">
              {customerType === 'Umum' && (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="only-shop" checked={onlyShopping} onChange={(e) => setOnlyShopping(e.target.checked)} className="w-3 h-3 accent-primary" />
                    <label htmlFor="only-shop" className="text-[9px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer">Tanpa Plat</label>
                  </div>
                  {!onlyShopping && (
                    <button 
                      onClick={pullFromWorkshop} 
                      className="text-[8px] font-black text-primary hover:text-primary/70 transition-all flex items-center gap-1.5 uppercase"
                    >
                      <Wrench className="w-3 h-3" />
                      Ambil Data Bengkel
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                {/* Horizontal Grid for Plate and Phone */}
                <div className={`grid gap-2 ${customerType === 'Umum' && !onlyShopping ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {customerType === 'Umum' && !onlyShopping && (
                    <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
                      <input 
                        type="text" 
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                        placeholder="PLAT NOMOR" 
                        className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-3 py-2.5 font-black uppercase text-[10px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input 
                      type="text" 
                      placeholder="WHATSAPP (62...)" 
                      className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2.5 font-black uppercase text-[10px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={customerWA}
                      onChange={(e) => setCustomerWA(e.target.value)}
                    />
                  </div>
                </div>

                {/* Name Field (Full Width) */}
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input 
                    type="text" 
                    placeholder={customerType === 'Umum' ? "NAMA PELANGGAN (OPSIONAL)" : "NAMA PELANGGAN / TOKO"} 
                    className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2.5 font-black uppercase text-[10px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerSuggestions(true);
                    }}
                  />
                  {showCustomerSuggestions && customerSearchTerm.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden">
                      {customers
                        .filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                        .map(c => (
                          <button 
                            key={c.id} 
                            className="w-full px-4 py-2.5 text-left hover:bg-muted border-b border-border/50 flex justify-between items-center group transition-all"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearchTerm(c.name);
                              setCustomerWA((c as any).whatsapp || (c as any).phone || '');
                              setShowCustomerSuggestions(false);
                            }}
                          >
                            <div>
                              <p className="text-[10px] font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{c.name}</p>
                              <p className="text-[8px] text-muted-foreground font-bold uppercase">{c.type}</p>
                            </div>
                            <CheckCircle2 className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-8 px-8 custom-scrollbar min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center opacity-40 py-20">
              <ShoppingCart className="w-12 h-12 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Belum Ada Barang</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-dashed border-border/50">
                  <th className="text-left py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-1/2">Barang/Jasa</th>
                  <th className="text-center py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Qty</th>
                  <th className="text-right py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border/30">
                {cart.map(item => (
                  <tr key={item.id} className="group hover:bg-primary/[0.02]">
                    <td className="py-4 pr-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-black text-foreground leading-tight line-clamp-2 uppercase tracking-tight">{item.name}</span>
                          {item.type === 'part' && (typeof item.currentStock === 'number') && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.currentStock <= 0 ? (
                                <span className="text-[7px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md uppercase animate-pulse">Stok Habis</span>
                              ) : item.quantity > item.currentStock ? (
                                <span className="text-[7px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-md uppercase">Stok Kurang ({item.currentStock})</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border ${item.type === 'part' ? 'bg-orange-500/5 border-orange-500/20 text-orange-500' : 'bg-blue-500/5 border-blue-500/20 text-blue-500'}`}>
                              {item.type === 'part' ? 'PARTS' : 'SERVIS'}
                           </span>
                           {item.type === 'part' && (
                             <div className="flex bg-muted/50 p-0.5 rounded-md border border-border/50">
                               {(['normal', 'grosir', 'bengkel'] as const).map(tier => (
                                 <button 
                                   key={tier} 
                                   onClick={() => updatePriceTier(item.id, tier)}
                                   className={`w-4 h-4 flex items-center justify-center rounded-sm text-[6px] font-black transition-all ${item.priceTier === tier ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                 >
                                   {tier[0].toUpperCase()}
                                 </button>
                               ))}
                             </div>
                           )}
                           {item.type === 'service' && (
                             <select 
                               value={item.mechanicId || ''} 
                               onChange={(e) => updateMechanic(item.id, e.target.value)} 
                               className="bg-muted border border-border rounded-md px-1.5 py-0.5 text-[7px] font-black uppercase outline-none focus:border-primary max-w-[100px] truncate"
                             >
                               <option value="">Pilih Mekanik</option>
                               {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                             </select>
                           )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-center bg-muted/30 rounded-xl p-1 border border-border/30">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:text-red-500 transition-colors"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-[11px] font-black">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:text-primary transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[8px] font-black text-muted-foreground uppercase">Rp</span>
                          <input 
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const newPrice = Number(e.target.value);
                              setCart(prev => prev.map(i => i.id === item.id ? { ...i, price: newPrice } : i));
                            }}
                            className="w-14 bg-transparent border-b border-border/20 hover:border-primary/50 focus:border-primary text-right font-black text-[10px] p-0 focus:outline-none transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className={`text-[12px] font-black italic ${item.isMechanicFault ? 'text-red-500 line-through' : 'text-primary'}`}>
                            Rp {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-6 border-t-2 border-dashed border-border/50 space-y-4 shrink-0 bg-white dark:bg-zinc-900">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              <span>SUBTOTAL</span>
              <span>Rp {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              <span>TAX ({workshopProfile.taxRate}%)</span>
              <span>Rp {Math.round(tax).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border/20">
              <span className="text-sm font-black uppercase tracking-widest text-foreground">TOTAL AKHIR</span>
              <span className="text-2xl font-black text-primary font-mono tracking-tighter">Rp {total.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || isCheckoutProcessing}
            className="w-full py-5 bg-orange-600 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-orange-600/30 hover:bg-orange-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em]"
          >
            {isCheckoutProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> PROSES PEMBAYARAN</>}
          </button>
        </div>
      </div>

      {/* MODALS */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl border border-border animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="text-center shrink-0 mb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Transaksi Berhasil!</h2>
              <p className="text-muted-foreground text-xs font-medium mt-1">Pembayaran telah diterima & nota telah digenerate.</p>
            </div>
            
            {/* Receipt Preview Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-950 rounded-[2rem] border border-border/50 p-8 mb-6 shadow-inner">
              <div id="receipt-print" className="bg-white text-black p-4 font-mono text-[10px] space-y-4">
                <div className="text-center space-y-1">
                  <h1 className="text-sm font-bold uppercase">{workshopProfile.name}</h1>
                  <p>{workshopProfile.address}</p>
                  <p>Telp: {workshopProfile.phone}</p>
                  <div className="border-t border-dashed border-black my-2" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>No: {lastTransaction?.invoiceNo}</span>
                    <span>{new Date(lastTransaction?.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cust: {lastTransaction?.customer?.name || 'UMUM'}</span>
                    <span>{new Date(lastTransaction?.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {lastTransaction?.vehicle?.plateNumber && (
                    <div className="flex justify-between uppercase">
                      <span>Plat: {lastTransaction.vehicle.plateNumber}</span>
                      <span>{lastTransaction.vehicle.model || ''}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-black my-2" />
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dashed border-black">
                      <th className="py-1">ITEM</th>
                      <th className="text-center py-1">QTY</th>
                      <th className="text-right py-1">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lastTransaction?.items || []).map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1 uppercase pr-2">{item.name}</td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className="text-right py-1">{(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-black mt-4 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {lastTransaction?.totalAmount ? (lastTransaction.totalAmount + (lastTransaction.discount || 0)).toLocaleString() : '0'}</span>
                  </div>
                  {lastTransaction?.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Diskon:</span>
                      <span>- Rp {lastTransaction.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>TOTAL:</span>
                    <span>Rp {lastTransaction?.totalAmount?.toLocaleString()}</span>
                  </div>
                  {lastTransaction?.cashReceived > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Bayar:</span>
                        <span>Rp {lastTransaction.cashReceived.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kembali:</span>
                        <span>Rp {(lastTransaction.cashReceived - lastTransaction.totalAmount).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center mt-8 space-y-1">
                  <p className="uppercase text-[8px]">{workshopProfile.footerMessage || 'Terima Kasih Atas Kunjungan Anda'}</p>
                  <p className="text-[7px]">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 shrink-0">
              <button 
                onClick={() => handleSilentPrint(lastTransaction)}
                disabled={isPrinting}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-black shadow-lg shadow-green-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Printer className="w-5 h-5" /> CETAK NOTA</>}
              </button>
              <button 
                onClick={() => setShowSuccessModal(false)} 
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black hover:bg-zinc-800 transition-all text-sm uppercase tracking-wider"
              >
                TRANSAKSI BARU
              </button>
            </div>
            <button 
              onClick={handlePrint}
              className="mt-4 w-full py-2 text-muted-foreground hover:text-primary transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <FileText className="w-3 h-3" /> Cetak Alternatif (Browser A4/PDF)
            </button>
          </div>
        </div>
      )}

      {/* Custom Service Modal */}
      {showCustomServiceModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-border animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Layanan Custom</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest italic">Input Jasa Dinamis</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nama Layanan</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Misal: Ganti Ban + Bongkar Pasang" 
                  className="w-full bg-muted border border-border rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('custom-price-input')?.focus()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Harga (Rp)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Rp</span>
                  <input 
                    id="custom-price-input"
                    type="number" 
                    placeholder="0" 
                    className="w-full bg-muted border border-border rounded-2xl pl-14 pr-6 py-4 font-black text-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    value={customServicePrice || ''}
                    onChange={(e) => setCustomServicePrice(Number(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomService()}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowCustomServiceModal(false)}
                  className="flex-1 py-4 bg-muted border border-border text-muted-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:bg-muted/70 transition-all"
                >
                  BATAL
                </button>
                <button 
                  onClick={addCustomService}
                  className="flex-2 py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  TAMBAHKAN KE KERANJANG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bug #1 fix: Payment Modal — was completely empty (placeholder comment only) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-5xl rounded-[3rem] shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300">
            
            {/* Header */}
            <div className="p-8 border-b border-border/50 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/30">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Konfirmasi Pembayaran</h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                    Total Tagihan: <span className="text-primary font-black">Rp {total.toLocaleString('id-ID')}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* LEFT SIDE: Order Review */}
              <div className="p-8 bg-muted/10 border-r border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Review Pesanan</label>
                  <span className="text-[10px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full">{cart.length} Item</span>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Item</th>
                        <th className="py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Qty</th>
                        <th className="py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {cart.map(item => (
                        <tr key={item.id} className="group">
                          <td className="py-4 pr-4">
                            <p className="text-[11px] font-black uppercase leading-tight mb-1">{item.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                item.type === 'part' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {item.type === 'part' ? 'PART' : 'SERVICE'}
                              </span>
                              {item.isMechanicFault && <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">FREE (RUSAK)</span>}
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className="text-[11px] font-black">{item.quantity}</span>
                          </td>
                          <td className="py-4 text-right">
                            <p className={`text-[12px] font-black ${item.isMechanicFault ? 'text-red-500 line-through' : 'text-primary'}`}>
                              Rp {(item.price * item.quantity).toLocaleString()}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                   <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-3xl text-white shadow-xl">
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Tagihan</p>
                        <h4 className="text-3xl font-black italic">Rp {total.toLocaleString('id-ID')}</h4>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl">
                        <DollarSign className="w-8 h-8 text-primary" />
                      </div>
                   </div>
                </div>
              </div>

              {/* RIGHT SIDE: Payment Method & Input */}
              <div className="p-8 flex flex-col h-full space-y-6 bg-zinc-950/20">
                <div className="flex-1 space-y-6">
                  {/* Payment Method */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: 'tunai', label: 'Tunai', icon: <DollarSign className="w-4 h-4" /> },
                        { key: 'qris', label: 'QRIS', icon: <Smartphone className="w-4 h-4" /> },
                        { key: 'transfer', label: 'Transfer', icon: <CreditCard className="w-4 h-4" /> },
                        { key: 'hutang', label: 'Piutang', icon: <FileText className="w-4 h-4" /> },
                      ] as const).map(m => (
                        <button
                          key={m.key}
                          onClick={() => setPaymentMethod(m.key)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-black text-[11px] uppercase tracking-wider transition-all ${
                            paymentMethod === m.key
                              ? 'bg-primary border-primary text-white shadow-lg'
                              : 'bg-muted/20 border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Received — only show for Tunai */}
                  {paymentMethod === 'tunai' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Uang Diterima (Rp)</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-lg">Rp</span>
                        <input
                          type="number"
                          autoFocus
                          placeholder="0"
                          className="w-full bg-zinc-900 border-2 border-border/50 rounded-2xl pl-16 pr-6 py-4 font-black text-3xl text-primary focus:outline-none focus:border-primary transition-all shadow-inner"
                          value={cashReceived || ''}
                          onChange={e => setCashReceived(Number(e.target.value))}
                          onKeyDown={e => e.key === 'Enter' && cashReceived >= total && processPayment()}
                        />
                      </div>
                      
                      {/* Quick Cash Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button 
                          onClick={() => setCashReceived(total)}
                          className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                        >
                          Uang Pas
                        </button>
                        {[20000, 50000, 100000].map(amt => (
                          <button 
                            key={amt}
                            onClick={() => setCashReceived(amt)}
                            className="px-4 py-2 bg-muted border border-border text-foreground rounded-lg text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                          >
                            {amt / 1000}rb
                          </button>
                        ))}
                      </div>

                      {cashReceived > 0 && (
                        <div className={`flex justify-between items-center px-4 py-2 rounded-xl font-black text-xs mt-3 ${
                          cashReceived >= total ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          <span>{cashReceived >= total ? 'Kembalian' : 'Kurang'}</span>
                          <span>Rp {Math.abs(cashReceived - total).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Simplified Discount */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Potongan Diskon (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground/30 text-xs">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-muted/30 border border-border/50 rounded-xl pl-10 pr-4 py-3 font-bold text-sm focus:outline-none focus:border-primary/50 transition-all"
                        value={discount || ''}
                        onChange={e => setDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Final Checkout Button Section */}
                <div className="space-y-4 pt-6 border-t border-border/50">
                  <div className="bg-muted/40 rounded-2xl p-6 space-y-2 border border-border/50 shadow-inner">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[10px] font-black text-green-500 uppercase tracking-widest">
                        <span>Diskon</span>
                        <span>- Rp {discount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-border/30">
                      <span className="font-black text-xs uppercase tracking-widest text-foreground">TOTAL TAGIHAN</span>
                      <span className="text-4xl font-black text-primary font-mono italic tracking-tighter">Rp {total.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <button 
                    onClick={processPayment}
                    disabled={isCheckoutProcessing || (paymentMethod === 'tunai' && cashReceived < total)}
                    className="w-full py-6 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-orange-600/40 hover:bg-orange-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] border-b-4 border-orange-800"
                  >
                    {isCheckoutProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CreditCard className="w-6 h-6" /> BAYAR SEKARANG</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
