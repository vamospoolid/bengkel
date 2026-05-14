import React, { useState, useEffect } from 'react';
import { Wrench, Clock, CheckCircle2, X, AlertCircle, Loader2, Trash2, Car, Bike, ArrowRight, Search, Plus, ZapIcon, User, Phone, RotateCcw, Image as ImageIcon } from 'lucide-react';
import api from '../api';

const STATUS_CONFIG: Record<string, any> = {
  QUEUED:   { label: 'Antrean', color: 'bg-blue-500',   text: 'text-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/10',   icon: <Clock className="w-3.5 h-3.5"/>,        next: 'PROGRESS', nextLabel: 'Mulai Proses' },
  PROGRESS: { label: 'Proses',  color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', icon: <Wrench className="w-3.5 h-3.5"/>,       next: 'DONE',     nextLabel: 'Selesai' },
  TESTING:  { label: 'Proses',  color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', icon: <Wrench className="w-3.5 h-3.5"/>,       next: 'DONE',     nextLabel: 'Selesai' },
  DONE:     { label: 'Selesai', color: 'bg-green-500',  text: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  icon: <CheckCircle2 className="w-3.5 h-3.5"/>, next: null,       nextLabel: null },
};

const TABS = [
  { key: 'ALL',      label: 'Semua',   dot: 'bg-zinc-500' },
  { key: 'QUEUED',   label: 'Antrean', dot: 'bg-blue-500' },
  { key: 'PROGRESS', label: 'Proses',  dot: 'bg-orange-500' },
  { key: 'DONE',     label: 'Selesai', dot: 'bg-green-500' },
];

export const Servis: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({
    plateNumber: '', customerName: '', model: '',
    vehicleType: 'MOTOR' as 'MOTOR'|'MOBIL',
    complaint: '', mechanicId: '', services: [] as { name: string; price: number }[], whatsapp: ''
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, m, s] = await Promise.all([
        api.get('/work-orders'), api.get('/mechanics'), api.get('/services')
      ]);
      setTasks(t.data); setMechanics(m.data); setServices(s.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/work-orders/${id}`, { status }); fetchAll(); }
    catch { alert('Gagal update status'); }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Hapus unit ini?')) return;
    try { await api.delete(`/work-orders/${id}`); fetchAll(); }
    catch { alert('Gagal hapus'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.services.length === 0) return alert('Pilih minimal satu layanan');
    setIsSaving(true);
    try {
      await api.post('/work-orders', form);
      alert('Unit Berhasil Didaftarkan!');
      setShowSheet(false);
      setForm({ plateNumber:'', customerName:'', model:'', vehicleType:'MOTOR', complaint:'', mechanicId:'', services:[], whatsapp:'' });
      fetchAll();
    } catch { alert('Gagal menyimpan'); }
    finally { setIsSaving(false); }
  };

  const counts: Record<string,number> = {
    ALL: tasks.length,
    QUEUED: tasks.filter(t=>t.status==='QUEUED').length,
    PROGRESS: tasks.filter(t=>t.status==='PROGRESS'||t.status==='TESTING').length,
    DONE: tasks.filter(t=>t.status==='DONE').length,
  };

  const filtered = tasks.filter(t =>
    (activeTab === 'ALL' || t.status === activeTab) &&
    (!search || t.plateNumber?.toLowerCase().includes(search.toLowerCase()) || t.customerName?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gradient">Antrian Servis</h1>
            <p className="text-[10px] text-muted-foreground">{tasks.length} unit terdaftar</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSearch(''); setActiveTab('ALL'); fetchAll(); }} 
              className="p-2.5 bg-muted rounded-xl active:scale-90 transition-all border border-white/5">
              <RotateCcw className="w-4 h-4 text-muted-foreground"/>
            </button>
            <button onClick={()=>setShowSheet(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all">
              <Plus className="w-4 h-4"/>
              Unit Baru
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cari plat atau nama..." type="text"
            className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"/>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {TABS.map(tab => (
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${
                activeTab===tab.key ? 'bg-foreground text-background shadow-lg' : 'bg-muted text-muted-foreground'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`}/>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab===tab.key ? 'bg-background/20' : 'bg-background/50'}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin"/>
            <p className="text-sm font-bold text-muted-foreground">Memuat antrian...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
              <Wrench className="w-8 h-8 text-muted-foreground/40"/>
            </div>
            <p className="text-sm font-bold text-muted-foreground">Tidak ada antrian</p>
          </div>
        ) : filtered.map(task => {
          const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.QUEUED;
          const isOpen = expanded === task.id;
          return (
            <div key={task.id} className={`bg-card rounded-3xl border overflow-hidden transition-all ${cfg.border}`}>
              {/* Card Main */}
              <button className="w-full text-left p-4" onClick={()=>setExpanded(isOpen ? null : task.id)}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${cfg.bg}`}>
                    {task.vehicleType==='MOTOR' ? <Bike className={`w-5 h-5 ${cfg.text}`}/> : <Car className={`w-5 h-5 ${cfg.text}`}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-black text-lg tracking-widest leading-tight">{task.plateNumber}</p>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black shrink-0 ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{task.model}{task.customerName ? ` · ${task.customerName}` : ''}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(task.services||[]).slice(0,3).map((s:any,i:number)=>(
                        <span key={i} className="px-2 py-0.5 bg-muted rounded-md text-[9px] font-bold text-muted-foreground">
                          {typeof s === 'string' ? s : s.name}
                        </span>
                      ))}
                      {(task.services||[]).length > 3 && <span className="px-2 py-0.5 bg-muted rounded-md text-[9px] font-bold text-muted-foreground">+{task.services.length-3}</span>}
                    </div>
                  </div>
                </div>
                {task.mechanicName && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border/50">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-primary"/>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{task.mechanicName}</span>
                  </div>
                )}
              </button>

              {/* Expanded */}
              {isOpen && (
                <div className="border-t border-border/50 bg-muted/20">
                  {task.complaint && (
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex gap-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5"/>
                        <p className="text-xs text-orange-300 leading-relaxed">{task.complaint}</p>
                      </div>
                    </div>
                  )}

                  {/* Service Photos Section */}
                  <div className="px-4 pt-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                      <ImageIcon className="w-3 h-3"/> Dokumentasi Foto
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {(task.photos || []).map((img: string, idx: number) => (
                        <div key={idx} className="w-20 h-20 rounded-xl bg-muted border border-border shrink-0 overflow-hidden relative group">
                          <img src={img} alt="servis" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground active:bg-muted transition-all shrink-0">
                        <Plus className="w-5 h-5 mb-1 opacity-50"/>
                        <span className="text-[8px] font-bold">TAMBAH</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async (rv) => {
                              const base64 = rv.target?.result as string;
                              const updatedPhotos = [...(task.photos || []), base64];
                              await api.patch(`/work-orders/${task.id}`, { photos: updatedPhotos });
                              fetchAll();
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {task.startTime && (
                    <div className="px-4 pt-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 uppercase tracking-widest px-3 py-1.5 bg-blue-500/5 rounded-xl border border-blue-500/20">
                        <Clock className="w-3 h-3"/> Mulai: {new Date(task.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                  <div className="px-4 py-3 flex gap-2">
                    {cfg.next && (
                      <button onClick={()=>updateStatus(task.id, cfg.next)}
                        className={`flex-1 py-3.5 ${cfg.color} text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg`}>
                        <ArrowRight className="w-4 h-4"/> {cfg.nextLabel}
                      </button>
                    )}
                    {task.whatsapp && (
                      <button 
                        onClick={() => {
                          const msg = `Halo Bapak/Ibu ${task.customerName || ''}, unit ${task.plateNumber} (${task.model}) saat ini statusnya: ${cfg.label}. Terima kasih. - Jakarta Motor`;
                          window.open(`https://wa.me/${task.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="p-3.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl active:scale-90 transition-all"
                      >
                        <Phone className="w-4 h-4"/>
                      </button>
                    )}
                    <button onClick={()=>deleteTask(task.id)}
                      className="p-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl active:scale-90 transition-all">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* Bottom Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowSheet(false)}/>
          <div className="relative bg-card rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-muted rounded-full"/></div>
            <div className="flex items-center justify-between px-5 py-3">
              <div><h3 className="font-black text-lg">Unit Baru</h3><p className="text-xs text-muted-foreground">Lengkapi data kendaraan</p></div>
              <button onClick={()=>setShowSheet(false)} className="p-2 bg-muted rounded-xl"><X className="w-4 h-4"/></button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-16 space-y-4">
              {/* Vehicle Type */}
              <div className="grid grid-cols-2 gap-3">
                {(['MOTOR','MOBIL'] as const).map(t=>(
                  <button key={t} type="button" onClick={()=>setForm(p=>({...p,vehicleType:t}))}
                    className={`py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${form.vehicleType===t ? 'bg-primary border-primary text-white' : 'border-border bg-muted/40 text-muted-foreground'}`}>
                    {t==='MOTOR'?<Bike className="w-5 h-5"/>:<Car className="w-5 h-5"/>} {t}
                  </button>
                ))}
              </div>

              {/* Plate */}
              <input required type="text" placeholder="B 1234 ABC"
                value={form.plateNumber} onChange={e=>setForm(p=>({...p,plateNumber:e.target.value.toUpperCase()}))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 text-2xl font-black tracking-[0.3em] text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-zinc-600 placeholder:text-xl"/>

              {/* Customer & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Pemilik</label>
                  <input type="text" placeholder="Nama..." value={form.customerName} onChange={e=>setForm(p=>({...p,customerName:e.target.value}))}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Model</label>
                  <input type="text" placeholder="Vario, Beat..." value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5"><Phone className="w-2.5 h-2.5 inline mr-1"/>WhatsApp</label>
                <input type="tel" placeholder="0812-xxxx-xxxx" value={form.whatsapp} onChange={e=>setForm(p=>({...p,whatsapp:e.target.value}))}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              </div>

              {/* Complaint */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Keluhan</label>
                <textarea rows={2} placeholder="Deskripsikan keluhan..." value={form.complaint} onChange={e=>setForm(p=>({...p,complaint:e.target.value}))}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/>
              </div>

              {/* Mechanic */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Mekanik</label>
                <div className="grid grid-cols-2 gap-2">
                  {mechanics.map(m=>(
                    <button key={m.id} type="button" onClick={()=>setForm(p=>({...p,mechanicId:p.mechanicId===m.id?'':m.id}))}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${form.mechanicId===m.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${form.mechanicId===m.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-bold text-xs leading-tight ${form.mechanicId===m.id ? 'text-primary' : 'text-muted-foreground'}`}>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                  Layanan <span className="text-primary">({form.services.length} dipilih)</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {services.map(svc=>{
                    const selectedService = form.services.find(s => s.name === svc.name);
                    const checked = !!selectedService;
                    return (
                      <div key={svc.id} className={`flex flex-col p-3.5 rounded-2xl border-2 transition-all ${checked ? 'border-primary bg-primary/10' : 'border-border bg-muted/20'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <button type="button" onClick={()=>setForm(p=>({...p,services:checked?p.services.filter(s=>s.name!==svc.name):[...p.services,{ name: svc.name, price: svc.price }]}))}
                            className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`}>
                              {checked && <CheckCircle2 className="w-3 h-3 text-white"/>}
                            </div>
                            <span className={`font-bold text-sm ${checked ? 'text-primary' : ''}`}>{svc.name}</span>
                          </button>
                          <span className={`text-[10px] font-black ${checked ? 'text-primary' : 'text-muted-foreground'}`}>Rp {svc.price?.toLocaleString('id-ID')}</span>
                        </div>
                        
                        {checked && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/20">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">Harga Custom:</span>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">Rp</span>
                              <input 
                                type="number" 
                                value={selectedService.price}
                                onChange={(e) => {
                                  const newPrice = Number(e.target.value);
                                  setForm(p => ({
                                    ...p,
                                    services: p.services.map(s => s.name === svc.name ? { ...s, price: newPrice } : s)
                                  }));
                                }}
                                className="w-full bg-background border border-primary/30 rounded-xl pl-9 pr-3 py-2 text-sm font-black focus:outline-none focus:border-primary transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={isSaving || !form.plateNumber || form.services.length===0}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <ZapIcon className="w-5 h-5"/>}
                MULAI ANTREAN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


