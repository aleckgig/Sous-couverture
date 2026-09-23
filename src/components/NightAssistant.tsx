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
import { PlayerSelect } from './PlayerSelect';
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
    <div className="h-full flex flex-col animate-in fade-in duration-150 text-stone-900">
      {/* Main Single-Screen Night Step Card */}
      <div className="h-full min-h-0 flex flex-col bg-transparent space-y-2">
        {/* Step Progress & Role Badge */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-stone-200 pb-2 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow shrink-0">
              {currentStep.roleId === 'agent_sous_couverture' ? (
                '👮🏻‍♂️'
              ) : (
                <Moon className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
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
                <h2 className="font-black text-lg text-stone-900 tracking-tight leading-tight">
                  {currentStep.title}
                </h2>
                {actingPlayer && (
                  <span className="text-xs font-bold text-stone-600 bg-white px-2 py-1 rounded-lg border border-stone-200">
                    👤 {actingPlayer.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Storyteller Instructions Box */}
        <div className="shrink-0 bg-white border border-stone-200 rounded-2xl p-3 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-1.5">
            <span className="text-base">📜</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              CONSIGNE DU CONTEUR
            </span>
          </div>
          <p className="text-sm text-stone-800 font-semibold leading-snug">
            {currentStep.instruction}
          </p>
          {currentStep.reminder && (
            <p className="text-[11px] text-stone-500 italic pt-1">
              💡 {currentStep.reminder}
            </p>
          )}
        </div>

        {/* Chimiste Poison/Falsification Warning */}
        {isImpairedByChimiste && (
          <div className="shrink-0 bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[11px] font-black text-red-800 uppercase tracking-wide">
                ⚠️ Information Falsifiée par le Chimiste !
              </h4>
              <p className="text-[10px] text-red-700 mt-0.5 leading-snug">
                Le Chimiste a ciblé ce joueur cette nuit. L'information que vous devez lui transmettre <strong>DOIT ÊTRE FAUSSE</strong> (mentez ou donnez un résultat erroné). Ne lui révélez pas qu'il a été altéré !
              </p>
            </div>
          </div>
        )}

        {/* --- STEP SPECIFIC ACTIONS --- */}
        <div className="flex-1 min-h-0 overflow-y-auto py-1 space-y-2 overscroll-contain">
          {/* ACTIONS COMPACTES — une décision à la fois */}
          {currentStep.roleId === 'chimiste' && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-purple-700">Cible du Chimiste</div>
              <PlayerSelect
                value={chimisteTargetId}
                onChange={(id) => {
                  setChimisteTargetId(id);
                  const target = players.find((p) => p.id === id);
                  setNoticeMessage(target ? `Les informations de ${target.name} seront faussées cette nuit.` : null);
                }}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                placeholder="Choisir un joueur…"
                accent="purple"
              />
            </div>
          )}

          {currentStep.roleId === 'apprenti' && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-sky-700">Joueur que l’Apprenti doit suivre demain</div>
              <PlayerSelect
                value={apprentiTargetId}
                onChange={(id) => {
                  setApprentiTargetId(id);
                  const target = players.find((p) => p.id === id);
                  setNoticeMessage(target ? `L’Apprenti devra voter comme ${target.name} demain.` : null);
                }}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur…"
                accent="blue"
              />
            </div>
          )}

          {currentStep.roleId === 'agent_sous_couverture' && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center justify-between gap-2">
                <span>Action de l’Agent</span>
                {isFirstNight && <span className="text-[9px] normal-case tracking-normal bg-white border border-blue-200 rounded-full px-2 py-1">Nuit 1 : recrutement seulement</span>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => {
                  setAgentActionType('recruit');
                  setAgentTargetId('');
                  setRecruitmentAcceptedTonight(null);
                }} className={`py-2.5 rounded-xl border text-xs font-black transition ${agentActionType === 'recruit' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-stone-700 border-blue-200'}`}>
                  Recruter
                </button>
                {!isFirstNight ? (
                  <button type="button" onClick={() => {
                    setAgentActionType('prison');
                    setAgentTargetId('');
                    setRecruitmentAcceptedTonight(null);
                  }} className={`py-2.5 rounded-xl border text-xs font-black transition ${agentActionType === 'prison' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-stone-700 border-blue-200'}`}>
                    Envoyer en prison
                  </button>
                ) : (
                  <button type="button" onClick={() => {
                    setAgentActionType('none');
                    setAgentTargetId('');
                    setRecruitmentAcceptedTonight(null);
                  }} className={`py-2.5 rounded-xl border text-xs font-black transition ${agentActionType === 'none' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-700 border-blue-200'}`}>
                    Ne rien faire
                  </button>
                )}
              </div>

              {agentActionType === 'recruit' && (
                <div className="space-y-2">
                  <PlayerSelect
                    value={agentTargetId}
                    onChange={(id) => {
                      setAgentTargetId(id);
                      setRecruitmentAcceptedTonight(null);
                    }}
                    players={players.filter((p) =>
                      p.isAlive &&
                      !p.isPrisoner &&
                      p.currentTeam === 'Gang' &&
                      !p.isInformateur &&
                      p.roleId !== 'agent_sous_couverture' &&
                      getInformantsCount(players) < 2
                    )}
                    placeholder={getInformantsCount(players) >= 2 ? 'Maximum de 2 Informateurs atteint' : 'Choisir un membre du Gang…'}
                    accent="blue"
                  />
                  {agentTargetId && (
                    <div className="rounded-xl bg-white border border-blue-100 p-3 space-y-2">
                      {players.find((p) => p.id === agentTargetId)?.roleId === 'homme_de_main' && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                          Homme de main : refus obligatoire.
                        </div>
                      )}
                      <div className="text-[11px] font-bold text-stone-600">Réponse secrète du joueur</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => {
                          setRecruitmentAcceptedTonight(true);
                          const targetPlayer = players.find((p) => p.id === agentTargetId);
                          if (targetPlayer && !isImpairedByChimiste && targetPlayer.roleId !== 'homme_de_main' && getInformantsCount(players) < 2) {
                            onUpdatePlayer({ ...targetPlayer, isInformateur: true, currentTeam: 'Forces de l\'ordre' });
                          }
                        }} className={`py-2.5 rounded-xl border text-xs font-black ${recruitmentAcceptedTonight === true ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-700 border-emerald-200'}`}>
                          A accepté
                        </button>
                        <button type="button" onClick={() => {
                          setRecruitmentAcceptedTonight(false);
                          const targetPlayer = players.find((p) => p.id === agentTargetId);
                          if (targetPlayer) onUpdatePlayer({ ...targetPlayer, isInformateur: false, currentTeam: 'Gang' });
                        }} className={`py-2.5 rounded-xl border text-xs font-black ${recruitmentAcceptedTonight === false ? 'bg-red-700 text-white border-red-700' : 'bg-white text-red-700 border-red-200'}`}>
                          A refusé
                        </button>
                      </div>
                      {recruitmentAcceptedTonight === true && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                          Recrutement accepté. Montrez secrètement l’identité de l’Agent au joueur.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {agentActionType === 'prison' && !isFirstNight && (
                <PlayerSelect
                  value={agentTargetId}
                  onChange={(id) => {
                    setAgentTargetId(id);
                    const target = players.find((p) => p.id === id);
                    if (!target) {
                      setImprisonedPlayerId(undefined);
                      return;
                    }
                    const isProtected = gardeTargetId === target.id;
                    if (isImpairedByChimiste) {
                      setNoticeMessage('L’Agent est empoisonné : il croit que l’arrestation réussit, mais elle échoue.');
                      setImprisonedPlayerId(undefined);
                    } else if (target.roleId === 'chauffeur') {
                      setNoticeMessage(`Le Chauffeur (${target.name}) est immunisé contre la prison.`);
                      setImprisonedPlayerId(undefined);
                    } else if (isProtected) {
                      setNoticeMessage(`${target.name} est protégé cette nuit.`);
                      setImprisonedPlayerId(undefined);
                    } else {
                      setNoticeMessage(`${target.name} sera envoyé en prison.`);
                      setImprisonedPlayerId(target.id);
                    }
                  }}
                  players={players.filter((p) => p.isAlive && !p.isPrisoner && p.roleId !== 'agent_sous_couverture' && !p.isInformateur)}
                  placeholder="Choisir un joueur à envoyer en prison…"
                  accent="red"
                />
              )}

              {agentActionType === 'none' && (
                <div className="text-xs text-stone-500 bg-white/70 rounded-xl p-2.5 border border-blue-100">
                  Aucune action cette nuit.
                </div>
              )}
            </div>
          )}

          {currentStep.roleId === 'avocat_vereux' && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-blue-700">Protection contre la prison</div>
              <PlayerSelect
                value={avocateTargetId}
                onChange={(id) => {
                  setAvocateTargetId(id);
                  const target = players.find((p) => p.id === id);
                  setNoticeMessage(target ? `${target.name} est protégé contre la prison cette nuit.` : null);
                }}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur à protéger…"
                accent="blue"
              />
              {avocateTargetId && isImpairedByChimiste && (
                <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                  L’Avocate est empoisonnée : sa protection échouera.
                </div>
              )}
            </div>
          )}

          {currentStep.roleId === 'hacker' && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-indigo-700">Deux joueurs désignés par le Hacker</div>
              <div className="grid grid-cols-2 gap-2">
                <PlayerSelect
                  value={hackerTargetOneId}
                  onChange={(id) => {
                    setHackerTargetOneId(id);
                    if (id === hackerTargetTwoId) setHackerTargetTwoId('');
                  }}
                  players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                  excludePlayerId={actingPlayer?.id}
                  placeholder="1er joueur…"
                  accent="purple"
                />
                <PlayerSelect
                  value={hackerTargetTwoId}
                  onChange={(id) => setHackerTargetTwoId(id)}
                  players={players.filter((p) => p.isAlive && !p.isPrisoner && p.id !== hackerTargetOneId)}
                  excludePlayerId={actingPlayer?.id}
                  placeholder="2e joueur…"
                  accent="purple"
                />
              </div>
              {hackerTargetOneId && hackerTargetTwoId && (
                <div className="rounded-xl bg-white border border-indigo-100 p-3 flex items-center justify-between gap-3">
                  {(() => {
                    const p1 = players.find((p) => p.id === hackerTargetOneId);
                    const p2 = players.find((p) => p.id === hackerTargetTwoId);
                    const hasAgentOrFaussePiste = Boolean(
                      p1?.roleId === 'agent_sous_couverture' || p1?.isFaussePiste ||
                      p2?.roleId === 'agent_sous_couverture' || p2?.isFaussePiste
                    );
                    const finalResponse = isImpairedByChimiste ? !hasAgentOrFaussePiste : hasAgentOrFaussePiste;
                    return (
                      <>
                        <span className="text-xs text-stone-500">Signe à faire au Hacker</span>
                        <span className={`text-xl font-black ${finalResponse ? 'text-emerald-700' : 'text-red-700'}`}>
                          {finalResponse ? 'OUI' : 'NON'}
                        </span>
                      </>
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
          <div className="shrink-0 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium flex items-center justify-between gap-2">
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
        <div className="shrink-0 flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed text-stone-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-stone-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Précédent</span>
          </button>

          <div className="flex items-center gap-2 text-center">
            <span className="text-[10px] text-stone-400 font-mono">
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
              className="text-[10px] text-stone-400 hover:text-stone-700 underline font-medium px-1 py-1 cursor-pointer"
              title="Passer à l'étape suivante sans forcer d'action"
            >
              Passer
            </button>
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            id="btn-next-night-step"
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
          >
            <span>{isLastStep ? 'Terminer la Nuit' : 'Suivant'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
