import React, { useState, useEffect } from 'react';
import { GamePhase, LogEntry, NightStep, Player, RoleId } from './types';
import { SetupWizard } from './components/SetupWizard';
import { Header } from './components/Header';
import { GrimoireView } from './components/GrimoireView';
import { NightAssistant } from './components/NightAssistant';
import { DayAssistant } from './components/DayAssistant';
import { RulesModal } from './components/RulesModal';
import { LogDrawer } from './components/LogDrawer';
import { VictoryModal } from './components/VictoryModal';
import { ConfirmResetModal } from './components/ConfirmResetModal';
import { RoleCardModal } from './components/RoleCardModal';
import { PhonePlayerView } from './components/PhonePlayerView';
import { ImageManagerModal } from './components/ImageManagerModal';
import { RulesValidationModal } from './components/RulesValidationModal';
import { generateNightSteps, checkVictory, generateBalancedSousCouvertureRoles } from './utils/gameLogic';
import { ROLES } from './data/roles';
import { Sparkles, RefreshCw, Trophy, Eye, RotateCcw } from 'lucide-react';

const GAME_STORAGE_KEY = 'botc_clocktower_game_v1';

interface SavedGameState {
  gamePhase: GamePhase;
  gameMode?: 'physical' | 'phone';
  players: Player[];
  bluffs: RoleId[];
  faussePistePlayerId: string;
  drunkPerceivedRoleId?: RoleId;
  dayCount: number;
  nightCount: number;
  nightSteps: NightStep[];
  lastNightKillPlayerId?: string;
  lastDayExecutedPlayerId?: string;
  logs: LogEntry[];
  victoryState: { winner: 'Gang' | "Forces de l'ordre" | 'Village' | 'Camp du Mal'; reason: string } | null;
  lastSavedAt: string;
}

function loadSavedGame(): SavedGameState | null {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.gamePhase && Array.isArray(parsed.players)) {
      return parsed as SavedGameState;
    }
  } catch (err) {
    console.error('Erreur lors de la lecture de la partie sauvegardée:', err);
  }
  return null;
}

