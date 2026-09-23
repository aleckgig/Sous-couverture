import React, { useState, useEffect } from 'react';
import {
  Moon,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Shield,
  Sun,
  UserCheck,
  Eye,
  Check,
  X,
  Info,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import { NightStep, Player, RoleId, StructuredRole } from '../types';
import { ROLES } from '../data/roles';
import {
  getPickpocketForcesDeLOrdreCount,
  getInformantsCount,
  getPerturbateursCount,
} from '../utils/gameLogic';
import {
  canRecruitPrisoners,
  isCaidImmuneToPrison,
  canPrisonerInformantsParticipateInAvocate,
} from '../utils/rulesConfig';
import { RoleCardModal } from './RoleCardModal';
import { ValidationAlertModal } from './ValidationAlertModal';

interface NightAssistantProps {
  nightCount: number;
  steps: NightStep[];
  players: Player[];
  onUpdatePlayer: (player: Player) => void;
  onBatchUpdatePlayers?: (players: Player[]) => void;
  onFinishNight: (summary?: {
    imprisonedPlayerId?: string;
    recruitedPlayerId?: string;
    chimisteTargetId?: string;
    apprentiTargetId?: string;
    gardeTargetId?: string;
    avocateTargetId?: string;
  }) => void;
  lastDayExecutedPlayerId?: string;
  avocatPlaidoyerActive?: boolean;
}

export const NightAssistant: React.FC<NightAssistantProps> = ({
  nightCount,
  steps,
  players,
  onUpdatePlayer,
  onBatchUpdatePlayers,
  onFinishNight,
  lastDayExecutedPlayerId,
  avocatPlaidoyerActive,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    const saved = localStorage.getItem('sc_night_step_index');
    return saved ? Math.max(0, parseInt(saved, 10)) : 0;
  });

  // Turn-based night selections
  const [chimisteTargetId, setChimisteTargetId] = useState<string>('');
  const [apprentiTargetId, setApprentiTargetId] = useState<string>('');
  const [gardeTargetId, setGardeTargetId] = useState<string>('');
  const [avocateTargetId, setAvocateTargetId] = useState<string>('');
  
  // Agent choices
  const [agentActionType, setAgentActionType] = useState<'none' | 'recruit' | 'prison'>('none');
  const [agentTargetId, setAgentTargetId] = useState<string>('');
  const [recruitmentAcceptedTonight, setRecruitmentAcceptedTonight] = useState<boolean | null>(null);
  const [imprisonedPlayerId, setImprisonedPlayerId] = useState<string | undefined>(undefined);

  // Hacker choices
  const [hackerTargetOneId, setHackerTargetOneId] = useState<string>('');
  const [hackerTargetTwoId, setHackerTargetTwoId] = useState<string>('');

  // Nettoyeur / Role card inspect modal
  const [cardModalRoleId, setCardModalRoleId] = useState<string | null>(null);

  // Notice & Validation dialog
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    setCurrentStepIndex(0);
    setChimisteTargetId('');
    setApprentiTargetId('');
    setGardeTargetId('');
    setAgentActionType('none');
    setAgentTargetId('');
    setRecruitmentAcceptedTonight(null);
    setImprisonedPlayerId(undefined);
    setHackerTargetOneId('');
    setHackerTargetTwoId('');
    setNoticeMessage(null);
    localStorage.removeItem('sc_night_step_index');
  }, [nightCount]);

  useEffect(() => {
    localStorage.setItem('sc_night_step_index', currentStepIndex.toString());
    window.scrollTo({ top: 0, behavior: 'instant' });
    setNoticeMessage(null);
  }, [currentStepIndex]);

  const handleFinish = () => {
    localStorage.removeItem('sc_night_step_index');
    onFinishNight({
      imprisonedPlayerId,
      recruitedPlayerId: recruitmentAcceptedTonight ? agentTargetId : undefined,
      chimisteTargetId: chimisteTargetId || undefined,
      apprentiTargetId: apprentiTargetId || undefined,
      gardeTargetId: gardeTargetId || undefined,
      avocateTargetId: avocateTargetId || undefined,
    });
  };

  const currentStep = steps[currentStepIndex];
  const isFirstNight = nightCount === 1;
  const isLastStep = currentStepIndex >= steps.length - 1;

  if (!currentStep || steps.length === 0) {
    return (
      <div className="bg-stone-900 border-2 border-amber-500/50 p-6 sm:p-10 rounded-3xl text-center space-y-6 max-w-2xl mx-auto shadow-2xl animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-indigo-950 border border-indigo-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <Moon className="w-8 h-8 text-indigo-300 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-amber-200">
            Tous les rôles ont été appelés cette nuit !
          </h3>
          <p className="text-sm text-stone-300 font-medium">
            {isFirstNight
              ? 'La Première Nuit est terminée. Vous pouvez maintenant réveiller la ville.'
              : 'La Nuit est terminée. Vous pouvez appliquer les événements et lancer le Jour.'}
          </p>
        </div>

        <button
          onClick={handleFinish}
          id="btn-wake-city-final"
          className="w-full sm:w-auto px-10 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black shadow-2xl shadow-amber-950 flex flex-col items-center justify-center gap-1 mx-auto transition-all cursor-pointer border border-amber-300"
        >
          <span className="text-lg sm:text-xl font-black flex items-center justify-center gap-2 leading-none">
            <Sun className="w-6 h-6 text-stone-950" />
            <span>Réveiller la Ville</span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-stone-900/80 leading-none">
            (Lancer le Jour {nightCount})
          </span>
        </button>
      </div>
    );
  }

  const role = ROLES[currentStep.roleId];
  const actingPlayer = players.find(
    (p) => p.roleId === currentStep.roleId && p.isAlive && !p.isPrisoner
  );

  // Is the acting player affected by Chimiste falsification?
  const isImpairedByChimiste = Boolean(
    actingPlayer && chimisteTargetId && actingPlayer.id === chimisteTargetId
  );

  // Next / Previous helpers
  const handleNextStep = () => {
    // Validation des choix obligatoires
    if (currentStep.roleId === 'chimiste' && !chimisteTargetId) {
      setValidationModal({ isOpen: true, title: 'Cible du Chimiste requise', message: 'Sélectionnez le joueur que le Chimiste empoisonne.' });
      return;
    }
    if (currentStep.roleId === 'apprenti' && !apprentiTargetId) {
      setValidationModal({ isOpen: true, title: 'Cible de l’Apprenti requise', message: 'Sélectionnez le joueur que l’Apprenti doit suivre demain.' });
      return;
    }
    if (currentStep.roleId === 'avocat_vereux' && !avocateTargetId) {
      setValidationModal({ isOpen: true, title: 'Cible de l’Avocate requise', message: 'Sélectionnez le joueur à protéger contre la prison.' });
      return;
    }

    // Validation: Agent sous couverture
    if (currentStep.roleId === 'agent_sous_couverture') {
      if (agentActionType === 'recruit' && recruitmentAcceptedTonight === null) {
        setValidationModal({
          isOpen: true,
          title: 'Confirmation du Recrutement Requise',
          message:
            'Veuillez indiquer si le joueur ciblé a accepté ou refusé le recrutement avant de continuer.',
        });
        return;
      }
      if (agentActionType === 'prison' && !agentTargetId) {
        setValidationModal({
          isOpen: true,
          title: 'Cible d\'Arrestation Requise',
          message: 'Veuillez sélectionner le joueur à envoyer en prison ou choisir de passer.',
        });
        return;
      }
    }

    // Validation: Hacker
    if (currentStep.roleId === 'hacker') {
      if (!hackerTargetOneId || !hackerTargetTwoId) {
        setValidationModal({
          isOpen: true,
          title: 'Sélection du Hacker Requise',
          message:
            'Veuillez sélectionner les 2 joueurs désignés par le Hacker afin d\'obtenir la réponse exacte.',
        });
        return;
      }
    }

    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-150 text-stone-100">
      {/* Main Single-Screen Night Step Card */}
      <div className="bg-stone-900 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
        {/* Step Progress & Role Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-xl sm:text-2xl shadow shrink-0">
              {currentStep.roleId === 'agent_sous_couverture' ? (
                '👮🏻‍♂️'
              ) : (
                <Moon className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                  Nuit {nightCount} • Étape {currentStepIndex + 1}/{steps.length}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    role?.camp_initial === 'Forces de l\'ordre'
                      ? 'bg-blue-950 text-blue-300 border border-blue-500/50'
                      : 'bg-red-950 text-red-300 border border-red-500/50'
                  }`}
                >
                  {role?.camp_initial}
                </span>
                {role?.isPerturbateur && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/50">
                    Perturbateur
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                <h2 className="font-serif font-black text-xl sm:text-2xl md:text-3xl text-white tracking-wide leading-tight">
                  {currentStep.title}
                </h2>
                {actingPlayer && (
                  <span className="text-sm sm:text-base font-bold text-amber-300 bg-stone-950/90 px-2.5 py-0.5 rounded-xl border border-amber-500/30">
                    👤 {actingPlayer.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Storyteller Instructions Box */}
        <div className="bg-stone-950/95 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-lg space-y-2">
          <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2">
            <span className="text-base">📜</span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-400">
              CONSIGNE DU CONTEUR
            </span>
          </div>
          <p className="text-sm sm:text-base text-stone-100 font-medium leading-relaxed">
            {currentStep.instruction}
          </p>
          {currentStep.reminder && (
            <p className="text-xs text-amber-200/80 italic pt-1">
              💡 {currentStep.reminder}
            </p>
          )}
        </div>

        {/* Chimiste Poison/Falsification Warning */}
        {isImpairedByChimiste && (
          <div className="bg-red-950/80 border-2 border-red-500 rounded-2xl p-4 flex items-start gap-3 shadow-lg animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-red-200 uppercase tracking-wide">
                ⚠️ Information Falsifiée par le Chimiste !
              </h4>
              <p className="text-xs text-red-300 mt-1 leading-relaxed">
                Le Chimiste a ciblé ce joueur cette nuit. L'information que vous devez lui transmettre <strong>DOIT ÊTRE FAUSSE</strong> (mentez ou donnez un résultat erroné). Ne lui révélez pas qu'il a été altéré !
              </p>
            </div>
          </div>
        )}

        {/* --- STEP SPECIFIC ACTIONS --- */}
        <div className="space-y-4 pt-2">
          {/* 1. CHIMISTE */}
          {currentStep.roleId === 'chimiste' && (
            <div className="bg-stone-950 border border-purple-500/40 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wider block">
                🧪 Cible du Chimiste pour cette nuit :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players
                  .filter((p) => p.isAlive && !p.isPrisoner)
                  .map((p) => {
                    const isSelected = chimisteTargetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setChimisteTargetId(isSelected ? '' : p.id);
                          setNoticeMessage(
                            isSelected ? null : `L'information de ${p.name} sera faussée cette nuit.`
                          );
                        }}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-900 border-purple-400 text-purple-100 ring-2 ring-purple-400/40'
                            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2. APPRENTI */}
          {currentStep.roleId === 'apprenti' && (
            <div className="bg-stone-950 border border-sky-500/40 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-sky-300 uppercase tracking-wider block">
                🎯 Cible désignée par l'Apprenti (vote lié demain) :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players
                  .filter((p) => p.isAlive && !p.isPrisoner && p.id !== actingPlayer?.id)
                  .map((p) => {
                    const isSelected = apprentiTargetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setApprentiTargetId(isSelected ? '' : p.id);
                          setNoticeMessage(
                            isSelected ? null : `Demain, l'Apprenti devra voter comme ${p.name}.`
                          );
                        }}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-900 border-sky-400 text-sky-100 ring-2 ring-sky-400/40'
                            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 3. GARDE DU CORPS */}
          {currentStep.roleId === 'garde_du_corps' && (
            <div className="bg-stone-950 border border-amber-500/40 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                🛡️ Joueur protégé contre la prison cette nuit :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players
                  .filter((p) => p.isAlive && !p.isPrisoner && p.id !== actingPlayer?.id)
                  .map((p) => {
                    const isSelected = gardeTargetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setGardeTargetId(isSelected ? '' : p.id);
                          setNoticeMessage(
                            isSelected ? null : `${p.name} est protégé contre la prison cette nuit.`
                          );
                        }}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-900 border-amber-400 text-amber-100 ring-2 ring-amber-400/40'
                            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. AGENT SOUS COUVERTURE */}
          {currentStep.roleId === 'agent_sous_couverture' && (
            <div className="bg-stone-950 border-2 border-blue-500/60 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-300 uppercase tracking-wider">
                  🕵️ Choix de l'Agent sous couverture :
                </span>
                {isFirstNight && (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                    Prison désactivée (Nuit 1)
                  </span>
                )}
              </div>

              {/* Action type buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAgentActionType('recruit');
                    setAgentTargetId('');
                    setRecruitmentAcceptedTonight(null);
                  }}
                  className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    agentActionType === 'recruit'
                      ? 'bg-blue-900 border-blue-400 text-blue-100 ring-2 ring-blue-400/50'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <span className="text-base">🤝</span>
                  <span>Recruter un membre</span>
                </button>

                {!isFirstNight && (
                  <button
                    type="button"
                    onClick={() => {
                      setAgentActionType('prison');
                      setAgentTargetId('');
                      setRecruitmentAcceptedTonight(null);
                    }}
                    className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      agentActionType === 'prison'
                        ? 'bg-red-900 border-red-400 text-red-100 ring-2 ring-red-400/50'
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <span className="text-base">🚔</span>
                    <span>Envoyer en prison</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAgentActionType('none');
                    setAgentTargetId('');
                    setRecruitmentAcceptedTonight(null);
                  }}
                  className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    agentActionType === 'none'
                      ? 'bg-stone-800 border-stone-500 text-stone-100 ring-2 ring-stone-500/40'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className="text-base">🛑</span>
                  <span>Ne rien faire</span>
                </button>
              </div>

              {/* RECRUIT MODE */}
              {agentActionType === 'recruit' && (
                <div className="pt-2 border-t border-stone-800 space-y-3">
                  <span className="text-xs font-bold text-stone-300 block">
                    1. Sélectionner le membre du Gang à approcher :
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {players
                      .filter(
                        (p) =>
                          p.isAlive &&
                          !p.isPrisoner &&
                          p.currentTeam === 'Gang' &&
                          p.roleId !== 'agent_sous_couverture' &&
                          !p.isInformateur &&
                          getInformantsCount(players) < 2
                      )
                      .map((p) => {
                        const isSelected = agentTargetId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setAgentTargetId(p.id);
                              setRecruitmentAcceptedTonight(null);
                            }}
                            className={`p-2.5 rounded-xl font-bold text-xs text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-900 border-blue-400 text-blue-100 ring-2 ring-blue-400/40'
                                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <span className="truncate block font-bold">
                              {p.name}
                              {p.isPrisoner && (
                                <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                                  🚔 En cellule
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-stone-400 block font-normal">
                              {ROLES[p.roleId]?.nom}
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  {agentTargetId && (
                    <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 space-y-3 animate-in fade-in">
                      {/* Check if target is Homme de main */}
                      {players.find((p) => p.id === agentTargetId)?.roleId === 'homme_de_main' ? (
                        <div className="p-2.5 bg-amber-950/60 border border-amber-500 rounded-xl text-xs text-amber-200 space-y-1">
                          <p className="font-bold">⚠️ Règle spéciale de l'Homme de main :</p>
                          <p>
                            L'Homme de main ne peut <strong>JAMAIS</strong> accepter un recrutement. Il a l'obligation stricte de refuser !
                          </p>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-200">
                          2. Réponse secrète de {players.find((p) => p.id === agentTargetId)?.name} :
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRecruitmentAcceptedTonight(true);
                              const targetPlayer = players.find((p) => p.id === agentTargetId);
                              if (targetPlayer && !isImpairedByChimiste && targetPlayer.roleId !== 'homme_de_main' && getInformantsCount(players) < 2) {
                                onUpdatePlayer({
                                  ...targetPlayer,
                                  isInformateur: true,
                                  currentTeam: 'Forces de l\'ordre',
                                });
                              }
                            }}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              recruitmentAcceptedTonight === true
                                ? 'bg-emerald-900 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/50'
                                : 'bg-stone-950 border-stone-700 text-stone-300 hover:border-emerald-600'
                            }`}
                          >
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>✅ A accepté le recrutement</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRecruitmentAcceptedTonight(false);
                              const targetPlayer = players.find((p) => p.id === agentTargetId);
                              if (targetPlayer) {
                                onUpdatePlayer({
                                  ...targetPlayer,
                                  isInformateur: false,
                                  currentTeam: 'Gang',
                                });
                              }
                            }}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              recruitmentAcceptedTonight === false
                                ? 'bg-red-900 border-red-400 text-red-100 ring-2 ring-red-400/50'
                                : 'bg-stone-950 border-stone-700 text-stone-300 hover:border-red-600'
                            }`}
                          >
                            <X className="w-4 h-4 text-red-400" />
                            <span>❌ A refusé</span>
                          </button>
                        </div>
                      </div>

                      {recruitmentAcceptedTonight === true && (
                        <div className="p-2.5 bg-emerald-950/80 border border-emerald-500 rounded-xl text-xs text-emerald-200">
                          👮 <strong>Succès :</strong> Le joueur devient un <strong>Informateur</strong> (Forces de l'ordre) !{' '}
                          {players.find((p) => p.id === agentTargetId)?.isPrisoner
                            ? 'Accord en cellule réussi : le détenu a accepté de coopérer avec la police !'
                            : 'Montrez-lui secrètement l\'identité de l\'Agent sous couverture.'}
                        </div>
                      )}
                      {recruitmentAcceptedTonight === false && (
                        <div className="p-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-400">
                          Le joueur a refusé. Il reste membre du Gang. L'Agent ne peut plus rien faire cette nuit.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PRISON MODE */}
              {agentActionType === 'prison' && !isFirstNight && (
                <div className="pt-2 border-t border-stone-800 space-y-3">
                  <span className="text-xs font-bold text-stone-300 block">
                    Sélectionner le joueur à envoyer en prison :
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {players
                      .filter((p) => p.isAlive && !p.isPrisoner && p.roleId !== 'agent_sous_couverture')
                      .map((p) => {
                        const isSelected = agentTargetId === p.id;
                        const isProtected = gardeTargetId === p.id;
                        const isChauffeur = p.roleId === 'chauffeur';
                        const isCaid = p.roleId === 'caid';
                        const caidImmune = isCaid && isCaidImmuneToPrison();
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setAgentTargetId(p.id);
                              if (isImpairedByChimiste) {
                                setNoticeMessage(`⚠️ L'Agent est empoisonné : il croit que l'arrestation a fonctionné, mais elle échoue.`);
                                setImprisonedPlayerId(undefined);
                              } else if (isChauffeur) {
                                setNoticeMessage(`🛑 Le Chauffeur (${p.name}) est immunisé contre la prison ! L'arrestation échoue.`);
                                setImprisonedPlayerId(undefined);
                              } else if (caidImmune) {
                                setNoticeMessage(`🛑 Le Caïd (${p.name}) bénéficie d'une immunité totale selon vos règles d'arbitrage ! L'arrestation échoue.`);
                                setImprisonedPlayerId(undefined);
                              } else if (isProtected) {
                                setNoticeMessage(`🛑 ${p.name} a été protégé par le Garde du corps cette nuit ! L'arrestation échoue.`);
                                setImprisonedPlayerId(undefined);
                              } else {
                                setNoticeMessage(`👮 ${p.name} est envoyé en prison.`);
                                setImprisonedPlayerId(p.id);
                                onUpdatePlayer({ ...p, isPrisoner: true });
                              }
                            }}
                            className={`p-2.5 rounded-xl font-bold text-xs text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-900 border-red-400 text-red-100 ring-2 ring-red-400/40'
                                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <span className="truncate block font-bold">{p.name}</span>
                            <span className="text-[10px] text-stone-400 block font-normal">
                              {ROLES[p.roleId]?.nom}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. L'AVOCATE */}
          {currentStep.roleId === 'avocat_vereux' && (
            <div className="bg-stone-950 border border-blue-500/40 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-blue-300 uppercase tracking-wider block">
                🛡️ Protection contre la prison
              </span>
              <p className="text-xs text-stone-300">
                Choisissez 1 joueur. Cette personne ne pourra pas être envoyée en prison cette nuit.
              </p>
              <select
                value={avocateTargetId}
                onChange={(e) => {
                  setAvocateTargetId(e.target.value);
                  const target = players.find(p => p.id === e.target.value);
                  if (target) setNoticeMessage(`${target.name} est protégé contre la prison cette nuit.`);
                }}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-sm text-white"
              >
                <option value="">— Choisir un joueur —</option>
                {players.filter(p => p.isAlive && !p.isPrisoner && p.id !== actingPlayer?.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {ROLES[p.roleId]?.nom}</option>
                ))}
              </select>
              {avocateTargetId && (
                <div className="text-xs text-blue-200 bg-blue-950/60 border border-blue-500/40 rounded-xl p-3">
                  {players.find(p => p.id === avocateTargetId)?.name} sera protégé contre la prison.
                  {isImpairedByChimiste && ' ⚠️ Mais l’Avocate est empoisonnée : sa protection échouera.'}
                </div>
              )}
            </div>
          )}

          {/* 6. HACKER */}
          {currentStep.roleId === 'hacker' && (
            <div className="bg-stone-950 border border-indigo-500/50 rounded-2xl p-4 space-y-4">
              <span className="text-xs font-black text-indigo-300 uppercase tracking-wider block">
                💻 Sélectionner les 2 joueurs désignés par le Hacker :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players
                  .filter((p) => p.isAlive && !p.isPrisoner && p.id !== actingPlayer?.id)
                  .map((p) => {
                    const is1 = hackerTargetOneId === p.id;
                    const is2 = hackerTargetTwoId === p.id;
                    const isSelected = is1 || is2;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (is1) setHackerTargetOneId('');
                          else if (is2) setHackerTargetTwoId('');
                          else if (!hackerTargetOneId) setHackerTargetOneId(p.id);
                          else if (!hackerTargetTwoId) setHackerTargetTwoId(p.id);
                        }}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-900 border-indigo-400 text-indigo-100 ring-2 ring-indigo-400/40'
                            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-black">
                            {is1 ? '1' : '2'}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              {hackerTargetOneId && hackerTargetTwoId && (
                <div className="pt-2 border-t border-stone-800">
                  {(() => {
                    const p1 = players.find((p) => p.id === hackerTargetOneId);
                    const p2 = players.find((p) => p.id === hackerTargetTwoId);
                    const hasAgentOrFaussePiste =
                      p1?.roleId === 'agent_sous_couverture' ||
                      p1?.isFaussePiste ||
                      p2?.roleId === 'agent_sous_couverture' ||
                      p2?.isFaussePiste;

                    const finalResponse = isImpairedByChimiste
                      ? !hasAgentOrFaussePiste
                      : hasAgentOrFaussePiste;

                    return (
                      <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex items-center justify-between gap-3 shadow">
                        <div>
                          <span className="text-xs text-stone-400 block">
                            Signe de tête à faire au Hacker :
                          </span>
                          <span
                            className={`text-2xl font-serif font-black ${
                              finalResponse ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {finalResponse ? 'OUI (de la tête)' : 'NON (de la tête)'}
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-stone-400">
                          <span>{p1?.name} & {p2?.name}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* 7. NETTOYEUR (CARTE DU DERNIER EXÉCUTÉ) */}
          {currentStep.roleId === 'nettoyeur' && (
            <div className="bg-stone-950 border border-stone-700 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-stone-300 uppercase tracking-wider block">
                🧹 Dernier joueur exécuté le jour précédent :
              </span>
              {lastDayExecutedPlayerId ? (
                (() => {
                  const execPlayer = players.find((p) => p.id === lastDayExecutedPlayerId);
                  const execRole = execPlayer ? ROLES[execPlayer.roleId] : undefined;
                  return (
                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-bold text-white block">
                          {execPlayer?.name}
                        </span>
                        <span className="text-xs text-amber-400 block font-serif">
                          {execRole ? `${execRole.nom} (${execRole.camp_initial})` : 'Inconnu'}
                        </span>
                      </div>
                      {execRole && (
                        <button
                          type="button"
                          onClick={() => setCardModalRoleId(execRole.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Montrer la carte</span>
                        </button>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-stone-900 p-3.5 rounded-xl text-stone-400 text-xs italic">
                  Aucun joueur n'a été exécuté le jour précédent. Faites un signe négatif de la tête au Nettoyeur.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notice Message */}
        {noticeMessage && (
          <div className="p-3 bg-stone-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-medium flex items-center justify-between gap-2 shadow">
            <span>{noticeMessage}</span>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal / Card Zoom trigger */}
        {cardModalRoleId && (
          <RoleCardModal
            roleId={cardModalRoleId}
            onClose={() => setCardModalRoleId(null)}
          />
        )}

        {/* Validation Error Alert Modal */}
        <ValidationAlertModal
          isOpen={validationModal.isOpen}
          title={validationModal.title}
          message={validationModal.message}
          onClose={() => setValidationModal({ isOpen: false, message: '' })}
        />

        {/* Navigation Step Buttons */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="px-3 sm:px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Précédent</span>
          </button>

          <div className="flex items-center gap-2 text-center">
            <span className="text-xs text-stone-400 font-mono">
              {currentStepIndex + 1} / {steps.length}
            </span>
            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  handleFinish();
                } else {
                  setCurrentStepIndex((prev) => prev + 1);
                }
              }}
              className="text-[11px] text-stone-400 hover:text-amber-300 underline font-medium px-2 py-1 cursor-pointer"
              title="Passer à l'étape suivante sans forcer d'action"
            >
              Passer
            </button>
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            id="btn-next-night-step"
            className="px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <span>{isLastStep ? 'Terminer la Nuit' : 'Suivant'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
