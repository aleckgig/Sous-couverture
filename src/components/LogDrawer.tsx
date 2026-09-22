import React from 'react';
import { ScrollText, X } from 'lucide-react';
import { LogEntry } from '../types';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
}

export const LogDrawer: React.FC<LogDrawerProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border-l border-amber-900/40 w-full max-w-md h-full flex flex-col text-stone-100 shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-amber-200 text-lg">
              Historique du Grimoire
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold cursor-pointer transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Log Entries list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-8">
              Aucun événement enregistré pour l’instant.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                  <span>
                    {log.phase === 'night' ? `Nuit ${log.dayOrNightNumber}` : `Jour ${log.dayOrNightNumber}`}
                  </span>
                  <span>{log.timestamp}</span>
                </div>
                <p className="text-stone-200 font-medium leading-relaxed">{log.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
          >
            Fermer l'historique
          </button>
        </div>
      </div>
    </div>
  );
};
