import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Skull, Eye, EyeOff, Sparkles, Moon, Sun, Trophy, RefreshCw, UserCheck, AlertTriangle, BookOpen, Volume2, ArrowLeft, CheckCircle2, User, ImageIcon, X, ZoomIn, ZoomOut, RotateCcw, ImageOff } from 'lucide-react';
import { PlayerSecretViewData, RoleId, Role } from '../types';
import { ROLES } from '../data/roles';
import { getRoleCardImageUrl } from '../utils/roleCardImages';
import { getLocalRoleImage } from '../utils/cardStorage';

interface PhonePlayerViewProps {
  initialRoomCode?: string;
  onExitToStoryteller?: () => void;
}

export const PhonePlayerView: React.FC<PhonePlayerViewProps> = ({ initialRoomCode = '', onExitToStoryteller }) => {
  const [roomCode, setRoomCode] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get('room') || initialRoomCode || localStorage.getItem('botc_player_room_code') || '').toUpperCase();
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('botc_player_name') || '';
  });

  const [playerId, setPlayerId] = useState<string>(() => {
    return localStorage.getItem('botc_player_id') || '';
  });

  const [joined, setJoined] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('botc_player_id') && localStorage.getItem('botc_player_room_code'));
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [gameData, setGameData] = useState<PlayerSecretViewData | null>(null);
  const [isSecretRevealed, setIsSecretRevealed] = useState<boolean>(false);
  const [showRulesTab, setShowRulesTab] = useState<boolean>(false);

  // Ready State & Card Viewer
  const [isMarkingReady, setIsMarkingReady] = useState<boolean>(false);
  const [localReady, setLocalReady] = useState<boolean>(false);
  const isPlayerReady = localReady || Boolean(gameData?.player?.isReady);

  const [showRoleCardModal, setShowRoleCardModal] = useState<boolean>(false);
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(null);
  const [cardImageLoading, setCardImageLoading] = useState<boolean>(false);
  const [cardImageError, setCardImageError] = useState<boolean>(false);

  // Mark player as ready when they click 'Je suis prêt'
  const handleSetReady = async () => {
    if (!roomCode || !playerId) return;
    setLocalReady(true);
    setIsMarkingReady(true);
    try {
      const res = await fetch(`/api/room/${roomCode}/player/${playerId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReady: true }),
      });
      if (res.ok) {
        setGameData((prev) => {
          if (!prev || !prev.player) return prev;
          return {
            ...prev,
            player: {
              ...prev.player,
              isReady: true,
            },
          };
        });
      }
    } catch (err) {
      console.error('Failed to set ready:', err);
    } finally {
      setIsMarkingReady(false);
    }
  };

  // Zoom & Pan state for Player Card Modal
  const [modalScale, setModalScale] = useState<number>(1);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Load the PNG image for the player's assigned role
  const displayedRoleIdForImg = gameData?.player?.perceivedRoleId || gameData?.player?.roleId;
  const loadPlayerRoleImage = useCallback(async (rId?: string) => {
    if (!rId) return;
    setCardImageLoading(true);
    setCardImageError(false);

    try {
      // 1. Check local indexedDB / custom override first
      const localImg = await getLocalRoleImage(rId);
      if (localImg) {
        setCardImageSrc(localImg);
        setCardImageLoading(false);
        return;
      }

      // 2. Check bundled asset image
      const resolved = getRoleCardImageUrl(rId);
      if (resolved) {
        setCardImageSrc(resolved);
      } else {
        setCardImageSrc(null);
        setCardImageError(true);
      }
    } catch {
      setCardImageError(true);
    } finally {
      setCardImageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (displayedRoleIdForImg) {
      loadPlayerRoleImage(displayedRoleIdForImg);
    }
  }, [displayedRoleIdForImg, loadPlayerRoleImage]);

  // Touch handlers for Player Role Card Modal
  const handleModalTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = modalScale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        if (modalScale > 1.2) {
          setModalScale(1);
          setModalPosition({ x: 0, y: 0 });
        } else {
          setModalScale(2.2);
        }
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
      }

      lastTouchPosRef.current = {
        x: e.touches[0].clientX - modalPosition.x,
        y: e.touches[0].clientY - modalPosition.y,
      };
      isDraggingRef.current = true;
    }
  };

  const handleModalTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialTouchDistanceRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * ratio, 1), 4.5);
      setModalScale(newScale);

      if (newScale <= 1.05) {
        setModalPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDraggingRef.current && lastTouchPosRef.current && modalScale > 1) {
      const newX = e.touches[0].clientX - lastTouchPosRef.current.x;
      const newY = e.touches[0].clientY - lastTouchPosRef.current.y;

      const maxOffset = (modalScale - 1) * 180;
      setModalPosition({
        x: Math.max(Math.min(newX, maxOffset), -maxOffset),
        y: Math.max(Math.min(newY, maxOffset), -maxOffset),
      });
    }
  };

  const handleModalTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      lastTouchPosRef.current = null;
      if (modalScale <= 1.05) {
        setModalScale(1);
        setModalPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleModalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.005;
    const newScale = Math.min(Math.max(modalScale + delta, 1), 4.5);
    setModalScale(newScale);
    if (newScale <= 1.05) {
      setModalPosition({ x: 0, y: 0 });
    }
  };

  // Automatic Reconnection Function
  const attemptReconnectOrFetch = useCallback(async (code: string, pId: string, pName: string) => {
    if (!code) return;
    try {
      if (pId) {
        const res = await fetch(`/api/room/${code}/player/${pId}`);
        if (res.ok) {
          const data = await res.json();
          setGameData(data);
          setJoined(true);
          return;
        }
      }

      // If player ID wasn't found (e.g. server restarted), try rejoining seamlessly with saved name
      if (pName) {
        const joinRes = await fetch(`/api/room/${code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pName }),
        });
        if (joinRes.ok) {
          const joinData = await joinRes.json();
          if (joinData.playerId) {
            setPlayerId(joinData.playerId);
            localStorage.setItem('botc_player_id', joinData.playerId);
            const pRes = await fetch(`/api/room/${code}/player/${joinData.playerId}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              setGameData(pData);
              setJoined(true);
            }
          }
        }
      }
    } catch (err) {
      // ignore network hiccups
    }
  }, []);

  // On initial mount: if we have saved info in localStorage, attempt immediate silent reconnection
  useEffect(() => {
    const savedCode = localStorage.getItem('botc_player_room_code') || roomCode;
    const savedId = localStorage.getItem('botc_player_id') || playerId;
    const savedName = localStorage.getItem('botc_player_name') || playerName;

    if (savedCode && (savedId || savedName)) {
      setIsReconnecting(true);
      attemptReconnectOrFetch(savedCode, savedId, savedName).finally(() => {
        setIsReconnecting(false);
      });
    }
  }, []);

  // Poll for room updates every 2 seconds when joined
  useEffect(() => {
    if (!joined || !roomCode || !playerId) return;

    let isMounted = true;

    const fetchPlayerData = async () => {
      try {
        const url = `/api/room/${roomCode}/player/${playerId}${playerName ? `?name=${encodeURIComponent(playerName)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setGameData(data);
          }
        } else if (res.status === 404 && playerName) {
          // If 404, try reconnecting
          attemptReconnectOrFetch(roomCode, playerId, playerName);
        }
      } catch (err) {
        // network or offline fallback
      }
    };

    fetchPlayerData();
    const interval = setInterval(fetchPlayerData, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [joined, roomCode, playerId, playerName, attemptReconnectOrFetch]);

  // Join Room handler
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeUpper = roomCode.trim().toUpperCase();
    const nameTrimmed = playerName.trim();

    if (!codeUpper) {
      setErrorMsg('Veuillez entrer le code de la salle (ex: VILLAGE-1234).');
      return;
    }
    if (!nameTrimmed) {
      setErrorMsg('Veuillez entrer votre prénom ou pseudo.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/room/${codeUpper}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameTrimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Impossible de rejoindre la salle.');
      }

      setPlayerId(data.playerId);
      setRoomCode(codeUpper);
      setJoined(true);

      // Save to localStorage for instant browser refresh / close recovery
      localStorage.setItem('botc_player_id', data.playerId);
      localStorage.setItem('botc_player_name', nameTrimmed);
      localStorage.setItem('botc_player_room_code', codeUpper);
      localStorage.setItem('botc_active_app_view', 'player');

      // Fetch immediately
      const pRes = await fetch(`/api/room/${codeUpper}/player/${data.playerId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setGameData(pData);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la connexion à la salle.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('botc_player_id');
    localStorage.removeItem('botc_player_room_code');
    localStorage.removeItem('botc_active_app_view');
    setJoined(false);
    setGameData(null);
    setPlayerId('');
  };

  // If not joined yet, show the Join Screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-4">
        {onExitToStoryteller && (
          <div className="w-full max-w-md flex justify-start mb-3">
            <button
              type="button"
              onClick={onExitToStoryteller}
              className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour au Conteur (Grimoire)</span>
            </button>
          </div>
        )}

        <div className="w-full max-w-md bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-red-950 border border-amber-400/50 flex items-center justify-center text-3xl mx-auto shadow-lg">
              🕶️
            </div>
            <h1 className="font-serif font-black text-2xl text-amber-300 tracking-wide">
              Rejoindre la Partie
            </h1>
            <p className="text-xs sm:text-sm text-stone-300">
              Sous Couverture • Entrez votre nom et le code de salle pour recevoir votre rôle secret.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-950/80 border border-red-500 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl flex items-center gap-2 font-medium">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                Code de Salle (ex : SC-4829)
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: SC-4829"
                className="w-full bg-stone-950 border-2 border-stone-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-lg font-mono font-bold text-center text-amber-200 uppercase tracking-widest placeholder:text-stone-600 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                Votre Prénom ou Pseudo
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex : Alexandre, Sophie, Thomas..."
                className="w-full bg-stone-950 border-2 border-stone-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white placeholder:text-stone-600 outline-none transition-colors"
                required
                maxLength={24}
              />
            </div>

            <button
              type="submit"
              disabled={loading || isReconnecting}
              id="btn-join-room"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-stone-950 font-black text-lg shadow-lg shadow-amber-900/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading || isReconnecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>🕶️ Rejoindre la Table</span>
                </>
              )}
            </button>
          </form>

          {onExitToStoryteller && (
            <div className="pt-4 border-t border-stone-800 text-center">
              <button
                type="button"
                onClick={onExitToStoryteller}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
              >
                ← Vous êtes le Conteur ? Accéder au Grimoire
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If in Lobby (no role assigned yet)
  if (!gameData || (!gameData.player?.roleId && gameData.status === 'lobby')) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between p-4 sm:p-6">
        {/* Top bar with auto-reconnect badge */}
        <div className="max-w-md mx-auto w-full flex items-center justify-between bg-stone-900/90 border border-stone-800 p-3 rounded-2xl shadow gap-2">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm truncate">{roomCode}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-stone-300 hidden sm:inline">
              Conteur : <strong className="text-amber-300">{gameData?.storytellerName || 'En attente'}</strong>
            </span>
            {onExitToStoryteller && (
              <button
                type="button"
                onClick={onExitToStoryteller}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs flex items-center gap-1 border border-stone-700 transition-colors cursor-pointer"
                title="Accéder au Grimoire du Conteur"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Conteur</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Card */}
        <div className="max-w-md mx-auto w-full bg-stone-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl my-auto">
          <div className="w-20 h-20 rounded-full bg-amber-950/80 border-2 border-amber-400/50 flex items-center justify-center text-4xl mx-auto shadow-inner">
            ⏳
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              Salle d’attente
            </span>
            <h2 className="font-serif font-black text-2xl text-white">
              Bienvenue, {playerName} !
            </h2>
            <p className="text-sm text-stone-300 leading-relaxed">
              Vous êtes bien inscrit. Le <span className="text-amber-400 font-bold">conteur</span> est en train de préparer les rôles.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 border-b border-stone-800 pb-2">
              <span>Joueurs connectés</span>
              <span className="text-amber-400 font-mono font-bold">{gameData?.allLivingPlayers?.length || 1} présents</span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {gameData?.allLivingPlayers && gameData.allLivingPlayers.length > 0 ? (
                gameData.allLivingPlayers.map((p) => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                      p.id === playerId || p.name.toLowerCase() === playerName.toLowerCase()
                        ? 'bg-amber-500 text-stone-950 font-black shadow'
                        : 'bg-stone-800 text-stone-200 border border-stone-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{p.name}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-500 italic">En attente des autres joueurs...</span>
              )}
            </div>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="text-xs text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
          >
            Changer de nom ou de salle
          </button>
        </div>

        {/* Bottom bar */}
        {onExitToStoryteller && (
          <div className="max-w-md mx-auto w-full text-center">
            <button
              onClick={onExitToStoryteller}
              className="text-xs text-stone-400 hover:text-stone-200 underline"
            >
              Basculer vers l'écran du Conteur
            </button>
          </div>
        )}
      </div>
    );
  }

  // ACTIVE GAME VIEW (Secret Role Card + Status)
  const assignedRoleId = gameData.player.roleId as RoleId;
  const perceivedRoleId = gameData.player.perceivedRoleId as RoleId | undefined;
  const displayedRoleId = perceivedRoleId || assignedRoleId;
  const roleInfo = ROLES[displayedRoleId];

  const isEvil = roleInfo?.team === 'Camp du Mal';
  const isDead = gameData.player.isAlive === false;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between p-4 sm:p-6 select-none pb-12">
      {/* Top Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between bg-stone-900 border border-stone-800 p-3.5 rounded-2xl shadow-xl gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="truncate">
            {assignedRoleId === 'agent_sous_couverture' ? (
              <h2 className="font-black text-sm text-blue-400 leading-tight truncate flex items-center gap-1">
                <span className="truncate">{gameData.player.name}</span>
                <span className="text-xs shrink-0">👮🏻‍♂️</span>
              </h2>
            ) : gameData.player.isInformateur ? (
              <h2 className="font-black text-sm text-blue-400 leading-tight truncate flex items-center gap-1">
                <span className="truncate">{gameData.player.name}</span>
                <span className="text-xs shrink-0">💬</span>
              </h2>
            ) : (
              <h2 className="font-bold text-sm text-white leading-tight truncate flex items-center gap-1">
                <span className="truncate">{gameData.player.name}</span>
                {gameData.player.isPrisoner && <span className="text-xs shrink-0">🚔</span>}
              </h2>
            )}
            <p className="text-[10px] text-stone-400 font-medium truncate">
              {assignedRoleId === 'agent_sous_couverture'
                ? "Forces de l'ordre"
                : gameData.player.isInformateur
                ? "Informateur (Forces de l'ordre)"
                : gameData.player.isPrisoner
                ? 'Prisonnier (Hors jeu)'
                : 'Sous Couverture'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {gameData.gameState?.phase === 'night' ? (
            <span className="px-2 py-1 rounded-xl bg-indigo-950 border border-indigo-500/50 text-indigo-300 text-xs font-bold flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Nuit {gameData.gameState.nightCount || 1}</span>
            </span>
          ) : (
            <span className="px-2 py-1 rounded-xl bg-amber-950 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Jour {gameData.gameState?.dayCount || 1}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowRulesTab(!showRulesTab)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-colors cursor-pointer"
            title="Guide des règles"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {onExitToStoryteller && (
            <button
              type="button"
              onClick={onExitToStoryteller}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
              title="Retourner à l'écran du Conteur"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Secret Card Container */}
      <main className="max-w-md mx-auto w-full my-auto py-4 space-y-4">
        {/* Prisoner Status Banner */}
        {gameData.player.isPrisoner && (
          <div className="bg-amber-950/90 border-2 border-amber-500/80 p-3.5 rounded-2xl text-center space-y-1 shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
              <span className="text-base">🚔</span>
              <span>Vous êtes en prison (Hors jeu)</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              L'Agent sous couverture vous a incarcéré. Vous ne participez plus aux votes d'élimination ni aux décisions nocturnes.
            </p>
          </div>
        )}

        {/* Informant Status Banner */}
        {gameData.player.isInformateur && (
          <div className="bg-blue-950/90 border-2 border-blue-500/80 p-3.5 rounded-2xl text-center space-y-1 shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-blue-300 font-bold text-sm">
              <span className="text-base">💬</span>
              <span className="text-blue-400 font-black">Vous êtes Informateur (Forces de l'ordre)</span>
            </div>
            <p className="text-xs text-blue-200/90 leading-relaxed">
              Vous collaborez désormais avec la Police. Vous remportez la victoire si les Forces de l'ordre triomphent.
              {gameData.player.agentSousCouvertureName && (
                <span className="block mt-1 text-blue-300 font-bold">
                  Votre contact secret : Agent <span className="text-blue-200 font-black">{gameData.player.agentSousCouvertureName}</span> 👮🏻‍♂️
                </span>
              )}
            </p>
          </div>
        )}

        {/* Dead / Ghost Status Banner */}
        {isDead && (
          <div className="bg-red-950/90 border-2 border-red-500/80 p-3 rounded-2xl text-center space-y-1 shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-red-300 font-bold text-sm">
              <Skull className="w-4 h-4 text-red-400" />
              <span>Vous êtes mort(e) (Fantôme)</span>
            </div>
            <p className="text-xs text-red-200/90">
              {gameData.player.isGhostVoteUsed
                ? ' Votre vote fantôme a déjà été utilisé.'
                : ' Il vous reste 1 vote fantôme à utiliser judicieusement.'}
            </p>
          </div>
        )}

        {/* The Card Container */}
        <div className="rounded-3xl border-2 border-amber-500/40 bg-stone-900 shadow-2xl overflow-hidden p-4 sm:p-5 space-y-4 transition-all">
          {/* Top Quick Hide/Reveal Bar */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                {isSecretRevealed ? (roleInfo?.name || 'Carte de Rôle') : 'Carte Secrète'}
              </span>
            </div>

            <button
              onClick={() => setIsSecretRevealed(!isSecretRevealed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-950 border border-stone-700 hover:border-amber-400 text-stone-200 text-xs font-black transition-all active:scale-95 cursor-pointer shadow"
            >
              {isSecretRevealed ? (
                <>
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>Cacher</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Afficher</span>
                </>
              )}
            </button>
          </div>

          {/* Hidden View: Simple discreet lock screen */}
          {!isSecretRevealed ? (
            <div className="py-6 px-2 text-center space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-20 h-20 rounded-full bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-amber-500/20">
                👁️
              </div>

              <div className="space-y-2">
                <h2 className="font-serif font-black text-xl sm:text-2xl text-white">
                  Votre Rôle Secret
                </h2>

                <div className="bg-amber-950/60 border border-amber-500/60 rounded-xl p-3 text-amber-200 text-xs font-bold leading-relaxed shadow-inner max-w-xs mx-auto">
                  ⚠️ <span>Assure-toi que personne d’autre ne regarde ton téléphone !</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSecretRevealed(true)}
                id="btn-learn-role-player"
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] text-stone-950 font-black text-base shadow-xl shadow-amber-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Eye className="w-5 h-5 stroke-[2.5]" />
                <span>Dévoiler</span>
              </button>
            </div>
          ) : (
            /* Revealed View: Directly shows the official PNG card + Ready button */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
              {cardImageSrc && !cardImageError ? (
                <div className="w-full relative flex flex-col items-center">
                  <div 
                    onClick={() => setShowRoleCardModal(true)}
                    className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 bg-stone-950 max-w-[320px] w-full cursor-pointer hover:border-amber-400/60 transition-colors group"
                    title="Toucher pour agrandir"
                  >
                    <img
                      src={cardImageSrc}
                      alt={roleInfo?.name || 'Carte de rôle'}
                      className="w-full h-auto object-contain rounded-2xl select-none"
                      loading="eager"
                      onError={() => setCardImageError(true)}
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-stone-950/80 border border-stone-700 text-[10px] text-amber-300 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      <span>Agrandir</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fallback if image failed to load */
                <div className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center space-y-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isEvil ? 'bg-red-500 text-stone-950' : 'bg-sky-500 text-stone-950'
                    }`}
                  >
                    {roleInfo?.type} • {roleInfo?.team}
                  </span>
                  <h2 className="font-serif font-black text-2xl text-white">
                    {roleInfo?.name || 'Rôle Inconnu'}
                  </h2>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {roleInfo?.description}
                  </p>
                </div>
              )}

              {/* Ready Confirmation Section */}
              <div className="w-full space-y-2.5 pt-1">
                {isPlayerReady ? (
                  <div className="w-full py-3 px-4 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500/80 text-center space-y-1 shadow-xl">
                    <div className="flex items-center justify-center gap-2 font-black text-sm text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Je suis prêt(e)</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90">
                      Confirmé ! Le Conteur a reçu votre statut.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSetReady}
                    disabled={isMarkingReady}
                    id="btn-player-ready"
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] text-stone-950 font-black text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isMarkingReady ? (
                      <>
                        <span className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        <span>Confirmation...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        <span>Je suis prêt</span>
                      </>
                    )}
                  </button>
                )}

                {/* Hide Role Card Button */}
                <button
                  type="button"
                  onClick={() => setIsSecretRevealed(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>Cacher ma carte</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FULL-SCREEN ROLE CARD IMAGE VIEWER MODAL (Pinch-to-zoom / HD view)         */}
      {/* ========================================================================= */}
      {showRoleCardModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/98 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-in fade-in duration-200 select-none">
          {/* Top Bar with Role Info & Close */}
          <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-3 h-3 rounded-full shrink-0 ${isEvil ? 'bg-red-500' : 'bg-sky-400'}`} />
              <div className="truncate">
                <h3 className="font-serif font-black text-base sm:text-lg text-amber-200 truncate">
                  {roleInfo?.name || 'Votre Rôle'}
                </h3>
                <p className="text-[10px] sm:text-xs text-stone-400 font-medium truncate">
                  {roleInfo?.team} • {roleInfo?.type}
                </p>
              </div>
            </div>

            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowRoleCardModal(false)}
              className="p-2.5 rounded-2xl bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-200 hover:text-white transition-colors cursor-pointer shrink-0 shadow-lg"
              title="Fermer la carte"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Middle: Pinch-to-zoom / draggable PNG Card Container */}
          <div
            ref={modalContainerRef}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
            onWheel={handleModalWheel}
            className="relative w-full max-w-lg mx-auto flex-1 min-h-0 my-3 flex items-center justify-center overflow-hidden rounded-3xl bg-stone-950/80 border border-stone-800/90 cursor-grab active:cursor-grabbing"
          >
            {!cardImageLoading && cardImageSrc && !cardImageError ? (
              <div
                style={{
                  transform: `translate3d(${modalPosition.x}px, ${modalPosition.y}px, 0) scale(${modalScale})`,
                  transformOrigin: 'center center',
                  transition: initialTouchDistanceRef.current ? 'none' : 'transform 0.15s ease-out',
                }}
                className="relative w-full h-full flex items-center justify-center p-2 pointer-events-none"
              >
                <img
                  src={cardImageSrc}
                  alt={roleInfo?.name || 'Carte de Rôle'}
                  onError={() => setCardImageError(true)}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] pointer-events-auto"
                  draggable={false}
                />
              </div>
            ) : (
              /* Fallback if image not yet cached/found */
              <div className="p-6 text-center space-y-4 max-w-xs z-10 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-stone-900 border border-stone-700 flex items-center justify-center text-amber-400">
                  <ImageOff className="w-8 h-8 opacity-70" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-xl text-amber-200">
                    {roleInfo?.name}
                  </h3>
                  <p className="text-xs text-stone-400 mt-2">
                    {roleInfo?.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar (Zoom In, Zoom Out, Reset, Close) */}
          <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-2xl p-1 shadow-lg">
              <button
                type="button"
                onClick={() => setModalScale((prev) => Math.min(prev + 0.3, 4.5))}
                className="p-2 rounded-xl text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                title="Zoomer (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalScale((prev) => {
                    const next = Math.max(prev - 0.3, 1);
                    if (next <= 1.05) setModalPosition({ x: 0, y: 0 });
                    return next;
                  });
                }}
                className="p-2 rounded-xl text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                title="Dézoomer (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalScale(1);
                  setModalPosition({ x: 0, y: 0 });
                }}
                className="p-2 rounded-xl text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                title="Réinitialiser (100%)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowRoleCardModal(false)}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              Fermer la carte
            </button>
          </div>
        </div>
      )}

      {/* Rules / Reference Modal */}
      {showRulesTab && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setShowRulesTab(false)}
        >
          <div
            className="bg-stone-900 border-2 border-amber-500/40 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <h3 className="font-serif font-bold text-lg text-amber-300">
                  Règles & Objectifs • Sous Couverture
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesTab(false)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
                <strong className="text-blue-300 block mb-0.5 font-bold">Objectif de la Police (Forces de l'ordre) :</strong>
                <span>Incarcérer le Caïd du Gang ou neutraliser les membres influents pour faire triompher la loi.</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
                <strong className="text-red-300 block mb-0.5 font-bold">Objectif du Gang :</strong>
                <span>Démasquer et éliminer l'Agent sous couverture avant que le Caïd ne soit envoyé en prison.</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
                <strong className="text-amber-300 block mb-0.5 font-bold">Pendant la Nuit :</strong>
                <span>Tous les joueurs gardent les yeux fermés. Le Conteur appelle discrètement chaque rôle actif pour exécuter ses ordres secrets.</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
                <strong className="text-stone-200 block mb-0.5 font-bold">Pendant le Jour :</strong>
                <span>Échangez, bluffez et observez les réactions. À la fin du débat, le Gang organise un vote d'élimination.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesTab(false)}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Fermer l'aide
            </button>
          </div>
        </div>
      )}

      {/* Bottom status */}
      <footer className="max-w-md mx-auto w-full text-center space-y-2">
        <p className="text-[11px] text-stone-500">
          Connecté au salon <span className="font-mono text-amber-400 font-bold">{roomCode}</span> • Session sauvegardée
        </p>

        {onExitToStoryteller && (
          <button
            onClick={onExitToStoryteller}
            className="text-xs text-stone-400 hover:text-stone-200 underline"
          >
            ← Accéder au Grimoire du Conteur
          </button>
        )}
      </footer>
    </div>
  );
};
