import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'danger': return { icon: <AlertCircle className="w-10 h-10 text-red-500" />, bg: 'bg-red-500/10', border: 'border-red-500/20', button: 'bg-red-500 hover:bg-red-600 shadow-red-500/20' };
      case 'success': return { icon: <CheckCircle2 className="w-10 h-10 text-green-500" />, bg: 'bg-green-500/10', border: 'border-green-500/20', button: 'bg-green-500 hover:bg-green-600 shadow-green-500/20' };
      default: return { icon: <AlertCircle className="w-10 h-10 text-orange-500" />, bg: 'bg-orange-500/10', border: 'border-orange-500/20', button: 'bg-primary hover:bg-primary/90 shadow-primary/20' };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 text-center">
          <div className={`w-20 h-20 ${colors.bg} rounded-[2rem] mx-auto flex items-center justify-center border ${colors.border} mb-6`}>
            {colors.icon}
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{title}</h3>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
        
        <div className="p-6 bg-muted/20 flex gap-3 border-t border-border/50">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-card border border-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted transition-all"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${colors.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
