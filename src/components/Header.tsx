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
  const isNight = gamePhase === 'night';
  const isDay = gamePhase === 'day';
  const isGameActive = isNight || isDay || gamePhase === 'game_over';

  return (
    <header className="h-[57px] shrink-0 border-b border-stone-200 bg-[#faf8f2]/95 backdrop-blur-md text-stone-900 sticky top-0 z-30">
      <div className="h-full max-w-2xl mx-auto px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isGameActive ? (
            <>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isNight ? 'bg-slate-900 border-slate-700 text-slate-100' : isDay ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-stone-100 border-stone-300 text-stone-700'}`}>
                {isNight ? <Moon className="w-4 h-4" /> : isDay ? <Sun className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
              </div>
              <div className="min-w-0 leading-none">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">
                  Sous Couverture
                </div>
                <div className="text-sm font-black text-stone-900">
                  {isNight ? `Nuit ${nightCount}` : isDay ? `Jour ${dayCount}` : 'Fin de partie'}
                </div>
              </div>
              <div className="h-6 w-px bg-stone-200 mx-1" />
              <div className="flex items-center gap-1 text-xs font-bold text-stone-500">
                <Users className="w-3.5 h-3.5" />
                <span className="text-stone-900">{livingCount}</span>/{totalCount}
              </div>
            </>
          ) : (
            <span className="text-sm font-black tracking-tight text-stone-900">Préparation</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onOpenGrimoire && isGameActive && (
            <button onClick={onOpenGrimoire} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 active:scale-95" title="Table de jeu" aria-label="Table de jeu">
              <Users className="w-4 h-4" />
            </button>
          )}
          {onOpenPlayerView && gameMode === 'phone' && (
            <button onClick={onOpenPlayerView} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 active:scale-95" title="Vue joueur" aria-label="Vue joueur">
              <Smartphone className="w-4 h-4" />
            </button>
          )}
          {onOpenArbitrage && (
            <button onClick={onOpenArbitrage} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 active:scale-95" title="Règles" aria-label="Règles">
              <Sliders className="w-4 h-4" />
            </button>
          )}
          {onOpenImages && (
            <button onClick={onOpenImages} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 active:scale-95" title="Cartes et images" aria-label="Cartes et images">
              <ImageIcon className="w-4 h-4" />
            </button>
          )}
          <button onClick={onOpenGuide} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 active:scale-95" title="Guide" aria-label="Guide">
            <BookOpen className="w-4 h-4" />
          </button>
          <button onClick={onOpenLogs} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 active:scale-95" title="Historique" aria-label="Historique">
            <Clock className="w-4 h-4" />
          </button>
          <button onClick={onResetGame} className="p-2 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 active:scale-95" title="Nouvelle partie" aria-label="Nouvelle partie">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
