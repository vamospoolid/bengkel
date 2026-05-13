import React, { useState } from 'react';
import { Wrench, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login gagal. Periksa kembali username & password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="glass-card p-10 rounded-[2.5rem] border border-border shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/10 mb-6 border border-white/10 overflow-hidden hover:scale-105 transition-transform duration-300">
              <img src="./logo.png" alt="Logo Jakarta Motor" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter italic text-white">JAKARTA MOTOR</h1>
            <p className="text-xs text-primary font-bold mt-1 uppercase tracking-[0.3em]">Management System</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-center animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs text-red-500 font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Username Access</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="admin_bengkel"
                  className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-all font-bold"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-all font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  MASUK KE SISTEM <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Lupa password? Hubungi Admin Utama
            </p>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-muted-foreground/50 mt-8 font-medium">
          &copy; 2024 JAKARTA MOTOR POS • VERSION 2.0.4
        </p>
      </div>
    </div>
  );
};

export default Login;
