import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition-colors"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-red-200">
              Recommencer la partie ?
            </h3>
            <p className="text-xs text-slate-400">Confirmation requise</p>
          </div>
        </div>

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed">
          Êtes-vous certain de vouloir recommencer une nouvelle partie ? Toute la progression, les rôles attribués et l’historique des évènements seront réinitialisés.
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs md:text-sm font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            id="btn-confirm-reset"
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-900/40 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Oui, recommencer
          </button>
        </div>
      </div>
    </div>
  );
};
