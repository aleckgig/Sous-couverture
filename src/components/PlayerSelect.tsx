import React, { useEffect, useRef, useState } from 'react';
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
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
  const normalizedSearch = search.trim().toLocaleLowerCase('fr-CA');
  const filteredPlayers = normalizedSearch
    ? availablePlayers.filter((player) => {
        const roleName = ROLES[player.roleId]?.nom ?? player.roleId;
        return `${player.name} ${roleName}`.toLocaleLowerCase('fr-CA').includes(normalizedSearch);
      })
    : availablePlayers;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const choosePlayer = (playerId: string) => {
    onChange(playerId);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className={\`relative \${className}\`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => {
            const next = !open;
            if (next) window.setTimeout(() => searchRef.current?.focus(), 0);
            else setSearch('');
            return next;
          });
        }}
        className={\`w-full min-h-[58px] rounded-xl border bg-[#faf8f2] px-4 py-2.5 text-left shadow-sm outline-none transition ring-0 focus:ring-4 \${isOpen ? accentClasses.open : accentClasses.border}\`}
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
          <span className="block pr-7 text-[16px] font-semibold text-stone-500">
            {placeholder}
          </span>
        )}

        <ChevronDown
          className={\`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500 transition-transform \${isOpen ? 'rotate-180' : ''}\`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={placeholder}
          className="absolute left-0 right-0 z-50 mt-2 max-h-[min(52dvh,420px)] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-[#faf8f2] p-1.5 shadow-[0_12px_35px_rgba(30,25,18,0.16)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => choosePlayer('')}
            className={\`w-full rounded-xl px-3.5 py-3 text-left transition \${!value ? accentClasses.selected : 'hover:bg-stone-100'}\`}
          >
            <span className="block text-[15px] font-semibold text-stone-500">{placeholder}</span>
          </button>

          {availablePlayers.map((player) => {
            const roleName = ROLES[player.roleId]?.nom ?? player.roleId;
            const selected = player.id === value;

            return (
              <button
                key={player.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choosePlayer(player.id)}
                className={\`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition \${selected ? accentClasses.selected : 'hover:bg-stone-100 active:bg-stone-200'}\`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-black leading-tight text-stone-900">
                    {player.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-medium leading-tight text-stone-500">
                    {roleName}
                  </span>
                </span>
                {selected && <Check className={\`h-5 w-5 shrink-0 \${accentClasses.check}\`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
