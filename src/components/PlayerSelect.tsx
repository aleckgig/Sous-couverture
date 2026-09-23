import React from 'react';
import { ChevronDown } from 'lucide-react';
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
  const accentClasses = {
    default: 'border-stone-300 focus:border-stone-900 focus:ring-stone-900/10',
    blue: 'border-blue-200 focus:border-blue-600 focus:ring-blue-600/10',
    red: 'border-red-200 focus:border-red-600 focus:ring-red-600/10',
    purple: 'border-purple-200 focus:border-purple-600 focus:ring-purple-600/10',
    amber: 'border-amber-200 focus:border-amber-600 focus:ring-amber-600/10',
  }[accent];

  const availablePlayers = players.filter(
    (player) => player.id !== excludePlayerId && !disabledPlayerIds.includes(player.id)
  );

  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-3 pr-10 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:ring-4 ${accentClasses}`}
      >
        <option value="">{placeholder}</option>
        {availablePlayers.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name} — {ROLES[player.roleId]?.nom ?? player.roleId}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
    </div>
  );
};
