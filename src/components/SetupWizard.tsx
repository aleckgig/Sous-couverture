import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
  AlertTriangle,
  QrCode,
  Smartphone,
  Copy,
  UserCheck,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  X,
  UserPlus,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Image as ImageIcon,
  Shield,
  BookOpen,
  Sliders,
  Search,
  ArrowLeftRight,
  Pencil,
  Move,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Player, RoleId, StructuredRole } from '../types';
import { ALL_ROLES_LIST, ROLES } from '../data/roles';
import { RoleCardModal } from './RoleCardModal';
import { ValidationAlertModal } from './ValidationAlertModal';
import { ImageManagerModal } from './ImageManagerModal';
import { RulesValidationModal } from './RulesValidationModal';
import {
  generateBalancedSousCouvertureRoles,
  getRecommendedGangComposition,
} from '../utils/gameLogic';

interface SetupWizardProps {
  onCompleteSetup: (
    players: Player[],
    bluffs: RoleId[],
    faussePistePlayerId: string,
    drunkPerceivedRoleId?: RoleId,
    roomInfo?: { code: string; storytellerName: string; mode: 'physical' | 'phone' }
  ) => void;
}

const ROSTER_STORAGE_KEY = 'sous_couverture_roster';

interface ConnectedPlayer {
  id: string;
  name: string;
  seatNumber?: number;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onCompleteSetup }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [gameMode, setGameMode] = useState<'physical' | 'phone'>('physical');
  const [storytellerName, setStorytellerName] = useState<string>(() => {
    return localStorage.getItem('sc_storyteller_name') || 'Conteur';
  });

  const [physicalPlayers, setPhysicalPlayers] = useState<string[]>(() => {
    const saved = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return ['Alex', 'Sam', 'Jordan', 'Camille', 'Morgan', 'Maxime'];
  });

  const [newPlayerInput, setNewPlayerInput] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [roomCode, setRoomCode] = useState<string>(() => {
    return localStorage.getItem('sc_room_code') || '';
  });
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const activePlayersList = gameMode === 'phone' ? connectedPlayers.map((p) => p.name) : physicalPlayers;
  const activeCount = Math.max(1, activePlayersList.length);

  const [playerRoleMap, setPlayerRoleMap] = useState<Record<number, RoleId>>({});
  const [step2LayoutMode, setStep2LayoutMode] = useState<'circle' | 'grid'>('circle');

  const [rolePickerSeatIndex, setRolePickerSeatIndex] = useState<number | null>(null);
  const [rolePickerSearch, setRolePickerSearch] = useState<string>('');
  const [rolePickerCategory, setRolePickerCategory] = useState<'all' | 'gang' | 'perturbateur' | 'police'>('all');
  const [previewCardRoleId, setPreviewCardRoleId] = useState<RoleId | null>(null);

  // Drag & drop state for swapping seats/roles at the table
  const [draggedSeatIndex, setDraggedSeatIndex] = useState<number | null>(null);
  const [dragOverSeatIndex, setDragOverSeatIndex] = useState<number | null>(null);
  const [swapActiveSeatIndex, setSwapActiveSeatIndex] = useState<number | null>(null);
  const [floatingTouchPos, setFloatingTouchPos] = useState<{ x: number; y: number } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; seatIdx: number } | null>(null);
  const isTouchDraggingRef = useRef<boolean>(false);

  const [faussePisteSeatIndex, setFaussePisteSeatIndex] = useState<number>(0);
  const [junkiePerceivedRoleId, setJunkiePerceivedRoleId] = useState<RoleId | ''>('');
  const [agentBluffRoleId, setAgentBluffRoleId] = useState<RoleId | ''>('');
  const [localRoleImages, setLocalRoleImages] = useState<Record<string, string>>({});

  const [isImageManagerOpen, setIsImageManagerOpen] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    message: '',
  });

  // Load the same custom role-card images used by RoleCardModal.
  // This keeps the table view visually tied to the actual cards without editing the artwork.
  useEffect(() => {
    let active = true;
    getAllLocalRoleImages().then((items) => {
      if (!active) return;
      const next: Record<string, string> = {};
      items.forEach((item) => {
        next[item.roleId.toLowerCase().trim()] = item.dataUrl;
      });
      setLocalRoleImages(next);
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-save physical roster
  useEffect(() => {
    if (physicalPlayers.length > 0) {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(physicalPlayers));
    }
  }, [physicalPlayers]);

  const handleCreateRoom = async (forcedCode?: string) => {
    const sName = storytellerName.trim() || 'Conteur';
    setIsCreatingRoom(true);
    try {
      localStorage.setItem('sc_storyteller_name', sName);
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storytellerName: sName,
          targetPlayerCount: 20,
          mode: 'phone',
          customCode: forcedCode || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setRoomCode(data.code);
        localStorage.setItem('sc_room_code', data.code);
        if (data.room && Array.isArray(data.room.players)) {
          setConnectedPlayers(data.room.players);
        }
      }
    } catch (e) {
      const fallbackCode = forcedCode ? forcedCode.trim().toUpperCase() : `GANG-${Math.floor(1000 + Math.random() * 9000)}`;
      setRoomCode(fallbackCode);
      localStorage.setItem('sc_room_code', fallbackCode);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  useEffect(() => {
    if (!roomCode || gameMode !== 'phone') return;

    let isMounted = true;
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/room/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.players)) {
            setConnectedPlayers(data.players);
          }
        }
      } catch (err) {
        // ignore
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomCode, gameMode]);

  const handleProceedToRoleAssignments = () => {
    const count = activePlayersList.length;
    if (count < 5) {
      setValidationModal({
        isOpen: true,
        title: 'Nombre de Joueurs Insuffisant',
        message: `Sous Couverture nécessite au moins 5 joueurs (actuellement ${count}). Veuillez ajouter au moins ${
          5 - count
        } joueur(s) supplémentaire(s).`,
      });
      return;
    }

    const balancedRoles = generateBalancedSousCouvertureRoles(count);
    const newMap: Record<number, RoleId> = {};
    balancedRoles.forEach((roleId, idx) => {
      newMap[idx] = roleId;
    });

    setPlayerRoleMap(newMap);
    setCurrentStep(2);
  };

  const handleRegenerateRandomBalanced = () => {
    const count = activePlayersList.length;
    const balancedRoles = generateBalancedSousCouvertureRoles(count);
    const newMap: Record<number, RoleId> = {};
    balancedRoles.forEach((roleId, idx) => {
      newMap[idx] = roleId;
    });
    setPlayerRoleMap(newMap);
  };

  const handleSelectRoleForPlayer = (targetSeatIndex: number, newRoleId: RoleId) => {
    const currentRoleId = playerRoleMap[targetSeatIndex];
    if (currentRoleId === newRoleId) {
      setRolePickerSeatIndex(null);
      return;
    }

    const existingOtherSeatEntry = Object.entries(playerRoleMap).find(
      ([sIdx, rId]) => Number(sIdx) !== targetSeatIndex && rId === newRoleId
    );

    if (existingOtherSeatEntry) {
      const existingSeatIndex = Number(existingOtherSeatEntry[0]);

      // Selecting an already-used role swaps the two players' roles.
      // This preserves the rule that each actual role exists only once.
      setPlayerRoleMap((prev) => ({
        ...prev,
        [targetSeatIndex]: newRoleId,
        [existingSeatIndex]: currentRoleId,
      }));

      setRolePickerSeatIndex(null);
      return;
    }

    setPlayerRoleMap((prev) => ({ ...prev, [targetSeatIndex]: newRoleId }));

    setRolePickerSeatIndex(null);
  };

  // Swap seats & roles between two players (Drag and drop or tap swap)
  const handleSwapSeats = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx || sourceIdx < 0 || targetIdx < 0) return;

    setPlayerRoleMap((prev) => {
      const roleSource = prev[sourceIdx];
      const roleTarget = prev[targetIdx];
      const updated = { ...prev };
      if (roleSource !== undefined && roleTarget !== undefined) {
        updated[targetIdx] = roleSource;
        updated[sourceIdx] = roleTarget;
      } else if (roleSource !== undefined) {
        updated[targetIdx] = roleSource;
        delete updated[sourceIdx];
      } else if (roleTarget !== undefined) {
        updated[sourceIdx] = roleTarget;
        delete updated[targetIdx];
      }
      return updated;
    });

    setFaussePisteSeatIndex((prev) => {
      if (prev === sourceIdx) return targetIdx;
      if (prev === targetIdx) return sourceIdx;
      return prev;
    });

    setSwapActiveSeatIndex(null);
  };

  // Toggle seat selection for 1-tap swap via the drag icon
  const handleToggleSwapSeat = (seatIdx: number) => {
    if (swapActiveSeatIndex === null) {
      setSwapActiveSeatIndex(seatIdx);
    } else if (swapActiveSeatIndex === seatIdx) {
      setSwapActiveSeatIndex(null);
    } else {
      handleSwapSeats(swapActiveSeatIndex, seatIdx);
    }
  };

  // Touch drag handlers for mobile devices
  const handleSeatTouchStart = (seatIdx: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, seatIdx };
    isTouchDraggingRef.current = false;
  };

  const handleSeatTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;

    // Trigger drag mode after a small movement threshold
    if (Math.hypot(dx, dy) > 8) {
      if (e.cancelable) {
        e.preventDefault();
      }
      isTouchDraggingRef.current = true;
      setDraggedSeatIndex(touchStartPosRef.current.seatIdx);
      setFloatingTouchPos({ x: touch.clientX, y: touch.clientY });

      // Find seat beneath the finger (ignoring floating follower via pointer-events-none)
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const seatElem = elem?.closest('[data-seat-index]');
      if (seatElem) {
        const overIdx = Number(seatElem.getAttribute('data-seat-index'));
        if (!isNaN(overIdx) && overIdx !== touchStartPosRef.current.seatIdx) {
          setDragOverSeatIndex(overIdx);
        } else {
          setDragOverSeatIndex(null);
        }
      } else {
        setDragOverSeatIndex(null);
      }
    }
  };

  const handleSeatTouchEnd = () => {
    if (
      isTouchDraggingRef.current &&
      touchStartPosRef.current &&
      dragOverSeatIndex !== null &&
      dragOverSeatIndex !== touchStartPosRef.current.seatIdx
    ) {
      handleSwapSeats(touchStartPosRef.current.seatIdx, dragOverSeatIndex);
    }
    touchStartPosRef.current = null;
    isTouchDraggingRef.current = false;
    setDraggedSeatIndex(null);
    setDragOverSeatIndex(null);
    setFloatingTouchPos(null);
  };

  const handleSeatTouchCancel = () => {
    touchStartPosRef.current = null;
    isTouchDraggingRef.current = false;
    setDraggedSeatIndex(null);
    setDragOverSeatIndex(null);
    setFloatingTouchPos(null);
  };

  // Helper for role ordering requested by user:
  // 1. Agent sous couverture (Forces de l'ordre)
  // 2. Membres du gang normaux (camp_initial === 'Gang' && !isPerturbateur)
  // 3. Perturbateurs (isPerturbateur === true)
  const getRoleCategoryRank = (role: StructuredRole): number => {
    if (role.id === 'agent_sous_couverture' || role.camp_initial === "Forces de l'ordre") {
      return 1;
    }
    if (!role.isPerturbateur && role.camp_initial === 'Gang') {
      return 2;
    }
    return 3;
  };

  const sortedRolesList = [...ALL_ROLES_LIST].sort((a, b) => {
    const rankA = getRoleCategoryRank(a);
    const rankB = getRoleCategoryRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return a.nom.localeCompare(b.nom, 'fr');
  });

  const countPolice = ALL_ROLES_LIST.filter(
    (r) => r.id === 'agent_sous_couverture' || r.camp_initial === "Forces de l'ordre"
  ).length;
  const countGang = ALL_ROLES_LIST.filter((r) => r.camp_initial === 'Gang' && !r.isPerturbateur).length;
  const countPerturbateur = ALL_ROLES_LIST.filter((r) => r.isPerturbateur).length;

  const filteredRolesList = sortedRolesList.filter((r) => {
    if (rolePickerCategory === 'police') {
      if (r.id !== 'agent_sous_couverture' && r.camp_initial !== "Forces de l'ordre") return false;
    } else if (rolePickerCategory === 'gang') {
      if (r.camp_initial !== 'Gang' || r.isPerturbateur) return false;
    } else if (rolePickerCategory === 'perturbateur') {
      if (!r.isPerturbateur) return false;
    }

    if (rolePickerSearch.trim()) {
      const q = rolePickerSearch.toLowerCase().trim();
      const matchNom = r.nom.toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      const matchType = (r.type_de_pouvoir || '').toLowerCase().includes(q);
      if (!matchNom && !matchDesc && !matchType) return false;
    }

    return true;
  });

  const handleProceedToSecrets = () => {
    const totalPlayers = activePlayersList.length;
    const assignedKeys = Object.keys(playerRoleMap);
    if (assignedKeys.length < totalPlayers) {
      setValidationModal({
        isOpen: true,
        title: 'Attribution Incomplète',
        message: 'Chaque joueur autour de la table doit avoir un rôle attribué avant de continuer.',
      });
      return;
    }

    const assignedRolesList = Object.values(playerRoleMap) as RoleId[];
    if (!assignedRolesList.includes('agent_sous_couverture')) {
      setValidationModal({
        isOpen: true,
        title: "Agent sous couverture manquant",
        message: "La partie doit obligatoirement comporter exactement 1 rôle d'Agent sous couverture !",
      });
      return;
    }

    setCurrentStep(3);
  };

  const handleAddPlayer = () => {
    const trimmed = newPlayerInput.trim();
    if (!trimmed) return;
    setPhysicalPlayers((prev) => [...prev, trimmed]);
    setNewPlayerInput('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRemovePlayer = (idxToRemove: number) => {
    setPhysicalPlayers((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    if (editingIndex === idxToRemove) {
      setEditingIndex(null);
    }
  };

  const handleSaveEditPlayer = (idx: number) => {
    if (!editingNameValue.trim()) {
      handleRemovePlayer(idx);
    } else {
      setPhysicalPlayers((prev) => {
        const copy = [...prev];
        copy[idx] = editingNameValue.trim();
        return copy;
      });
    }
    setEditingIndex(null);
  };

  const getJoinUrl = () => {
    const origin = window.location.origin;
    return `${origin}/?room=${roomCode}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getJoinUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const junkieSeatIndex = Object.entries(playerRoleMap).find(([, roleId]) => roleId === 'junkie')?.[0];
  const agentSeatIndex = Object.entries(playerRoleMap).find(([, roleId]) => roleId === 'agent_sous_couverture')?.[0];
  const assignedRoleIds = new Set(Object.values(playerRoleMap) as RoleId[]);
  const junkieRoleOptions = Object.values(ROLES).filter(
    (r) => r.id !== 'junkie' && !assignedRoleIds.has(r.id)
  );
  const agentBluffRoleOptions = Object.values(ROLES).filter(
    (r) => !assignedRoleIds.has(r.id)
  );

  useEffect(() => {
    if (junkieSeatIndex === undefined) {
      setJunkiePerceivedRoleId('');
    }
  }, [junkieSeatIndex]);

  const handleLaunchGame = async () => {
    const hasJunkie = Object.values(playerRoleMap).includes('junkie');
    const assignedRolesList = Object.values(playerRoleMap) as RoleId[];
    const duplicateRoles = assignedRolesList.filter((roleId, index) => assignedRolesList.indexOf(roleId) !== index);
    if (duplicateRoles.length > 0) {
      const duplicateNames = Array.from(new Set(duplicateRoles)).map((roleId) => ROLES[roleId]?.nom ?? roleId).join(', ');
      setValidationModal({
        isOpen: true,
        title: 'Rôles en double',
        message: `Impossible de lancer la partie : les rôles suivants sont sélectionnés plus d’une fois : ${duplicateNames}.`,
      });
      return;
    }

    if (hasJunkie && !junkiePerceivedRoleId) {
      setValidationModal({
        isOpen: true,
        title: 'Fausse carte du Junkie requise',
        message: 'Choisissez la carte de rôle que le Junkie recevra et croira être son rôle.',
      });
      return;
    }

    if (agentSeatIndex !== undefined && !agentBluffRoleId) {
      setValidationModal({
        isOpen: true,
        title: 'Fausse carte de l’Agent requise',
        message: 'Choisissez la carte de rôle que l’Agent sous couverture recevra comme bluff pour la première nuit.',
      });
      return;
    }

    if (agentSeatIndex !== undefined && assignedRolesList.includes(agentBluffRoleId as RoleId)) {
      setValidationModal({
        isOpen: true,
        title: 'Rôle déjà sélectionné',
        message: `${ROLES[agentBluffRoleId as RoleId]?.nom ?? agentBluffRoleId} est déjà utilisé dans cette partie. La fausse carte de l’Agent doit être un rôle non sélectionné.`,
      });
      return;
    }

    if (hasJunkie && assignedRolesList.includes(junkiePerceivedRoleId as RoleId)) {
      setValidationModal({
        isOpen: true,
        title: 'Rôle déjà sélectionné',
        message: `${ROLES[junkiePerceivedRoleId as RoleId]?.nom ?? junkiePerceivedRoleId} est déjà utilisé dans cette partie. La fausse carte du Junkie doit être un rôle non sélectionné.`,
      });
      return;
    }

    let finalPlayers: Player[] = [];

    if (gameMode === 'phone') {
      finalPlayers = connectedPlayers.map((cp, idx) => {
        const rId = playerRoleMap[idx] || 'guetteur';
        return {
          id: cp.id,
          name: cp.name,
          seatNumber: idx + 1,
          roleId: rId,
          isAlive: true,
          isPrisoner: false,
          isInformateur: false,
          currentTeam: rId === 'agent_sous_couverture' ? "Forces de l'ordre" : 'Gang',
          isProtected: false,
          isFaussePiste: idx === faussePisteSeatIndex,
          ...(rId === 'junkie' && junkiePerceivedRoleId ? { perceivedRoleId: junkiePerceivedRoleId } : {}),
          ...(rId === 'agent_sous_couverture' && agentBluffRoleId ? { agentBluffRoleId } : {}),
        };
      });
    } else {
      finalPlayers = physicalPlayers.map((name, idx) => {
        const assignedRole = playerRoleMap[idx] || 'guetteur';
        return {
          id: `player-${idx + 1}-${Date.now()}`,
          name: name.trim() || `Joueur ${idx + 1}`,
          seatNumber: idx + 1,
          roleId: assignedRole,
          isAlive: true,
          isPrisoner: false,
          isInformateur: false,
          currentTeam: assignedRole === 'agent_sous_couverture' ? "Forces de l'ordre" : 'Gang',
          isProtected: false,
          isFaussePiste: idx === faussePisteSeatIndex,
          ...(assignedRole === 'junkie' && junkiePerceivedRoleId ? { perceivedRoleId: junkiePerceivedRoleId } : {}),
          ...(assignedRole === 'agent_sous_couverture' && agentBluffRoleId ? { agentBluffRoleId } : {}),
        };
      });
    }

    const redHerringPlayerId = finalPlayers[faussePisteSeatIndex]?.id || finalPlayers[0]?.id || '';

    onCompleteSetup(
      finalPlayers,
      [],
      redHerringPlayerId,
      junkiePerceivedRoleId || undefined,
      { code: roomCode, storytellerName, mode: gameMode }
    );
  };

  // STEP 0: WELCOME & MODE SELECTION
  if (currentStep === 0) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-[70vh] px-4 py-4 space-y-6 animate-in fade-in select-none text-stone-100">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl mx-auto shadow-xl">
            🕵️‍♂️
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-amber-300 tracking-wide">
            Sous Couverture
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Application compagnon officielle pour le jeu de déduction du crime organisé.
          </p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setGameMode('physical')}
            className={`py-4 sm:py-5 px-3 rounded-2xl border-2 font-serif font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center text-center ${
              gameMode === 'physical'
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-400/30'
                : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            Cartes physiques
          </button>

          <button
            type="button"
            onClick={() => setGameMode('phone')}
            className={`py-4 sm:py-5 px-3 rounded-2xl border-2 font-serif font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center text-center ${
              gameMode === 'phone'
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-400/30'
                : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            Codes QR / Mobiles
          </button>
        </div>

        {/* Action button to open image manager directly */}
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() => setIsImageManagerOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Illustrations des cartes</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Règles d'arbitrage</span>
          </button>
        </div>

        <div className="w-full pt-2">
          <button
            type="button"
            onClick={async () => {
              if (gameMode === 'phone' && !roomCode) {
                await handleCreateRoom();
              }
              setCurrentStep(1);
            }}
            disabled={isCreatingRoom}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-black text-base shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Configurer la Table</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {isImageManagerOpen && <ImageManagerModal onClose={() => setIsImageManagerOpen(false)} />}
        {isRulesModalOpen && <RulesValidationModal onClose={() => setIsRulesModalOpen(false)} />}
      </div>
    );
  }

  // STEP 1: PLAYERS INPUT / ROOM
  if (currentStep === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in text-stone-100">
        <div className="bg-[#f4efe4] border border-stone-300 rounded-3xl p-3 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
                Étape 1 / 3
              </span>
              <h2 className="font-serif font-black text-xl text-stone-900">
                {gameMode === 'phone' ? 'Salle Connectée par QR Code' : 'Enregistrement des Joueurs'}
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-stone-950 border border-amber-500/40 text-amber-300 font-black text-xs">
              {activePlayersList.length} Joueurs
            </span>
          </div>

          {gameMode === 'phone' ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex flex-col items-center">
                <QRCodeSVG value={getJoinUrl()} size={160} bgColor="#0c0a09" fgColor="#f59e0b" />
                <span className="text-xs text-stone-400 mt-2 font-mono">Code : {roomCode}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-stone-800 text-xs text-stone-300 hover:text-white font-bold cursor-pointer"
                >
                  {copiedLink ? 'Lien copié !' : 'Copier le lien pour mobile'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {connectedPlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-left"
                  >
                    <span className="font-bold text-xs text-white block truncate">{p.name}</span>
                    <span className="text-[10px] text-amber-400">Siège #{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newPlayerInput}
                  onChange={(e) => setNewPlayerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  placeholder="Nom du joueur..."
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddPlayer}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow"
                >
                  Ajouter
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {physicalPlayers.map((name, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between gap-2"
                  >
                    {editingIndex === idx ? (
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onBlur={() => handleSaveEditPlayer(idx)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditPlayer(idx)}
                        autoFocus
                        className="bg-stone-900 border border-amber-500 rounded-lg px-2 py-1 text-xs text-white outline-none w-full"
                      />
                    ) : (
                      <span className="font-bold text-xs text-white truncate">
                        #{idx + 1} {name}
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingNameValue(name);
                        }}
                        className="p-1 text-stone-400 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(idx)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold cursor-pointer"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={handleProceedToRoleAssignments}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span>Attribution des Rôles</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ValidationAlertModal
          isOpen={validationModal.isOpen}
          title={validationModal.title}
          message={validationModal.message}
          onClose={() => setValidationModal({ isOpen: false, message: '' })}
        />
      </div>
    );
  }

  // STEP 2: ROLE ASSIGNMENT
  if (currentStep === 2) {
    const isHackerSelected = Object.values(playerRoleMap).includes('hacker');

    return (
      <div className="max-w-4xl mx-auto space-y-3 animate-in fade-in text-stone-800">
        <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 pb-2">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-stone-500">
                Étape 2 / 3
              </span>
              <h2 className="font-serif font-black text-xl text-white">
                Attribution des Rôles autour de la Table
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Déterminez qui est assis à côté de qui autour de la table pour les pouvoirs de voisinage.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Layout switcher */}
              <div className="flex items-center gap-1 bg-[#e8e0d2] p-1 rounded-xl border border-stone-300 text-xs">
                <button
                  type="button"
                  onClick={() => setStep2LayoutMode('circle')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    step2LayoutMode === 'circle'
                      ? 'bg-[#d8c8ad] text-stone-900 font-black shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Table Ronde
                </button>
                <button
                  type="button"
                  onClick={() => setStep2LayoutMode('grid')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    step2LayoutMode === 'grid'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Grille
                </button>
              </div>

              <button
                type="button"
                onClick={handleRegenerateRandomBalanced}
                className="px-3 py-1.5 rounded-xl bg-[#eee6d8] border border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1 hover:bg-white cursor-pointer"
                title="Générer une répartition aléatoire équilibrée"
              >
                <span>Rééquilibrer</span>
              </button>
            </div>
          </div>

          {/* Active Swap Selection Banner */}
          {swapActiveSeatIndex !== null && (
            <div className="flex items-center justify-between bg-[#ebe2d3] border border-stone-400 rounded-2xl px-3.5 py-2.5 text-stone-700 shadow-sm animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold min-w-0">
                <Move className="w-4 h-4 text-stone-600 shrink-0" />
                <span className="truncate">
                  Échange activé pour <strong className="text-stone-900">#{swapActiveSeatIndex + 1} {activePlayersList[swapActiveSeatIndex]}</strong> : touchez un autre siège pour échanger.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSwapActiveSeatIndex(null)}
                className="px-2.5 py-1 rounded-xl bg-white border border-stone-300 text-xs font-black text-stone-700 hover:text-stone-950 cursor-pointer ml-2 shrink-0"
              >
                Annuler
              </button>
            </div>
          )}

          {/* CIRCLE LAYOUT: Around the table */}
          {step2LayoutMode === 'circle' ? (
            <div
              className="relative w-full aspect-square max-w-[560px] mx-auto my-1 rounded-[2rem] border border-stone-300 shadow-sm overflow-visible bg-[#e9dfcf]"
            >
              {/* Table Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#f4efe4] border border-stone-400 shadow-inner flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[10px] sm:text-xs text-stone-800 font-serif font-black uppercase tracking-wider">
                    Table de jeu
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-stone-500 mt-1">
                    {activePlayersList.length} joueurs
                  </span>
                </div>
              </div>

              {/* Role cards snapped around the table. The artwork itself stays untouched;
                  only the player/camp bubbles are layered over it. */}
              <div className="relative w-full h-full">
                {activePlayersList.map((playerName, seatIdx) => {
                  const total = activePlayersList.length;
                  const angle = (seatIdx / total) * 2 * Math.PI - Math.PI / 2;
                  const rx = total > 12 ? 40 : 41;
                  const ry = total > 12 ? 39 : 41;
                  const x = 50 + rx * Math.cos(angle);
                  const y = 50 + ry * Math.sin(angle);

                  const assignedRoleId = playerRoleMap[seatIdx] || 'guetteur';
                  const roleInfo = ROLES[assignedRoleId];
                  const isAgent = assignedRoleId === 'agent_sous_couverture';
                  const isFaussePisteThisSeat = isHackerSelected && seatIdx === faussePisteSeatIndex;
                  const isDragged = draggedSeatIndex === seatIdx;
                  const isDragTarget =
                    dragOverSeatIndex === seatIdx &&
                    draggedSeatIndex !== null &&
                    draggedSeatIndex !== seatIdx;
                  const isSwapSource = swapActiveSeatIndex === seatIdx;
                  const cardImageUrl = localRoleImages[assignedRoleId.toLowerCase()] || getRoleCardImageUrl(assignedRoleId);

                  const campLabel = isAgent
                    ? "AGENT"
                    : roleInfo?.isPerturbateur
                    ? "PERTURBATEUR"
                    : "GANG";

                  const campClasses = isAgent
                    ? "bg-[#9db5b8]/95 text-stone-900 border-[#718f93]"
                    : roleInfo?.isPerturbateur
                    ? "bg-[#b59bc5]/95 text-stone-900 border-[#9277a5]"
                    : "bg-[#a8a39a]/95 text-stone-900 border-[#817c73]";

                  return (
                    <div
                      key={seatIdx}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute ${
                        isDragTarget || isSwapSource ? 'z-40 scale-110' : 'z-20 hover:z-30'
                      } transition-all`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        data-seat-index={seatIdx}
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedSeatIndex(seatIdx);
                          e.dataTransfer.setData('text/plain', String(seatIdx));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverSeatIndex !== seatIdx) {
                            setDragOverSeatIndex(seatIdx);
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDragOverSeatIndex(seatIdx);
                        }}
                        onDragLeave={() => {
                          if (dragOverSeatIndex === seatIdx) {
                            setDragOverSeatIndex(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceIdx =
                            draggedSeatIndex ?? Number(e.dataTransfer.getData('text/plain'));
                          if (!isNaN(sourceIdx)) {
                            handleSwapSeats(sourceIdx, seatIdx);
                          }
                          setDraggedSeatIndex(null);
                          setDragOverSeatIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedSeatIndex(null);
                          setDragOverSeatIndex(null);
                        }}
                        onTouchStart={(e) => handleSeatTouchStart(seatIdx, e)}
                        onTouchMove={handleSeatTouchMove}
                        onTouchEnd={handleSeatTouchEnd}
                        onTouchCancel={handleSeatTouchCancel}
                        onClick={() => {
                          if (!isTouchDraggingRef.current) {
                            if (swapActiveSeatIndex !== null) {
                              if (swapActiveSeatIndex === seatIdx) {
                                setSwapActiveSeatIndex(null);
                              } else {
                                handleSwapSeats(swapActiveSeatIndex, seatIdx);
                              }
                            } else {
                              setRolePickerSearch('');
                              setRolePickerCategory('all');
                              setRolePickerSeatIndex(seatIdx);
                            }
                          }
                        }}
                        className={`group relative touch-none cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
                          total > 12
                            ? 'w-[58px] xs:w-[64px] sm:w-[82px] md:w-[92px]'
                            : 'w-[68px] xs:w-[74px] sm:w-[92px] md:w-[104px]'
                        } ${
                          isDragged
                            ? 'opacity-30 scale-95'
                            : isSwapSource
                            ? 'ring-4 ring-stone-500 rounded-2xl animate-pulse'
                            : isDragTarget
                            ? 'ring-4 ring-amber-400 rounded-2xl'
                            : 'hover:scale-105'
                        }`}
                      >
                        {/* Player name bubble — does not modify the role-card image */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%+20px)]">
                          <div className="px-2.5 py-1 rounded-full bg-[#f4efe4] border border-stone-400 text-stone-900 text-[9px] sm:text-[10px] font-black leading-none whitespace-nowrap shadow-lg truncate max-w-[120px]">
                            {playerName}
                          </div>
                        </div>

                        {/* The real role card image: role + power stay entirely inside the image */}
                        <div className="relative w-full aspect-[2/3] flex items-center justify-center">
                          {cardImageUrl ? (
                            <img
                              src={cardImageUrl}
                              alt={roleInfo?.nom || assignedRoleId}
                              draggable={false}
                              className="w-full h-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] rounded-2xl bg-[#e9dfcf] border border-stone-300 flex items-center justify-center p-2 text-center">
                              <span className="text-[9px] font-bold text-stone-300">
                                {roleInfo?.nom || assignedRoleId}
                              </span>
                            </div>
                          )}

                          {isFaussePisteThisSeat && (
                            <span
                              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#d8c8ad] text-stone-900 flex items-center justify-center text-[11px] font-black border-2 border-[#f4efe4] shadow-lg"
                              title="Fausse Piste (Hacker en jeu)"
                            >
                              🎯
                            </span>
                          )}
                        </div>

                        {/* Camp bubble — one glance, without duplicating role/power text */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[7.5px] sm:text-[8px] font-black tracking-wide shadow-lg whitespace-nowrap ${campClasses}`}
                          >
                            {campLabel}
                          </span>
                        </div>

                        {/* Tiny swap handle, kept outside the artwork */}
                        <button
                          type="button"
                          title="Glisser-déposer ou toucher pour échanger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSwapSeat(seatIdx);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            handleSeatTouchStart(seatIdx, e);
                          }}
                          onTouchMove={handleSeatTouchMove}
                          onTouchEnd={handleSeatTouchEnd}
                          onTouchCancel={handleSeatTouchCancel}
                          className={`absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border shadow-lg flex items-center justify-center cursor-grab touch-none transition-colors ${
                            isSwapSource
                              ? 'bg-amber-400 text-stone-950 border-amber-200'
                              : 'bg-stone-950/95 text-stone-300 border-stone-600 hover:text-amber-300 hover:border-amber-400'
                          }`}
                        >
                          <Move className="w-3 h-3" />
                        </button>

                        {isDragTarget && (
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-amber-500 text-stone-950 font-black text-[8px] shadow-lg whitespace-nowrap z-50">
                            ⇄ Échanger
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* GRID OF SEATED PLAYERS */
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {activePlayersList.map((playerName, seatIdx) => {
                const assignedRoleId = playerRoleMap[seatIdx] || 'guetteur';
                const roleInfo = ROLES[assignedRoleId];
                const isAgent = assignedRoleId === 'agent_sous_couverture';
                const isFaussePisteThisSeat = isHackerSelected && seatIdx === faussePisteSeatIndex;
                const isDragged = draggedSeatIndex === seatIdx;
                const isDragTarget =
                  dragOverSeatIndex === seatIdx &&
                  draggedSeatIndex !== null &&
                  draggedSeatIndex !== seatIdx;
                const isSwapSource = swapActiveSeatIndex === seatIdx;

                return (
                  <div
                    key={seatIdx}
                    data-seat-index={seatIdx}
                    draggable={true}
                    onDragStart={(e) => {
                      setDraggedSeatIndex(seatIdx);
                      e.dataTransfer.setData('text/plain', String(seatIdx));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverSeatIndex !== seatIdx) {
                        setDragOverSeatIndex(seatIdx);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverSeatIndex(seatIdx);
                    }}
                    onDragLeave={() => {
                      if (dragOverSeatIndex === seatIdx) {
                        setDragOverSeatIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceIdx =
                        draggedSeatIndex ?? Number(e.dataTransfer.getData('text/plain'));
                      if (!isNaN(sourceIdx)) {
                        handleSwapSeats(sourceIdx, seatIdx);
                      }
                      setDraggedSeatIndex(null);
                      setDragOverSeatIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedSeatIndex(null);
                      setDragOverSeatIndex(null);
                    }}
                    onTouchStart={(e) => handleSeatTouchStart(seatIdx, e)}
                    onTouchMove={handleSeatTouchMove}
                    onTouchEnd={handleSeatTouchEnd}
                    onTouchCancel={handleSeatTouchCancel}
                    onClick={() => {
                      if (!isTouchDraggingRef.current) {
                        if (swapActiveSeatIndex !== null) {
                          if (swapActiveSeatIndex === seatIdx) {
                            setSwapActiveSeatIndex(null);
                          } else {
                            handleSwapSeats(swapActiveSeatIndex, seatIdx);
                          }
                        } else {
                          setRolePickerSearch('');
                          setRolePickerCategory('all');
                          setRolePickerSeatIndex(seatIdx);
                        }
                      }
                    }}
                    className={`relative p-3.5 rounded-2xl border-2 text-left cursor-grab active:cursor-grabbing transition-all select-none shadow-md touch-none ${
                      isDragged
                        ? 'opacity-30 scale-95 border-dashed border-amber-400 ring-2 ring-amber-400/60'
                        : isSwapSource
                        ? 'scale-105 ring-4 ring-amber-400 border-amber-400 bg-amber-950 animate-pulse'
                        : isDragTarget
                        ? 'scale-105 ring-4 ring-amber-400 bg-amber-950 border-amber-400'
                        : 'bg-stone-900 border-stone-800 text-stone-200 hover:border-stone-700 hover:scale-102'
                    }`}
                  >
                    {isDragTarget && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] shadow-lg whitespace-nowrap z-50">
                        ⇄ Échanger
                      </div>
                    )}
                    {isSwapSource && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] shadow-lg whitespace-nowrap z-50 animate-bounce">
                        ⇄ En cours
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-stone-400">
                        Siège #{seatIdx + 1}
                      </span>
                      {isFaussePisteThisSeat && (
                        <span className="text-xs" title="Fausse Piste (Hacker en jeu)">
                          🎯
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 truncate">
                      <span className="font-bold text-sm text-white truncate block">
                        {playerName}
                      </span>
                    </div>

                    <div className="text-xs font-bold truncate mt-1 text-stone-300">
                      {roleInfo?.nom || assignedRoleId}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-800">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          isAgent
                            ? 'bg-blue-900/90 text-blue-200 border border-blue-700/60'
                            : roleInfo?.isPerturbateur
                            ? 'bg-purple-900/90 text-purple-200 border border-purple-700/60'
                            : 'bg-red-900/80 text-red-200 border border-red-700/60'
                        }`}
                      >
                        {isAgent
                          ? "Forces de l'ordre"
                          : roleInfo?.isPerturbateur
                          ? 'Perturbateur'
                          : 'Gang'}
                      </span>

                      {/* Action buttons: Pencil and Move */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Modifier le rôle (Crayon)"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (swapActiveSeatIndex !== null) {
                              handleSwapSeats(swapActiveSeatIndex, seatIdx);
                            } else {
                              setRolePickerSearch('');
                              setRolePickerCategory('all');
                              setRolePickerSeatIndex(seatIdx);
                            }
                          }}
                          className="p-1 rounded-md hover:bg-stone-800 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Glisser-déposer ou toucher pour échanger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSwapSeat(seatIdx);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            handleSeatTouchStart(seatIdx, e);
                          }}
                          onTouchMove={handleSeatTouchMove}
                          onTouchEnd={handleSeatTouchEnd}
                          onTouchCancel={handleSeatTouchCancel}
                          className={`p-1 rounded-md transition-colors cursor-grab active:cursor-grabbing touch-none ${
                            isSwapSource
                              ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300'
                              : 'hover:bg-stone-800 text-stone-400 hover:text-amber-300'
                          }`}
                        >
                          <Move className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold cursor-pointer"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={handleProceedToSecrets}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span>Configurations Spéciales</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating follower element while dragging on touch/mobile */}
        {draggedSeatIndex !== null && floatingTouchPos !== null && (
          <div
            className="fixed pointer-events-none z-[99999] -translate-x-1/2 -translate-y-1/2 w-28 p-2.5 rounded-2xl border-2 border-amber-400 bg-stone-950/95 text-stone-100 shadow-2xl backdrop-blur-md ring-4 ring-amber-400/50 select-none scale-105"
            style={{
              left: `${floatingTouchPos.x}px`,
              top: `${floatingTouchPos.y}px`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-amber-400">
                #{draggedSeatIndex + 1}
              </span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-stone-950">
                ⇄ Échanger
              </span>
            </div>
            <div className="font-bold text-xs text-white truncate mt-1">
              {activePlayersList[draggedSeatIndex]}
            </div>
            <div className="text-[10px] font-bold text-amber-300 truncate">
              {ROLES[playerRoleMap[draggedSeatIndex]]?.nom || playerRoleMap[draggedSeatIndex]}
            </div>
          </div>
        )}

        {/* Role Picker Modal */}
        {rolePickerSeatIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={() => setRolePickerSeatIndex(null)}
          >
            <div
              className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl max-w-xl w-full p-4 sm:p-5 space-y-3.5 text-stone-100 shadow-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">
                      Changement de Rôle
                    </span>
                    <span className="text-[10px] text-stone-500">•</span>
                    <span className="text-[10px] font-mono text-stone-400">
                      Siège #{rolePickerSeatIndex + 1}
                    </span>
                  </div>
                  <h3 className="font-serif font-black text-lg sm:text-xl text-white truncate">
                    {activePlayersList[rolePickerSeatIndex]}
                  </h3>
                  <p className="text-xs text-stone-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>Rôle actuel :</span>
                    <strong className="text-amber-300 font-bold">
                      {ROLES[playerRoleMap[rolePickerSeatIndex]]?.nom || 'Inconnu'}
                    </strong>
                    {playerRoleMap[rolePickerSeatIndex] === 'agent_sous_couverture' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-900/90 text-blue-200 border border-blue-700/60 shadow uppercase tracking-wide">
                        Forces de l'ordre
                      </span>
                    ) : ROLES[playerRoleMap[rolePickerSeatIndex]]?.isPerturbateur ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-900/90 text-purple-200 border border-purple-700/60 shadow uppercase tracking-wide">
                        Perturbateur
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRolePickerSeatIndex(null)}
                  className="p-2 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white cursor-pointer shrink-0 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={rolePickerSearch}
                  onChange={(e) => setRolePickerSearch(e.target.value)}
                  placeholder="Rechercher un rôle, pouvoir, mot-clé..."
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-stone-500 outline-none transition-colors"
                />
                {rolePickerSearch && (
                  <button
                    type="button"
                    onClick={() => setRolePickerSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filters: All, Police (Agent), Gang normaux, Perturbateurs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setRolePickerCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    rolePickerCategory === 'all'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Tous ({ALL_ROLES_LIST.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRolePickerCategory('police')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    rolePickerCategory === 'police'
                      ? 'bg-blue-600 text-white font-black shadow'
                      : 'bg-stone-950 border border-stone-800 text-blue-400 hover:bg-blue-950/30'
                  }`}
                >
                  <span>Forces de l'ordre</span>
                  <span className="text-[10px] opacity-80">({countPolice})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRolePickerCategory('gang')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    rolePickerCategory === 'gang'
                      ? 'bg-red-600 text-white font-black shadow'
                      : 'bg-stone-950 border border-stone-800 text-red-400 hover:bg-red-950/30'
                  }`}
                >
                  <span>Gang normaux</span>
                  <span className="text-[10px] opacity-80">({countGang})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRolePickerCategory('perturbateur')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    rolePickerCategory === 'perturbateur'
                      ? 'bg-purple-600 text-white font-black shadow'
                      : 'bg-stone-950 border border-stone-800 text-purple-400 hover:bg-purple-950/30'
                  }`}
                >
                  <span>Perturbateurs</span>
                  <span className="text-[10px] opacity-80">({countPerturbateur})</span>
                </button>
              </div>

              {/* Roles List ordered as requested: Agent, Gang normaux, Perturbateurs */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
                {filteredRolesList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-500">
                    Aucun rôle ne correspond à cette recherche.
                  </div>
                ) : (
                  filteredRolesList.map((r) => {
                    const isCurrent = playerRoleMap[rolePickerSeatIndex] === r.id;
                    const isAgent = r.id === 'agent_sous_couverture';
                    const assignedToOtherSeat = Object.entries(playerRoleMap).find(
                      ([sIdx, rId]) => Number(sIdx) !== rolePickerSeatIndex && rId === r.id
                    );
                    const otherSeatName = assignedToOtherSeat
                      ? activePlayersList[Number(assignedToOtherSeat[0])]
                      : null;

                    let cardClasses = '';
                    if (isCurrent) {
                      cardClasses =
                        'bg-amber-500/20 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-lg text-white';
                    } else {
                      cardClasses =
                        'bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-200';
                    }

                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRoleForPlayer(rolePickerSeatIndex, r.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${cardClasses}`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-white">
                                {r.nom}
                              </span>

                              {/* Category Badge */}
                              {isAgent ? (
                                <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-blue-900/90 text-blue-200 border border-blue-700/60 uppercase tracking-wide">
                                  Forces de l'ordre
                                </span>
                              ) : r.isPerturbateur ? (
                                <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 border border-purple-700/60 uppercase tracking-wide">
                                  Perturbateur
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-700/60 uppercase tracking-wide">
                                  Gang
                                </span>
                              )}

                              {isCurrent && (
                                <span className="text-[8.5px] font-black px-2 py-0.5 rounded-full bg-emerald-900/90 text-emerald-200 border border-emerald-500/40">
                                  ✓ Ce joueur
                                </span>
                              )}
                            </div>

                            <p className="text-[10.5px] text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                              {r.description}
                            </p>

                            {otherSeatName && (
                              <span className="text-[9px] text-amber-400 font-bold block mt-1">
                                ⇄ Échangera avec {otherSeatName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 1-click View Role Card button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewCardRoleId(r.id);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400 text-stone-300 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                            title="Voir la carte de rôle en 1 clic"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px]">Carte</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <ValidationAlertModal
          isOpen={validationModal.isOpen}
          title={validationModal.title}
          message={validationModal.message}
          onClose={() => setValidationModal({ isOpen: false, message: '' })}
        />

        {previewCardRoleId && (
          <RoleCardModal
            roleId={previewCardRoleId}
            onClose={() => setPreviewCardRoleId(null)}
          />
        )}
      </div>
    );
  }

  // STEP 3: STORYTELLER SECRETS & LAUNCH
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in text-stone-100">
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-stone-800 pb-3">
          <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
            Étape 3 / 3
          </span>
          <h2 className="font-serif font-black text-xl text-white">
            Configurations Spéciales & Lancement
          </h2>
        </div>

        {/* Junkie false-role card */}
        {junkieSeatIndex !== undefined && (
          <div className="bg-purple-950/30 p-4 rounded-2xl border border-purple-500/30 space-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-black text-purple-300">
                Configuration du Junkie
              </div>
              <p className="text-xs text-stone-400 mt-1">
                <strong className="text-stone-200">Rôle réel : Le Junkie.</strong> La carte ci-dessous est la fausse carte qu’il recevra et croira sincèrement être son rôle.
              </p>
            </div>
            <select
              value={junkiePerceivedRoleId}
              onChange={(e) => setJunkiePerceivedRoleId(e.target.value as RoleId)}
              className="w-full bg-stone-900 border border-purple-400/40 rounded-xl px-3 py-3 text-sm text-white outline-none"
            >
              <option value="">Choisir la fausse carte…</option>
              {junkieRoleOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>
            {junkiePerceivedRoleId && (
              <button
                type="button"
                onClick={() => setPreviewCardRoleId(junkiePerceivedRoleId)}
                className="w-full py-3 rounded-xl bg-stone-900 border border-purple-400/40 text-purple-200 font-black text-xs"
              >
                Voir la carte à montrer au Junkie
              </button>
            )}
          </div>
        )}

        {/* Agent sous couverture bluff card */}
        {agentSeatIndex !== undefined && (
          <div className="bg-blue-950/30 p-4 rounded-2xl border border-blue-500/30 space-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-black text-blue-300">
                Configuration de l’Agent sous couverture
              </div>
              <p className="text-xs text-stone-400 mt-1">
                <strong className="text-stone-200">Carte réelle : Agent sous couverture.</strong> Choisissez une fausse carte qu’il recevra à son réveil lors de la première nuit pour connaître ses pouvoirs et pouvoir bluffer avec ce rôle. Les pouvoirs de cette carte ne sont jamais actifs dans la partie.
              </p>
            </div>
            <select
              value={agentBluffRoleId}
              onChange={(e) => setAgentBluffRoleId(e.target.value as RoleId)}
              className="w-full bg-stone-900 border border-blue-400/40 rounded-xl px-3 py-3 text-sm text-white outline-none"
            >
              <option value="">Choisir la fausse carte…</option>
              {agentBluffRoleOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>
            {agentBluffRoleId && (
              <button
                type="button"
                onClick={() => setPreviewCardRoleId(agentBluffRoleId)}
                className="w-full py-3 rounded-xl bg-stone-900 border border-blue-400/40 text-blue-200 font-black text-xs"
              >
                Voir la carte à montrer à l’Agent
              </button>
            )}
          </div>
        )}

        {/* Fausse Piste selector */}
        <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="font-bold text-xs text-amber-300">
              Fausse Piste (Signal trompeur pour l'Enquêteur)
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Ce joueur renverra un faux signal lors des investigations policières nocturnes.
          </p>
          <select
            value={faussePisteSeatIndex}
            onChange={(e) => setFaussePisteSeatIndex(Number(e.target.value))}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            {activePlayersList.map((pName, idx) => (
              <option key={idx} value={idx}>
                {pName} ({ROLES[playerRoleMap[idx]]?.nom})
              </option>
            ))}
          </select>
        </div>

        {/* Buttons for Images and Rules modals */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsImageManagerOpen(true)}
            className="p-3 bg-stone-950 hover:bg-stone-800 border border-amber-500/40 rounded-2xl text-xs text-amber-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Gérer les Cartes</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="p-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-2xl text-xs text-stone-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Règles d'Arbitrage</span>
          </button>
        </div>

        <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold cursor-pointer"
          >
            ← Retour
          </button>
          <button
            type="button"
            onClick={handleLaunchGame}
            id="btn-launch-game"
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-black text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-amber-950/60"
          >
            <span>Lancer la Partie (Nuit 1)</span>
          </button>
        </div>
      </div>

      {isImageManagerOpen && <ImageManagerModal onClose={() => setIsImageManagerOpen(false)} />}
      {isRulesModalOpen && <RulesValidationModal onClose={() => setIsRulesModalOpen(false)} />}
    </div>
  );
};
