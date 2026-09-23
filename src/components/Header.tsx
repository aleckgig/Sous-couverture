import React from 'react';
import { ArrowLeft, Sliders, MoreHorizontal, RotateCcw } from 'lucide-react';
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
    <header className="h-[52px] shrink-0 bg-[#f5f1e8] text-stone-900">
      <div className="h-full max-w-md mx-auto px-3 flex items-center justify-between">
        <button
          onClick={onOpenGuide}
          className="w-10 h-10 rounded-full flex items-center justify-center text-stone-800 active:scale-95"
          aria-label="Retour / règles"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="text-[20px] font-black tracking-tight leading-none">
            {isNight ? `Nuit ${nightCount}` : isDay ? `Jour ${dayCount}` : gamePhase === 'game_over' ? 'Fin de partie' : 'Sous Couverture'}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenArbitrage}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-800 active:scale-95"
            aria-label="Règles"
          >
            <Sliders className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenLogs}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 active:scale-95"
            aria-label="Historique"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
