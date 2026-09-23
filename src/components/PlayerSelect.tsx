import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Player } from '../types';
import { ROLES } from '../data/roles';

interface PlayerSelectProps {
  value: string;
  onChange: (playerId: string) => void;
  players: Player[];
  placeholder?: string;
  excludePlayerId?: string;
  disabledPlayerIds?: string[];
  className?: string;
  id?: string;
  accent?: 'default' | 'blue' | 'red' | 'purple' | 'amber';
}

interface MenuPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export const PlayerSelect: React.FC<PlayerSelectProps> = ({
  value,
  onChange,
  players,
  placeholder = 'Choisir un joueur',
  excludePlayerId,
  disabledPlayerIds = [],
  className = '',
  id,
  accent = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const accentClasses = {
    default: {
      border: 'border-stone-300',
      open: 'border-stone-500 ring-stone-900/5',
      selected: 'bg-stone-100',
      check: 'text-stone-800',
    },
    blue: {
      border: 'border-blue-200',
      open: 'border-blue-400 ring-blue-600/10',
      selected: 'bg-blue-50',
      check: 'text-blue-700',
    },
    red: {
      border: 'border-red-200',
      open: 'border-red-400 ring-red-600/10',
      selected: 'bg-red-50',
      check: 'text-red-700',
    },
    purple: {
      border: 'border-purple-200',
      open: 'border-purple-400 ring-purple-600/10',
      selected: 'bg-purple-50',
      check: 'text-purple-700',
    },
    amber: {
      border: 'border-amber-200',
      open: 'border-amber-400 ring-amber-600/10',
      selected: 'bg-amber-50',
      check: 'text-amber-700',
    },
  }[accent];

  const availablePlayers = players.filter(
    (player) => player.id !== excludePlayerId && !disabledPlayerIds.includes(player.id)
  );
  const selectedPlayer = availablePlayers.find((player) => player.id === value);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;
    const desiredHeight = Math.min(420, Math.max(180, availablePlayers.length * 62 + 12));
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - viewportPadding);
    const spaceAbove = Math.max(0, rect.top - gap - viewportPadding);
    const openUp = spaceBelow < Math.min(desiredHeight, 300) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(desiredHeight, openUp ? spaceAbove : spaceBelow));

    setMenuPosition(
      openUp
        ? {
            left: rect.left,
            width: rect.width,
            bottom: window.innerHeight - rect.top + gap,
            maxHeight,
          }
        : {
            left: rect.left,
            width: rect.width,
            top: rect.bottom + gap,
            maxHeight,
          }
    );
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, availablePlayers.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.querySelector('[data-player-select-menu="true"]');
      if (menu?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const handleViewportChange = () => updateMenuPosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, availablePlayers.length]);

  const choosePlayer = (playerId: string) => {
    onChange(playerId);
    setIsOpen(false);
  };

  const menu = isOpen && menuPosition
    ? createPortal(
        <div
          data-player-select-menu="true"
          role="listbox"
          aria-label={placeholder}
          className="fixed z-[100] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-[#faf8f2] p-1.5 shadow-[0_16px_40px_rgba(30,25,18,0.22)]"
          style={{
            left: menuPosition.left,
            width: menuPosition.width,
            top: menuPosition.top,
            bottom: menuPosition.bottom,
            maxHeight: menuPosition.maxHeight,
          }}
        >
          {availablePlayers.length === 0 ? (
            <div className="px-3.5 py-4 text-center text-sm font-medium text-stone-500">
              Aucun joueur disponible.
            </div>
          ) : (
            availablePlayers.map((player) => {
              const roleName = ROLES[player.roleId]?.nom ?? player.roleId;
              const selected = player.id === value;

              return (
                <button
                  key={player.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choosePlayer(player.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3.5 text-left transition ${
                    selected ? accentClasses.selected : 'hover:bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-black leading-tight text-stone-900">
                      {player.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium leading-tight text-stone-500">
                      {roleName}
                    </span>
                  </span>
                  {selected && <Check className={`h-5 w-5 shrink-0 ${accentClasses.check}`} />}
                </button>
              );
            })
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`w-full min-h-[58px] rounded-xl border bg-[#faf8f2] px-4 py-2.5 text-left shadow-sm outline-none transition ring-0 focus:ring-4 ${
          isOpen ? accentClasses.open : accentClasses.border
        }`}
      >
        {selectedPlayer ? (
          <span className="block min-w-0 pr-7">
            <span className="block truncate text-[16px] font-black leading-tight text-stone-900">
              {selectedPlayer.name}
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-medium leading-tight text-stone-500">
              {ROLES[selectedPlayer.roleId]?.nom ?? selectedPlayer.roleId}
            </span>
          </span>
        ) : (
          <span className="block pr-7 text-[16px] font-semibold text-stone-500">{placeholder}</span>
        )}

        <ChevronDown
          className={`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {menu}
    </div>
  );
};
