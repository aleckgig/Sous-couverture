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
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-150 text-stone-100">
      {/* 1. TOP HERO BADGE: DAY HIGHLIGHT */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 rounded-3xl p-5 sm:p-7 shadow-2xl text-stone-950 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-amber-300">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shrink-0 border border-amber-300">
            ☀️
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-stone-900 bg-amber-400/80 px-3 py-0.5 rounded-full inline-block mb-1">
              Phase de Journée • Sous Couverture
            </span>
            <h1 className="font-serif font-black text-3xl sm:text-5xl text-stone-950 tracking-tight">
              JOUR {dayCount}
            </h1>
            <p className="text-xs sm:text-sm text-stone-900 font-bold mt-0.5">
              Débats du Gang, plaidoyers secrets & vote d'élimination
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="bg-stone-950 text-amber-200 px-3.5 py-2.5 rounded-2xl border border-amber-400/40 text-center shadow-lg">
            <span className="text-[9px] text-stone-400 font-black uppercase block tracking-wider">
              Libres
            </span>
            <span className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>{freeLivingPlayers.length}</span>
            </span>
          </div>

          <div className="bg-stone-950 text-red-300 px-3.5 py-2.5 rounded-2xl border border-red-500/40 text-center shadow-lg">
            <span className="text-[9px] text-red-400 font-black uppercase block tracking-wider">
              En Prison
            </span>
            <span className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-1 mt-0.5">
              <span>🚔</span>
              <span>{prisoners.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* MINUTEUR / DÉBATS */}
      <div className="bg-stone-900 border border-amber-500/40 rounded-2xl px-4 py-2.5 shadow-lg flex items-center justify-center gap-2 sm:gap-3 text-stone-100 flex-wrap">
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
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5 border-b border-stone-800 pb-3">
          <span className="text-xl">🌅</span>
          <h2 className="font-serif font-black text-lg sm:text-xl text-white">
            Annonce du Matin au Gang
          </h2>
        </div>

        {imprisonedTonight ? (
          <div className="bg-amber-950/80 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-amber-200 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-amber-900/90 border border-amber-400 flex items-center justify-center text-amber-100 shrink-0 text-2xl">
              🚔
            </div>
            <div>
              <span className="text-[10px] text-amber-300 font-black uppercase tracking-wider block">
                Arrestation nocturne :
              </span>
              <h3 className="font-bold text-base sm:text-lg text-white">
                {imprisonedTonight.name} a été envoyé(e) en prison cette nuit !
              </h3>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Dites à haute voix : « La ville se réveille... {imprisonedTonight.name} a été arrêté(e) par la police cette nuit ! Il est placé en détention. »
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-emerald-200 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/90 border border-emerald-400 flex items-center justify-center text-emerald-100 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider block">
                Nuit sans arrestation :
              </span>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Aucune arrestation signalée cette nuit !
              </h3>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                Dites à haute voix : « La ville se réveille. Tout le monde est présent autour de la table aujourd'hui. »
              </p>
            </div>
          </div>
        )}

        {/* PRISONERS STATUS LIST */}
        {prisoners.length > 0 && (
          <div className="mt-3 p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <span className="text-base">🚔</span>
              <span>
                <strong>Joueur(s) en prison :</strong>{' '}
                {prisoners.map((p) => p.name).join(', ')}
              </span>
            </div>
            <span className="text-[10px] text-stone-400 italic">
              (Ne peuvent ni parler, ni voter, ni être exécutés)
            </span>
          </div>
        )}
      </div>

      {/* ACTIONS SPÉCIALES DU JOUR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tueurPlayer && (
          <div className="bg-stone-900 border border-red-500/40 rounded-3xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-sm text-white font-serif">Le Tueur à gages — {tueurPlayer.name}</h3>
            </div>
            <p className="text-xs text-stone-300">Une fois par partie, il peut exécuter immédiatement un joueur libre, sans vote.</p>
            {tueurPlayer.hasUsedTueurAGages ? (
              <div className="text-xs text-stone-400 bg-stone-950 border border-stone-800 rounded-xl p-3">Pouvoir déjà utilisé.</div>
            ) : (
              <>
                <select value={tueurTargetId} onChange={e => setTueurTargetId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-3 text-sm text-white">
                  <option value="">— Choisir une cible —</option>
                  {freeLivingPlayers.filter(p => p.id !== tueurPlayer.id).map(p =>
                    <option key={p.id} value={p.id}>{p.name} — {ROLES[p.roleId]?.nom}</option>
                  )}
                </select>
                <button type="button" disabled={!tueurTargetId}
                  onClick={() => { if (tueurTargetId) { onTriggerTueurShot?.(tueurPlayer.id, tueurTargetId); setTueurTargetId(''); } }}
                  className="w-full py-3 rounded-xl bg-red-700 text-white font-black text-xs disabled:opacity-40">
                  Exécuter immédiatement
                </button>
              </>
            )}
          </div>
        )}
        {gardePlayer && (
          <div className="bg-stone-900 border border-blue-500/40 rounded-3xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm text-white font-serif">Le Garde du corps — {gardePlayer.name}</h3>
            </div>
            <p className="text-xs text-stone-300">Une fois par partie, il peut empêcher l’exécution d’un joueur. Le vote devra alors être refait sans cette cible.</p>
            {gardePlayer.hasUsedGardeDuCorps ? (
              <div className="text-xs text-stone-400 bg-stone-950 border border-stone-800 rounded-xl p-3">Pouvoir déjà utilisé.</div>
            ) : (
              <>
                <select
                  value={gardeTargetId}
                  onChange={e => setGardeTargetId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-3 text-sm text-white">
                  <option value="">— Choisir un joueur à protéger —</option>
                  {freeLivingPlayers.filter(p => p.id !== gardePlayer.id).map(p =>
                    <option key={p.id} value={p.id}>{p.name} — {ROLES[p.roleId]?.nom}</option>
                  )}
                </select>
                <button type="button" disabled={!gardeTargetId}
                  onClick={() => {
                    if (!gardeTargetId) return;
                    const target = players.find(p => p.id === gardeTargetId);
                    if (target) {
                      onUpdatePlayer?.({ ...target, isExecutionProtected: true });
                      onUpdatePlayer?.({ ...gardePlayer, hasUsedGardeDuCorps: true });
                    }
                    setGardeTargetId('');
                  }}
                  className="w-full py-3 rounded-xl bg-blue-700 text-white font-black text-xs disabled:opacity-40">
                  Empêcher l’exécution de ce joueur
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* VOTE DU GANG & ÉLIMINATION */}
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
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

            <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
              Sélectionnez le joueur condamné par le vote du Gang :
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {freeLivingPlayers.map((p) => {
                const isSelected = selectedExecuteId === p.id;
                const isCaid = p.roleId === 'caid';
                const isAgent = p.roleId === 'agent_sous_couverture';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedExecuteId(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-red-950 border-red-400 text-white shadow ring-2 ring-red-400/40'
                        : 'bg-stone-950 border-stone-800 text-stone-200 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="truncate min-w-0 flex-1">
                      <span className={`font-bold text-sm block truncate ${isAgent ? 'text-blue-400' : 'text-white'}`}>
                        {p.name}
                      </span>
                      <span className="text-[10px] text-stone-400 block truncate">
                        {ROLES[p.roleId]?.nom || p.roleId}
                      </span>
                      {isCaid && (
                        <span className="text-[9px] text-amber-400 font-bold block">
                          Caïd
                        </span>
                      )}
                      {isAgent && (
                        <span className="text-[9px] text-blue-400 font-bold block">
                          👮🏻‍♂️ Agent sous couverture
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
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
          className="w-full py-4 sm:py-5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 hover:from-indigo-500 hover:to-purple-700 active:scale-95 text-white font-black shadow-2xl shadow-indigo-950 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border border-indigo-400/40"
        >
          <span className="text-lg sm:text-xl font-black flex items-center justify-center gap-2 leading-none">
            <span>🌙</span>
            <span>Endormir la Ville</span>
          </span>
          <span className="text-xs sm:text-sm font-semibold text-indigo-200 leading-none">
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
