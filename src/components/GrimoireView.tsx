import React, { useState } from 'react';
import {
  Skull,
  Shield,
  User,
  CheckCircle,
  Crosshair,
  AlertCircle,
  Edit3,
  Eye,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { Player, RoleId, StructuredRole } from '../types';
import { ROLES } from '../data/roles';
import { RoleCardModal } from './RoleCardModal';

interface GrimoireViewProps {
  players: Player[];
  onUpdatePlayer: (updatedPlayer: Player) => void;
  onOpenLogs?: () => void;
}

export const GrimoireView: React.FC<GrimoireViewProps> = ({
  players,
  onUpdatePlayer,
  onOpenLogs,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'circle' | 'grid'>('circle');
  const [cardModalRoleId, setCardModalRoleId] = useState<string | null>(null);
  const [noteSavedMessage, setNoteSavedMessage] = useState<boolean>(false);

  const handleOpenPlayerModal = (player: Player) => {
    setSelectedPlayer(player);
    setEditingNotes(player.notes || '');
    setNoteSavedMessage(false);
  };

  const handleSaveNotes = () => {
    if (selectedPlayer) {
      onUpdatePlayer({ ...selectedPlayer, notes: editingNotes });
      setSelectedPlayer({ ...selectedPlayer, notes: editingNotes });
      setNoteSavedMessage(true);
      setTimeout(() => setNoteSavedMessage(false), 2500);
    }
  };

  const handleToggleAlive = (cause?: string) => {
    if (selectedPlayer) {
      const isAliveNow = !selectedPlayer.isAlive;
      const updated: Player = {
        ...selectedPlayer,
        isAlive: isAliveNow,
        deathReason: isAliveNow ? undefined : cause || 'Éliminé par vote',
      };
      onUpdatePlayer(updated);
      setSelectedPlayer(updated);
    }
  };

  const handleTogglePrison = () => {
    if (selectedPlayer) {
      const isPrisonerNow = !selectedPlayer.isPrisoner;
      const updated: Player = {
        ...selectedPlayer,
        isPrisoner: isPrisonerNow,
      };
      onUpdatePlayer(updated);
      setSelectedPlayer(updated);
    }
  };

  const handleToggleInformateur = () => {
    if (selectedPlayer) {
      const isInformateurNow = !selectedPlayer.isInformateur;
      const updated: Player = {
        ...selectedPlayer,
        isInformateur: isInformateurNow,
        currentTeam: isInformateurNow ? 'Forces de l\'ordre' : 'Gang',
      };
      onUpdatePlayer(updated);
      setSelectedPlayer(updated);
    }
  };

  const handleToggleStatus = (field: 'isProtected' | 'isFaussePiste') => {
    if (selectedPlayer) {
      const updated: Player = {
        ...selectedPlayer,
        [field]: !selectedPlayer[field],
      };
      onUpdatePlayer(updated);
      setSelectedPlayer(updated);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 text-stone-100">
      {/* Top Header & Layout Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold font-serif text-sm">
            📜
          </div>
          <div>
            <h2 className="font-serif font-black text-lg text-white leading-tight">
              Table du Grimoire • Sous Couverture
            </h2>
            <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
              Touchez un joueur pour modifier son statut (prison, informateur, mort) ou afficher sa carte.
            </p>
          </div>
        </div>

        {/* View Toggle & Chronology Button */}
        <div className="flex items-center gap-2">
          {onOpenLogs && (
            <button
              onClick={onOpenLogs}
              id="btn-grimoire-open-logs"
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 hover:border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title="Consulter l'Historique / Chronologie de la partie"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Historique</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setLayoutMode('circle')}
              id="btn-layout-circle"
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                layoutMode === 'circle'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Table Ronde
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              id="btn-layout-grid"
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Grille
            </button>
          </div>
        </div>
      </div>

      {/* CIRCLE LAYOUT */}
      {layoutMode === 'circle' ? (
        <div className="relative w-full aspect-square max-w-[360px] xs:max-w-[400px] sm:max-w-[500px] md:max-w-[580px] mx-auto my-1 flex items-center justify-center p-2 sm:p-4 bg-stone-950 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden">
          {/* Subtle Center Table Motif */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border border-stone-800/80 bg-stone-900/40 shadow-inner flex flex-col items-center justify-center p-2 text-center select-none opacity-60">
              <span className="text-[7.5px] sm:text-[9px] text-amber-500/60 font-serif font-black uppercase tracking-widest text-center">
                Table
              </span>
              <p className="text-[7px] sm:text-[8px] text-stone-500 font-serif font-black uppercase tracking-widest mt-0.5">
                Sous Couverture
              </p>
            </div>
          </div>

          {/* Players in Circle */}
          <div className="relative w-full h-full">
            {players.map((player, idx) => {
              const total = players.length;
              const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
              const rx = total > 10 ? 40 : total > 7 ? 38.5 : 37;
              const ry = total > 10 ? 39 : total > 7 ? 37.5 : 36;
              const x = 50 + rx * Math.cos(angle);
              const y = 50 + ry * Math.sin(angle);

              const role = ROLES[player.roleId];
              const isHackerInGame = players.some((p) => p.roleId === 'hacker');
              const isAgent = player.roleId === 'agent_sous_couverture';
              const isInformateur = player.isInformateur || (player.currentTeam === 'Forces de l\'ordre' && !isAgent);
              const isForces = isAgent || isInformateur;

              return (
                <div
                  key={player.id}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-20 hover:z-30 transition-all"
                >
                  <div className="relative">
                    <button
                      onClick={() => handleOpenPlayerModal(player)}
                      className={`group relative ${
                        total > 10
                          ? 'w-[64px] xs:w-[70px] sm:w-24 md:w-28 p-1 sm:p-1.5 rounded-xl'
                          : total > 7
                          ? 'w-[72px] xs:w-[78px] sm:w-26 md:w-30 p-1.5 sm:p-2 rounded-2xl'
                          : 'w-[78px] xs:w-[86px] sm:w-28 md:w-34 p-1.5 sm:p-2 rounded-2xl'
                      } border-2 text-left transition-all duration-200 hover:scale-105 shadow-xl cursor-pointer ${
                        !player.isAlive
                          ? 'bg-stone-950 border-stone-800 text-stone-500 opacity-70 grayscale'
                          : player.isPrisoner
                          ? 'bg-stone-900 border-amber-500/80 text-amber-200 ring-2 ring-amber-500/30'
                          : isForces
                          ? 'bg-blue-950 border-blue-500 text-blue-100'
                          : 'bg-stone-900 border-red-500/50 text-stone-100'
                      }`}
                    >
                      {/* Status Badges */}
                      <div className="flex items-center gap-0.5 absolute -top-2 right-0.5">
                        {player.isPrisoner && (
                          <span
                            className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 text-[10px] flex items-center justify-center font-bold border border-amber-400 shadow"
                            title="En Prison"
                          >
                            🚔
                          </span>
                        )}
                        {isInformateur && (
                          <span
                            className="w-5 h-5 rounded-full bg-blue-950 text-blue-300 text-[10px] flex items-center justify-center font-bold border border-blue-400 shadow"
                            title="Informateur"
                          >
                            💬
                          </span>
                        )}
                        {isAgent && (
                          <span
                            className="w-5 h-5 rounded-full bg-blue-900 text-blue-200 text-[10px] flex items-center justify-center font-bold border border-blue-400 shadow"
                            title="Agent sous couverture"
                          >
                            👮🏻‍♂️
                          </span>
                        )}
                        {isHackerInGame && player.isFaussePiste && (
                          <span
                            className="w-5 h-5 rounded-full bg-amber-900 text-amber-200 text-[10px] flex items-center justify-center font-bold border border-amber-400 shadow"
                            title="Fausse Piste"
                          >
                            🎯
                          </span>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="mt-0.5">
                        <div className="font-black text-[10px] xs:text-[11px] sm:text-xs md:text-sm truncate">
                          {isAgent ? (
                            <span className="text-blue-400 flex items-center gap-0.5 truncate">
                              <span className="truncate">{player.name}</span>
                              <span className="text-xs shrink-0">👮🏻‍♂️</span>
                            </span>
                          ) : isInformateur ? (
                            <span className="text-blue-400 flex items-center gap-0.5 truncate">
                              <span className="truncate">{player.name}</span>
                              <span className="text-xs shrink-0">💬</span>
                            </span>
                          ) : (
                            <span className="text-white truncate block">{player.name}</span>
                          )}
                        </div>

                        <div className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold mt-0.5 truncate">
                          {player.isAlive ? (
                            <span
                              className={
                                isForces
                                  ? 'text-blue-400 font-black'
                                  : 'text-red-400 font-black'
                              }
                            >
                              {role?.nom}
                            </span>
                          ) : (
                            <span className="text-stone-500 line-through">{role?.nom}</span>
                          )}
                        </div>

                        {/* Prisoner label */}
                        {player.isPrisoner && (
                          <div className="text-[7.5px] sm:text-[8.5px] text-amber-300 bg-amber-950/80 px-1 py-0.5 rounded mt-0.5 border border-amber-500/40 font-bold truncate">
                            🚔 En prison
                          </div>
                        )}

                        {/* Informateur tag */}
                        {isInformateur && (
                          <div className="text-[7.5px] sm:text-[8.5px] text-blue-300 bg-blue-950 px-1 py-0.5 rounded mt-0.5 border border-blue-500/40 font-bold truncate">
                            💬 Informateur
                          </div>
                        )}

                        {/* Fausse Piste tag when Hacker is in game */}
                        {isHackerInGame && player.isFaussePiste && (
                          <div className="text-[7.5px] sm:text-[8.5px] text-amber-400 bg-stone-900 px-1 py-0.5 rounded mt-0.5 border border-amber-500/30 font-bold truncate">
                            🎯 Fausse Piste
                          </div>
                        )}

                        {!player.isAlive && (
                          <div className="text-[8px] sm:text-[9px] text-red-400 font-bold mt-0.5 flex items-center gap-0.5">
                            <Skull className="w-2.5 h-2.5" />
                            <span>Éliminé</span>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Corner Role Card Visualizer Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardModalRoleId(player.roleId);
                      }}
                      className="absolute -bottom-1.5 -right-1.5 p-1 sm:p-1.5 rounded-full bg-stone-900 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-stone-700 hover:border-amber-400 shadow-lg transition-all active:scale-90 cursor-pointer z-30"
                      title={`Afficher la carte de ${role?.nom || player.roleId}`}
                    >
                      <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GRID LAYOUT */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 my-4">
          {players.map((player) => {
            const role = ROLES[player.roleId];
            const isHackerInGame = players.some((p) => p.roleId === 'hacker');
            const isAgent = player.roleId === 'agent_sous_couverture';
            const isInformateur = player.isInformateur || (player.currentTeam === 'Forces de l\'ordre' && !isAgent);
            const isForces = isAgent || isInformateur;

            return (
              <div key={player.id} className="relative group">
                <button
                  onClick={() => handleOpenPlayerModal(player)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-102 shadow-lg relative cursor-pointer ${
                    !player.isAlive
                      ? 'bg-stone-950 border-stone-800 text-stone-500 opacity-70 grayscale'
                      : player.isPrisoner
                      ? 'bg-stone-900 border-amber-500/80 text-amber-200'
                      : isForces
                      ? 'bg-blue-950 border-blue-500 text-blue-100'
                      : 'bg-stone-900 border-red-500/50 text-stone-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {player.isPrisoner && <span title="En prison">🚔</span>}
                      {isInformateur && <span title="Informateur">💬</span>}
                      {isAgent && <span title="Agent sous couverture">👮🏻‍♂️</span>}
                      {isHackerInGame && player.isFaussePiste && <span title="Fausse Piste">🎯</span>}
                    </div>
                  </div>

                  <div className="font-black text-sm truncate">
                    {isAgent ? (
                      <span className="text-blue-400 flex items-center gap-1 truncate">
                        <span>{player.name}</span>
                        <span className="text-xs">👮🏻‍♂️</span>
                      </span>
                    ) : isInformateur ? (
                      <span className="text-blue-400 flex items-center gap-1 truncate">
                        <span>{player.name}</span>
                        <span className="text-xs">💬</span>
                      </span>
                    ) : (
                      <span className="text-white truncate block">{player.name}</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-amber-300 mt-0.5 truncate">
                    {role?.nom}
                  </div>

                  <div className="flex gap-1 mt-2 flex-wrap">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                        isForces ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {player.currentTeam}
                    </span>
                    {role?.isPerturbateur && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-900 text-purple-200 uppercase">
                        Perturbateur
                      </span>
                    )}
                  </div>

                  {!player.isAlive && (
                    <div className="text-xs text-red-400 font-black mt-2 flex items-center gap-1">
                      <Skull className="w-3.5 h-3.5" />
                      <span>ÉLIMINÉ</span>
                    </div>
                  )}

                  {player.notes && (
                    <div className="text-xs text-stone-300 mt-2 bg-stone-950 p-2 rounded-xl border border-stone-800 line-clamp-2">
                      {player.notes}
                    </div>
                  )}
                </button>

                {/* Corner Role Card Visualizer Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardModalRoleId(player.roleId);
                  }}
                  className="absolute bottom-3 right-3 p-1.5 rounded-full bg-stone-900 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-stone-700 hover:border-amber-400 shadow-md transition-all active:scale-90 cursor-pointer z-30"
                  title={`Afficher la carte de ${role?.nom || player.roleId}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* PLAYER DETAIL MODAL */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 space-y-5 text-stone-100 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[11px] uppercase font-black text-amber-400 tracking-wider">
                  {ROLES[selectedPlayer.roleId]?.nom || 'Joueur'}
                </span>
                <h3 className="text-2xl font-serif font-black">
                  {selectedPlayer.roleId === 'agent_sous_couverture' ? (
                    <span className="text-blue-400 flex items-center gap-1.5">
                      <span>{selectedPlayer.name}</span>
                      <span>👮🏻‍♂️</span>
                    </span>
                  ) : selectedPlayer.isInformateur ? (
                    <span className="text-blue-400 flex items-center gap-1.5">
                      <span>{selectedPlayer.name}</span>
                      <span>💬</span>
                    </span>
                  ) : (
                    <span className="text-white">{selectedPlayer.name}</span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-stone-400 hover:text-white p-2 rounded-xl bg-stone-800 text-sm font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Role Details */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  {selectedPlayer.roleId === 'agent_sous_couverture' && <span>👮🏻‍♂️</span>}
                  <span>{ROLES[selectedPlayer.roleId]?.nom}</span>
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                      selectedPlayer.currentTeam === 'Forces de l\'ordre' || selectedPlayer.isInformateur
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {selectedPlayer.isInformateur ? 'Forces de l\'ordre (Informateur)' : selectedPlayer.currentTeam}
                  </span>
                  {ROLES[selectedPlayer.roleId]?.isPerturbateur && (
                    <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-purple-900 text-purple-200">
                      Perturbateur
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-200 leading-relaxed font-medium">
                {ROLES[selectedPlayer.roleId]?.description}
              </p>

              {/* Show Card Button */}
              <button
                onClick={() => setCardModalRoleId(selectedPlayer.roleId)}
                id="btn-show-player-card"
                className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Afficher la carte de rôle ({selectedPlayer.name})</span>
              </button>
            </div>

            {/* Status Toggles */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-black text-amber-400 tracking-wider">
                Statuts & Actions
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {/* Alive / Dead */}
                <button
                  onClick={() => handleToggleAlive()}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-2 justify-center transition-all cursor-pointer ${
                    selectedPlayer.isAlive
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                      : 'bg-red-950 border-red-500 text-red-200'
                  }`}
                >
                  <Skull className="w-4 h-4" />
                  <span>{selectedPlayer.isAlive ? 'Marquer Éliminé' : 'Ressusciter'}</span>
                </button>

                {/* Prison */}
                <button
                  onClick={handleTogglePrison}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-2 justify-center transition-all cursor-pointer ${
                    selectedPlayer.isPrisoner
                      ? 'bg-amber-950 border-amber-500 text-amber-200'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  <span>🚔 {selectedPlayer.isPrisoner ? 'En Prison' : 'Libre'}</span>
                </button>

                {/* Informateur */}
                <button
                  onClick={handleToggleInformateur}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-2 justify-center transition-all cursor-pointer ${
                    selectedPlayer.isInformateur
                      ? 'bg-blue-950 border-blue-500 text-blue-200'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  <span>💬 {selectedPlayer.isInformateur ? 'Informateur (Forces de l\'ordre)' : 'Membre du Gang'}</span>
                </button>

                {/* Fausse Piste */}
                <button
                  onClick={() => handleToggleStatus('isFaussePiste')}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-2 justify-center transition-all cursor-pointer ${
                    selectedPlayer.isFaussePiste
                      ? 'bg-purple-950 border-purple-500 text-purple-200'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  <span>🎯 {selectedPlayer.isFaussePiste ? 'Fausse Piste' : 'Normal'}</span>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-black text-amber-400 tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Notes Conteur
              </label>
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Ex : Recruté Nuit 1, suspecté par le Gang..."
                rows={2}
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none resize-none font-medium"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow cursor-pointer transition-all active:scale-95"
                  >
                    Enregistrer la note
                  </button>
                  {noteSavedMessage && (
                    <span className="text-xs text-emerald-400 font-bold animate-in fade-in">
                      ✓ Enregistrée !
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cardModalRoleId && (
        <RoleCardModal
          roleId={cardModalRoleId}
          selectableRoles={Object.keys(ROLES) as RoleId[]}
          onClose={() => setCardModalRoleId(null)}
        />
      )}
    </div>
  );
};