export default function App() {
  const savedGame = loadSavedGame();

  // App View mode: Storyteller (Grimoire) vs Player (Mon Téléphone)
  const [appView, setAppView] = useState<'storyteller' | 'player'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room') || urlParams.get('view') === 'player' || urlParams.get('mode') === 'player') {
      return 'player';
    }
    const saved = localStorage.getItem('botc_active_app_view');
    if (saved === 'player' && localStorage.getItem('botc_player_id')) {
      return 'player';
    }
    return 'storyteller';
  });

  const [gamePhase, setGamePhase] = useState<GamePhase>(savedGame?.gamePhase || 'setup_player_count');
  const [gameMode, setGameMode] = useState<'physical' | 'phone'>(savedGame?.gameMode || 'physical');
  const [players, setPlayers] = useState<Player[]>(savedGame?.players || []);
  const [bluffs, setBluffs] = useState<RoleId[]>(savedGame?.bluffs || []);
  const [faussePistePlayerId, setFaussePistePlayerId] = useState<string>(savedGame?.faussePistePlayerId || '');
  const [drunkPerceivedRoleId, setDrunkPerceivedRoleId] = useState<RoleId | undefined>(savedGame?.drunkPerceivedRoleId);

  const [dayCount, setDayCount] = useState<number>(savedGame?.dayCount || 1);
  const [nightCount, setNightCount] = useState<number>(savedGame?.nightCount || 1);
  const [nightSteps, setNightSteps] = useState<NightStep[]>(savedGame?.nightSteps || []);
  const [lastNightKillPlayerId, setLastNightKillPlayerId] = useState<string | undefined>(savedGame?.lastNightKillPlayerId);
  const [lastDayExecutedPlayerId, setLastDayExecutedPlayerId] = useState<string | undefined>(savedGame?.lastDayExecutedPlayerId);

  const [logs, setLogs] = useState<LogEntry[]>(savedGame?.logs || []);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [isGrimoirePopupOpen, setIsGrimoirePopupOpen] = useState<boolean>(false);
  const [isImageManagerOpen, setIsImageManagerOpen] = useState<boolean>(false);
  const [isRulesValidationOpen, setIsRulesValidationOpen] = useState<boolean>(false);
  const [avocatPlaidoyerActive, setAvocatPlaidoyerActive] = useState<boolean>(false);

  const [victoryState, setVictoryState] = useState<{ winner: 'Gang' | "Forces de l'ordre" | 'Village' | 'Camp du Mal'; reason: string } | null>(savedGame?.victoryState || null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState<boolean>(true);

  // Scroll to top on game phase change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [gamePhase]);

  // Auto-save on state change
  useEffect(() => {
    if (gamePhase === 'setup_player_count' && players.length === 0) {
      return;
    }

    const stateToSave: SavedGameState = {
      gamePhase,
      gameMode,
      players,
      bluffs,
      faussePistePlayerId,
      drunkPerceivedRoleId,
      dayCount,
      nightCount,
      nightSteps,
      lastNightKillPlayerId,
      lastDayExecutedPlayerId,
      logs,
      victoryState,
      lastSavedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde automatique:', e);
    }
  }, [
    gamePhase,
    gameMode,
    players,
    bluffs,
    faussePistePlayerId,
    drunkPerceivedRoleId,
    dayCount,
    nightCount,
    nightSteps,
    lastNightKillPlayerId,
    logs,
    victoryState,
  ]);

  // Window visibility / backgrounding lifecycle listener
  useEffect(() => {
    const handleSaveOnExit = () => {
      if (players.length === 0) return;
      const stateToSave: SavedGameState = {
        gamePhase,
        players,
        bluffs,
        faussePistePlayerId,
        drunkPerceivedRoleId,
        dayCount,
        nightCount,
        nightSteps,
        lastNightKillPlayerId,
        logs,
        victoryState,
        lastSavedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('visibilitychange', handleSaveOnExit);
    window.addEventListener('pagehide', handleSaveOnExit);
    window.addEventListener('beforeunload', handleSaveOnExit);

    return () => {
      window.removeEventListener('visibilitychange', handleSaveOnExit);
      window.removeEventListener('pagehide', handleSaveOnExit);
      window.removeEventListener('beforeunload', handleSaveOnExit);
    };
  }, [
    gamePhase,
    players,
    bluffs,
    faussePistePlayerId,
    drunkPerceivedRoleId,
    dayCount,
    nightCount,
    nightSteps,
    lastNightKillPlayerId,
    logs,
    victoryState,
  ]);

  // Keep room synced to phones in real-time when in phone mode
  useEffect(() => {
    if (gameMode !== 'phone' || players.length === 0) return;
    const roomCode = localStorage.getItem('botc_storyteller_room_code');
    if (!roomCode) return;

    const payload = {
      status: 'playing',
      players,
      gameState: {
        phase: gamePhase === 'night' ? 'night' : 'day',
        dayCount,
        nightCount,
        lastAnnouncement: logs[0]?.text || (gamePhase === 'night' ? `Nuit ${nightCount}` : `Jour ${dayCount}`),
      },
    };

    fetch(`/api/room/${roomCode}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [gameMode, gamePhase, dayCount, nightCount, players, logs]);

  // Helper to add log
  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      phase: gamePhase === 'night' ? 'night' : 'day',
      dayOrNightNumber: gamePhase === 'night' ? nightCount : dayCount,
      text,
      type,
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  // Setup completion handler
  const handleCompleteSetup = (
    createdPlayers: Player[],
    chosenBluffs: RoleId[],
    faussePisteId: string,
    drunkRoleId?: RoleId,
    roomInfo?: { code: string; storytellerName: string; mode: 'physical' | 'phone' }
  ) => {
    if (roomInfo?.mode) {
      setGameMode(roomInfo.mode);
    }
    setPlayers(createdPlayers);
    setBluffs(chosenBluffs);
    setFaussePistePlayerId(faussePisteId);
    setDrunkPerceivedRoleId(drunkRoleId);

    setDayCount(1);
    setNightCount(1);
    setGamePhase('night');

    const steps = generateNightSteps(true, createdPlayers);
    setNightSteps(steps);

    addLog('La partie commence ! Première Nuit en cours.', 'info');
  };

  const handleVictory = (vResult: { winner: 'Gang' | "Forces de l'ordre" | 'Village' | 'Camp du Mal'; reason: string }) => {
    setVictoryState(vResult);
    setIsVictoryModalOpen(true);
    setGamePhase('game_over');
    addLog(`Fin de partie ! Victoire : ${vResult.winner}.`, 'victory');
  };

  // Batch update players handler
  const handleBatchUpdatePlayers = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    const vResult = checkVictory(updatedPlayers);
    if (vResult) {
      handleVictory(vResult);
    }
  };

  // Player state update handler
  const handleUpdatePlayer = (updated: Player) => {
    const newPlayers = players.map((p) => (p.id === updated.id ? updated : p));
    setPlayers(newPlayers);

    // Check victory after any status/death change
    const vResult = checkVictory(newPlayers);
    if (vResult) {
      handleVictory(vResult);
    }
  };

  // Night finished handler
  const handleFinishNight = (killedPlayerId?: string) => {
    let updatedPlayers = players.map((p) => ({ ...p, isProtected: false })); // Monk protection resets each day
    let actualKilledId: string | undefined = undefined;

    if (killedPlayerId && killedPlayerId !== 'none') {
      const target = players.find((p) => p.id === killedPlayerId);
      const moinePlayer = players.find(
        (p) =>
          (p.roleId === 'moine' || (p.roleId === 'ivrogne' && drunkPerceivedRoleId === 'moine')) &&
          p.isAlive
      );
      const isMoineImpaired = Boolean(
        moinePlayer && (moinePlayer.isPoisoned || moinePlayer.roleId === 'ivrogne')
      );
      // Monk protection ONLY works if Monk is alive AND not poisoned AND not drunk!
      const isProtectionEffective = Boolean(
        target?.isProtected && moinePlayer && !isMoineImpaired
      );
      const demonPlayer = players.find((p) => p.roleId === 'demon' && p.isAlive);
      const isDemonImpaired = Boolean(demonPlayer?.isPoisoned);

      if (target) {
        // 0. Check if Demon is poisoned
        if (isDemonImpaired) {
          addLog(
            `⚠️ Pendant la nuit, le Démon a attaqué ${target.name}, mais le Démon était empoisonné : son attaque a échoué ! Aucun mort.`,
            'info'
          );
        }
        // 1. Check if attack was blocked by Monk protection (ONLY if Monk was sober & healthy!)
        else if (isProtectionEffective) {
          addLog(
            `🛡️ Pendant la nuit, l'attaque du Démon a été bloquée car ${target.name} était protégé(e) par le Prêtre ! Aucun mort.`,
            'protection'
          );
        }
        // 2. Check if attack was blocked by Soldier immunity
        else if (target.roleId === 'soldat' && !target.isPoisoned) {
          addLog(
            `⚔️ Pendant la nuit, l'attaque du Démon a échoué sur l'armure du Soldat (${target.name}) ! Aucun mort.`,
            'info'
          );
        }
        // 3. Check Imp Suicide (Starpass)
        else if (target.roleId === 'demon' || target.isNewDemon) {
          actualKilledId = target.id;
          // Demon dies
          updatedPlayers = updatedPlayers.map((p) =>
            p.id === target.id ? { ...p, isAlive: false, deathReason: 'night_kill' as const } : p
          );

          // Promote a living Minion to be the new Demon
          const livingMinions = updatedPlayers.filter(
            (p) =>
              p.isAlive &&
              (p.roleId === 'femme_ecarlate' ||
                p.roleId === 'empoisonneur' ||
                p.roleId === 'espion' ||
                p.roleId === 'baron')
          );

          // Priority to Scarlet Woman, otherwise first available living minion
          const nextDemon =
            livingMinions.find((m) => m.roleId === 'femme_ecarlate') || livingMinions[0];

          if (nextDemon) {
            updatedPlayers = updatedPlayers.map((p) =>
              p.id === nextDemon.id ? { ...p, roleId: 'demon' as const, isNewDemon: true } : p
            );
            addLog(
              `💀 Le Démon s'est suicidé cette nuit (Starpass) ! ${nextDemon.name} (${ROLES[nextDemon.roleId]?.name}) prend la succession et devient le nouveau Démon ! Le Camp du Mal survit.`,
              'action'
            );
          } else {
            addLog(
              `💀 Le Démon s'est suicidé cette nuit, mais aucun acolyte n'était en vie pour lui succéder !`,
              'death'
            );
          }
        }
        // 4. Regular victim killed
        else {
          actualKilledId = target.id;
          updatedPlayers = updatedPlayers.map((p) =>
            p.id === target.id ? { ...p, isAlive: false, deathReason: 'night_kill' as const } : p
          );
          if (target.isProtected && isMoineImpaired) {
            addLog(
              `💀 Pendant la nuit, ${target.name} (${ROLES[target.roleId]?.name}) a été tué(e) par le Démon ! La protection du Prêtre a échoué car le Prêtre était ${moinePlayer?.isPoisoned ? 'empoisonné' : 'ivrogne'}.`,
              'death'
            );
          } else if (target.roleId === 'soldat' && target.isPoisoned) {
            addLog(
              `💀 Pendant la nuit, le Soldat (${target.name}) a été tué par le Démon car son armure était inopérante (Soldat empoisonné).`,
              'death'
            );
          } else {
            addLog(`Pendant la nuit, ${target.name} (${ROLES[target.roleId]?.name}) a été tué(e) par le Démon.`, 'death');
          }
        }
      }
    } else {
      addLog('Pendant la nuit, aucun joueur n’est mort.', 'info');
    }

    setPlayers(updatedPlayers);
    setLastNightKillPlayerId(actualKilledId);
    setLastDayExecutedPlayerId(undefined); // Reset day execution for the upcoming day
    setAvocatPlaidoyerActive(false); // Reset plaidoyer once resolved

    // Check victory
    const vResult = checkVictory(updatedPlayers);
    if (vResult) {
      handleVictory(vResult);
      return;
    }

    // Move to Day
    setGamePhase('day');
  };

  // Start next night handler
  const handleStartNight = () => {
    const newNightNum = nightCount + 1;
    setNightCount(newNightNum);
    setGamePhase('night');

    // Reset temporary night statuses: poison & monk protection from previous night
    const resetPlayers = players.map((p) => ({
      ...p,
      isPoisoned: false,
      isProtected: false,
    }));
    setPlayers(resetPlayers);

    const steps = generateNightSteps(false, resetPlayers, {
      avocatPlaidoyerActive,
    });
    setNightSteps(steps);

    addLog(`Début de la Nuit ${newNightNum}.`, 'info');
  };

  // Execution handler during day
  const handleExecutePlayer = (playerId: string) => {
    const target = players.find((p) => p.id === playerId);
    if (!target) return;

    setLastDayExecutedPlayerId(playerId);

    // 1. Saint execution rule: If Saint is executed (and not poisoned/drunk), Evil wins immediately!
    if (target.roleId === 'saint' && !target.isPoisoned && drunkPerceivedRoleId !== 'saint') {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, isAlive: false, deathReason: 'execution' as const } : p
      );
      setPlayers(updated);
      addLog(`⚖️ Le Village a exécuté ${target.name} qui était le Saint ! Le Camp du Mal l’emporte immédiatement !`, 'death');
      handleVictory({
        winner: 'Camp du Mal',
        reason: 'Le Saint a été exécuté sur le bûcher par le Village ! Le Camp du Mal l’emporte immédiatement.',
      });
      return;
    }

    // 2. Demon execution rule: Check Scarlet Woman inheritance
    if (target.roleId === 'demon' || target.isNewDemon) {
      let updated = players.map((p) =>
        p.id === playerId ? { ...p, isAlive: false, deathReason: 'execution' as const } : p
      );
      const livingCountAfterDeath = updated.filter((p) => p.isAlive).length;
      const scarletWoman = updated.find((p) => p.roleId === 'femme_ecarlate' && p.isAlive);

      if (scarletWoman && livingCountAfterDeath >= 5) {
        // Scarlet Woman becomes the new Demon!
        updated = updated.map((p) =>
          p.id === scarletWoman.id ? { ...p, roleId: 'demon' as const, isNewDemon: true } : p
        );
        setPlayers(updated);
        addLog(
          `⚖️ Le Démon (${target.name}) a été exécuté sur le bûcher ! Mais avec 5+ joueurs en vie, la Femme Écarlate (${scarletWoman.name}) devient le nouveau Démon ! La partie continue.`,
          'action'
        );
        return;
      } else {
        // Demon dead and no Scarlet Woman takeover -> Village wins!
        setPlayers(updated);
        addLog(`⚖️ Le Démon (${target.name}) a été exécuté sur le bûcher ! Le Village est libéré !`, 'death');
        handleVictory({
          winner: 'Village',
          reason: 'Le Démon a été éliminé sur le bûcher et le village l’emporte !',
        });
        return;
      }
    }

    // 3. Regular player execution
    const updated = players.map((p) =>
      p.id === playerId ? { ...p, isAlive: false, deathReason: 'execution' as const } : p
    );
    setPlayers(updated);
    addLog(`Le Village a exécuté ${target.name} (${ROLES[target.roleId]?.name}).`, 'death');

    const vResult = checkVictory(updated, playerId);
    if (vResult) {
      handleVictory(vResult);
    }
  };

  // Virgin trigger
  const handleTriggerVirgin = (virginId: string, nominatorId: string) => {
    const virginP = players.find((p) => p.id === virginId);
    const nominatorP = players.find((p) => p.id === nominatorId);
    if (!virginP || !nominatorP) return;

    // Virgin only triggers if virgin is sober & nominator is Townsfolk
    const nominatorRole = ROLES[nominatorP.roleId];
    if (nominatorRole?.type === 'Villageois' && !virginP.isPoisoned && drunkPerceivedRoleId !== 'vierge') {
      const updated = players.map((p) =>
        p.id === nominatorId ? { ...p, isAlive: false, deathReason: 'vierge' as const } : p
      );
      setPlayers(updated);
      addLog(
        `Pouvoir de la Vierge déclenché ! ${nominatorP.name} (nominateur Villageois) est immédiatement exécuté(e). ${virginP.name} (la Vierge) prouve son innocence !`,
        'death'
      );

      const vResult = checkVictory(updated);
      if (vResult) {
        handleVictory(vResult);
      }
    } else {
      addLog(
        `La nomination sur la Vierge n'a pas déclenché d'exécution (nominateur non-villageois ou Vierge empoisonnée).`,
        'info'
      );
    }
  };

  // Hunter trigger
  const handleTriggerHunter = (hunterId: string, targetId: string) => {
    const hunterP = players.find((p) => p.id === hunterId);
    const targetP = players.find((p) => p.id === targetId);
    if (!hunterP || !targetP) return;

    // Check if Hunter is poisoned or drunk
    if (hunterP.isPoisoned || hunterP.roleId === 'ivrogne') {
      addLog(`🏹 Le Chasseur a tiré sur ${targetP.name}, mais rien ne s'est produit (Chasseur empoisonné ou ivrogne).`, 'info');
      return;
    }

    const isDemon = targetP.roleId === 'demon' || targetP.isNewDemon;
    if (isDemon) {
      let updated = players.map((p) =>
        p.id === targetId ? { ...p, isAlive: false, deathReason: 'chasseur' as const } : p
      );
      const livingCountAfterDeath = updated.filter((p) => p.isAlive).length;
      const scarletWoman = updated.find((p) => p.roleId === 'femme_ecarlate' && p.isAlive);

      if (scarletWoman && livingCountAfterDeath >= 5) {
        updated = updated.map((p) =>
          p.id === scarletWoman.id ? { ...p, roleId: 'demon' as const, isNewDemon: true } : p
        );
        setPlayers(updated);
        addLog(
          `🏹 Le Chasseur a abattu le Démon (${targetP.name}) ! Cependant, avec 5+ joueurs en vie, la Femme Écarlate (${scarletWoman.name}) prend le relais et devient le nouveau Démon !`,
          'action'
        );
      } else {
        setPlayers(updated);
        addLog(`🏹 Le Chasseur a tiré sur ${targetP.name}, qui était le Démon ! Coup fatal !`, 'death');
        handleVictory({
          winner: 'Village',
          reason: 'Le Chasseur a éliminé le Démon d’un tir précis !',
        });
      }
    } else {
      addLog(`🏹 Le Chasseur a tiré sur ${targetP.name}, mais ce n’était pas le Démon !`, 'info');
    }
  };

  // Full Reset & New Game
  const handleResetGame = () => {
    setIsResetConfirmOpen(true);
  };

  const handleNewGame = () => {
    localStorage.removeItem(GAME_STORAGE_KEY);
    localStorage.removeItem('botc_night_step_index');
    localStorage.removeItem('botc_night_kill_target');

    // Preserve previous player roster & seating layout for the next game
    try {
      const rawSetup = localStorage.getItem('botc_setup_wizard_state');
      const rawRoster = localStorage.getItem('botc_saved_player_roster');

      let savedNames: string[] = [];
      let savedCount = 7;

      if (rawSetup) {
        const parsed = JSON.parse(rawSetup);
        if (Array.isArray(parsed.playerNames) && parsed.playerNames.length > 0) {
          savedNames = parsed.playerNames;
        }
        if (typeof parsed.playerCount === 'number') {
          savedCount = parsed.playerCount;
        }
      }

      if (savedNames.length === 0 && rawRoster) {
        const parsedRoster = JSON.parse(rawRoster);
        if (Array.isArray(parsedRoster.playerNames) && parsedRoster.playerNames.length > 0) {
          savedNames = parsedRoster.playerNames;
        }
        if (typeof parsedRoster.playerCount === 'number') {
          savedCount = parsedRoster.playerCount;
        }
      }

      if (savedNames.length > 0) {
        localStorage.setItem(
          'botc_setup_wizard_state',
          JSON.stringify({
            step: 1,
            playerCount: savedCount,
            playerNames: savedNames,
            assignmentViewMode: 'table',
            selectedRoles: generateBalancedSousCouvertureRoles(savedCount),
            roleAssignments: {},
          })
        );
      } else {
        localStorage.removeItem('botc_setup_wizard_state');
      }
    } catch (e) {
      console.error('Erreur réinitialisation nouvelle partie:', e);
      localStorage.removeItem('botc_setup_wizard_state');
    }

    setGamePhase('setup_player_count');
    setPlayers([]);
    setBluffs([]);
    setFaussePistePlayerId('');
    setDrunkPerceivedRoleId(undefined);
    setLogs([]);
    setVictoryState(null);
    setIsVictoryModalOpen(true);
    setDayCount(1);
    setNightCount(1);
    setNightSteps([]);
    setLastNightKillPlayerId(undefined);
    setLastDayExecutedPlayerId(undefined);
  };

  const livingCount = players.filter((p) => p.isAlive).length;

  // If in Player View Mode (Phone Interface)
  if (appView === 'player') {
    return (
      <PhonePlayerView
        onExitToStoryteller={() => {
          setAppView('storyteller');
          localStorage.setItem('botc_active_app_view', 'storyteller');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <Header
        gamePhase={gamePhase}
        gameMode={gameMode}
        dayCount={dayCount}
        nightCount={nightCount}
        onOpenGuide={() => setIsRulesOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenPlayerView={() => {
          setAppView('player');
          localStorage.setItem('botc_active_app_view', 'player');
        }}
        onOpenGrimoire={
          gamePhase !== 'setup_player_count' &&
          gamePhase !== 'setup_roles' &&
          gamePhase !== 'setup_players'
            ? () => setIsGrimoirePopupOpen(true)
            : undefined
        }
        onOpenImages={() => setIsImageManagerOpen(true)}
        onOpenArbitrage={() => setIsRulesValidationOpen(true)}
        onResetGame={handleResetGame}
        livingCount={livingCount}
        totalCount={players.length}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Setup Phase */}
        {(gamePhase === 'setup_player_count' ||
          gamePhase === 'setup_roles' ||
          gamePhase === 'setup_players') && (
          <SetupWizard onCompleteSetup={handleCompleteSetup} />
        )}

        {/* End of Game Victory Banner when Modal is Dismissed */}
        {gamePhase === 'game_over' && victoryState && !isVictoryModalOpen && (
          <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/50 text-amber-100 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3.5 text-center md:text-left">
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 shrink-0">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-amber-200">
                  Partie terminée — Victoire du {victoryState.winner} !
                </h3>
                <p className="text-xs text-amber-300/80 mt-0.5">{victoryState.reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setIsVictoryModalOpen(true)}
                id="btn-reopen-victory"
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-bold border border-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                Voir les Révélations
              </button>
              <button
                onClick={handleNewGame}
                id="btn-banner-newgame"
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Recommencer une partie
              </button>
            </div>
          </div>
        )}

        {/* Active Game Phase (Night / Day / Overview) */}
        {gamePhase !== 'setup_player_count' &&
          gamePhase !== 'setup_roles' &&
          gamePhase !== 'setup_players' && (
            <div className="space-y-6">
              {/* Active Assistant Step (Night or Day) */}
              {gamePhase === 'night' && (
                <NightAssistant
                  nightCount={nightCount}
                  steps={nightSteps}
                  players={players}
                  onUpdatePlayer={handleUpdatePlayer}
                  onBatchUpdatePlayers={handleBatchUpdatePlayers}
                  onFinishNight={handleFinishNight}
                  bluffs={bluffs}
                  drunkPerceivedRoleId={drunkPerceivedRoleId}
                  lastDayExecutedPlayerId={lastDayExecutedPlayerId}
                  avocatPlaidoyerActive={avocatPlaidoyerActive}
                />
              )}

              {gamePhase === 'day' && (
                <DayAssistant
                  dayCount={dayCount}
                  lastNightKillPlayerId={lastNightKillPlayerId}
                  players={players}
                  onExecutePlayer={handleExecutePlayer}
                  onClearExecution={() => setLastDayExecutedPlayerId(undefined)}
                  onTriggerVirgin={handleTriggerVirgin}
                  onTriggerHunter={handleTriggerHunter}
                  onStartNight={handleStartNight}
                  avocatPlaidoyerActive={avocatPlaidoyerActive}
                  onToggleAvocatPlaidoyer={(active) => setAvocatPlaidoyerActive(active)}
                />
              )}
            </div>
          )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Sous Couverture • Jeu de Déduction Sociale sur le Thème du Crime Organisé
      </footer>

      {/* Table & Grimoire Modal Popup */}
      {isGrimoirePopupOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 flex items-center justify-center"
          onClick={() => setIsGrimoirePopupOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full mx-auto bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-3 sm:p-5 shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Integrated Close Button X */}
            <button
              type="button"
              onClick={() => setIsGrimoirePopupOpen(false)}
              id="btn-close-grimoire-popup"
              className="absolute top-3 right-3 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-950/90 hover:bg-red-600 border border-stone-700 hover:border-red-400 text-stone-300 hover:text-white flex items-center justify-center font-black text-base sm:text-lg transition-all active:scale-95 shadow-xl cursor-pointer"
              title="Fermer la Table de Jeu"
              aria-label="Fermer la Table de Jeu"
            >
              ✕
            </button>

            {/* Grimoire View Content */}
            <GrimoireView
              players={players}
              onUpdatePlayer={handleUpdatePlayer}
              bluffs={bluffs}
              drunkPerceivedRoleId={drunkPerceivedRoleId}
              onOpenLogs={() => {
                setIsGrimoirePopupOpen(false);
                setIsLogsOpen(true);
              }}
            />

            {/* Bottom Close Button */}
            <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGrimoirePopupOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Fermer la Table de Jeu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <LogDrawer isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} logs={logs} />
      <ConfirmResetModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleNewGame}
      />

      {isImageManagerOpen && <ImageManagerModal onClose={() => setIsImageManagerOpen(false)} />}
      {isRulesValidationOpen && <RulesValidationModal onClose={() => setIsRulesValidationOpen(false)} />}

      {isCardModalOpen && (
        <RoleCardModal
          roleId="agent_sous_couverture"
          selectableRoles={Object.keys(ROLES) as RoleId[]}
          onClose={() => setIsCardModalOpen(false)}
        />
      )}

      {victoryState && isVictoryModalOpen && (
        <VictoryModal
          winner={victoryState.winner}
          reason={victoryState.reason}
          players={players}
          onClose={() => setIsVictoryModalOpen(false)}
          onViewHistory={() => {
            setIsVictoryModalOpen(false);
            setIsLogsOpen(true);
          }}
          onNewGame={handleNewGame}
        />
      )}
    </div>
  );
}
