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
import { generateNightSteps, checkVictory, generateBalancedSousCouvertureRoles, getInformantsCount } from './utils/gameLogic';
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
  const handleFinishNight = (summary?: {
    imprisonedPlayerId?: string;
    recruitedPlayerId?: string;
    chimisteTargetId?: string;
    apprentiTargetId?: string;
    avocateTargetId?: string;
    junkieAction?: {
      perceivedRoleId: RoleId;
      chimisteTargetId?: string;
      apprentiTargetId?: string;
      avocateTargetId?: string;
      hackerTargetOneId?: string;
      hackerTargetTwoId?: string;
      agentActionType?: 'none' | 'recruit' | 'prison';
      agentTargetId?: string;
      recruitmentAccepted?: boolean | null;
      imprisonedPlayerId?: string;
    };
  }) => {
    let updatedPlayers = players.map(p => ({
      ...p,
      isProtected: false,
      isInformationPoisoned: false,
      isPoisoned: false,
    }));

    const chimiste = players.find(p => p.roleId === 'chimiste' && p.isAlive && !p.isPrisoner);
    const chimistePoisoned = !!(chimiste && summary?.chimisteTargetId === chimiste.id);
    if (summary?.chimisteTargetId && !chimistePoisoned) {
      updatedPlayers = updatedPlayers.map(p =>
        p.id === summary.chimisteTargetId
          ? { ...p, isInformationPoisoned: true, isPoisoned: true }
          : p
      );
    }

    // Resolve the Junkie's simulated role early enough for its real effects to
    // influence later night actions (e.g. a simulated Chimiste can poison the Agent,
    // and a simulated Avocate can protect someone from the Agent's arrest).
    const junkie = players.find(p => p.roleId === 'junkie' && p.isAlive && !p.isPrisoner);
    const junkieAction = summary?.junkieAction;
    const junkiePoisoned = !!(junkie && (
      summary?.chimisteTargetId === junkie.id ||
      junkie.isInformationPoisoned ||
      junkie.isPoisoned
    ));

    if (junkie && junkieAction && !junkiePoisoned) {
      if (junkieAction.perceivedRoleId === 'chimiste' && junkieAction.chimisteTargetId) {
        updatedPlayers = updatedPlayers.map(p =>
          p.id === junkieAction.chimisteTargetId
            ? { ...p, isInformationPoisoned: true, isPoisoned: true }
            : p
        );
        addLog(`🧪 Le Junkie a appliqué le pouvoir du Chimiste sur ${players.find(p => p.id === junkieAction.chimisteTargetId)?.name ?? 'une cible'}.`, 'action');
      }
      if (junkieAction.perceivedRoleId === 'avocat_vereux' && junkieAction.avocateTargetId) {
        updatedPlayers = updatedPlayers.map(p =>
          p.id === junkieAction.avocateTargetId
            ? { ...p, isProtected: true }
            : p
        );
        addLog(`🛡️ Le Junkie a appliqué le pouvoir de l’Avocate sur ${players.find(p => p.id === junkieAction.avocateTargetId)?.name ?? 'une cible'}.`, 'protection');
      }
    }

    if (summary?.apprentiTargetId) {
      const apprenti = players.find(p => p.roleId === 'apprenti' && p.isAlive && !p.isPrisoner);
      if (apprenti && !apprenti.isInformationPoisoned && !apprenti.isPoisoned) {
        updatedPlayers = updatedPlayers.map(p =>
          p.id === apprenti.id ? { ...p, linkedVoteTargetId: summary.apprentiTargetId } : p
        );
      }
    }

    const agent = players.find(p => p.roleId === 'agent_sous_couverture' && p.isAlive && !p.isPrisoner);
    const agentPoisoned = !!(agent && (
      agent.isInformationPoisoned ||
      agent.isPoisoned ||
      summary?.chimisteTargetId === agent.id ||
      updatedPlayers.find(p => p.id === agent.id)?.isInformationPoisoned
    ));
    const target = summary?.recruitedPlayerId
      ? players.find(p => p.id === summary.recruitedPlayerId)
      : undefined;

    if (target && agent && !agentPoisoned && !target.isPrisoner && !target.isInformateur) {
      updatedPlayers = updatedPlayers.map(p =>
        p.id === target.id
          ? { ...p, isInformateur: true, currentTeam: 'Forces de l\'ordre' }
          : p
      );
      addLog(`👮 ${target.name} a accepté le recrutement et devient Informateur.`, 'recruitment');
    }

    const prisonTargetId = summary?.imprisonedPlayerId;
    if (prisonTargetId && agent && !agentPoisoned) {
      const prisonTarget = players.find(p => p.id === prisonTargetId);
      const avocateTargetId = summary?.avocateTargetId;
      const avocate = players.find(p => p.roleId === 'avocat_vereux' && p.isAlive && !p.isPrisoner);
      const avocatePoisoned = !!(avocate && (
        avocate.isInformationPoisoned ||
        avocate.isPoisoned ||
        summary?.chimisteTargetId === avocate.id ||
        updatedPlayers.find(p => p.id === avocate.id)?.isInformationPoisoned
      ));
      const protectedByAvocate = avocateTargetId === prisonTargetId && avocate && !avocatePoisoned;
      const protectedByJunkieAvocate = junkieAction?.perceivedRoleId === 'avocat_vereux' &&
        !junkiePoisoned &&
        junkieAction.avocateTargetId === prisonTargetId;
      const targetIsChauffeur = prisonTarget.roleId === 'chauffeur' || prisonTarget.perceivedRoleId === 'chauffeur';
      const validTarget = prisonTarget &&
        prisonTarget.isAlive &&
        !prisonTarget.isPrisoner &&
        prisonTarget.roleId !== 'agent_sous_couverture' &&
        !targetIsChauffeur &&
        !prisonTarget.isInformateur;

      if (validTarget && !protectedByAvocate && !protectedByJunkieAvocate) {
        updatedPlayers = updatedPlayers.map(p =>
          p.id === prisonTargetId ? { ...p, isPrisoner: true } : p
        );
        addLog(`🚔 ${prisonTarget.name} a été envoyé en prison par l'Agent sous couverture.`, 'prison');
      } else if (prisonTarget) {
        addLog(`🛑 L'arrestation de ${prisonTarget.name} a échoué.`, 'info');
      }
    }

    if (summary?.recruitedPlayerId && agentPoisoned) {
      addLog('⚠️ L’Agent sous couverture était empoisonné : son recrutement a échoué, même s’il croit avoir réussi.', 'info');
    }

    // Apply the remaining simulated Junkie powers after the normal Agent resolution.
    if (junkie && junkieAction && !junkiePoisoned) {
      switch (junkieAction.perceivedRoleId) {
        case 'apprenti':
          if (junkieAction.apprentiTargetId) {
            updatedPlayers = updatedPlayers.map(p =>
              p.id === junkie.id
                ? { ...p, linkedVoteTargetId: junkieAction.apprentiTargetId }
                : p
            );
            addLog('🎯 Le Junkie a appliqué le pouvoir de l’Apprenti.', 'action');
          }
          break;
        case 'agent_sous_couverture': {
          const target = junkieAction.agentTargetId
            ? players.find(p => p.id === junkieAction.agentTargetId)
            : undefined;
          if (junkieAction.agentActionType === 'recruit' && target && junkieAction.recruitmentAccepted) {
            if (target.roleId !== 'homme_de_main' && target.perceivedRoleId !== 'homme_de_main' && !target.isInformateur && target.currentTeam === 'Gang' && getInformantsCount(updatedPlayers) < 2) {
              updatedPlayers = updatedPlayers.map(p =>
                p.id === target.id ? { ...p, isInformateur: true, currentTeam: 'Forces de l\'ordre' } : p
              );
              addLog(`👮 Le Junkie a appliqué le pouvoir de l’Agent sous couverture : ${target.name} devient Informateur.`, 'recruitment');
            }
          }
          if (junkieAction.agentActionType === 'prison' && target) {
            const valid = target.isAlive && !target.isPrisoner &&
              target.roleId !== 'chauffeur' &&
              target.roleId !== 'agent_sous_couverture' &&
              !target.isInformateur &&
              target.roleId !== 'homme_de_main';
            const protectedByAvocate = updatedPlayers.find(p => p.id === target.id)?.isProtected;
            if (valid && !protectedByAvocate) {
              updatedPlayers = updatedPlayers.map(p =>
                p.id === target.id ? { ...p, isPrisoner: true } : p
              );
              addLog(`🚔 Le Junkie a appliqué le pouvoir de l’Agent sous couverture : ${target.name} est envoyé en prison.`, 'prison');
            }
          }
          break;
        }
        case 'trafiquant':
        case 'blanchisseur':
        case 'nettoyeur':
        case 'pickpocket':
        case 'hacker':
        case 'revendeur_armes':
        default:
          break;
      }
    } else if (junkie && junkieAction && junkiePoisoned) {
      addLog('⚠️ Le Junkie était empoisonné : son pouvoir simulé échoue silencieusement.', 'info');
    }

    setPlayers(updatedPlayers);
    setLastNightKillPlayerId(prisonTargetId);
    setLastDayExecutedPlayerId(undefined);
    setAvocatPlaidoyerActive(false);

    const vResult = checkVictory(updatedPlayers);
    if (vResult) {
      handleVictory(vResult);
      return;
    }
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

  // Day execution and once-per-day special actions
  const handleExecutePlayer = (playerId: string): boolean => {
    const target = players.find(p => p.id === playerId);
    if (!target || !target.isAlive || target.isPrisoner) return false;

    if (target.isExecutionProtected) {
      addLog(`🛡️ Le Garde du corps a empêché l’exécution de ${target.name}. Le vote doit être refait sans cette cible.`, 'protection');
      const updated = players.map(p => p.id === target.id ? { ...p, isExecutionProtected: false } : p);
      setPlayers(updated);
      return false;
    }

    setLastDayExecutedPlayerId(playerId);
    const updated = players.map(p =>
      p.id === playerId ? { ...p, isAlive: false, isPrisoner: false, deathReason: 'execution' as const } : p
    );
    setPlayers(updated);
    addLog(`⚖️ ${target.name} a été exécuté par vote (${ROLES[target.roleId]?.nom ?? target.roleId}).`, 'death');

    const vResult = checkVictory(updated, playerId);
    if (vResult) handleVictory(vResult);
    return true;
  };

  const handleTriggerTueurShot = (tueurPlayerId: string, targetPlayerId: string): boolean => {
    const tueur = players.find(p => p.id === tueurPlayerId);
    const target = players.find(p => p.id === targetPlayerId);
    if (!tueur || !target || !tueur.isAlive || tueur.isPrisoner || tueur.hasUsedTueurAGages) return false;
    if (!target.isAlive || target.isPrisoner) return false;
    if (tueur.isInformationPoisoned || tueur.isPoisoned) {
      addLog(`⚠️ Le Tueur à gages était empoisonné : son tir sur ${target.name} échoue.`, 'info');
      setPlayers(players.map(p => p.id === tueur.id ? { ...p, hasUsedTueurAGages: true } : p));
      return true;
    }

    const updated = players.map(p => {
      if (p.id === tueur.id) return { ...p, hasUsedTueurAGages: true };
      if (p.id === target.id) return { ...p, isAlive: false, isPrisoner: false, deathReason: 'tueur_a_gages' as const };
      return p;
    });
    setPlayers(updated);
    addLog(`🎯 Le Tueur à gages a exécuté ${target.name} sans vote.`, 'death');
    const vResult = checkVictory(updated);
    if (vResult) handleVictory(vResult);
    return true;
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

  const livingCount = players.filter((p) => p.isAlive && !p.isPrisoner).length;

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
    <div className="min-h-dvh bg-[#f5f1e8] text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-stone-950">
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
      <main className={`flex-1 w-full mx-auto px-3 sm:px-4 ${gamePhase === "night" || gamePhase === "day" ? "max-w-2xl py-2 overflow-hidden h-[calc(100dvh-57px)]" : "max-w-7xl py-3 md:py-6"}`}>
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
                  lastDayExecutedPlayerId={lastDayExecutedPlayerId}
                />
              )}

              {gamePhase === 'day' && (
                <DayAssistant
                  dayCount={dayCount}
                  lastNightKillPlayerId={lastNightKillPlayerId}
                  players={players}
                  onExecutePlayer={handleExecutePlayer}
                  onClearExecution={() => setLastDayExecutedPlayerId(undefined)}
                  onStartNight={handleStartNight}
                  onTriggerTueurShot={handleTriggerTueurShot}
                />
              )}
            </div>
          )}
      </main>

      {gamePhase !== "night" && gamePhase !== "day" && (
        <footer className="border-t border-stone-200 bg-[#f0ece2] py-3 text-center text-[10px] text-stone-400">
          Sous Couverture • Jeu de déduction sociale
        </footer>
      )}

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
