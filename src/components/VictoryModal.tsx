import React from 'react';
import { Trophy, Skull, RotateCcw, X, ScrollText } from 'lucide-react';
import { Player } from '../types';
import { ROLES } from '../data/roles';

interface VictoryModalProps {
  winner: 'Gang' | "Forces de l'ordre" | 'Village' | 'Camp du Mal' | string;
  reason: string;
  players: Player[];
  onNewGame: () => void;
  onClose?: () => void;
  onViewHistory?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  reason,
  players,
  onNewGame,
  onClose,
  onViewHistory,
}) => {
  const isForcesWin = winner === "Forces de l'ordre" || winner === 'Village';

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`relative bg-stone-900 border-2 max-w-xl w-full p-6 md:p-8 rounded-3xl shadow-2xl text-stone-100 space-y-6 text-center animate-in zoom-in-95 ${
          isForcesWin ? 'border-sky-500/60' : 'border-red-600/60'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close X Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            id="btn-victory-close-icon"
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-100 bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50 transition-all cursor-pointer"
            title="Fermer et consulter le plateau"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Victory Header */}
        <div className="space-y-2">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl ${
              isForcesWin
                ? 'bg-gradient-to-br from-sky-600 to-indigo-800 text-sky-200 border border-sky-400'
                : 'bg-gradient-to-br from-red-700 to-amber-950 text-red-200 border border-red-500'
            }`}
          >
            {isForcesWin ? '⚖️' : '🕶️'}
          </div>

          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              isForcesWin ? 'text-sky-400' : 'text-red-400'
            }`}
          >
            Fin de Partie
          </span>

          <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-amber-200">
            Victoire : {winner} !
          </h2>

          <p className="text-sm text-stone-300 max-w-md mx-auto leading-relaxed pt-2">
            {reason}
          </p>
        </div>

        {/* Complete Role Reveal */}
        <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3 text-left">
          <h3 className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider text-center">
            Révélation des Dossiers Secrets
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-56 overflow-y-auto pr-1">
            {players.map((p) => {
              const role = ROLES[p.roleId];
              const isAgent = p.roleId === 'agent_sous_couverture';
              const isForces = p.currentTeam === "Forces de l'ordre" || isAgent || p.isInformateur;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isForces
                      ? 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                      : 'bg-stone-900 border-stone-800 text-stone-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className={`block ${isAgent || p.isInformateur ? 'text-blue-400' : 'text-amber-200'}`}>
                        {p.name}
                      </strong>
                      {isAgent && (
                        <span className="text-xs">👮🏻‍♂️</span>
                      )}
                      {p.isInformateur && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-bold flex items-center gap-0.5">
                          <span>💬</span>
                          <span>Informateur</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {isAgent ? '👮🏻‍♂️ ' : ''}{role?.nom || role?.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.isPrisoner
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          : p.isAlive
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-stone-800 text-stone-400 line-through'
                      }`}
                    >
                      {p.isPrisoner ? '🚔 En Prison' : p.isAlive ? 'Libre' : 'Neutralisé'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              id="btn-victory-history"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold text-xs md:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-all active:scale-95 cursor-pointer shadow"
            >
              <ScrollText className="w-4 h-4 text-amber-400" />
              <span>Historique du Grimoire</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNewGame}
            id="btn-victory-newgame"
            className={`w-full ${onViewHistory ? 'sm:w-1/2' : ''} py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer`}
          >
            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            Recommencer une Partie
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            id="btn-victory-close-board"
            className="w-full py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200 font-medium text-xs transition-colors cursor-pointer"
          >
            ← Fermer et consulter le Grimoire (Plateau de jeu)
          </button>
        )}
      </div>
    </div>
  );
};

