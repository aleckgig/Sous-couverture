import React, { useState, useEffect } from 'react';
import {
  Sun,
  Skull,
  Moon,
  Check,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Scale,
  Crosshair,
  ShieldAlert,
} from 'lucide-react';
import { Player, RoleId } from '../types';
import { ROLES } from '../data/roles';
import { ValidationAlertModal } from './ValidationAlertModal';
import { canPrisonersVoteDuringDay } from '../utils/rulesConfig';
import { PlayerSelect } from './PlayerSelect';

interface DayAssistantProps {
  dayCount: number;
  lastNightImprisonedPlayerId?: string;
  players: Player[];
  onExecutePlayer: (playerId: string) => void;
  onClearExecution?: () => void;
  onStartNight: () => void;
  onUpdatePlayer?: (player: Player) => void;
  avocatPlaidoyerActive?: boolean;
  onToggleAvocatPlaidoyer?: (active: boolean) => void;
  onTriggerTueurShot?: (tueurPlayerId: string, targetPlayerId: string) => void;
}

export const DayAssistant: React.FC<DayAssistantProps> = ({
  dayCount,
  lastNightImprisonedPlayerId,
  players,
  onExecutePlayer,
  onClearExecution,
  onStartNight,
  onUpdatePlayer,
  avocatPlaidoyerActive,
  onToggleAvocatPlaidoyer,
  onTriggerTueurShot,
}) => {
  const [selectedExecuteId, setSelectedExecuteId] = useState<string>('');
  const [hasExecutedToday, setHasExecutedToday] = useState<boolean>(false);
  const [noExecutionConfirmed, setNoExecutionConfirmed] = useState<boolean>(false);
  const [executedPlayerName, setExecutedPlayerName] = useState<string>('');
  const [balanceRevengeTargetId, setBalanceRevengeTargetId] = useState<string>('');
  
  // Tueur à gages UI
  const [isTueurSectionOpen, setIsTueurSectionOpen] = useState<boolean>(false);
  const [tueurTargetId, setTueurTargetId] = useState<string>('');
  const [gardeTargetId, setGardeTargetId] = useState<string>('');

  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    message: '',
  });

  // Debate timer (default 5 minutes)
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            try {
              const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.6);
            } catch {
              // ignore
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft]);

  const handleAdjustMinutes = (delta: number) => {
    const newMinutes = Math.max(1, Math.min(60, timerMinutes + delta));
    setTimerMinutes(newMinutes);
    if (!isTimerRunning) {
      setTimeLeft(newMinutes * 60);
    }
  };

  const handleToggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(timerMinutes * 60);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMinutes * 60);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const livingPlayers = players.filter((p) => p.isAlive);
  const freeLivingPlayers = livingPlayers.filter((p) => !p.isPrisoner);
  const prisoners = livingPlayers.filter((p) => p.isPrisoner);
  const imprisonedTonight = players.find((p) => p.id === lastNightImprisonedPlayerId);

  const tueurPlayer = players.find((p) => p.roleId === 'tueur_a_gages' && p.isAlive && !p.isPrisoner);
  const gardePlayer = players.find((p) => p.roleId === 'garde_du_corps' && p.isAlive && !p.isPrisoner);

  const handleConfirmExecution = (playerId: string) => {
    const p = players.find((pl) => pl.id === playerId);
    if (p) {
      const success = onExecutePlayer(playerId);
      if (success === false) {
        setHasExecutedToday(false);
        setExecutedPlayerName('');
        setSelectedExecuteId('');
        setNoExecutionConfirmed(false);
        return;
      }
      setExecutedPlayerName(p.name);
      setHasExecutedToday(true);
      setNoExecutionConfirmed(false);
      setSelectedExecuteId('');
    }
  };

  const handleConfirmNoExecution = () => {
    setNoExecutionConfirmed(true);
    setHasExecutedToday(false);
    setExecutedPlayerName('');
    setSelectedExecuteId('');
    onClearExecution?.();
  };

  const handleTryStartNight = () => {
    if (!hasExecutedToday && !noExecutionConfirmed) {
      setValidationModal({
        isOpen: true,
        title: 'Exécution du Jour non renseignée',
        message: `Pour le Jour ${dayCount}, veuillez sélectionner le joueur éliminé par le vote du Gang, ou confirmer qu'il n'y a eu "Aucune exécution aujourd'hui" avant d'endormir la ville.`,
      });
      return;
    }

    if (noExecutionConfirmed) {
      onClearExecution?.();
    }

    onStartNight();
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-150 text-stone-900">
      {/* DAY COMPACT HEADER */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-stone-200 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] font-black text-stone-400">Phase de jour</div>
            <h1 className="text-lg font-black tracking-tight text-stone-900 leading-none">Jour {dayCount}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className="px-2 py-1 rounded-lg bg-white border border-stone-200 text-stone-700">{freeLivingPlayers.length} libres</span>
          <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">{prisoners.length} prison</span>
        </div>
      </div>

      {/* MINUTEUR / DÉBATS */}
      <div className="shrink-0 bg-white border border-stone-200 rounded-2xl px-3 py-2 shadow-sm flex items-center justify-center gap-2 text-stone-800">
        <button
          type="button"
          onClick={() => handleAdjustMinutes(-1)}
          disabled={isTimerRunning || timerMinutes <= 1}
          className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 font-black text-sm flex items-center justify-center border border-stone-700 transition-all active:scale-95 cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span
          className={`font-mono font-black text-xl min-w-[56px] text-center tracking-tight ${
            timeLeft === 0
              ? 'text-red-400 animate-pulse'
              : isTimerRunning
              ? 'text-amber-300'
              : 'text-white'
          }`}
        >
          {formatTimer(timeLeft)}
        </span>

        <button
          type="button"
          onClick={() => handleAdjustMinutes(1)}
          disabled={isTimerRunning || timerMinutes >= 60}
          className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 font-black text-sm flex items-center justify-center border border-stone-700 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleToggleTimer}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer ${
            isTimerRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 border border-amber-400'
              : timeLeft === 0
              ? 'bg-red-600 hover:bg-red-500 text-white border border-red-400'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 border border-amber-300'
          }`}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </>
          ) : timeLeft === 0 ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Relancer</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Démarrer</span>
            </>
          )}
        </button>

        {(timeLeft !== timerMinutes * 60 || timeLeft === 0) && (
          <button
            type="button"
            onClick={handleResetTimer}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 border border-stone-700 transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* MORNING ANNOUNCEMENT */}
      <div className="shrink-0 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🌅</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-stone-400">Annonce du matin</span>
        </div>
        {imprisonedTonight ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
            <div className="text-xs font-black text-stone-900">{imprisonedTonight.name} est en prison.</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Annoncez son arrestation à la table.</div>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
            <div className="text-xs font-black text-stone-900">Aucune arrestation cette nuit.</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Annoncez que tout le monde est présent.</div>
          </div>
        )}
        {prisoners.length > 0 && (
          <div className="mt-2 text-[10px] text-stone-500"><strong>En prison :</strong> {prisoners.map((p) => p.name).join(', ')}</div>
        )}
      </div>

      {/* ACTIONS SPÉCIALES DU JOUR */}
      {(tueurPlayer || gardePlayer) && (
        <div className="shrink-0 grid grid-cols-2 gap-2">
          {tueurPlayer && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-red-700" /><span className="text-[11px] font-black text-stone-900 truncate">Tueur à gages</span></div>
              {tueurPlayer.hasUsedTueurAGages ? <div className="text-[10px] text-stone-500">Pouvoir utilisé.</div> : <>
                <PlayerSelect value={tueurTargetId} onChange={setTueurTargetId} players={freeLivingPlayers.filter(p => p.id !== tueurPlayer.id)} placeholder="Cible…" accent="red" />
                <button type="button" disabled={!tueurTargetId} onClick={() => { if (tueurTargetId) { onTriggerTueurShot?.(tueurPlayer.id, tueurTargetId); setTueurTargetId(''); } }} className="w-full py-2 rounded-lg bg-red-700 text-white font-black text-[10px] disabled:opacity-40">Exécuter</button>
              </>}
            </div>
          )}
          {gardePlayer && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-blue-700" /><span className="text-[11px] font-black text-stone-900 truncate">Garde du corps</span></div>
              {gardePlayer.hasUsedGardeDuCorps ? <div className="text-[10px] text-stone-500">Pouvoir utilisé.</div> : <>
                <PlayerSelect value={gardeTargetId} onChange={setGardeTargetId} players={freeLivingPlayers.filter(p => p.id !== gardePlayer.id)} placeholder="Protéger…" accent="blue" />
                <button type="button" disabled={!gardeTargetId} onClick={() => {
                  if (!gardeTargetId) return;
                  const target = players.find((p) => p.id === gardeTargetId);
                  if (target) {
                    onUpdatePlayer?.({ ...target, isExecutionProtected: true });
                    onUpdatePlayer?.({ ...gardePlayer, hasUsedGardeDuCorps: true });
                  }
                  setGardeTargetId('');
                }} className="w-full py-2 rounded-lg bg-blue-700 text-white font-black text-[10px] disabled:opacity-40">Protéger</button>
              </>}
            </div>
          )}
        </div>
      )}

      {/* VOTE DU GANG & ÉLIMINATION */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-transparent space-y-2 py-1 overscroll-contain">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚖️</span>
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-white">
                Vote d'Élimination du Gang
              </h2>
              <p className="text-xs text-stone-400">
                Après les débats, enregistrez le joueur éliminé par le vote ou l'absence d'exécution.
              </p>
            </div>
          </div>
        </div>

        {hasExecutedToday ? (
          <div className="bg-red-950/80 border-2 border-red-500 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 text-red-200">
            <div className="flex items-center gap-3">
              <Skull className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white">
                  {executedPlayerName} a été éliminé(e) par le Gang !
                </h3>
                <p className="text-xs text-red-300/80 mt-0.5">
                  L'élimination du Jour {dayCount} est enregistrée.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setHasExecutedToday(false);
                setExecutedPlayerName('');
                onClearExecution?.();
              }}
              className="text-xs text-stone-400 hover:text-stone-200 underline cursor-pointer shrink-0"
            >
              Modifier
            </button>
          </div>
        ) : noExecutionConfirmed ? (
          <div className="bg-stone-950 border-2 border-stone-700 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 text-stone-300">
            <div className="flex items-center gap-3">
              <XCircle className="w-7 h-7 text-stone-400 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-white">
                  Aucune exécution aujourd'hui
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Égalité de votes ou seuil d'élimination non atteint.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNoExecutionConfirmed(false)}
              className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer shrink-0"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {prisoners.length > 0 && (
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-stone-300">
                  <span className="text-base">🚔</span>
                  <span>
                    <strong>Prisonniers ({prisoners.map((p) => p.name).join(', ')}) :</strong>{' '}
                    {canPrisonersVoteDuringDay()
                      ? 'Autorisés à voter (selon la règle active).'
                      : 'Interdits de voter lors de l\'exécution du jour (seuls les joueurs libres votent).'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-800 text-amber-400 shrink-0">
                  Règle Canon
                </span>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">Joueur condamné par le vote</div>
              <PlayerSelect
                value={selectedExecuteId}
                onChange={setSelectedExecuteId}
                players={freeLivingPlayers}
                placeholder="Choisir le joueur exécuté…"
                accent="red"
              />
            </div>

            {selectedExecuteId && (
              <div className="pt-2">
                {players.find((p) => p.id === selectedExecuteId)?.roleId === 'caid' && (
                  <div className="p-3 bg-red-950 border-2 border-red-500 rounded-2xl mb-3 text-xs text-red-200 flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-black uppercase block">ALERTE RÈGLE : LE CAÏD !</strong>
                      <span>Si le Gang vote l'exécution de son propre Caïd, le Gang perd immédiatement la partie !</span>
                    </div>
                  </div>
                )}

                {players.find((p) => p.id === selectedExecuteId)?.roleId === 'balance' && (
                  <div className="p-3 bg-purple-950 border-2 border-purple-500 rounded-2xl mb-3 text-xs text-purple-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-black uppercase block">RÈGLE : LA BALANCE !</strong>
                      <span>Si la Balance est exécutée par le Gang, elle emporte immédiatement dans sa chute l'un de ses accusateurs !</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleConfirmExecution(selectedExecuteId)}
                  id="btn-confirm-execution"
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Skull className="w-5 h-5" />
                  <span>
                    Condamner et exécuter {players.find((p) => p.id === selectedExecuteId)?.name}
                  </span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmNoExecution}
              id="btn-no-execution-today"
              className="w-full py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs border border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4 text-stone-400" />
              <span>Aucune exécution aujourd'hui (Égalité / Vote blanc)</span>
            </button>
          </div>
        )}
      </div>

      {/* ENDORMIR LA VILLE */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleTryStartNight}
          id="btn-start-next-night"
          className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black shadow transition-all cursor-pointer"
        >
          <span className="text-sm font-black flex items-center justify-center gap-2 leading-none">
            <span>🌙</span>
            <span>Endormir la Ville</span>
          </span>
          <span className="text-[10px] font-semibold text-stone-400 leading-none">
            (Lancer la Nuit {dayCount + 1})
          </span>
        </button>
      </div>

      {/* Validation Alert Popup */}
      <ValidationAlertModal
        isOpen={validationModal.isOpen}
        title={validationModal.title}
        message={validationModal.message}
        onClose={() => setValidationModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};
