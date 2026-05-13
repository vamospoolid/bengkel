import React, { useState, useEffect } from 'react';
import { Save, Store, MapPin, Phone, Receipt, Percent, Wrench, Plus, Pencil, Trash2, X, Clock, Loader2, CheckCircle2, Layers, Tag, Sun, Moon, Palette, ScanLine, MessageSquare, QrCode, Printer, Activity, Download } from 'lucide-react';
import api from '../api';

interface Service {
  id: string;
  name: string;
  price: number;
  estimatedTime: string;
}

// Reusable component for managing a list of string items (categories, etalase)
const ListManager: React.FC<{
  title: string;
  settingKey: string;
  placeholder: string;
  icon: React.ReactNode;
  colorClass: string;
}> = ({ title, settingKey, placeholder, icon, colorClass }) => {
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(`/app-settings/${settingKey}`)
      .then(res => setItems(res.data.items || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [settingKey]);

  const saveToServer = async (newList: string[]) => {
    setIsSaving(true);
    try {
      await api.put(`/app-settings/${settingKey}`, { items: newList });
      setItems(newList);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch { alert('Gagal menyimpan.'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = () => {
    if (!newItem.trim()) return;
    if (items.includes(newItem.trim())) return alert('Item sudah ada!');
    saveToServer([...items, newItem.trim()]);
    setNewItem('');
  };

  const handleDelete = (idx: number) => {
    if (!confirm(`Hapus "${items[idx]}"?`)) return;
    saveToServer(items.filter((_, i) => i !== idx));
  };

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(items[idx]);
  };

  const handleEditSave = (idx: number) => {
    if (!editValue.trim()) return;
    const updated = [...items];
    updated[idx] = editValue.trim();
    saveToServer(updated);
    setEditingIdx(null);
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
          <div>
            <h5 className="font-black text-base">{title}</h5>
            <p className="text-[11px] text-muted-foreground">{items.length} item terdaftar</p>
          </div>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-bold text-green-500 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan!
          </span>
        )}
        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">Belum ada item. Tambahkan di bawah.</p>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              {editingIdx === idx ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEditSave(idx)}
                    className="flex-1 bg-muted border border-primary/50 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none"
                  />
                  <button onClick={() => handleEditSave(idx)} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingIdx(null)} className="p-1.5 text-zinc-500 hover:text-red-500 rounded-lg transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border/50">
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                  <button onClick={() => handleEdit(idx)} className="p-1.5 text-zinc-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(idx)} className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add input */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={placeholder}
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// MAIN SETTINGS PAGE
// =============================================
const ACCENT_COLORS = [
  { id: 'orange', label: 'Orange', value: '#ff4500' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'green', label: 'Green', value: '#22c55e' },
  { id: 'yellow', label: 'Yellow', value: '#eab308' },
  { id: 'purple', label: 'Purple', value: '#a855f7' },
  { id: 'red', label: 'Red', value: '#ef4444' },
];

const Settings: React.FC<{ 
  theme: 'dark' | 'light'; 
  setTheme: (t: 'dark' | 'light') => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
}> = ({ theme, setTheme, accentColor, setAccentColor }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'masterdata' | 'general' | 'appearance' | 'hardware' | 'reminder' | 'database'>('services');

  // --- Services State ---
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', estimatedTime: '' });
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // --- General Settings State ---
  const [workshopSettings, setWorkshopSettings] = useState({
    name: 'Jakarta Motor',
    phone: '0812-3456-7890',
    address: 'Jl. Sudirman No. 123, Jakarta Selatan, 12190',
    taxRate: 11,
    footerMessage: 'Terima kasih telah mempercayakan kendaraan Anda pada Jakarta Motor. Garansi service 7 hari.',
    enableWhatsApp: true,
    bankAccount: 'BCA 123-456-7890 a/n Jakarta Motor',
    qrisImage: ''
  });
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(true);

  const [waStatus, setWaStatus] = useState({ isReady: false, status: 'loading' as 'loading' | 'qr' | 'ready' });
  const [waQR, setWaQR] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
    fetchGeneralSettings();
    checkWAStatus();
    const interval = setInterval(checkWAStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkWAStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(prev => ({ ...prev, isReady: res.data.isReady }));
      if (res.data.isReady) {
        setWaStatus(prev => ({ ...prev, status: 'ready' }));
      }
    } catch (error) {}
  };

  const handleGenerateQR = async () => {
    try {
      setWaStatus(prev => ({ ...prev, status: 'loading' }));
      const res = await api.get('/whatsapp/qr');
      if (res.data.status === 'qr') {
        setWaQR(res.data.qr);
        setWaStatus(prev => ({ ...prev, status: 'qr' }));
      } else if (res.data.status === 'ready') {
        setWaStatus(prev => ({ ...prev, isReady: true, status: 'ready' }));
      }
    } catch (error) {
      alert('Gagal mengambil QR Code. Pastikan backend berjalan.');
    }
  };

  const handleDisconnectWA = async () => {
    if (!confirm('Apakah Anda yakin ingin memutuskan koneksi WhatsApp?')) return;
    try {
      await api.post('/whatsapp/logout');
      setWaStatus({ isReady: false, status: 'loading' });
      setWaQR(null);
      alert('Berhasil terputus dari WhatsApp.');
    } catch (error) {
      alert('Gagal memutuskan koneksi WhatsApp.');
    }
  };

  const fetchGeneralSettings = async () => {
    try {
      setIsLoadingGeneral(true);
      const res = await api.get('/app-settings/workshop_profile');
      if (res.data && res.data.items && res.data.items.length > 0) {
        const data = JSON.parse(res.data.items[0]);
        setWorkshopSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch general settings', error);
    } finally {
      setIsLoadingGeneral(false);
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await api.put('/app-settings/workshop_profile', {
        items: [JSON.stringify(workshopSettings)]
      });
      setSaveSuccess('Profil bengkel berhasil disimpan!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      alert('Gagal menyimpan profil bengkel.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchServices = async () => {
    try {
      setIsLoadingServices(true);
      const res = await api.get('/services');
      setServices(res.data);
    } catch (error) {
      console.error('Failed to fetch services', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const openAddModal = () => {
    setEditingService(null);
    setServiceForm({ name: '', price: '', estimatedTime: '' });
    setShowServiceModal(true);
  };

  const openEditModal = (svc: Service) => {
    setEditingService(svc);
    setServiceForm({ name: svc.name, price: String(svc.price), estimatedTime: svc.estimatedTime });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingService(true);
    try {
      const payload = {
        name: serviceForm.name,
        price: Number(serviceForm.price),
        estimatedTime: serviceForm.estimatedTime || '-'
      };
      if (editingService) {
        await api.patch(`/services/${editingService.id}`, payload);
      } else {
        await api.post('/services', payload);
      }
      setShowServiceModal(false);
      setSaveSuccess(editingService ? 'Jasa berhasil diperbarui!' : 'Jasa berhasil ditambahkan!');
      setTimeout(() => setSaveSuccess(null), 2500);
      fetchServices();
    } catch {
      alert('Gagal menyimpan jasa. Pastikan semua data terisi.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Hapus jasa "${name}"?`)) return;
    try {
      await api.delete(`/services/${id}`);
      fetchServices();
    } catch {
      alert('Gagal menghapus jasa.');
    }
  };

  const TABS = [
    { key: 'services', label: 'Jasa Servis', icon: <Wrench className="w-4 h-4" /> },
    { key: 'masterdata', label: 'Kategori & Etalase', icon: <Layers className="w-4 h-4" /> },
    { key: 'appearance', label: 'Tampilan', icon: <Palette className="w-4 h-4" /> },
    { key: 'hardware', label: 'Hardware', icon: <Layers className="w-4 h-4 text-purple-500" /> },
    { key: 'reminder', label: 'Reminder WA', icon: <MessageSquare className="w-4 h-4 text-green-500" /> },
    { key: 'database', label: 'Database', icon: <Save className="w-4 h-4 text-red-500" /> },
    { key: 'general', label: 'Profil Bengkel', icon: <Store className="w-4 h-4" /> },
  ] as const;

  const [printerSize, setPrinterSize] = useState('80mm');
  const [useScanner, setUseScanner] = useState(true);
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('PrinterResi');
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  // Label Printer Settings
  const [labelPrinter, setLabelPrinter] = useState('Xprinter XP-D4601B');
  const [labelColumns, setLabelColumns] = useState(3);
  const [isSavingLabelPrinter, setIsSavingLabelPrinter] = useState(false);

  // Reminder Config State
  const [reminderConfig, setReminderConfig] = useState({
    enabled: true,
    monthsAfterService: 3,
    sendHour: 9,
    sendMinute: 0,
    serviceKeywords: ['oli', 'ganti oli', 'tune up', 'servis'],
    messageTemplate: `🔧 *PENGINGAT SERVIS - JAKARTA MOTOR*\n\nHalo, *{customerName}*! 👋\n\nSudah {months} bulan sejak servis terakhir Anda:\n📅 Terakhir servis: *{lastServiceDate}*\n🏍️ Kendaraan: *{vehicleInfo}*\n🔩 Jasa: *{serviceName}*\n\nSudah saatnya servis kembali agar kendaraan Anda tetap prima dan aman di jalan!\n\n📍 *{workshopName}*\n📞 {workshopPhone}\n{workshopAddress}`
  });
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [isLoadingHardware, setIsLoadingHardware] = useState(false);

  useEffect(() => {
    if (activeTab === 'reminder') {
      api.get('/reminder/config').then(res => setReminderConfig(res.data)).catch(() => {});
    }
    if (activeTab === 'hardware') {
      fetchHardwareInfo();
    }
  }, [activeTab]);

  const fetchHardwareInfo = async () => {
    try {
      setIsLoadingHardware(true);
      const res = await api.get('/system/hardware');
      setHardwareInfo(res.data);
    } catch (error) {
      console.error('Failed to fetch hardware info', error);
    } finally {
      setIsLoadingHardware(false);
    }
  };

  const handleSaveReminder = async () => {
    setIsSavingReminder(true);
    try {
      await api.put('/reminder/config', reminderConfig);
      setSaveSuccess('Konfigurasi reminder berhasil disimpan!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch { alert('Gagal menyimpan konfigurasi reminder.'); }
    finally { setIsSavingReminder(false); }
  };

  const handleSendNow = async () => {
    if (!confirm('Kirim reminder sekarang ke semua pelanggan yang memenuhi syarat?')) return;
    setIsSendingNow(true);
    try {
      const res = await api.post('/reminder/send-now', {});
      alert(res.data.message);
    } catch (err: any) {
      alert('Gagal mengirim: ' + (err.response?.data?.error || err.message));
    } finally { setIsSendingNow(false); }
  };

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const res = await api.get('/print/list');
        setPrinters(res.data);
        const settingRes = await api.get('/app-settings/thermal_printer');
        if (settingRes.data && settingRes.data.items && typeof settingRes.data.items === 'string') {
          setSelectedPrinter(settingRes.data.items);
        } else if (settingRes.data && settingRes.data.items && Array.isArray(settingRes.data.items) && settingRes.data.items.length > 0) {
          setSelectedPrinter(settingRes.data.items[0]);
        }

        // Fetch Label Printer Settings
        const labelPrinterRes = await api.get('/app-settings/label_printer');
        if (labelPrinterRes.data && labelPrinterRes.data.items) {
          setLabelPrinter(Array.isArray(labelPrinterRes.data.items) ? labelPrinterRes.data.items[0] : labelPrinterRes.data.items);
        }
        
        const labelColsRes = await api.get('/app-settings/label_columns');
        if (labelColsRes.data && labelColsRes.data.items) {
          setLabelColumns(Number(Array.isArray(labelColsRes.data.items) ? labelColsRes.data.items[0] : labelColsRes.data.items));
        }
      } catch (error) {
        console.error('Failed to fetch printers');
      }
    };
    if (activeTab === 'hardware') fetchPrinters();
  }, [activeTab]);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-black tracking-tighter">PENGATURAN SISTEM</h3>
        <p className="text-sm text-muted-foreground">Kelola profil bengkel, jasa servis, kategori produk, dan konfigurasi hardware.</p>
      </div>

      {/* Tab Nav */}
      <div className="flex bg-muted p-1 rounded-xl w-fit gap-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: SERVICES ===== */}
      {activeTab === 'services' && (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="font-black text-lg">Manajemen Jasa Servis</h4>
              <p className="text-sm text-muted-foreground">Daftar harga jasa untuk pendaftaran unit bengkel & kasir.</p>
            </div>
            <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Tambah Jasa
            </button>
          </div>

          {saveSuccess && (
            <div className="mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm font-bold text-green-500">{saveSuccess}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            {isLoadingServices ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-bold italic">Memuat daftar jasa...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Belum ada jasa terdaftar.</p>
                <button onClick={openAddModal} className="px-4 py-2 bg-primary text-white text-sm rounded-xl font-bold">+ Tambah Jasa Pertama</button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/60 border-b border-border">
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                    <th className="px-6 py-4 text-left">Nama Jasa</th>
                    <th className="px-6 py-4 text-center">Estimasi</th>
                    <th className="px-6 py-4 text-right">Harga</th>
                    <th className="px-6 py-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-primary" />
                          </div>
                          <p className="font-bold text-sm group-hover:text-primary transition-colors">{svc.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs font-bold">
                          <Clock className="w-3 h-3 text-muted-foreground" />{svc.estimatedTime}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-primary text-base">Rp {svc.price.toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(svc)} className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteService(svc.id, svc.name)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {services.length > 0 && (
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">{services.length} jasa terdaftar</p>
              <p className="text-[11px] text-muted-foreground">Harga otomatis muncul di pendaftaran unit & kasir</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: HARDWARE ===== */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Receipt className="w-6 h-6 text-purple-500" /><h4 className="font-bold text-lg">Konfigurasi Printer</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Lebar Kertas Thermal</label>
                <div className="grid grid-cols-2 gap-3">
                  {['58mm', '80mm'].map(size => (
                    <button
                      key={size}
                      onClick={() => setPrinterSize(size)}
                      className={`py-4 rounded-2xl border-2 transition-all font-black ${printerSize === size ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10' : 'border-border bg-muted/40 text-muted-foreground hover:border-border-hover'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 italic">* Layout nota akan menyesuaikan secara otomatis saat dicetak.</p>
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                <p className="text-xs text-blue-400 leading-relaxed font-medium">
                  <strong>Tips:</strong> Untuk hasil terbaik pada printer thermal, pastikan Margin di pengaturan print browser diset ke <strong>'None'</strong> atau <strong>'Minimal'</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Tag className="w-6 h-6 text-blue-500" /><h4 className="font-bold text-lg">Barcode Scanner</h4>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                <div>
                  <p className="font-bold text-sm">Mode Input Otomatis</p>
                  <p className="text-[11px] text-muted-foreground">Fokus otomatis pada pencarian produk</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={useScanner} onChange={() => setUseScanner(!useScanner)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Konfigurasi Lanjutan</p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Suffix (Akhiran)</label>
                      <select className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs font-black focus:outline-none">
                        <option value="ENTER">ENTER (Default)</option>
                        <option value="TAB">TAB</option>
                        <option value="NONE">NONE</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Kecepatan Scan</label>
                      <select className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs font-black focus:outline-none">
                        <option value="FAST">FAST</option>
                        <option value="NORMAL">NORMAL</option>
                      </select>
                   </div>
                </div>
              </div>

              {/* Real-time Test Zone */}
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Zona Pengetesan (Test Area)</h5>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold text-green-500 uppercase">Ready</span>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Scan barcode produk di sini untuk tes..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono focus:border-primary/50 transition-all text-center text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) {
                        alert(`Scanner Berhasil Membaca: ${val}`);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <p className="text-[9px] text-zinc-500 text-center italic">Arahkan kursor ke kotak di atas lalu tembak barcode Anda.</p>
              </div>

              <div className="space-y-3">

                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Panduan Koneksi</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-black text-primary">1</span></div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Hubungkan scanner via USB atau Bluetooth. Pastikan terdeteksi sebagai <strong>Keyboard HID</strong>.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-black text-primary">2</span></div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Cukup scan barcode pada produk di menu Kasir. Sistem akan otomatis memasukkan item ke keranjang.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Printer className="w-6 h-6 text-blue-500" /><h4 className="font-bold text-lg">Thermal Printer (80mm)</h4>
            </div>
            <div className="space-y-6">
               <div className="p-5 bg-muted/40 rounded-2xl border border-border space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pilih Printer Aktif</label>
                      <button 
                        onClick={async () => {
                          setPrinters([]);
                          const res = await api.get('/print/list');
                          setPrinters(res.data);
                        }}
                        className="text-[9px] font-black text-primary uppercase hover:underline"
                      >
                        Refresh Daftar
                      </button>
                    </div>
                    {printers.length > 0 ? (
                      <select 
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                        value={selectedPrinter}
                        onChange={(e) => setSelectedPrinter(e.target.value)}
                      >
                        {printers.map((p: any) => (
                          <option key={p.Name} value={p.Name}>{p.Name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <input 
                          type="text"
                          placeholder="Masukkan nama printer manual..."
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                          value={selectedPrinter}
                          onChange={(e) => setSelectedPrinter(e.target.value)}
                        />
                        <p className="text-[9px] text-orange-500 font-bold italic">⚠️ Gagal mendeteksi printer otomatis. Masukkan nama printer (misal: "80mm Series Printer") secara manual.</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={async () => {
                      await api.put('/app-settings/thermal_printer', { items: selectedPrinter });
                      setIsTestingPrinter(true);
                      setTimeout(() => {
                        setIsTestingPrinter(false);
                        alert('Konfigurasi Printer Berhasil Disimpan!');
                      }, 500);
                    }}
                    className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isTestingPrinter ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> SIMPAN KONFIGURASI</>}
                  </button>
                  
                  <button 
                    onClick={async () => {
                      try {
                        await api.post('/print/receipt', { transactionId: 'test', printerName: selectedPrinter });
                        alert('Print Test berhasil terkirim ke printer!');
                      } catch (err: any) {
                        const errorMsg = err.response?.data?.error || err.message;
                        alert(`Print Test Gagal: ${errorMsg}`);
                      }
                    }}
                    className="w-full py-3 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" /> Tes Koneksi Printer
                  </button>
               </div>

               <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                 <p className="text-[10px] text-blue-400 font-bold leading-relaxed italic">
                   ℹ️ Printer Anda terdeteksi sebagai "80mm Series Printer". Jika nota tidak keluar, pastikan nama printer di atas sesuai dengan yang ada di Control Panel Windows.
                 </p>
               </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <ScanLine className="w-6 h-6 text-orange-500" /><h4 className="font-bold text-lg">Label Printer (Barcode)</h4>
            </div>
            <div className="space-y-6">
               <div className="p-5 bg-muted/40 rounded-2xl border border-border space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Printer Label Aktif</label>
                    </div>
                    {printers.length > 0 ? (
                      <select 
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/30 outline-none transition-all"
                        value={labelPrinter}
                        onChange={(e) => setLabelPrinter(e.target.value)}
                      >
                        {printers.map((p: any) => (
                          <option key={p.Name} value={p.Name}>{p.Name}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        placeholder="Nama printer label (Xprinter...)"
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/30 outline-none transition-all"
                        value={labelPrinter}
                        onChange={(e) => setLabelPrinter(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Default Kolom Barcode</label>
                    <select 
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/30 outline-none transition-all"
                      value={labelColumns}
                      onChange={(e) => setLabelColumns(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} Kolom</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={async () => {
                      setIsSavingLabelPrinter(true);
                      try {
                        await api.put('/app-settings/label_printer', { items: [labelPrinter] });
                        await api.put('/app-settings/label_columns', { items: [String(labelColumns)] });
                        alert('Konfigurasi Printer Label Berhasil Disimpan!');
                      } catch (err) {
                        console.error('Save label printer error:', err);
                        alert('Gagal menyimpan konfigurasi.');
                      } finally {
                        setIsSavingLabelPrinter(false);
                      }
                    }}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    {isSavingLabelPrinter ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> SIMPAN LABEL SETUP</>}
                  </button>
               </div>

               <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                 <p className="text-[10px] text-orange-400 font-bold leading-relaxed italic">
                   ℹ️ Printer Label digunakan untuk mencetak barcode produk. Xprinter XP-D4601B biasanya menggunakan ukuran label 3-column.
                 </p>
               </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Activity className="w-6 h-6 text-purple-500" /><h4 className="font-bold text-lg">Informasi Sistem & Hardware</h4>
            </div>
            <div className="space-y-6">
              {isLoadingHardware ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-bold italic">Membaca hardware...</p>
                </div>
              ) : hardwareInfo ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Motherboard / Device</p>
                    <p className="text-sm font-bold">{hardwareInfo.motherboard?.manufacturer} {hardwareInfo.motherboard?.model}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">Serial: {hardwareInfo.motherboard?.serial}</p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Processor (CPU)</p>
                    <p className="text-sm font-bold">{hardwareInfo.cpu?.manufacturer} {hardwareInfo.cpu?.brand}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">{hardwareInfo.cpu?.cores} Cores @ {hardwareInfo.cpu?.speed}GHz</p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Storage (Disks)</p>
                    {hardwareInfo.disk?.map((d: any, i: number) => (
                      <div key={i} className="mb-2 last:mb-0">
                        <p className="text-sm font-bold">{d.name} ({Math.round(d.size / (1024**3))} GB)</p>
                        <p className="text-[10px] text-muted-foreground font-mono">SN: {d.serialNum}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl text-center">
                  <p className="text-xs text-red-500 font-bold">Gagal membaca informasi hardware.</p>
                  <button onClick={fetchHardwareInfo} className="mt-2 text-[10px] text-primary underline font-black">Coba Lagi</button>
                </div>
              )}
              
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                <p className="text-[10px] text-blue-400 font-bold leading-relaxed italic">
                  ℹ️ Hardware ID digunakan untuk lisensi aplikasi dan tracking perangkat POS yang terdaftar.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <MessageSquare className="w-6 h-6 text-green-500" /><h4 className="font-bold text-lg">WhatsApp API Gateway</h4>
            </div>
            <div className="space-y-6">
               <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full opacity-50 animate-pulse" />
                    <div className="relative w-48 h-48 bg-white p-3 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
                       {waStatus.isReady ? (
                         <div className="flex flex-col items-center gap-2 text-green-600">
                           <CheckCircle2 className="w-16 h-16" />
                           <span className="font-black text-xs uppercase tracking-widest">Terhubung</span>
                         </div>
                       ) : waStatus.status === 'qr' && waQR ? (
                         <img src={waQR} alt="WhatsApp QR" className="w-full h-full object-contain" />
                       ) : (
                         <div className="flex flex-col items-center gap-2 text-zinc-300">
                           <QrCode className="w-12 h-12 opacity-20" />
                           {waStatus.status === 'loading' && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                         </div>
                       )}
                       
                       {!waStatus.isReady && (
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-sm">
                            <button 
                              onClick={handleGenerateQR}
                              className="bg-green-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                              {waStatus.status === 'loading' ? 'Loading...' : 'Generate Baru'}
                            </button>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-black ${waStatus.isReady ? 'text-green-500' : 'text-white'}`}>
                      {waStatus.isReady ? 'WHATSAPP AKTIF' : 'Hubungkan WhatsApp'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 px-4 leading-relaxed italic">
                      {waStatus.isReady 
                        ? 'Sistem siap mengirimkan nota otomatis ke pelanggan.' 
                        : 'Scan QR di atas dengan WhatsApp Anda (Linked Devices) untuk mengaktifkan fitur pengiriman nota otomatis.'}
                    </p>
                    {waStatus.isReady && (
                      <button 
                        onClick={handleDisconnectWA}
                        className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                      >
                        Putuskan Koneksi
                      </button>
                    )}
                  </div>
               </div>

               <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                   <div>
                     <p className="font-bold text-sm">Notifikasi Nota Otomatis</p>
                     <p className="text-[11px] text-muted-foreground">Kirim WA setelah transaksi selesai</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" checked={true} className="sr-only peer" />
                     <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                   </label>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                   <div>
                     <p className="font-bold text-sm">Pengingat Servis Rutin</p>
                     <p className="text-[11px] text-muted-foreground">Ingatkan pelanggan setiap 3 bulan</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" checked={true} className="sr-only peer" />
                     <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                   </label>
                 </div>
               </div>
            </div>
          </div>
        </div>

      )}

      {/* ===== TAB: REMINDER WA ===== */}
      {activeTab === 'reminder' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Settings */}
            <div className="space-y-4">
              {/* Enable Toggle */}
              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-base">Aktifkan Reminder Otomatis</p>
                    <p className="text-xs text-muted-foreground mt-1">Kirim WA otomatis ke pelanggan yang belum servis</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={reminderConfig.enabled}
                      onChange={e => setReminderConfig(p => ({...p, enabled: e.target.checked}))}
                      className="sr-only peer" />
                    <div className="w-12 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>

              {/* Interval & Time */}
              <div className="glass-card p-6 rounded-2xl space-y-4">
                <h5 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Jadwal Pengiriman</h5>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-2">Kirim Setelah Berapa Bulan?</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5,6].map(m => (
                      <button key={m} onClick={() => setReminderConfig(p => ({...p, monthsAfterService: m}))}
                        className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${reminderConfig.monthsAfterService === m ? 'bg-green-500 text-white shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">Saat ini: <strong>{reminderConfig.monthsAfterService} bulan</strong> setelah servis</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-2">Jam Pengiriman</label>
                  <div className="flex items-center gap-3">
                    <select value={reminderConfig.sendHour}
                      onChange={e => setReminderConfig(p => ({...p, sendHour: Number(e.target.value)}))}
                      className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                      {Array.from({length: 24}, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>
                      ))}
                    </select>
                    <span className="font-black text-muted-foreground">:</span>
                    <select value={reminderConfig.sendMinute}
                      onChange={e => setReminderConfig(p => ({...p, sendMinute: Number(e.target.value)}))}
                      className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                      <option value={0}>00</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">Reminder dikirim setiap hari pukul <strong>{String(reminderConfig.sendHour).padStart(2,'0')}:{String(reminderConfig.sendMinute).padStart(2,'0')} WIB</strong></p>
                </div>
              </div>

              {/* Keywords */}
              <div className="glass-card p-6 rounded-2xl space-y-3">
                <h5 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Kata Kunci Jasa Servis</h5>
                <p className="text-xs text-muted-foreground">Reminder hanya dikirim jika transaksi mengandung kata-kata ini</p>
                <div className="flex flex-wrap gap-2">
                  {reminderConfig.serviceKeywords.map((kw, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                      {kw}
                      <button onClick={() => setReminderConfig(p => ({...p, serviceKeywords: p.serviceKeywords.filter((_,idx) => idx !== i)}))}
                        className="hover:text-red-400 transition-colors ml-1">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Tambah kata kunci..." value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && keywordInput.trim()) {
                      setReminderConfig(p => ({...p, serviceKeywords: [...p.serviceKeywords, keywordInput.trim()]}));
                      setKeywordInput('');
                    }}}
                    className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  <button onClick={() => { if (keywordInput.trim()) {
                    setReminderConfig(p => ({...p, serviceKeywords: [...p.serviceKeywords, keywordInput.trim()]}));
                    setKeywordInput('');
                  }}} className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Template Editor */}
            <div className="space-y-4">
              <div className="glass-card p-6 rounded-2xl space-y-4">
                <h5 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Template Pesan</h5>
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs font-bold text-green-400 mb-2">Variabel yang tersedia:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['{customerName}','{months}','{lastServiceDate}','{vehicleInfo}','{serviceName}','{workshopName}','{workshopPhone}','{workshopAddress}'].map(v => (
                      <button key={v} onClick={() => setReminderConfig(p => ({...p, messageTemplate: p.messageTemplate + v}))}
                        className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-mono hover:bg-green-500/20 transition-all">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={14}
                  value={reminderConfig.messageTemplate}
                  onChange={e => setReminderConfig(p => ({...p, messageTemplate: e.target.value}))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none leading-relaxed"
                  placeholder="Tulis template pesan di sini..."
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button onClick={handleSaveReminder} disabled={isSavingReminder}
                  className="w-full py-4 bg-green-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                  {isSavingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Konfigurasi Reminder
                </button>
                <button onClick={handleSendNow} disabled={isSendingNow || !reminderConfig.enabled}
                  className="w-full py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {isSendingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Kirim Reminder Sekarang (Test)
                </button>
                <p className="text-[10px] text-muted-foreground italic text-center">
                  "Kirim Sekarang" hanya mengirim ke pelanggan yang servisnya sudah {reminderConfig.monthsAfterService} bulan lalu.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===== TAB: MASTER DATA ===== */}
      {activeTab === 'masterdata' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Klik item untuk edit, atau hover untuk melihat tombol aksi. Tekan Enter untuk menyimpan cepat.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ListManager
              title="Kategori Produk"
              settingKey="categories"
              placeholder="Tambah kategori baru..."
              icon={<Tag className="w-4 h-4 text-orange-500" />}
              colorClass="bg-orange-500/10"
            />
            <ListManager
              title="Lokasi Etalase"
              settingKey="etalase"
              placeholder="Tambah lokasi etalase baru..."
              icon={<Layers className="w-4 h-4 text-blue-500" />}
              colorClass="bg-blue-500/10"
            />
          </div>
        </div>
      )}

      {/* ===== TAB: APPEARANCE ===== */}
      {activeTab === 'appearance' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="glass-card p-10 rounded-[3rem] border border-border/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="md:w-1/2 space-y-4">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit">
                  <Palette className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-3xl font-black uppercase tracking-tight">Pilih Tema Aplikasi</h4>
                <p className="text-sm text-muted-foreground leading-relaxed italic">Sesuaikan tampilan Jakarta Motor POS agar nyaman di mata Anda, baik saat bekerja di siang hari maupun malam hari.</p>
              </div>

              <div className="md:w-1/2 grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => setTheme('light')}
                  className={`relative flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all group ${
                    theme === 'light' 
                      ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' 
                      : 'border-border bg-muted/20 grayscale opacity-40 hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${theme === 'light' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-muted text-muted-foreground'}`}>
                    <Sun className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm uppercase tracking-widest">Clean Light</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">Siang Hari / Terang</p>
                  </div>
                  {theme === 'light' && <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full"><CheckCircle2 className="w-5 h-5" /></div>}
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`relative flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all group ${
                    theme === 'dark' 
                      ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' 
                      : 'border-border bg-muted/20 grayscale opacity-40 hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/50' : 'bg-muted text-muted-foreground'}`}>
                    <Moon className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm uppercase tracking-widest">Modern Dark</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">Malam Hari / Gelap</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 rounded-[3rem] border border-border/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="md:w-1/2 space-y-4">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit">
                   <Sun className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-3xl font-black uppercase tracking-tight">Warna Aksen</h4>
                <p className="text-sm text-muted-foreground leading-relaxed italic">Pilih warna kontras untuk tombol, ikon, dan elemen penting lainnya. Semua pilihan dirancang tetap elegan dengan dasar Hitam.</p>
              </div>

              <div className="md:w-1/2 grid grid-cols-3 gap-4 w-full">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setAccentColor(color.value)}
                    className={`relative flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all group ${
                      accentColor === color.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-muted/20 hover:border-border-hover'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-2xl shadow-lg transition-transform group-hover:scale-110" 
                      style={{ backgroundColor: color.value }}
                    />
                    <p className="font-black text-[10px] uppercase tracking-widest">{color.label}</p>
                    {accentColor === color.value && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-card border border-border/50 rounded-3xl">
              <h5 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" /> Tip Visual
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"Tema **Modern Dark** membantu mengurangi kelelahan mata saat bekerja di ruangan bengkel yang minim cahaya."</p>
            </div>
            <div className="p-8 bg-card border border-border/50 rounded-3xl">
              <h5 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" /> Responsif
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"Tema **Clean Light** sangat bagus digunakan saat tablet/komputer Anda terkena sinar matahari langsung."</p>
            </div>
            <div className="p-8 bg-card border border-border/50 rounded-3xl">
              <h5 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" /> Hemat Energi
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"Gunakan mode gelap pada perangkat dengan layar OLED untuk menghemat daya baterai secara signifikan."</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: DATABASE ===== */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Save className="w-6 h-6 text-blue-500" /><h4 className="font-bold text-lg">Backup Database</h4>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">Amankan data bengkel (transaksi, inventori, pelanggan) dengan melakukan backup secara berkala.</p>
              
              <button
                onClick={async () => {
                  try {
                    const res = await api.get('/database/backup', { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `backup_bengkel_${new Date().toISOString().split('T')[0]}.json`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (err) {
                    alert('Gagal melakukan backup database.');
                  }
                }}
                className="w-full py-4 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> UNDUH BACKUP SEKARANG
              </button>

              <div className="relative">
                <input 
                  type="file" 
                  id="import-db" 
                  className="hidden" 
                  accept=".json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const confirmImport = confirm('PERINGATAN: Mengimpor database akan menghapus SELURUH data saat ini dan menggantinya dengan isi file backup. Lanjutkan?');
                    if (!confirmImport) return;

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const jsonData = JSON.parse(event.target?.result as string);
                        await api.post('/database/import', { data: jsonData });
                        alert('Database berhasil diimpor! Sistem akan dimuat ulang.');
                        window.location.reload();
                      } catch (err: any) {
                        alert('Gagal impor: ' + (err.response?.data?.error || err.message));
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                <button
                  onClick={() => document.getElementById('import-db')?.click()}
                  className="w-full py-4 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> UNGGAH BACKUP (IMPORT)
                </button>
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-blue-500">Auto Backup</p>
                  <p className="text-[10px] text-muted-foreground">Backup otomatis setiap malam</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" onChange={async (e) => {
                    await api.put('/app-settings/auto_backup', { items: [e.target.checked.toString()] });
                  }}/>
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-6 border-red-500/20">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
              <Trash2 className="w-6 h-6 text-red-500" /><h4 className="font-bold text-lg text-red-500">Reset Database</h4>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p className="text-xs text-blue-400 leading-relaxed font-bold">
                  ℹ️ SMART RESET: Fitur ini akan membersihkan Riwayat Transaksi, Pembelian, Log Stok, dan Absensi. Data Master (User, Layanan, Pelanggan, Rak/Etalase) akan TETAP ADA untuk Go-Live.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!window.confirm('SMART RESET: Tindakan ini akan membersihkan seluruh riwayat transaksi dan operasional (Pembelian, Stok, Cashflow, Absensi).\n\nData Master (User, Layanan, Pelanggan, Produk & Rak) akan TETAP ADA.\n\nApakah Anda yakin?')) return;
                  
                  const confirm2 = window.confirm('KONFIRMASI TERAKHIR: Seluruh riwayat transaksi akan dihapus PERMANEN. Tekan OK untuk memproses reset.');
                  if (!confirm2) return;

                  try {
                    setIsSaving(true);
                    console.log('Initiating database reset...');
                    const res = await api.post('/database/reset');
                    console.log('Reset response:', res.data);
                    alert(res.data.message || 'Database berhasil di-reset.');
                    window.location.href = '/';
                  } catch (err: any) {
                    console.error('Reset error:', err);
                    const errorMsg = err.response?.data?.error || err.message;
                    alert('Gagal mereset database: ' + errorMsg);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="w-full py-4 bg-transparent border-2 border-red-500 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" /> RESET KE PENGATURAN AWAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: GENERAL ===== */}
      {activeTab === 'general' && (
        <>
          <div className="flex justify-end">
            <button 
              onClick={handleSaveGeneral} 
              disabled={isSaving || isLoadingGeneral}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

          {saveSuccess && activeTab === 'general' && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm font-bold text-green-500">{saveSuccess}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Store className="w-6 h-6 text-primary" /><h4 className="font-bold text-lg">Profil Bisnis</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Nama Bengkel</label>
                  <input 
                    type="text" 
                    value={workshopSettings.name} 
                    onChange={e => setWorkshopSettings({ ...workshopSettings, name: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">No. Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={workshopSettings.phone} 
                      onChange={e => setWorkshopSettings({ ...workshopSettings, phone: e.target.value })}
                      className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Alamat Lengkap</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                    <textarea 
                      rows={3} 
                      value={workshopSettings.address} 
                      onChange={e => setWorkshopSettings({ ...workshopSettings, address: e.target.value })}
                      className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Receipt className="w-6 h-6 text-blue-500" /><h4 className="font-bold text-lg">Penagihan & Struk</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Tarif Pajak (PPN %)</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="number" 
                      value={workshopSettings.taxRate} 
                      onChange={e => setWorkshopSettings({ ...workshopSettings, taxRate: Number(e.target.value) })}
                      className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Pesan Footer Struk</label>
                  <textarea 
                    rows={3} 
                    value={workshopSettings.footerMessage} 
                    onChange={e => setWorkshopSettings({ ...workshopSettings, footerMessage: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none" 
                  />
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Informasi Rekening Bank (Transfer)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: BCA 123456789 a/n Jakarta Motor"
                    value={workshopSettings.bankAccount || ''} 
                    onChange={e => setWorkshopSettings({ ...workshopSettings, bankAccount: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium mb-4" 
                  />
                  
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Gambar QRIS (Opsional)</label>
                  <div className="flex items-center gap-4">
                    {workshopSettings.qrisImage ? (
                      <div className="relative group">
                        <img src={workshopSettings.qrisImage} alt="QRIS" className="w-24 h-24 object-contain bg-white rounded-xl border border-border p-2" />
                        <button 
                          onClick={() => setWorkshopSettings({ ...workshopSettings, qrisImage: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-muted border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground">
                        <ScanLine className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/70 text-foreground text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-border">
                        <Plus className="w-4 h-4" /> Pilih Gambar QRIS
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setWorkshopSettings({ ...workshopSettings, qrisImage: event.target?.result as string });
                            };
                            reader.readAsDataURL(file);
                          }} 
                        />
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-2 italic">Format: JPG/PNG. Ukuran maks 500KB agar cepat dimuat di kasir.</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={workshopSettings.enableWhatsApp} 
                      onChange={e => setWorkshopSettings({ ...workshopSettings, enableWhatsApp: e.target.checked })}
                      className="w-5 h-5 accent-primary" 
                    />
                    <span className="font-medium">Aktifkan Struk Digital WhatsApp</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL: ADD / EDIT SERVICE ===== */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in duration-300 border border-border/50">
            <button onClick={() => setShowServiceModal(false)} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl"><Wrench className="w-6 h-6 text-primary" /></div>
              <div>
                <h3 className="text-xl font-black">{editingService ? 'Edit Jasa Servis' : 'Tambah Jasa Baru'}</h3>
                <p className="text-xs text-muted-foreground">Harga tampil otomatis di Kasir & Bengkel</p>
              </div>
            </div>
            <form onSubmit={handleSaveService} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Nama Jasa *</label>
                <input required type="text" placeholder="Cth: Ganti Oli, Tune Up, Ganti Ban..." value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Harga Jasa (Rp) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">Rp</span>
                  <input required type="number" min="0" placeholder="0" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 font-black text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                {serviceForm.price && <p className="text-xs text-muted-foreground mt-1 ml-1">= Rp {Number(serviceForm.price).toLocaleString('id-ID')}</p>}
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Estimasi Waktu</label>
                <div className="flex gap-2 mb-2">
                  {['15m', '30m', '45m', '1j', '2j', '3j+'].map(t => (
                    <button key={t} type="button" onClick={() => setServiceForm({ ...serviceForm, estimatedTime: t })} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${serviceForm.estimatedTime === t ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-transparent text-muted-foreground hover:border-border'}`}>{t}</button>
                  ))}
                </div>
                <input type="text" placeholder="Atau ketik sendiri (cth: 90m)" value={serviceForm.estimatedTime} onChange={e => setServiceForm({ ...serviceForm, estimatedTime: e.target.value })} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowServiceModal(false)} className="flex-1 py-3.5 bg-muted hover:bg-muted/70 rounded-xl font-bold transition-all">Batal</button>
                <button type="submit" disabled={isSavingService} className="flex-1 py-3.5 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSavingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> {editingService ? 'Perbarui' : 'Simpan'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
