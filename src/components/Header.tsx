import React from 'react';
import { Moon, Sun, BookOpen, RotateCcw, Clock, Users, Trophy, Smartphone, Image as ImageIcon, Sliders } from 'lucide-react';
import { GamePhase } from '../types';

interface HeaderProps {
  gamePhase: GamePhase;
  gameMode?: 'physical' | 'phone';
  dayCount: number;
  nightCount: number;
  onOpenGuide: () => void;
  onOpenLogs: () => void;
  onOpenPlayerView?: () => void;
  onOpenGrimoire?: () => void;
  onOpenImages?: () => void;
  onOpenArbitrage?: () => void;
  onResetGame: () => void;
  livingCount: number;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  gamePhase,
  gameMode = 'physical',
  dayCount,
  nightCount,
  onOpenGuide,
  onOpenLogs,
  onOpenPlayerView,
  onOpenGrimoire,
  onOpenImages,
  onOpenArbitrage,
  onResetGame,
  livingCount,
  totalCount,
}) => {
  const isGameActive =
    gamePhase !== 'setup_player_count' &&
    gamePhase !== 'setup_roles' &&
    gamePhase !== 'setup_players';

  return (
    <header className="bg-stone-900 border-b border-amber-500/40 text-stone-100 sticky top-0 z-30 shadow-xl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Left: Direct Phase (Nuit 1 / Jour 1) and Living count */}
        <div className="flex items-center gap-2 shrink-0">
          {isGameActive ? (
            <div className="flex items-center gap-2 bg-stone-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 text-xs shadow-inner">
              {gamePhase === 'night' ? (
                <span className="flex items-center gap-1.5 text-indigo-300 font-black">
                  <Moon className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span>Nuit {nightCount}</span>
                </span>
              ) : gamePhase === 'day' ? (
                <span className="flex items-center gap-1.5 text-amber-300 font-black">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Jour {dayCount}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-300 font-black">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>Fin</span>
                </span>
              )}

              <div className="h-3 w-px bg-stone-800" />

              <span className="flex items-center gap-1 text-stone-200 font-medium">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <strong className="text-white font-black">{livingCount}</strong>/{totalCount}
                <span className="hidden sm:inline text-stone-400 text-[10px]">en vie</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-stone-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-stone-800 text-xs shadow-inner">
              <span className="font-serif font-bold text-amber-300 text-xs">
                Préparation
              </span>
            </div>
          )}
        </div>

        {/* Right: Action Buttons (all visible, compact icons + booklet for guide + clock for history) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenGrimoire && isGameActive && (
            <button
              onClick={onOpenGrimoire}
              id="btn-header-grimoire"
              className="flex items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black shadow border border-amber-300 transition-all active:scale-95 cursor-pointer"
              title="Ouvrir la Table de Jeu"
            >
              Table
            </button>
          )}

          {/* Rejoindre / Vue Joueur button: ONLY shown for phone mode, removed for physical cards mode */}
          {onOpenPlayerView && gameMode === 'phone' && (
            <button
              onClick={onOpenPlayerView}
              id="btn-open-player-view"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs border border-purple-500/50 transition-all active:scale-95 shadow font-bold cursor-pointer"
              title="Écran joueur smartphone"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden md:inline">Vue Joueur</span>
            </button>
          )}

          {/* Arbitrage des règles */}
          {onOpenArbitrage && (
            <button
              onClick={onOpenArbitrage}
              id="btn-open-arbitrage"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs border border-stone-700 hover:border-amber-500/40 transition-all active:scale-95 shadow font-bold cursor-pointer flex items-center justify-center"
              title="Arbitrage des interactions & règles"
            >
              <Sliders className="w-4 h-4 text-stone-300" />
            </button>
          )}

          {/* Cartes & Images */}
          {onOpenImages && (
            <button
              onClick={onOpenImages}
              id="btn-open-images"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs border border-stone-700 hover:border-amber-500/40 transition-all active:scale-95 shadow font-bold cursor-pointer flex items-center justify-center"
              title="Gérer les cartes & illustrations"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Guide button: booklet icon only */}
          <button
            onClick={onOpenGuide}
            id="btn-open-guide"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-amber-500/40 hover:border-amber-400 transition-all active:scale-95 shadow font-bold cursor-pointer flex items-center justify-center"
            title="Guide des règles, cartes et lexique"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
          </button>

          {/* History / Chrono button: clock/chrono icon */}
          <button
            onClick={onOpenLogs}
            id="btn-open-logs"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-stone-700 hover:border-amber-500/40 transition-all active:scale-95 shadow font-bold cursor-pointer flex items-center justify-center"
            title="Historique / Chronologie de la partie"
          >
            <Clock className="w-4 h-4 text-amber-400" />
          </button>

          {/* Reset button */}
          <button
            onClick={onResetGame}
            id="btn-reset-game"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 text-xs border border-red-800/60 transition-all active:scale-95 font-bold cursor-pointer flex items-center justify-center"
            title="Nouvelle partie"
          >
            <RotateCcw className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
