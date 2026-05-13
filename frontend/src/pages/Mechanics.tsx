import React, { useState, useEffect } from 'react';
import { Plus, Star, MoreVertical, X, Loader2, UserPlus, Percent, User, Bike, Car, Layers, Wrench, TrendingUp, DollarSign, Clock, Calendar, Search, Filter, ChevronDown } from 'lucide-react';
import api from '../api';

interface Mechanic {
  id: string;
  name: string;
  username: string;
  commissionRate: number;
  specialty: 'MOTOR' | 'MOBIL' | 'ALL';
  _count: {
    assignedTasks: number;
  };
}

interface PerformanceData {
  mechanic: Mechanic;
  stats: {
    totalRevenue: number;
    totalCommission: number;
    totalUnits: number;
  };
  history: {
    id: string;
    plate: string;
    model: string;
    date: string;
    status: string;
    revenue: number;
  }[];
}

const Mechanics: React.FC = () => {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState<PerformanceData | null>(null);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<'ALL' | 'MOTOR' | 'MOBIL'>('ALL');
  const [listRange, setListRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
  const [performanceRange, setPerformanceRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('MONTH');

  const [formData, setFormData] = useState({
    name: '',
    commissionRate: 0,
    specialty: 'MOTOR' as 'MOTOR' | 'MOBIL' | 'ALL'
  });

  useEffect(() => {
    fetchMechanics();
  }, [listRange]);

  const fetchMechanics = async () => {
    try {
      setIsLoading(true);
      let startDate = '';
      const now = new Date();

      if (listRange === 'TODAY') {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (listRange === 'WEEK') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        startDate = weekAgo.toISOString();
      } else if (listRange === 'MONTH') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        startDate = monthAgo.toISOString();
      }

      const res = await api.get('/mechanics', {
        params: { startDate, endDate: listRange === 'ALL' ? '' : new Date().toISOString() }
      });
      setMechanics(res.data);
    } catch (error) {
      console.error('Failed to fetch mechanics', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPerformance = async (id: string, range?: string) => {
    try {
      setIsLoadingPerf(true);
      const activeRange = range || performanceRange;
      let startDate = '';
      const now = new Date();

      if (activeRange === 'TODAY') {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (activeRange === 'WEEK') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        startDate = weekAgo.toISOString();
      } else if (activeRange === 'MONTH') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        startDate = monthAgo.toISOString();
      }

      const res = await api.get(`/mechanics/${id}/performance`, {
        params: { startDate, endDate: activeRange === 'ALL' ? '' : new Date().toISOString() }
      });
      setSelectedPerformance(res.data);
    } catch (error) {
      alert('Gagal mengambil data performa.');
    } finally {
      setIsLoadingPerf(false);
    }
  };

  const handleAddMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const randomSuffix = Math.random().toString(36).substring(7);
    const generatedUsername = `mech_${formData.name.toLowerCase().replace(/\s+/g, '_')}_${randomSuffix}`;
    const generatedPassword = `pass_${randomSuffix}`;

    try {
      await api.post('/auth/register', {
        ...formData,
        username: generatedUsername,
        password: generatedPassword,
        role: 'MECHANIC'
      });
      setIsModalOpen(false);
      setFormData({ name: '', commissionRate: 0, specialty: 'MOTOR' });
      fetchMechanics();
    } catch (error) {
      alert('Gagal menambah mekanik.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMechanic = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus mekanik ini? Data performa akan hilang.')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchMechanics();
    } catch (error) {
      alert('Gagal menghapus mekanik. Pastikan mekanik tidak memiliki transaksi aktif.');
    }
  };

  const filteredMechanics = mechanics.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = specialtyFilter === 'ALL' || m.specialty === specialtyFilter || (!m.specialty && specialtyFilter === 'MOTOR');
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black tracking-tighter uppercase">Manajemen Mekanik</h3>
          <p className="text-sm text-muted-foreground font-medium italic">Monitor performa, spesialisasi, dan bagi hasil jasa tim.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all font-black text-sm uppercase tracking-widest"
        >
          <UserPlus className="w-5 h-5" />
          Daftarkan Mekanik
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row items-center gap-4 bg-card/30 p-4 rounded-[2rem] border border-border/50 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama mekanik..."
            className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* Time Range Filter */}
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setListRange(r)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[9px] font-black transition-all ${
                  listRange === r ? 'bg-zinc-800 text-white shadow-md' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {r === 'TODAY' ? 'HARI' : r === 'WEEK' ? 'MINGGU' : r === 'MONTH' ? 'BULAN' : 'SEMUA'}
              </button>
            ))}
          </div>
          {/* Specialty Filter */}
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border">
            {(['ALL', 'MOTOR', 'MOBIL'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSpecialtyFilter(type)}
                className={`flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                  specialtyFilter === type ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {type === 'MOTOR' ? <Bike className="w-3 h-3" /> : type === 'MOBIL' ? <Car className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                {type === 'ALL' ? 'SEMUA' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mechanic Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-sm font-black text-muted-foreground tracking-widest animate-pulse uppercase">Syncing Staff Data...</p>
        </div>
      ) : filteredMechanics.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-muted-foreground bg-card/20 rounded-[3rem] border border-dashed border-border/50">
          <User className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-bold">Mekanik tidak ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMechanics.map((mechanic) => (
            <div key={mechanic.id} className="glass-card p-8 rounded-[2.5rem] relative group hover:border-primary/50 transition-all border border-border/50 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
              
              <div className="absolute top-8 right-8 z-20 flex gap-2">
                <button 
                  onClick={() => handleDeleteMechanic(mechanic.id)}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  title="Hapus Mekanik"
                >
                  <X className="w-4 h-4" />
                </button>
                <button className="text-muted-foreground hover:text-foreground"><MoreVertical className="w-5 h-5" /></button>
              </div>
              
              <div className="flex items-center gap-5 mb-8 relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-3xl text-primary uppercase shadow-inner">
                  {mechanic.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-xl tracking-tight leading-none mb-2">{mechanic.name}</h4>
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full w-fit">
                    {mechanic.specialty === 'MOTOR' ? <Bike className="w-3 h-3 text-primary" /> : 
                     mechanic.specialty === 'MOBIL' ? <Car className="w-3 h-3 text-blue-500" /> : 
                     <Layers className="w-3 h-3 text-purple-500" />}
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {!mechanic.specialty || mechanic.specialty === 'ALL' ? 'Spesialis Umum' : `Spesialis ${mechanic.specialty}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Kerja</span>
                  </div>
                  <span className="font-black text-sm">{mechanic._count?.assignedTasks || 0} <span className="text-[10px] text-muted-foreground">Unit</span></span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/30">
                  <div className="flex items-center gap-3">
                    <Percent className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black text-primary uppercase tracking-widest">Rate Komisi</span>
                  </div>
                  <span className="font-black text-lg text-primary">{mechanic.commissionRate}%</span>
                </div>
              </div>
              
              <button 
                onClick={() => fetchPerformance(mechanic.id)}
                className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Lihat Performa Lengkap
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Performance Detail Modal with FILTER */}
      {selectedPerformance && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl border border-border/50 animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-primary/5 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                  {selectedPerformance.mechanic.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{selectedPerformance.mechanic.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <Star className="w-3 h-3 text-orange-500 fill-orange-500" /> Profil Performa Staf Ahli
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex bg-muted/50 p-1 rounded-xl border border-border">
                  {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setPerformanceRange(r); fetchPerformance(selectedPerformance.mechanic.id, r); }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        performanceRange === r ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {r === 'TODAY' ? 'HARI INI' : r === 'WEEK' ? 'MINGGU' : r === 'MONTH' ? 'BULAN' : 'SEMUA'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSelectedPerformance(null)} className="p-3 bg-muted/50 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-muted/30 p-6 rounded-[2rem] border border-border/50 relative overflow-hidden">
                  <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/5 -rotate-12" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Omzet Jasa</p>
                  <p className="text-2xl font-black text-foreground">Rp {selectedPerformance.stats.totalRevenue.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/20 relative overflow-hidden">
                  <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/10 -rotate-12" />
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Total Komisi</p>
                  <p className="text-2xl font-black text-primary">Rp {selectedPerformance.stats.totalCommission.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-muted/30 p-6 rounded-[2rem] border border-border/50 relative overflow-hidden">
                  <Wrench className="absolute -right-4 -bottom-4 w-24 h-24 text-muted-foreground/5 -rotate-12" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Unit Selesai</p>
                  <p className="text-2xl font-black text-foreground">{selectedPerformance.history.length} Unit</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Riwayat Pekerjaan
                  </h4>
                </div>
                <div className="space-y-3">
                  {selectedPerformance.history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-5 bg-card border border-border/50 rounded-2xl hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="bg-muted px-4 py-2 rounded-xl font-mono font-black text-primary text-sm group-hover:bg-primary group-hover:text-white transition-all uppercase">
                          {h.plate}
                        </div>
                        <div>
                          <p className="font-black text-sm">{h.model || 'Unknown'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${h.status === 'DONE' || h.status === 'ARCHIVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                              {h.status === 'DONE' || h.status === 'ARCHIVED' ? 'SELESAI' : h.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Nilai Jasa</p>
                        <p className="font-black text-foreground">Rp {h.revenue.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  ))}
                  {selectedPerformance.history.length === 0 && (
                    <div className="py-20 text-center opacity-30 italic font-bold uppercase tracking-widest">Belum ada riwayat pengerjaan</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-border/50 bg-muted/20 shrink-0">
              <button onClick={() => setSelectedPerformance(null)} className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-700 transition-all">
                Tutup Detail Performa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mechanic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl border border-border/50 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                  <UserPlus className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Tambah Mekanik</h3>
                  <p className="text-xs text-muted-foreground font-medium">Daftarkan personel ahli baru ke sistem.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddMechanic} className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2 block mb-3">Profil Mekanik</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      type="text"
                      className="w-full bg-muted border-2 border-border/50 rounded-[1.5rem] pl-14 pr-6 py-4 focus:outline-none focus:border-primary transition-all font-black text-lg placeholder:text-muted-foreground/30"
                      placeholder="NAMA LENGKAP MEKANIK"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Rate Komisi (%)</label>
                  <div className="relative group">
                    <Percent className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                    <input
                      type="number"
                      className="w-full bg-muted border-2 border-border/50 rounded-[1.2rem] pl-12 pr-4 py-4 focus:outline-none focus:border-primary transition-all font-black text-sm"
                      placeholder="0 (Opsional)"
                      value={formData.commissionRate || ''}
                      onChange={(e) => setFormData({...formData, commissionRate: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Spesialisasi Keahlian</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['MOTOR', 'MOBIL', 'ALL'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, specialty: type as any})}
                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                          formData.specialty === type 
                            ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' 
                            : 'bg-muted border-border/50 text-muted-foreground grayscale opacity-50 hover:opacity-100 hover:grayscale-0'
                        }`}
                      >
                        {type === 'MOTOR' ? <Bike className="w-5 h-5" /> : 
                         type === 'MOBIL' ? <Car className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{type === 'ALL' ? 'SEMUA' : type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-muted hover:bg-red-500/10 hover:text-red-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-5 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> SIMPAN DATA MEKANIK</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mechanics;
