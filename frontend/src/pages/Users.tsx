import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, UserPlus, Shield, Key, Trash2, 
  Search, Loader2, AlertCircle, CheckCircle2, X,
  Briefcase, Percent
} from 'lucide-react';
import api from '../api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'CASHIER' | 'MECHANIC';
  commissionRate: number;
  specialty?: string;
  fingerprintId?: string;
  isActive: boolean;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [enrollId, setEnrollId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'CASHIER',
    commissionRate: 0,
    specialty: 'ALL'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/auth/users'); // I need to create this endpoint or check if it exists
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditMode && selectedUser) {
        const updatePayload = { ...formData };
        if (!updatePayload.password) delete (updatePayload as any).password;
        await api.patch(`/users/${selectedUser.id}`, updatePayload);
        alert('User berhasil diperbarui!');
      } else {
        await api.post('/auth/register', formData);
        alert('User berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menyimpan user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'CASHIER',
      commissionRate: 0,
      specialty: 'ALL'
    });
    setIsEditMode(false);
    setSelectedUser(null);
  };

  const handleToggleStatus = async (user: User) => {
    if (user.username === 'admin') return;
    const action = user.isActive ? 'Nonaktifkan' : 'Aktifkan';
    if (!window.confirm(`${action} user ${user.name}?`)) return;
    
    try {
      await api.patch(`/auth/users/${user.id}/toggle-status`);
      fetchUsers();
    } catch (error) {
      alert('Gagal mengubah status user.');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setFormData({
      name: user.name,
      username: user.username,
      password: '', // Leave empty for security
      role: user.role,
      commissionRate: user.commissionRate || 0,
      specialty: user.specialty || 'ALL'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus user ini?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert('Gagal menghapus user.');
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/users/${selectedUser.id}/fingerprint`, { fingerprintId: enrollId });
      alert('Fingerprint ID berhasil didaftarkan!');
      setIsEnrollModalOpen(false);
      setEnrollId('');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal mendaftarkan fingerprint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Manajemen User</h2>
          <p className="text-sm text-muted-foreground font-medium italic">Kelola akses administrator, kasir, dan mekanik.</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-3"
        >
          <UserPlus className="w-5 h-5" /> Tambah User Baru
        </button>
      </div>

      <div className="flex-1 overflow-hidden glass-card rounded-[2.5rem] border border-border/50 shadow-sm flex flex-col">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama atau username..."
              className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6">{filteredUsers.length} User Terdaftar</p>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memuat Data User...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                <tr className="text-muted-foreground text-[10px] uppercase tracking-widest font-black">
                  <th className="px-8 py-5">Nama Lengkap</th>
                  <th className="px-8 py-5">Username</th>
                  <th className="px-8 py-5 text-center">Role</th>
                  <th className="px-8 py-5 text-center">Komisi (%)</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-center">Fingerprint</th>
                  <th className="px-8 py-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt="avatar" />
                        </div>
                        <p className="font-black text-sm">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <code className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded">@{u.username}</code>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase border ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' 
                          : u.role === 'CASHIER'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                      }`}>
                        {u.role === 'CASHIER' ? 'KASIR' : u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xs font-bold text-muted-foreground">{u.commissionRate}%</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase border ${
                        u.isActive 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {u.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button 
                        onClick={() => { setSelectedUser(u); setEnrollId(u.fingerprintId || ''); setIsEnrollModalOpen(true); }}
                        className={`p-2 rounded-lg transition-all ${u.fingerprintId ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:bg-muted'}`}
                        title="Daftarkan Fingerprint"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(u)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="Edit User"
                      >
                        <Key className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.username === 'admin'}
                        className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          u.isActive ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'
                        }`}
                        title={u.isActive ? 'Nonaktifkan User' : 'Aktifkan User'}
                      >
                        {u.isActive ? <Trash2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-border/50 animate-in zoom-in duration-300 flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">{isEditMode ? 'Edit User' : 'Tambah User'}</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{isEditMode ? 'Perbarui Akses' : 'Registrasi Akses Baru'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-all"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Ahmad Kasir"
                  className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Username</label>
                  <input 
                    type="text" 
                    required
                    placeholder="kasir_baru"
                    className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-sm"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Password {isEditMode && '(Kosongkan jika tidak diubah)'}</label>
                  <input 
                    type="password" 
                    required={!isEditMode}
                    placeholder="••••••••"
                    className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Role / Jabatan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ADMIN', 'CASHIER', 'MECHANIC'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({...formData, role: r})}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                        formData.role === r 
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {r === 'CASHIER' ? 'KASIR' : r}
                    </button>
                  ))}
                </div>
              </div>

              {formData.role === 'MECHANIC' && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Komisi (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="number" 
                        className="w-full bg-muted/30 border border-border rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                        value={formData.commissionRate}
                        onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Spesialis</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Matic, Injeksi"
                        className="w-full bg-muted/30 border border-border rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-xs"
                        value={formData.specialty}
                        onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Simpan User Sekarang'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Enrollment Modal */}
      {isEnrollModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-[3rem] p-10 shadow-2xl border border-border/50 animate-in zoom-in duration-300 flex flex-col gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Pendaftaran Jari</h3>
              <p className="text-xs text-muted-foreground font-medium italic mt-1">Daftarkan ID Hardware untuk {selectedUser.name}</p>
            </div>

            <form onSubmit={handleEnroll} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Fingerprint ID (Hardware)</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="Masukkan ID Perangkat..."
                  className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-black text-center text-lg"
                  value={enrollId}
                  onChange={(e) => setEnrollId(e.target.value)}
                />
              </div>
              
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-[10px] font-bold text-primary italic leading-relaxed">
                Tip: Pastikan ID sesuai dengan yang terdaftar di database hardware fingerprint Anda.
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="flex-1 bg-muted py-4 rounded-xl font-black text-[10px] uppercase transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
};

export default Users;
