import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Truck, MapPin, Phone, ChevronRight, X, History, Loader2, Edit3, Trash2 } from 'lucide-react';
import api from '../api';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    address: ''
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSuppliers();
    // Auto-focus search input on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);
  }, []);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSupplier) {
        await api.patch(`/suppliers/${encodeURIComponent(editingSupplier.id)}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setShowAddModal(false);
      setEditingSupplier(null);
      setFormData({ name: '', phone: '', address: '' });
      fetchSuppliers();
    } catch (error: any) {
      alert('Gagal menyimpan supplier: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return;
    try {
      await api.delete(`/suppliers/${encodeURIComponent(id)}`);
      fetchSuppliers();
    } catch (error: any) {
      alert('Gagal menghapus supplier: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Data Supplier</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Kelola daftar pemasok barang dan suku cadang.</p>
        </div>
        <button 
          onClick={() => { setEditingSupplier(null); setFormData({name:'', phone:'', address:''}); setShowAddModal(true); }}
          className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all font-black text-sm uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Tambah Supplier
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Cari nama supplier atau telepon..."
          className="w-full bg-card/60 border border-border rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menghubungkan ke Database Supplier...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id} 
              className="glass-card p-6 rounded-[2rem] border border-border/50 hover:border-primary/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all" />
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-all">
                    <Truck className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl group-hover:text-primary transition-colors leading-tight">{supplier.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">ID: {supplier.id.slice(0,8)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6 relative z-10">
                <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{supplier.phone || '-'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm font-bold text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50 min-h-[80px]">
                  <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <span className="leading-relaxed">{supplier.address || '-'}</span>
                </div>
              </div>

              <div className="flex gap-2 relative z-10">
                <button className="flex-1 py-3 bg-muted border border-border rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2">
                   <History className="w-4 h-4" /> Riwayat Belanja
                </button>
                <button 
                  onClick={() => handleEditClick(supplier)}
                  className="p-3 bg-muted border border-border rounded-xl text-muted-foreground hover:text-blue-500 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  className="p-3 bg-muted border border-border rounded-xl text-muted-foreground hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {filteredSuppliers.length === 0 && (
            <div className="col-span-full py-32 text-center glass-card rounded-[2.5rem] border border-dashed border-border flex flex-col items-center justify-center gap-4">
              <Truck className="w-16 h-16 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground italic font-black uppercase tracking-widest text-xs">Belum ada supplier yang terdaftar.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in duration-300 border border-border/50">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
               <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Truck className="w-8 h-8" /></div>
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">
                    {editingSupplier ? 'Edit Data Supplier' : 'Daftarkan Supplier'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium italic">
                    {editingSupplier ? 'Perbarui data lengkap pemasok barang.' : 'Masukkan data lengkap pemasok barang.'}
                  </p>
               </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block ml-2">Nama Perusahaan / Supplier</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full bg-muted border-2 border-border/50 rounded-2xl px-6 py-4 font-black text-lg focus:outline-none focus:border-primary transition-all" placeholder="CONTOH: PT. ASTRA HONDA" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block ml-2">No. Telepon / HP</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-muted border-2 border-border/50 rounded-2xl px-6 py-4 font-black text-lg focus:outline-none focus:border-primary transition-all" placeholder="021-xxxx atau 0812..." />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block ml-2">Alamat Lengkap</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full bg-muted border-2 border-border/50 rounded-2xl px-6 py-4 font-bold text-sm focus:outline-none focus:border-primary transition-all min-h-[120px]" placeholder="ALAMAT KANTOR / GUDANG SUPPLIER..." />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-muted border border-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted/70 transition-all">Batal</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    editingSupplier ? <><Edit3 className="w-5 h-5" /> Simpan Perubahan</> : <><Plus className="w-5 h-5" /> Daftarkan Supplier</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
