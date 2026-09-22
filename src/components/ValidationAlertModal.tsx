import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ValidationAlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export const ValidationAlertModal: React.FC<ValidationAlertModalProps> = ({
  isOpen,
  title = 'Information Obligatoire Requise',
  message,
  onClose,
  confirmLabel = 'Compris, je complète',
  onConfirm,
  showCancel = false,
}) => {
  if (!isOpen) return null;

  const handleAction = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close X Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-100 bg-stone-800/60 hover:bg-stone-800 transition-all cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
          <AlertTriangle className="w-8 h-8 text-amber-400 stroke-[2.5]" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h3 className="font-serif font-black text-xl sm:text-2xl text-white">
            {title}
          </h3>
          <p className="text-sm text-stone-200 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm transition-all active:scale-95 cursor-pointer"
            >
              Annuler
            </button>
          )}

          <button
            type="button"
            onClick={handleAction}
            id="btn-validation-modal-ok"
            className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm shadow-xl shadow-amber-950/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
