import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full glass-card p-8 rounded-[2.5rem] border-red-500/20 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tighter text-white">WADUH, ADA MASALAH!</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Terjadi kesalahan sistem yang tidak terduga. Jangan khawatir, data Anda tetap aman.
              </p>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-left overflow-auto max-h-32">
               <p className="text-[10px] font-mono text-red-400 break-all uppercase tracking-widest mb-1 font-bold">Error Info:</p>
               <p className="text-[11px] font-mono text-zinc-500">{this.state.error?.message}</p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              <RotateCcw className="w-4 h-4" /> REFRESH APLIKASI
            </button>
            
            <p className="text-[10px] text-zinc-600 italic">
              Jika masalah berlanjut, hubungi tim teknis Jakarta Motor.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
