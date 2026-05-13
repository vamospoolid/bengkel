import React, { useState, useEffect } from 'react';
import { Search, Plus, Wrench, Clock, CheckCircle2, X, User, AlertCircle, Loader2, Trash2, Car, Settings, Phone, ClipboardList, Bike, Camera, Eye } from 'lucide-react';
import api from '../api';

interface WorkshopTask {
  id: string;
  plateNumber: string;
  customerName?: string;
  model?: string;
  vehicleType: 'MOTOR' | 'MOBIL';
  status: 'QUEUED' | 'PROGRESS' | 'TESTING' | 'DONE';
  complaint?: string;
  services: string[];
  mechanicName?: string;
  photos?: string[];
  createdAt: string;
}

const Workshop: React.FC = () => {
  const [tasks, setTasks] = useState<WorkshopTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [servicesList, setServicesList] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({
    plateNumber: '',
    customerName: '',
    model: '',
    vehicleType: 'MOTOR' as 'MOTOR' | 'MOBIL',
    complaint: '',
    mechanicId: '',
    services: [] as string[],
    whatsapp: ''
  });
  const [mechanics, setMechanics] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchMechanics();
    fetchServices();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/work-orders');
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await api.get('/mechanics');
      setMechanics(res.data);
    } catch (error) {
      console.error('Failed to fetch mechanics', error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      setServicesList(res.data);
    } catch (error) {
      console.error('Failed to fetch services', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.services.length === 0) return alert('Pilih minimal satu layanan.');
    setIsSaving(true);
    try {
      await api.post('/work-orders', {
        ...newTask,
        services: newTask.services
      });
      setShowAddModal(false);
      setNewTask({ plateNumber: '', customerName: '', model: '', vehicleType: 'MOTOR', complaint: '', mechanicId: '', services: [], whatsapp: '' });
      fetchTasks();
    } catch (error) {
      alert('Gagal membuat tugas bengkel.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/work-orders/${id}`, { status });
      fetchTasks();
    } catch (error) {
      alert('Gagal memperbarui status.');
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Hapus data unit ini?')) return;
    try {
      await api.delete(`/work-orders/${id}`);
      fetchTasks();
    } catch (error) {
      alert('Gagal menghapus data.');
    }
  };

  const clearAllDone = async () => {
    const doneCount = tasks.filter(t => t.status === 'DONE').length;
    if (doneCount === 0) return alert('Tidak ada data yang selesai untuk dibersihkan.');
    if (!confirm(`Hapus ${doneCount} data yang sudah selesai dari dashboard?`)) return;
    try {
      await api.delete('/work-orders');
      fetchTasks();
    } catch (error) {
      alert('Gagal membersihkan data.');
    }
  };

  const STATUS_COLUMNS = [
    { key: 'QUEUED',   label: 'Antrean',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: <Clock className="w-4 h-4 text-blue-400" /> },
    { key: 'PROGRESS', label: 'Dikerjakan', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <Wrench className="w-4 h-4 text-orange-400" /> },
    { key: 'TESTING',  label: 'Test Jalan', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: <Settings className="w-4 h-4 text-yellow-400" /> },
    { key: 'DONE',     label: 'Selesai',    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
  ];

  const STATUS_NEXT: Record<string, string | null> = {
    QUEUED: 'PROGRESS', PROGRESS: 'TESTING', TESTING: 'DONE', DONE: null
  };
  const STATUS_NEXT_LABEL: Record<string, string> = {
    QUEUED: 'Mulai Kerjakan', PROGRESS: 'Test Jalan', TESTING: 'Selesai', DONE: ''
  };

  const filteredTasks = tasks.filter(t =>
    t.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tighter">KONTROL BENGKEL</h3>
          <p className="text-sm text-muted-foreground">Kelola antrian servis kendaraan secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={clearAllDone} className="px-4 py-2.5 bg-muted text-muted-foreground rounded-xl font-bold text-xs hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" /> Bersihkan Selesai
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm">
            <Plus className="w-4 h-4" /> Daftarkan Unit
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari plat nomor atau nama..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-bold">Memuat antrian...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {STATUS_COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-2xl border ${col.border} ${col.bg} p-4 space-y-3`}>
                {/* Column Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <span className={`font-black text-sm uppercase tracking-widest ${col.color}`}>{col.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${col.bg} ${col.color} border ${col.border}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-40">
                    <ClipboardList className="w-8 h-8 mb-2" />
                    <p className="text-xs font-bold">Kosong</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div key={task.id} className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                      {/* Plate & Type */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.vehicleType === 'MOTOR'
                            ? <Bike className="w-4 h-4 text-muted-foreground" />
                            : <Car className="w-4 h-4 text-muted-foreground" />}
                          <span className="font-black text-base tracking-widest">{task.plateNumber}</span>
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="p-1 text-zinc-600 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Customer & Model */}
                      {(task.customerName || task.model) && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {task.customerName && <p className="flex items-center gap-1.5"><User className="w-3 h-3" />{task.customerName}</p>}
                          {task.model && <p className="ml-4 font-medium">{task.model}</p>}
                        </div>
                      )}

                      {/* Complaint */}
                      {task.complaint && (
                        <div className="flex items-start gap-1.5 p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                          <AlertCircle className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-orange-300 leading-relaxed line-clamp-2">{task.complaint}</p>
                        </div>
                      )}

                      {/* Services */}
                      <div className="flex flex-wrap gap-1">
                        {(task.services || []).map((svc, i) => (
                          <span key={i} className="px-2 py-0.5 bg-muted rounded-md text-[10px] font-bold text-muted-foreground">{svc}</span>
                        ))}
                      </div>

                      {/* Mechanic */}
                      {task.mechanicName && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                          <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">{task.mechanicName}</span>
                        </div>
                      )}

                      {/* Action */}
                      {STATUS_NEXT[task.status] && (
                        <button
                          onClick={() => updateStatus(task.id, STATUS_NEXT[task.status]!)}
                          className="w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[11px] font-black hover:bg-primary hover:text-white transition-all"
                        >
                          → {STATUS_NEXT_LABEL[task.status]}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl"><Plus className="w-5 h-5 text-primary" /></div>
                <div>
                  <h4 className="font-black text-lg">DAFTARKAN UNIT BARU</h4>
                  <p className="text-xs text-muted-foreground">Harap lengkapi detail kendaraan untuk mempermudah pengerjaan mekanik.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">
                  {/* Vehicle Type */}
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Identitas Kendaraan</label>
                    <div className="flex gap-2 mb-3">
                      {(['MOTOR', 'MOBIL'] as const).map(type => (
                        <button key={type} type="button" onClick={() => setNewTask(p => ({ ...p, vehicleType: type }))}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all border-2 ${newTask.vehicleType === type ? 'bg-primary border-primary text-white' : 'border-border bg-muted/40 text-muted-foreground'}`}>
                          {type === 'MOTOR' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />} {type}
                        </button>
                      ))}
                    </div>
                    <input required type="text" placeholder="B 1234 ABC"
                      value={newTask.plateNumber} onChange={e => setNewTask(p => ({ ...p, plateNumber: e.target.value.toUpperCase() }))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-xl font-black tracking-[0.25em] text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-zinc-600" />
                  </div>

                  {/* Customer */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Pemilik</label>
                      <input type="text" placeholder="Nama Pel..." value={newTask.customerName} onChange={e => setNewTask(p => ({ ...p, customerName: e.target.value }))}
                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Model</label>
                      <input type="text" placeholder="Contoh: N..." value={newTask.model} onChange={e => setNewTask(p => ({ ...p, model: e.target.value }))}
                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">WhatsApp</label>
                      <input type="tel" placeholder="0812..." value={newTask.whatsapp} onChange={e => setNewTask(p => ({ ...p, whatsapp: e.target.value }))}
                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>

                  {/* Mechanic */}
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Pilih Mekanik</label>
                    <div className="grid grid-cols-2 gap-2">
                      {mechanics.map(m => (
                        <label key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${newTask.mechanicId === m.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/30 hover:border-primary/30'}`}>
                          <input type="radio" name="mechanic" value={m.id} checked={newTask.mechanicId === m.id}
                            onChange={() => setNewTask(p => ({ ...p, mechanicId: m.id }))} className="sr-only" />
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${newTask.mechanicId === m.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                            {m.name?.charAt(0)}
                          </div>
                          <span className="font-bold text-xs">{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  {/* Complaint */}
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Detail Keluhan</label>
                    <textarea rows={4} placeholder="Tuliskan keluhan..." value={newTask.complaint}
                      onChange={e => setNewTask(p => ({ ...p, complaint: e.target.value }))}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </div>

                  {/* Services */}
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Daftar Layanan</label>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {servicesList.map(svc => {
                        const checked = newTask.services.includes(svc.name);
                        return (
                          <label key={svc.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                                {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <input type="checkbox" checked={checked} onChange={() => {
                                setNewTask(p => ({
                                  ...p,
                                  services: checked ? p.services.filter(s => s !== svc.name) : [...p.services, svc.name]
                                }));
                              }} className="sr-only" />
                              <span className={`font-bold text-sm ${checked ? 'text-primary' : ''}`}>{svc.name}</span>
                            </div>
                            <span className={`text-xs font-black ${checked ? 'text-primary' : 'text-muted-foreground'}`}>Rp {svc.price?.toLocaleString('id-ID')}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-xl font-black text-sm hover:bg-muted/70 transition-all">
                  BATAL
                </button>
                <button type="submit" disabled={isSaving || !newTask.plateNumber || newTask.services.length === 0}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  MULAI ANTREAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="Foto" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
};

export default Workshop;
