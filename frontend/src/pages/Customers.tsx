import React, { useState, useEffect } from 'react';
import { Search, Plus, User, MapPin, Phone, Briefcase, ChevronRight, X, Mail, CreditCard, History, Loader2, MessageSquare, AlertCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import api from '../api';

interface Customer {
  id: string;
  name: string;
  type: 'UMUM' | 'GROSIR' | 'MITRA';
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  plateNumber?: string; // Virtual field for UI
  totalTransactions?: number;
  totalSpend?: number;
  lastVisit?: string | null;
  creditLimit?: number;
  currentDebt?: number;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'UMUM' | 'GROSIR' | 'MITRA' | 'REMINDER'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', plateNumber: '', address: '', phone: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Customer | null>(null);

  const [showPayDebtModal, setShowPayDebtModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'TUNAI' | 'QRIS' | 'TRANSFER'>('TUNAI');
  const [isPayingDebt, setIsPayingDebt] = useState(false);

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    type: 'UMUM',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    plateNumber: '',
    creditLimit: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerHistory = async (customer: Customer) => {
    try {
      setIsLoadingHistory(true);
      setHistoryTarget(customer);
      setShowHistoryModal(true);
      const res = await api.get(`/customers/${customer.id}/transactions`);
      setHistoryTransactions(res.data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/customers', newCustomer);
      setShowAddModal(false);
      setNewCustomer({ name: '', type: 'UMUM', phone: '', email: '', address: '', creditLimit: 0, plateNumber: '' });
      fetchCustomers();
    } catch (error) {
      alert('Gagal menambah pelanggan. Pastikan data terisi dengan benar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsPayingDebt(true);
    try {
      await api.post(`/customers/${selectedCustomer.id}/pay-debt`, {
        amount: payAmount,
        paymentType: payMethod
      });
      setShowPayDebtModal(false);
      setSelectedCustomer(null);
      setPayAmount(0);
      fetchCustomers();
    } catch (error: any) {
      alert('Gagal melunasi piutang: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsPayingDebt(false);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditForm({
      name: customer.name,
      plateNumber: customer.plateNumber || '',
      address: customer.address || '',
      phone: customer.phone || ''
    });
    setIsEditing(true);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;
    setIsSaving(true);
    try {
      await api.patch(`/customers/${selectedCustomer.id}`, {
        ...editForm,
        plateNumber: editForm.plateNumber.toUpperCase()
      });
      fetchCustomers();
      setIsEditing(false);
      setSelectedCustomer(null);
      alert('Data pelanggan berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'ADMIN') {
      alert('Maaf, hanya Admin yang dapat menghapus data pelanggan.');
      return;
    }

    if (!window.confirm('APAKAH ANDA YAKIN?\n\nMenghapus pelanggan akan menghilangkan data mereka dari daftar. Jika pelanggan memiliki riwayat transaksi, data hanya akan dinonaktifkan (Soft Delete).')) return;
    
    try {
      setIsSaving(true);
      const res = await api.delete(`/customers/${id}`);
      alert(res.data.message || 'Pelanggan berhasil dihapus.');
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Delete customer error:', error);
      alert('Gagal menghapus pelanggan: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const sendWA = (phone: string, message: string) => {
    // Format phone number to international format (remove 0, add 62)
    let formatted = (phone || '').replace(/[^0-9]/g, '');
    if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1);
    else if (!formatted.startsWith('62')) formatted = '62' + formatted;

    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (c.phone && c.phone.includes(searchTerm)) ||
                         (c.plateNumber && c.plateNumber.includes(searchTerm.toUpperCase()));
    
    if (filterType === 'REMINDER') {
      if (!c.lastVisit) return false;
      const lastDate = new Date(c.lastVisit);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return matchesSearch && lastDate < threeMonthsAgo;
    }

    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">Manajemen Pelanggan</h2>
          <p className="text-sm text-muted-foreground">Kelola data mitra bengkel dan pelanggan grosir Anda.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all font-bold"
        >
          <Plus className="w-5 h-5" />
          Tambah Pelanggan
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama, no. hp, atau plat..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-muted p-1 rounded-xl">
          {(['all', 'UMUM', 'GROSIR', 'MITRA', 'REMINDER'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                filterType === type ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {type === 'all' ? 'Semua' : type === 'REMINDER' ? <><AlertCircle className="w-3.5 h-3.5" /> Reminder</> : type === 'MITRA' ? 'BENGKEL' : type}
              {type === 'REMINDER' && customers.filter(c => {
                if (!c.lastVisit) return false;
                const lastDate = new Date(c.lastVisit);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return lastDate < threeMonthsAgo;
              }).length > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-bold italic text-muted-foreground">Menghubungkan ke data pelanggan...</p>
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] border border-border/50 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nama Pelanggan</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Kategori</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Kontak & Alamat</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Kunjungan</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Piutang</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total Transaksi</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <Search className="w-10 h-10" />
                        <p className="text-xs font-black uppercase tracking-widest">Tidak ada data ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isOverdue = customer.lastVisit && new Date(customer.lastVisit) < new Date(new Date().setMonth(new Date().getMonth() - 3));
                    
                    return (
                      <tr 
                        key={customer.id} 
                        onClick={() => setSelectedCustomer(customer)}
                        className="group hover:bg-primary/[0.02] transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm group-hover:text-primary transition-colors">{customer.name}</p>
                                {customer.plateNumber && (
                                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[8px] font-black rounded tracking-widest border border-orange-500/20">
                                    {customer.plateNumber}
                                  </span>
                                )}
                              </div>
                              {isOverdue && (
                                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            customer.type === 'GROSIR' ? 'bg-orange-500/10 text-orange-500' : 
                            customer.type === 'MITRA' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {customer.type === 'MITRA' ? 'BENGKEL' : customer.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic truncate max-w-[150px]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {customer.address}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-xs font-black ${isOverdue ? 'text-orange-500' : 'text-foreground'}`}>
                            {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-xs font-black ${customer.currentDebt && customer.currentDebt > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            Rp {(customer.currentDebt || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs font-black text-green-500">
                            Rp {(customer.totalSpend || 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-bold">{customer.totalTransactions || 0}x Transaksi</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                sendWA(customer.whatsapp || customer.phone, `Halo Pak/Bu ${customer.name}, ini dari Jakarta Motor. Sudah saatnya servis rutin kembali lho. Kapan bisa mampir?`); 
                              }}
                              className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all shadow-sm"
                              title="Reminder WA"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-2 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg transition-all text-muted-foreground">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black mb-6">Daftarkan Pelanggan Baru</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="flex bg-muted p-1 rounded-xl mb-4">
                {(['UMUM', 'GROSIR', 'MITRA'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewCustomer({...newCustomer, type})}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      newCustomer.type === type ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {type === 'MITRA' ? 'BENGKEL' : type}
                  </button>
                ))}
              </div>
              
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">
                  {newCustomer.type === 'UMUM' ? 'Nama Pelanggan' : 
                   newCustomer.type === 'GROSIR' ? 'Nama Toko / Pelanggan' : 'Bengkel Mitra'}
                </label>
                <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              {newCustomer.type === 'UMUM' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">Plat Nomor (Opsional)</label>
                  <input 
                    type="text" 
                    placeholder="B 1234 ABC" 
                    value={newCustomer.plateNumber} 
                    onChange={e => setNewCustomer({...newCustomer, plateNumber: e.target.value.toUpperCase()})} 
                    className="w-full bg-muted border border-orange-500/30 rounded-xl px-4 py-3 font-mono font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
                  />
                </div>
              )}

              {newCustomer.type !== 'UMUM' && (
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">No. HP (Telepon)</label>
                  <input required type="text" placeholder="0812..." value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">No. WhatsApp</label>
                <input type="text" placeholder="0812..." value={newCustomer.whatsapp || ''} onChange={e => setNewCustomer({...newCustomer, whatsapp: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">Alamat Lengkap</label>
                <textarea required value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" />
              </div>

              {newCustomer.type !== 'UMUM' && (
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">Limit Kredit (Opsional)</label>
                  <input type="number" value={newCustomer.creditLimit || ''} onChange={e => setNewCustomer({...newCustomer, creditLimit: Number(e.target.value)})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-muted hover:bg-muted/70 rounded-xl font-bold transition-all">Batal</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Daftarkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Modal Placeholder */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => { setSelectedCustomer(null); setIsEditing(false); }} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Briefcase className="w-10 h-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="text-2xl font-black bg-muted border border-primary/30 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <h3 className="text-2xl font-black">{selectedCustomer.name}</h3>
                  )}
                  
                  {!isEditing && (
                    <button 
                      onClick={() => handleEditClick(selectedCustomer)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-primary"
                      title="Edit Profil"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    selectedCustomer.type === 'GROSIR' ? 'bg-orange-500/10 text-orange-500' : 
                    selectedCustomer.type === 'MITRA' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    {selectedCustomer.type === 'MITRA' ? 'BENGKEL' : selectedCustomer.type}
                  </span>
                  
                  {isEditing ? (
                    <input 
                      type="text" 
                      placeholder="Plat Nomor"
                      value={editForm.plateNumber} 
                      onChange={e => setEditForm({...editForm, plateNumber: e.target.value.toUpperCase()})}
                      className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black tracking-widest border-none w-28 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                  ) : selectedCustomer.plateNumber && (
                    <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black tracking-widest">
                      {selectedCustomer.plateNumber}
                    </span>
                  )}
                </div>
                
                {isEditing ? (
                  <input 
                    type="text" 
                    placeholder="Nomor HP"
                    value={editForm.phone} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    className="text-sm bg-muted border border-border rounded-lg px-2 py-1 mt-2 w-full focus:outline-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">Kontak: {selectedCustomer.phone || '-'}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/20">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Kontribusi</p>
                <p className="text-xl font-black text-green-500">Rp {(selectedCustomer.totalSpend || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/20">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Piutang</p>
                <p className={`text-xl font-black ${selectedCustomer.currentDebt && selectedCustomer.currentDebt > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>Rp {(selectedCustomer.currentDebt || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Transaksi</p>
                <p className="text-xl font-black">{selectedCustomer.totalTransactions || 0}x</p>
              </div>
            </div>

            {/* Last Visit */}
            {selectedCustomer.lastVisit && (
              <div className="mb-4 px-4 py-3 bg-muted/20 rounded-xl border border-border/50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Kunjungan Terakhir</p>
                <p className="text-xs font-bold">{new Date(selectedCustomer.lastVisit).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            )}

            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Alamat</p>
                <div className="p-4 bg-muted/30 rounded-2xl border border-border flex gap-3 h-full">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  {isEditing ? (
                    <textarea 
                      value={editForm.address}
                      onChange={e => setEditForm({...editForm, address: e.target.value})}
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none resize-none"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm font-medium">{selectedCustomer.address}</p>
                  )}
                </div>
              </div>
              <div className="w-1/3 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">WhatsApp</p>
                <button 
                  disabled={isEditing}
                  onClick={() => sendWA(selectedCustomer.whatsapp || selectedCustomer.phone, `Halo Pak/Bu ${selectedCustomer.name}, ini dari Jakarta Motor. Ingin menginfokan...`)}
                  className={`w-full py-4 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20 hover:bg-green-500/20 transition-all flex flex-col items-center justify-center gap-1 group ${isEditing ? 'opacity-30' : ''}`}
                >
                  <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Kirim Pesan</span>
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-muted hover:bg-muted/70 rounded-2xl font-bold transition-all">
                    Batal
                  </button>
                  <button 
                    onClick={handleUpdateCustomer}
                    disabled={isSaving}
                    className="flex-2 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Simpan Perubahan</>}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Hapus Pelanggan"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setSelectedCustomer(null); setIsEditing(false); }} className="flex-1 py-4 bg-muted hover:bg-muted/70 rounded-2xl font-bold transition-all">
                    Tutup
                  </button>
                  {selectedCustomer.currentDebt && selectedCustomer.currentDebt > 0 ? (
                    <button 
                      onClick={() => { setPayAmount(selectedCustomer.currentDebt || 0); setShowPayDebtModal(true); }}
                      className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" /> Bayar Piutang
                    </button>
                  ) : null}
                  <button 
                    onClick={() => fetchCustomerHistory(selectedCustomer)}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <History className="w-5 h-5" /> Riwayat
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[85vh] border border-border/50">
            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20"><History className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Riwayat Transaksi</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">{historyTarget.name}</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Menarik Data Transaksi...</p>
                </div>
              ) : historyTransactions.length > 0 ? (
                <div className="space-y-4">
                  {historyTransactions.map((tx) => (
                    <div key={tx.id} className="bg-muted/30 rounded-[2rem] p-6 border border-border/50 group hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-black text-primary uppercase tracking-widest">{tx.invoiceNo}</p>
                          <p className="text-[10px] text-muted-foreground font-bold mt-1">
                            {new Date(tx.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-foreground">Rp {tx.totalAmount.toLocaleString('id-ID')}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                            tx.paymentType === 'HUTANG' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            tx.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {tx.paymentType === 'HUTANG' ? 'HUTANG' : tx.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-4 border-t border-border/30">
                        {tx.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">{item.quantity}x {item.name}</span>
                            <span className="font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                      
                      {tx.vehicle && (
                        <div className="mt-4 pt-3 border-t border-border/20 flex items-center gap-2">
                           <MapPin className="w-3 h-3 text-primary" />
                           <span className="text-[10px] font-bold text-muted-foreground uppercase">{tx.vehicle.plateNumber} — {tx.vehicle.model}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center flex flex-col items-center gap-4 opacity-30">
                   <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><History className="w-8 h-8" /></div>
                   <p className="italic font-black uppercase tracking-[0.2em] text-xs">Belum ada riwayat transaksi</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-border/50 bg-muted/10 shrink-0">
               <button onClick={() => setShowHistoryModal(false)} className="w-full py-4 bg-muted border border-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted/70 transition-all">Tutup Riwayat</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {showPayDebtModal && selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setShowPayDebtModal(false)} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black mb-1 text-red-500">Pelunasan Piutang</h3>
            <p className="text-sm text-muted-foreground mb-6">Sisa Piutang: <strong className="text-foreground">Rp {selectedCustomer.currentDebt?.toLocaleString()}</strong></p>
            
            <form onSubmit={handlePayDebt} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">Jumlah Pembayaran</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Rp</span>
                  <input 
                    required 
                    type="number" 
                    max={selectedCustomer.currentDebt}
                    value={payAmount || ''} 
                    onChange={e => setPayAmount(Number(e.target.value))} 
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-3 font-black text-lg focus:outline-none focus:ring-2 focus:ring-red-500/50" 
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => setPayAmount(selectedCustomer.currentDebt || 0)} className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Lunasi Semua</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 ml-1">Metode Pembayaran</label>
                <div className="flex bg-muted p-1 rounded-xl">
                  {(['TUNAI', 'QRIS', 'TRANSFER'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPayMethod(type)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        payMethod === type ? 'bg-card text-red-500 shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setShowPayDebtModal(false)} className="flex-1 py-3 bg-muted hover:bg-muted/70 rounded-xl font-bold transition-all">Batal</button>
                <button type="submit" disabled={isPayingDebt || payAmount <= 0} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isPayingDebt ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Proses Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;
