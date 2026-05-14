import React, { useState, useEffect, useRef } from 'react';
import { Search, Car, History, Phone, User, Calendar, ChevronRight, ArrowLeft, Loader2, Wrench, FileText, Users, Activity, Star, Clock, Bike } from 'lucide-react';
import api from '../api';

interface VehicleStats {
  id: string;
  plateNumber: string;
  model: string;
  owner: string;
  vehicleType: 'MOTOR' | 'MOBIL';
  phone: string | null;
  totalVisits: number;
  lastService: string | null;
}

interface TransactionHistory {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  notes: string | null;
  items: {
    name: string;
    quantity: number;
    price: number;
    type: 'PART' | 'SERVICE';
  }[];
  workOrder?: {
    complaint: string | null;
    mechanic?: {
      name: string;
    };
  };
}

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleStats | null>(null);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVehicles();
    // Auto-focus search input on mount
    if (!selectedVehicle) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
    }
  }, [selectedVehicle]);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (error) {
      console.error('Failed to fetch vehicles', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicleHistory = async (id: string) => {
    try {
      setIsLoadingHistory(true);
      const res = await api.get(`/vehicles/${id}/history`);
      setHistory(res.data.transactions);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectVehicle = (v: VehicleStats) => {
    setSelectedVehicle(v);
    fetchVehicleHistory(v.id);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick stats calculation
  const totalVehicles = vehicles.length;
  const loyalCustomers = vehicles.filter(v => v.totalVisits >= 5).length;
  const recentVisits = vehicles.filter(v => {
    if (!v.lastService) return false;
    const lastDate = new Date(v.lastService);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastDate >= thirtyDaysAgo;
  }).length;

  if (selectedVehicle) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => { setSelectedVehicle(null); setHistory([]); }}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden border-primary/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${selectedVehicle.vehicleType === 'MOBIL' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-primary shadow-primary/20'}`}>
                    {selectedVehicle.vehicleType === 'MOBIL' ? (
                      <Car className="text-white w-8 h-8" />
                    ) : (
                      <Bike className="text-white w-8 h-8" />
                    )}
                  </div>
                  {selectedVehicle.totalVisits >= 5 && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-[10px] font-black border border-yellow-500/30">
                      <Star className="w-3 h-3 fill-yellow-500" /> LOYAL CUSTOMER
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-mono font-black tracking-tighter text-primary">{selectedVehicle.plateNumber}</h3>
                <p className="text-muted-foreground font-bold mb-6">{selectedVehicle.model === 'Unknown' ? 'Model Tidak Diketahui' : selectedVehicle.model}</p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted rounded-xl"><User className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Pemilik</p>
                      <p className="text-sm font-bold">{selectedVehicle.owner === 'Customer' ? 'Pelanggan Umum' : selectedVehicle.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted rounded-xl"><Phone className="w-4 h-4 text-green-500" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Kontak</p>
                      <p className="text-sm font-bold">{selectedVehicle.phone || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-3xl">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Statistik Unit
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-2xl border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Datang</p>
                  <p className="text-2xl font-black">{selectedVehicle.totalVisits}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-2xl border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Terakhir</p>
                  <p className="text-sm font-black">
                    {selectedVehicle.lastService ? new Date(selectedVehicle.lastService).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="lg:col-span-2">
            <div className="glass-card p-8 rounded-3xl min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><History className="text-primary w-6 h-6" /></div>
                  <h3 className="text-xl font-black tracking-tight">Riwayat Servis & Transaksi</h3>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Menampilkan {history.length} data terbaru</span>
              </div>

              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-bold text-muted-foreground italic">Menyelami arsip data...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-center">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 opacity-50">
                    <FileText className="w-10 h-10" />
                  </div>
                  <p className="font-bold text-lg">Riwayat Kosong</p>
                  <p className="text-sm max-w-[250px]">Kendaraan ini belum pernah melakukan transaksi di sistem.</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary/50 before:to-transparent">
                  {history.map((item) => (
                    <div key={item.id} className="relative pl-12 group">
                      <div className="absolute left-0 top-1 w-10 h-10 bg-card border-4 border-muted rounded-full flex items-center justify-center z-10 group-hover:border-primary transition-all shadow-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="bg-muted/20 p-6 rounded-3xl border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                          <div>
                            <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-widest flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex items-center gap-2">
                              <h5 className="text-lg font-black tracking-tight">{item.invoiceNo}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                                item.status === 'RETURNED' 
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                  : 'bg-green-500/10 text-green-500 border-green-500/20'
                              }`}>
                                {item.status === 'RETURNED' ? 'DIBATALKAN' : 'SUKSES'}
                              </span>
                            </div>
                          </div>
                          <div className="text-left md:text-right bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                            <p className="text-xl font-black text-primary">Rp {item.totalAmount.toLocaleString('id-ID')}</p>
                            <div className="flex items-center md:justify-end gap-2 text-[10px] font-bold text-muted-foreground">
                              <Wrench className="w-3 h-3" />
                              Mekanik: <span className="text-foreground">{item.workOrder?.mechanic?.name || 'Tanpa Mekanik'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-border/50 space-y-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-black mb-2 tracking-widest">Detail Pekerjaan & Suku Cadang</p>
                            <div className="flex flex-wrap gap-2">
                              {item.items.map((it, idx) => (
                                <div key={idx} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border ${it.type === 'SERVICE' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                                  {it.type === 'SERVICE' ? <Wrench className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />}
                                  {it.name} {it.quantity > 1 && <span className="opacity-60">x{it.quantity}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          {item.workOrder?.complaint && (
                            <div className="bg-muted/40 p-3 rounded-2xl border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 ml-1">Keluhan Pelanggan</p>
                              <p className="text-xs italic text-zinc-300 leading-relaxed">"{item.workOrder.complaint}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border-l-4 border-l-primary flex items-center gap-5">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center"><Car className="text-primary w-7 h-7" /></div>
          <div>
            <p className="text-3xl font-black text-foreground leading-none mb-1">{totalVehicles}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Unit Terdaftar</p>
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl border-l-4 border-l-blue-500 flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center"><Activity className="text-blue-500 w-7 h-7" /></div>
          <div>
            <p className="text-3xl font-black text-foreground leading-none mb-1">{recentVisits}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aktif (30 Hari Terakhir)</p>
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl border-l-4 border-l-yellow-500 flex items-center gap-5">
          <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center"><Star className="text-yellow-500 w-7 h-7" /></div>
          <div>
            <p className="text-3xl font-black text-foreground leading-none mb-1">{loyalCustomers}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pelanggan Loyal (5+ Visit)</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">DATABASE UNIT KENDARAAN</h2>
          <p className="text-sm text-muted-foreground font-medium">Cari plat nomor untuk melihat riwayat servis lengkap.</p>
        </div>
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Ketik Plat Nomor (Contoh: B 1234 ABC)..."
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black tracking-widest shadow-sm uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Car className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
          </div>
          <p className="font-black italic text-muted-foreground text-sm tracking-widest animate-pulse uppercase">Syncing Vehicle Database...</p>
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] border border-border/50 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plat Nomor</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Model Unit</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pemilik</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Total Visit</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service Terakhir</th>
                  <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                        <Search className="w-12 h-12" />
                        <p className="font-black uppercase tracking-[0.2em] text-xs italic">Data kendaraan tidak ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <tr 
                      key={vehicle.id}
                      onClick={() => handleSelectVehicle(vehicle)}
                      className="group hover:bg-primary/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${vehicle.vehicleType === 'MOBIL' ? 'bg-blue-500/10' : 'bg-primary/10'}`}>
                            {vehicle.vehicleType === 'MOBIL' ? <Car className="w-5 h-5 text-blue-500" /> : <Bike className="w-5 h-5 text-primary" />}
                          </div>
                          <p className="text-lg font-mono font-black tracking-widest group-hover:text-primary transition-colors">{vehicle.plateNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-foreground">
                          {vehicle.model === 'Unknown' ? <span className="opacity-40 italic font-medium">Belum Tercatat</span> : vehicle.model}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-bold">{vehicle.owner === 'Customer' ? 'Pelanggan Umum' : vehicle.owner}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${vehicle.totalVisits >= 5 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-muted text-muted-foreground border-border/50'}`}>
                          {vehicle.totalVisits} VISIT
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {vehicle.lastService ? new Date(vehicle.lastService).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <button className="p-2.5 bg-muted group-hover:bg-primary/10 group-hover:text-primary rounded-xl transition-all text-muted-foreground flex items-center gap-2 mx-auto">
                          <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block">Detail History</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
