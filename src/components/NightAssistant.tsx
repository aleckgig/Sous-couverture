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
} from 'lucide-react';
import { NightStep, Player, RoleId, StructuredRole } from '../types';
import { ROLES } from '../data/roles';
import {
  getPickpocketForcesDeLOrdreCount,
  getInformantsCount,
  getActivePerturbatorRoleIds,
} from '../utils/gameLogic';
import { RoleCardModal } from './RoleCardModal';
import { PlayerSelect } from './PlayerSelect';
import { RoleSelect } from './RoleSelect';
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

  // Junkie simulation choices
  const [junkieChimisteTargetId, setJunkieChimisteTargetId] = useState<string>('');
  const [junkieApprentiTargetId, setJunkieApprentiTargetId] = useState<string>('');
  const [junkieAvocateTargetId, setJunkieAvocateTargetId] = useState<string>('');
  const [junkieHackerTargetOneId, setJunkieHackerTargetOneId] = useState<string>('');
  const [junkieHackerTargetTwoId, setJunkieHackerTargetTwoId] = useState<string>('');
  const [junkieAgentActionType, setJunkieAgentActionType] = useState<'none' | 'recruit' | 'prison'>('none');
  const [junkieAgentActionChosen, setJunkieAgentActionChosen] = useState(false);
  const [junkieAgentFlowStep, setJunkieAgentFlowStep] = useState(0);
  const [junkieAgentTargetId, setJunkieAgentTargetId] = useState('');
  const [junkieRecruitmentAccepted, setJunkieRecruitmentAccepted] = useState<boolean | null>(null);
  const [junkieImprisonedPlayerId, setJunkieImprisonedPlayerId] = useState<string | undefined>(undefined);

  const [agentActionType, setAgentActionType] = useState<'none' | 'recruit' | 'prison'>('none');
  const [agentActionChosen, setAgentActionChosen] = useState(false);
  const [agentFlowStep, setAgentFlowStep] = useState(0);
  const [agentBluffShown, setAgentBluffShown] = useState(false);
  const [agentBluffContinueReady, setAgentBluffContinueReady] = useState(false);
  const [agentTargetId, setAgentTargetId] = useState<string>('');
  const [recruitmentAcceptedTonight, setRecruitmentAcceptedTonight] = useState<boolean | null>(null);
  const [imprisonedPlayerId, setImprisonedPlayerId] = useState<string | undefined>(undefined);

  // Hacker choices
  const [hackerTargetOneId, setHackerTargetOneId] = useState<string>('');
  const [hackerTargetTwoId, setHackerTargetTwoId] = useState<string>('');

  // Role-card reveals (Agent, Nettoyeuse, Revendeur d'armes)
  const [cardModalRoleId, setCardModalRoleId] = useState<string | null>(null);
  const [revendeurCardRoleId, setRevendeurCardRoleId] = useState<RoleId | null>(null);

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
    setAgentActionChosen(false);
    setAgentFlowStep(0);
    setAgentBluffShown(false);
    setAgentBluffContinueReady(false);
    setAgentTargetId('');
    setRecruitmentAcceptedTonight(null);
    setImprisonedPlayerId(undefined);
    setHackerTargetOneId('');
    setHackerTargetTwoId('');
    setJunkieChimisteTargetId('');
    setJunkieApprentiTargetId('');
    setJunkieAvocateTargetId('');
    setJunkieHackerTargetOneId('');
    setJunkieHackerTargetTwoId('');
    setJunkieAgentActionType('none');
    setJunkieAgentActionChosen(false);
    setJunkieAgentFlowStep(0);
    setJunkieAgentTargetId('');
    setJunkieRecruitmentAccepted(null);
    setJunkieImprisonedPlayerId(undefined);
    setRevendeurCardRoleId(null);
    setNoticeMessage(null);
    localStorage.removeItem('sc_night_step_index');
  }, [nightCount]);

  useEffect(() => {
    localStorage.setItem('sc_night_step_index', currentStepIndex.toString());
    setAgentFlowStep(0);
    setAgentBluffShown(false);
    setAgentBluffContinueReady(false);
    setAgentActionChosen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setNoticeMessage(null);
  }, [currentStepIndex]);

  const currentStep = steps[currentStepIndex];
  const isFirstNight = nightCount === 1;
  const isJunkieStep = Boolean(currentStep?.isJunkieSimulation);
  const junkiePerceivedRoleId = isJunkieStep ? currentStep?.roleId : undefined;
  const isLastStep = currentStepIndex >= steps.length - 1;

  const currentStepPlayer = currentStep?.activePlayerIds?.[0]
    ? players.find((p) => p.id === currentStep.activePlayerIds?.[0])
    : currentStep
      ? players.find((p) => p.roleId === currentStep.roleId)
      : undefined;

  // A player can become an Informateur during the Agent's step.
  // Night steps are generated at the start of the night, so later steps
  // must be checked again against the live player state before being shown.
  const currentStepDisabled = Boolean(
    currentStepPlayer &&
    (!currentStepPlayer.isAlive || currentStepPlayer.isPrisoner || currentStepPlayer.isInformateur)
  );

  const handleFinish = () => {
    localStorage.removeItem('sc_night_step_index');
    onFinishNight({
      imprisonedPlayerId,
      recruitedPlayerId: recruitmentAcceptedTonight ? agentTargetId : undefined,
      chimisteTargetId: chimisteTargetId || undefined,
      apprentiTargetId: apprentiTargetId || undefined,
      gardeTargetId: gardeTargetId || undefined,
      avocateTargetId: avocateTargetId || undefined,
      ...(junkiePerceivedRoleId ? {
        junkieAction: {
          perceivedRoleId: junkiePerceivedRoleId,
          chimisteTargetId: junkieChimisteTargetId || undefined,
          apprentiTargetId: junkieApprentiTargetId || undefined,
          avocateTargetId: junkieAvocateTargetId || undefined,
          hackerTargetOneId: junkieHackerTargetOneId || undefined,
          hackerTargetTwoId: junkieHackerTargetTwoId || undefined,
          agentActionType: junkieAgentActionType,
          agentTargetId: junkieAgentTargetId || undefined,
          recruitmentAccepted: junkieRecruitmentAccepted,
          imprisonedPlayerId: junkieImprisonedPlayerId,
        }
      } : {}),
    });
  };

  useEffect(() => {
    if (!currentStep || !currentStepDisabled) return;

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  }, [currentStepIndex, currentStep, currentStepDisabled, steps.length]);

  const role = currentStep ? ROLES[currentStep.roleId] : undefined;
  const actingPlayer = currentStep
    ? currentStep.activePlayerIds?.length
      ? players.find((p) => p.id === currentStep.activePlayerIds?.[0] && p.isAlive && !p.isPrisoner)
      : players.find((p) => p.roleId === currentStep.roleId && p.isAlive && !p.isPrisoner)
    : undefined;
  const isImpairedByChimiste = Boolean(actingPlayer && chimisteTargetId && actingPlayer.id === chimisteTargetId);
  const agentTarget = players.find((p) => p.id === agentTargetId);
  const activePerturbatorRoleIds = getActivePerturbatorRoleIds(players);
  const poisonedInfo = (() => {
    if (!isImpairedByChimiste || currentStep?.actionType !== 'info_only' || !currentStep) return null;

    const reminder = currentStep.reminder ?? '';

    if (currentStep.roleId === 'trafiquant') {
      const trueValue = recruitmentAcceptedTonight === true ? 'OUI' : 'NON';
      return {
        normal: trueValue,
        toSay: trueValue === 'OUI' ? 'NON' : 'OUI',
      };
    }

    if (currentStep.roleId === 'blanchisseur') {
      const match = reminder.match(/(\\d+)/);
      const trueValue = match ? Number(match[1]) : null;
      if (trueValue !== null) {
        return {
          normal: trueValue === 0 ? 'aucun' : String(trueValue),
          toSay: trueValue === 0 ? '1' : 'aucun',
        };
      }
    }

    if (currentStep.roleId === 'pickpocket') {
      const match = reminder.match(/(0|1|2)/);
      const trueValue = match ? Number(match[1]) : null;
      if (trueValue !== null) {
        return {
          normal: String(trueValue),
          toSay: String(trueValue === 1 ? 0 : 1),
        };
      }
    }

    return null;
  })();

  const roleAccent =
    role?.camp_initial === "Forces de l'ordre"
      ? { bg: 'bg-blue-50', line: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', button: 'bg-blue-700', strokePosition: '0%' }
      : role?.isPerturbateur
        ? { bg: 'bg-purple-50', line: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', button: 'bg-purple-700', strokePosition: '40%' }
        : { bg: 'bg-stone-50', line: 'bg-stone-200', text: 'text-stone-800', border: 'border-stone-300', button: 'bg-stone-800', strokePosition: '20%' };

  const strokeStyle = {
    backgroundImage: "url('/images/ui/camp-strokes-sprite.webp')",
    backgroundSize: '100% 600%',
    backgroundPosition: `center ${roleAccent.strokePosition}`,
    backgroundRepeat: 'no-repeat',
  } as React.CSSProperties;

  useEffect(() => {
    if (currentStep?.roleId !== 'revendeur_armes') return;

    const available = getActivePerturbatorRoleIds(players);

    // Consistent option rule:
    // - 1 available card: select it automatically.
    // - 2+ available cards: the Storyteller must choose explicitly.
    // - 0 available cards: leave empty and let validation explain the problem.
    if (available.length === 1) {
      setRevendeurCardRoleId(available[0]);
    } else if (!available.includes(revendeurCardRoleId as RoleId)) {
      setRevendeurCardRoleId(null);
    }
  }, [currentStep?.roleId, players, revendeurCardRoleId]);

  const handlePrevStep = () => {
    if (currentStep?.roleId === 'agent_sous_couverture' && agentFlowStep > 0) {
      setAgentFlowStep((prev) => prev - 1);
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleNextStep = () => {
    if (!currentStep) return;

    // Junkie simulation: the perceived role's power is executed normally,
    // while information produced by the simulated role must be false.
    if (isJunkieStep) {
      if (currentStep.roleId === 'agent_sous_couverture') {
        if (junkieAgentFlowStep === 0) {
          if (!junkieAgentActionChosen) {
            setValidationModal({
              isOpen: true,
              title: 'Action requise',
              message: 'Veuillez choisir une action pour le Junkie.',
            });
            return;
          }
          if (junkieAgentActionType === 'none') {
            if (isLastStep) handleFinish();
            else setCurrentStepIndex((prev) => prev + 1);
            return;
          }
          setJunkieAgentFlowStep(1);
          return;
        }
        if (junkieAgentFlowStep === 1) {
          if (!junkieAgentTargetId) {
            setValidationModal({
              isOpen: true,
              title: 'Joueur requis',
              message: junkieAgentActionType === 'recruit'
                ? 'Veuillez sélectionner le joueur à recruter.'
                : 'Veuillez sélectionner le joueur à envoyer en prison.',
            });
            return;
          }
          if (junkieAgentActionType === 'recruit') {
            setJunkieAgentFlowStep(2);
            return;
          }
          if (junkieAgentActionType === 'prison') {
            const target = players.find((p) => p.id === junkieAgentTargetId);
            if (actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned) {
              setJunkieImprisonedPlayerId(undefined);
              setNoticeMessage('⚠️ Le Junkie est empoisonné : son pouvoir d’Agent échoue silencieusement.');
            } else if (target?.roleId === 'chauffeur' || target?.perceivedRoleId === 'chauffeur' || target?.isInformateur || target?.roleId === 'agent_sous_couverture') {
              setJunkieImprisonedPlayerId(undefined);
              setNoticeMessage('L’arrestation simulée échoue selon les règles du pouvoir.');
            } else if (target?.isProtected) {
              setJunkieImprisonedPlayerId(undefined);
              setNoticeMessage(`L’Avocate protège ${target.name} : l’arrestation échoue cette nuit.`);
            } else if (target) {
              setJunkieImprisonedPlayerId(target.id);
              onUpdatePlayer({ ...target, isPrisoner: true });
            }
            setJunkieAgentFlowStep(3);
            return;
          }
        }
        if (junkieAgentFlowStep === 2) {
          if (junkieAgentTargetId && players.find(p => p.id === junkieAgentTargetId)?.roleId === 'homme_de_main') {
            setJunkieRecruitmentAccepted(false);
            setJunkieAgentFlowStep(3);
            return;
          }
          if (junkieRecruitmentAccepted === null) {
            setValidationModal({
              isOpen: true,
              title: 'Réponse requise',
              message: 'Veuillez indiquer si le joueur accepte ou refuse le recrutement.',
            });
            return;
          }
          if (junkieRecruitmentAccepted === true) {
            const target = players.find((p) => p.id === junkieAgentTargetId);
            if (actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned) {
              setNoticeMessage('⚠️ Le Junkie est empoisonné : le recrutement simulé échoue silencieusement.');
              setJunkieRecruitmentAccepted(false);
            } else if (target && !target.isInformateur && target.currentTeam === 'Gang' && target.roleId !== 'homme_de_main' && target.perceivedRoleId !== 'homme_de_main' && getInformantsCount(players) < 2) {
              onUpdatePlayer({ ...target, isInformateur: true, currentTeam: 'Forces de l’ordre' });
              setNoticeMessage(`${target.name} devient Informateur immédiatement.`);
            }
          }
          setJunkieAgentFlowStep(3);
          return;
        }
        if (junkieAgentFlowStep === 3) {
          if (isLastStep) handleFinish();
          else setCurrentStepIndex((prev) => prev + 1);
          return;
        }
      }

      if (currentStep.roleId === 'chimiste' && !junkieChimisteTargetId) {
        setValidationModal({ isOpen: true, title: 'Cible requise', message: 'Sélectionnez la cible du pouvoir du Junkie.' });
        return;
      }
      if (currentStep.roleId === 'apprenti' && !junkieApprentiTargetId) {
        setValidationModal({ isOpen: true, title: 'Cible requise', message: 'Sélectionnez la cible du pouvoir du Junkie.' });
        return;
      }
      if (currentStep.roleId === 'avocat_vereux' && !junkieAvocateTargetId) {
        setValidationModal({ isOpen: true, title: 'Cible requise', message: 'Sélectionnez la cible du pouvoir du Junkie.' });
        return;
      }
      if (currentStep.roleId === 'hacker' && (!junkieHackerTargetOneId || !junkieHackerTargetTwoId)) {
        setValidationModal({ isOpen: true, title: 'Sélection requise', message: 'Sélectionnez les 2 joueurs désignés par le Junkie.' });
        return;
      }

      const liveJunkie = players.find((p) => p.id === actingPlayer?.id);
      const junkiePowerBlocked = Boolean(liveJunkie?.isPoisoned || liveJunkie?.isInformationPoisoned);
      if (currentStep.roleId === 'chimiste' && junkieChimisteTargetId && !junkiePowerBlocked) {
        const target = players.find((p) => p.id === junkieChimisteTargetId);
        if (target) onUpdatePlayer({ ...target, isPoisoned: true, isInformationPoisoned: true });
      }
      if (currentStep.roleId === 'apprenti' && junkieApprentiTargetId && !junkiePowerBlocked && actingPlayer) {
        onUpdatePlayer({ ...actingPlayer, linkedVoteTargetId: junkieApprentiTargetId });
      }
      if (currentStep.roleId === 'avocat_vereux' && junkieAvocateTargetId && !junkiePowerBlocked) {
        const target = players.find((p) => p.id === junkieAvocateTargetId);
        if (target) onUpdatePlayer({ ...target, isProtected: true });
      }

      if (isLastStep) handleFinish();
      else setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    // Sub-flow for agent_sous_couverture
    if (currentStep.roleId === 'agent_sous_couverture') {
      // On the first night, the bluff card is always shown before the Agent chooses an action.
      // This card is informational only: its power is never added to the night's steps.
      if (isFirstNight && !agentBluffShown) {
        if (actingPlayer?.agentBluffRoleId) {
          setCardModalRoleId(actingPlayer.agentBluffRoleId);
          setAgentBluffShown(true);
          return;
        }
      }

      // After the bluff card is closed, keep the Storyteller on the same screen
      // until they explicitly press Continue. This prevents the night from
      // jumping directly to the next role when the modal is dismissed.
      if (isFirstNight && agentBluffShown && !agentBluffContinueReady) {
        setAgentBluffContinueReady(true);
        return;
      }

      if (agentFlowStep === 0) {
        if (!agentActionChosen) {
          setValidationModal({
            isOpen: true,
            title: 'Action requise',
            message: 'Veuillez choisir une action pour l’Agent sous couverture.',
          });
          return;
        }
        if (agentActionType === 'none') {
          if (isLastStep) {
            handleFinish();
          } else {
            setCurrentStepIndex((prev) => prev + 1);
          }
          return;
        }
        setAgentFlowStep(1);
        return;
      }

      if (agentFlowStep === 1) {
        if (!agentTargetId) {
          setValidationModal({
            isOpen: true,
            title: 'Joueur requis',
            message:
              agentActionType === 'recruit'
                ? 'Veuillez sélectionner le joueur à recruter.'
                : 'Veuillez sélectionner le joueur à envoyer en prison.',
          });
          return;
        }
        if (agentActionType === 'recruit') {
          setAgentFlowStep(2);
          return;
        }
        if (agentActionType === 'prison') {
          const target = players.find((p) => p.id === agentTargetId);
          if (isImpairedByChimiste || actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned) {
            setNoticeMessage('L’Agent est empoisonné : son arrestation échouera silencieusement.');
            setImprisonedPlayerId(undefined);
          } else if (target?.roleId === 'chauffeur' || target?.perceivedRoleId === 'chauffeur') {
            setNoticeMessage(`Le Chauffeur (${target.name}) est immunisé contre la prison.`);
            setImprisonedPlayerId(undefined);
          } else if (target?.isProtected) {
            setNoticeMessage(`L’Avocate protège ${target.name} : l’arrestation échoue cette nuit.`);
            setImprisonedPlayerId(undefined);
          } else if (target) {
            setNoticeMessage(`${target.name} est envoyé en prison immédiatement.`);
            setImprisonedPlayerId(target.id);
            onUpdatePlayer({ ...target, isPrisoner: true });
          }
          setAgentFlowStep(3);
          return;
        }
      }

      if (agentFlowStep === 2) {
        if (agentTarget?.roleId === 'homme_de_main' || agentTarget?.perceivedRoleId === 'homme_de_main') {
          if (recruitmentAcceptedTonight !== false) {
            setRecruitmentAcceptedTonight(false);
            setNoticeMessage('L’Homme de main ne peut pas être recruté : le refus est obligatoire.');
          }
          setAgentFlowStep(3);
          return;
        }
        if (recruitmentAcceptedTonight === true) {
          if (actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned || isImpairedByChimiste) {
            setNoticeMessage('⚠️ L’Agent est empoisonné : le recrutement échoue silencieusement.');
            setRecruitmentAcceptedTonight(false);
          } else if (agentTarget && !agentTarget.isInformateur && agentTarget.currentTeam === 'Gang' && getInformantsCount(players) < 2) {
            onUpdatePlayer({ ...agentTarget, isInformateur: true, currentTeam: 'Forces de l’ordre' });
            setNoticeMessage(`${agentTarget.name} devient Informateur immédiatement.`);
          }
        }
        if (recruitmentAcceptedTonight === null) {
          setValidationModal({
            isOpen: true,
            title: 'Réponse requise',
            message: 'Veuillez indiquer si le joueur accepte ou refuse le recrutement.',
          });
          return;
        }
        setAgentFlowStep(3);
        return;
      }

      if (agentFlowStep === 3) {
        if (isLastStep) {
          handleFinish();
        } else {
          setCurrentStepIndex((prev) => prev + 1);
        }
        return;
      }
    }

    // Role-specific validations
    if (currentStep.roleId === 'chimiste' && !chimisteTargetId) {
      setValidationModal({
        isOpen: true,
        title: 'Cible du Chimiste requise',
        message: 'Sélectionnez le joueur que le Chimiste empoisonne.',
      });
      return;
    }
    if (currentStep.roleId === 'chimiste' && chimisteTargetId) {
      if (actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned) {
        setNoticeMessage('⚠️ Le Chimiste est empoisonné : son pouvoir échoue silencieusement.');
      } else {
        const target = players.find((p) => p.id === chimisteTargetId);
        if (target) onUpdatePlayer({ ...target, isPoisoned: true, isInformationPoisoned: true });
      }
    }
    if (currentStep.roleId === 'apprenti' && !apprentiTargetId) {
      setValidationModal({
        isOpen: true,
        title: 'Cible de l’Apprenti requise',
        message: 'Sélectionnez le joueur que l’Apprenti doit suivre demain.',
      });
      return;
    }
    if (currentStep.roleId === 'apprenti' && apprentiTargetId) {
      if (actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned) {
        setNoticeMessage('⚠️ L’Apprenti est empoisonné : son pouvoir échoue silencieusement.');
      } else if (actingPlayer) {
        onUpdatePlayer({ ...actingPlayer, linkedVoteTargetId: apprentiTargetId });
      }
    }
    if (currentStep.roleId === 'avocat_vereux' && !avocateTargetId) {
      setValidationModal({
        isOpen: true,
        title: 'Cible de l’Avocate requise',
        message: 'Sélectionnez le joueur à protéger contre la prison.',
      });
      return;
    }
    if (currentStep.roleId === 'avocat_vereux' && avocateTargetId) {
      if (actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned) {
        setNoticeMessage('⚠️ L’Avocate est empoisonnée : la protection échoue silencieusement.');
      } else {
        const target = players.find((p) => p.id === avocateTargetId);
        if (target) onUpdatePlayer({ ...target, isProtected: true });
      }
    }
    if (currentStep.roleId === 'hacker' && (!hackerTargetOneId || !hackerTargetTwoId)) {
      setValidationModal({
        isOpen: true,
        title: 'Sélection du Hacker requise',
        message: 'Veuillez sélectionner les 2 joueurs désignés par le Hacker.',
      });
      return;
    }
    if (currentStep.roleId === 'revendeur_armes') {
      const available = getActivePerturbatorRoleIds(players);
      if (available.length === 0) {
        setValidationModal({
          isOpen: true,
          title: 'Aucune carte disponible',
          message: 'Aucun Perturbateur actuellement en jeu ne peut être montré.',
        });
        return;
      }
      if (available.length > 1 && !revendeurCardRoleId) {
        setValidationModal({
          isOpen: true,
          title: 'Carte à montrer',
          message: 'Choisissez la carte Perturbateur à montrer au Revendeur d’armes.',
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

  const nextLabel =
    isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && junkieAgentFlowStep === 2
      ? 'Confirmer'
      : isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && junkieAgentFlowStep === 3
        ? (isLastStep ? 'Réveiller la ville' : 'Continuer')
        : currentStep.roleId === 'agent_sous_couverture' && isFirstNight && agentBluffShown && !agentBluffContinueReady
      ? 'Continuer'
      : currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 2
      ? 'Confirmer'
      : currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 3
        ? (isLastStep ? 'Réveiller la ville' : 'Continuer')
        : isLastStep ? 'Terminer la nuit' : 'Continuer';

  const renderProgress = () => (
    <div className="w-full max-w-md mx-auto px-1">
      <div className="flex items-center">
        {steps.map((_, index) => (
          <React.Fragment key={index}>
            <div className={`h-3 w-3 rounded-full border-2 transition-all ${index <= currentStepIndex ? 'bg-stone-800 border-stone-800' : 'bg-[#f5f1e8] border-stone-400'} ${index === currentStepIndex ? 'ring-4 ring-stone-800/10' : ''}`} />
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 transition-all ${index < currentStepIndex ? 'bg-stone-800' : 'bg-stone-300'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="text-center mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
        Étape {currentStepIndex + 1} / {steps.length}
      </div>
    </div>
  );

  const goNext = () => handleNextStep();

  if (!currentStep || steps.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-5 text-center">
        <Moon className="w-10 h-10 text-stone-800 mb-4" />
        <h3 className="text-xl font-black tracking-tight text-stone-900">La nuit est terminée</h3>
        <p className="text-sm text-stone-500 mt-2 max-w-sm">
          {isFirstNight ? 'La première nuit est terminée. Réveillez la ville.' : 'Tous les rôles ont été appelés. Réveillez la ville.'}
        </p>
        <button onClick={handleFinish} className="mt-8 w-full max-w-sm py-4 rounded-xl bg-stone-900 text-white font-black text-sm">
          <Sun className="inline w-4 h-4 mr-2" /> Réveiller la ville
        </button>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col text-stone-900">
      {/* Night progress */}
      <div className="shrink-0 pt-1 pb-2">
        {renderProgress()}
      </div>

      {/* Role identity */}
      <div className="shrink-0 text-center">
        <div className="relative mx-auto w-fit max-w-[92%] px-3 py-1">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 opacity-90"
            style={strokeStyle}
          />
          <h1 className="relative z-10 text-[22px] sm:text-2xl font-black tracking-tight uppercase leading-tight">
            {role?.nom ?? currentStep.title}
          </h1>
        </div>
      </div>

      {/* Main instruction / action */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-1 pt-3 pb-2">
        <div className="max-w-md mx-auto space-y-3">

          {!isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 0 && isFirstNight && (!agentBluffShown || !agentBluffContinueReady) && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Première étape — carte bluff</p>
                <p className="mt-1 text-sm text-stone-700">Montrez à l’Agent sa fausse carte pour qu’il puisse prendre connaissance de ses pouvoirs et bluffer avec ce rôle.</p>
                <p className="mt-2 text-[10px] text-stone-500">Cette carte n’est pas réellement en jeu et son pouvoir ne sera jamais exécuté.</p>
              </div>
              {actingPlayer?.agentBluffRoleId ? (
                <button
                  type="button"
                  disabled={agentBluffShown}
                  onClick={() => {
                    setCardModalRoleId(actingPlayer.agentBluffRoleId!);
                    setAgentBluffShown(true);
                  }}
                  className="w-full py-4 rounded-xl bg-blue-700 text-white font-black text-sm shadow-sm disabled:opacity-60"
                >
                  <Eye className="inline w-5 h-5 mr-2" /> {agentBluffShown ? 'CARTE BLUFF MONTRÉE' : 'MONTRER LA CARTE BLUFF'}
                </button>
                {agentBluffShown && (
                  <p className="text-center text-xs font-bold text-blue-800">
                    La carte a été montrée à l’Agent. Appuyez sur « Continuer » pour passer à son action.
                  </p>
                )}
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-bold">
                  Aucune carte bluff n’a été configurée pour cet Agent.
                </div>
              )}
            </div>
          )}

          {!isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 0 && (!isFirstNight || (agentBluffShown && agentBluffContinueReady)) && (
            <>
              <p className="text-center text-base sm:text-lg font-medium text-stone-800 mb-3">
                Que fait-il cette nuit ?
              </p>
              <div className="space-y-2.5">
                {[
                  ...(getInformantsCount(players) < 2
                    ? [{ id: 'recruit' as const, label: 'Recruter un informateur', icon: <UserCheck className="w-6 h-6" />, accent: 'red' }]
                    : []),
                  ...(!isFirstNight ? [{ id: 'prison' as const, label: 'Envoyer en prison', icon: <Shield className="w-6 h-6" />, accent: 'stone' }] : []),
                  { id: 'none' as const, label: 'Ne rien faire', icon: <Moon className="w-6 h-6" />, accent: 'stone' },
                ].map((action) => {
                  const selected = agentActionType === action.id && agentActionChosen;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        setAgentActionType(action.id);
                        setAgentActionChosen(true);
                        setAgentTargetId('');
                        setRecruitmentAcceptedTonight(null);
                      }}
                      className={`w-full min-h-[58px] px-4 rounded-xl border flex items-center gap-4 text-left transition active:scale-[0.99] ${selected ? 'border-stone-800 bg-white shadow-sm' : 'border-stone-300 bg-[#faf8f2]'}`}
                    >
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center ${selected ? 'bg-stone-900 text-white' : 'bg-white text-stone-800 border border-stone-200'}`}>
                        {action.icon}
                      </span>
                      <span className="flex-1 font-bold text-sm">{action.label}</span>
                      <ArrowRight className="w-4 h-4 text-stone-400" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 1 && (
            <>
              <div className="mt-4">
                <p className="text-center text-sm font-bold text-stone-700 mb-2">
                  {agentActionType === 'recruit' ? 'Joueur à recruter comme informateur' : 'Joueur à envoyer en prison'}
                </p>
                <PlayerSelect
                  value={agentTargetId}
                  onChange={(id) => setAgentTargetId(id)}
                  players={players.filter((p) =>
                    p.isAlive &&
                    !p.isPrisoner &&
                    (agentActionType === 'recruit'
                      ? p.currentTeam === 'Gang' && !p.isInformateur && p.roleId !== 'agent_sous_couverture' && getInformantsCount(players) < 2
                      : p.roleId !== 'agent_sous_couverture' && !p.isInformateur)
                  )}
                  placeholder="Choisir un joueur…"
                  accent={agentActionType === 'recruit' ? 'red' : 'default'}
                />
                <div className="mt-2 text-center text-[11px] text-stone-500">
                  Le nom et le rôle du joueur sont visibles dans la liste.
                </div>
              </div>
            </>
          )}

          {!isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 2 && (
            <>
              {(actingPlayer?.isPoisoned || actingPlayer?.isInformationPoisoned || isImpairedByChimiste) && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-red-800">⚠️ Recrutement impossible</p>
                  <p className="mt-1 text-sm font-black text-red-950">
                    L’Agent est empoisonné : le recrutement de {agentTarget?.name} a échoué.
                  </p>
                  <p className="mt-2 text-xs font-medium text-red-800">
                    Ne réveillez pas {agentTarget?.name}. Le recrutement ne peut pas avoir lieu cette nuit.
                  </p>
                  <p className="mt-2 text-xs font-bold text-red-900">
                    Vous devez quand même poser la question à l’Agent et noter sa réponse.
                  </p>
                </div>
              )}
              <p className="text-center text-base sm:text-lg font-medium text-stone-800">
                Demandez à l’Agent : {agentTarget?.name} accepte-t-il de devenir informateur ?
              </p>
              <div className="space-y-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setRecruitmentAcceptedTonight(true);
                    const targetPlayer = players.find((p) => p.id === agentTargetId);
                    if (targetPlayer && !isImpairedByChimiste && targetPlayer.roleId !== 'homme_de_main' && targetPlayer.perceivedRoleId !== 'homme_de_main' && getInformantsCount(players) < 2) {
                      onUpdatePlayer({ ...targetPlayer, isInformateur: true, currentTeam: 'Forces de l\'ordre' });
                    }
                  }}
                  className={`w-full min-h-[62px] rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center gap-3 px-4 font-black text-sm active:scale-[0.99] ${recruitmentAcceptedTonight === true ? 'ring-2 ring-emerald-700' : ''}`}
                >
                  <span className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center"><Check className="w-5 h-5" /></span>
                  OUI, il accepte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecruitmentAcceptedTonight(false);
                    const targetPlayer = players.find((p) => p.id === agentTargetId);
                    if (targetPlayer) onUpdatePlayer({ ...targetPlayer, isInformateur: false, currentTeam: 'Gang' });
                  }}
                  className={`w-full min-h-[62px] rounded-xl border border-red-300 bg-red-50 text-red-950 flex items-center gap-3 px-4 font-black text-sm active:scale-[0.99] ${recruitmentAcceptedTonight === false ? 'ring-2 ring-red-700' : ''}`}
                >
                  <span className="w-10 h-10 rounded-full bg-red-700 text-white flex items-center justify-center"><X className="w-5 h-5" /></span>
                  NON, il refuse
                </button>
              </div>
            </>
          )}

          {!isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && agentFlowStep === 3 && (
            <div className="text-center pt-2">
              {recruitmentAcceptedTonight === true ? (
                <>
                  <div className="inline-flex px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-black text-sm uppercase tracking-wide">
                    Recrutement accepté
                  </div>
                  <p className="text-base font-medium text-stone-800 mt-3">
                    {agentTarget?.name} est maintenant un informateur.
                  </p>
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
                    <p className="font-black">Réveillez l’Agent sous couverture.</p>
                    <p className="mt-1">Demandez-lui d’ouvrir les yeux pour qu’il prenne connaissance du recrutement.</p>
                    <p className="mt-2 font-bold">Lorsque les deux joueurs ont pris connaissance de la situation, demandez-leur de fermer les yeux.</p>
                  </div>
                </>
              ) : recruitmentAcceptedTonight === false ? (
                <>
                  <div className="inline-flex px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-900 font-black text-sm uppercase tracking-wide">
                    Recrutement refusé
                  </div>
                  <p className="text-base font-medium text-stone-800 mt-3">
                    {agentTarget?.name} reste dans le Gang.
                  </p>
                  <p className="text-xs text-stone-500 mt-2">Aucune information supplémentaire à transmettre à l’Agent.</p>
                </>
              ) : agentActionType === 'prison' ? (
                <>
                  <div className="inline-flex px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-black text-sm uppercase tracking-wide">
                    Arrestation enregistrée
                  </div>
                  <p className="text-base font-medium text-stone-800 mt-3">
                    {imprisonedPlayerId
                      ? `${agentTarget?.name} sera envoyé en prison cette nuit.`
                      : `${agentTarget?.name} ne sera finalement pas envoyé en prison.`}
                  </p>
                </>
              ) : null}
            </div>
          )}

          {currentStep.roleId !== 'agent_sous_couverture' && (
            <>
              {poisonedInfo ? (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-center space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wide text-red-800">⚠️ Joueur empoisonné</p>
                  <p className="text-base font-black text-red-950">
                    Donc dire : <span className="text-lg">{poisonedInfo.toSay}</span>{' '}
                    <span className="text-xs font-medium italic text-red-700">(au lieu de {poisonedInfo.normal})</span>
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-center text-base sm:text-lg font-medium text-stone-800">
                    {currentStep.roleId === 'trafiquant'
                      ? `Indiquez au Trafiquant ${recruitmentAcceptedTonight === true ? 'OUI' : 'NON'} : au moins une personne a-t-elle accepté un recrutement cette nuit ?`
                      : currentStep.instruction}
                  </p>
                  {currentStep.reminder && currentStep.roleId !== 'trafiquant' && (
                    <p className="text-center text-xs italic text-stone-500 max-w-sm mx-auto">{currentStep.reminder}</p>
                  )}
                  {isJunkieStep && (
                    <div className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-center text-xs font-bold text-purple-900">
                      ⚠️ FAUSSE IDENTITÉ — Le Junkie croit être {role?.nom}. Son pouvoir réel s’applique normalement; toute information qu’il reçoit doit être fausse.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {isJunkieStep && currentStep.roleId === 'chimiste' && (
            <div className="mt-4">
              <PlayerSelect
                value={junkieChimisteTargetId}
                onChange={setJunkieChimisteTargetId}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur…"
                accent="purple"
              />
            </div>
          )}

          {isJunkieStep && currentStep.roleId === 'apprenti' && (
            <div className="mt-4">
              <PlayerSelect
                value={junkieApprentiTargetId}
                onChange={setJunkieApprentiTargetId}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur…"
                accent="blue"
              />
            </div>
          )}

          {isJunkieStep && currentStep.roleId === 'avocat_vereux' && (
            <div className="mt-4">
              <PlayerSelect
                value={junkieAvocateTargetId}
                onChange={setJunkieAvocateTargetId}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur à protéger…"
                accent="blue"
              />
            </div>
          )}

          {isJunkieStep && currentStep.roleId === 'hacker' && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <PlayerSelect value={junkieHackerTargetOneId} onChange={(id) => { setJunkieHackerTargetOneId(id); if (id === junkieHackerTargetTwoId) setJunkieHackerTargetTwoId(''); }} players={players.filter((p) => p.isAlive && !p.isPrisoner)} excludePlayerId={actingPlayer?.id} placeholder="1er joueur…" accent="purple" />
                <PlayerSelect value={junkieHackerTargetTwoId} onChange={setJunkieHackerTargetTwoId} players={players.filter((p) => p.isAlive && !p.isPrisoner && p.id !== junkieHackerTargetOneId)} excludePlayerId={actingPlayer?.id} placeholder="2e joueur…" accent="purple" />
              </div>
            </div>
          )}

          {isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && junkieAgentFlowStep === 0 && (
            <div className="space-y-2.5">
              {[
                ...(getInformantsCount(players) < 2 ? [{ id: 'recruit' as const, label: 'Recruter un informateur', icon: <UserCheck className="w-6 h-6" /> }] : []),
                ...(!isFirstNight ? [{ id: 'prison' as const, label: 'Envoyer en prison', icon: <Shield className="w-6 h-6" /> }] : []),
                { id: 'none' as const, label: 'Ne rien faire', icon: <Moon className="w-6 h-6" /> },
              ].map((action) => (
                <button key={action.id} type="button"
                  onClick={() => {
                    setJunkieAgentActionType(action.id);
                    setJunkieAgentActionChosen(true);
                    setJunkieAgentTargetId('');
                    setJunkieRecruitmentAccepted(null);
                  }}
                  className={`w-full min-h-[58px] px-4 rounded-xl border flex items-center gap-4 text-left ${junkieAgentActionType === action.id && junkieAgentActionChosen ? 'border-purple-700 bg-purple-50' : 'border-stone-300 bg-[#faf8f2]'}`}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-stone-200">{action.icon}</span>
                  <span className="flex-1 font-bold text-sm">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>
              ))}
            </div>
          )}

          {isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && junkieAgentFlowStep === 1 && (
            <>
              <p className="text-center text-sm font-bold text-stone-700">
                {junkieAgentActionType === 'recruit' ? 'Joueur à recruter comme informateur' : 'Joueur à envoyer en prison'}
              </p>
              <PlayerSelect
              value={junkieAgentTargetId}
              onChange={setJunkieAgentTargetId}
              players={players.filter((p) =>
                p.isAlive && !p.isPrisoner &&
                (junkieAgentActionType === 'recruit'
                  ? p.currentTeam === 'Gang' && !p.isInformateur && p.roleId !== 'agent_sous_couverture' && getInformantsCount(players) < 2
                  : p.roleId !== 'agent_sous_couverture' && !p.isInformateur)
              )}
              placeholder="Choisir un joueur…"
              accent={junkieAgentActionType === 'recruit' ? 'red' : 'default'}
              />
            </>
          )}

          {isJunkieStep && currentStep.roleId === 'agent_sous_couverture' && junkieAgentFlowStep === 2 && (
            <div className="space-y-2.5 mt-4">
              <p className="text-center text-base font-medium">{players.find(p => p.id === junkieAgentTargetId)?.name} accepte-t-il ?</p>
              <button type="button" onClick={() => setJunkieRecruitmentAccepted(true)} className={`w-full min-h-[62px] rounded-xl border border-emerald-300 bg-emerald-50 font-black ${junkieRecruitmentAccepted === true ? 'ring-2 ring-emerald-700' : ''}`}>✓ OUI, il accepte</button>
              <button type="button" onClick={() => setJunkieRecruitmentAccepted(false)} className={`w-full min-h-[62px] rounded-xl border border-red-300 bg-red-50 font-black ${junkieRecruitmentAccepted === false ? 'ring-2 ring-red-700' : ''}`}>✕ NON, il refuse</button>
            </div>
          )}

          {isJunkieStep && (currentStep.roleId === 'nettoyeur' || currentStep.roleId === 'revendeur_armes') && (
            <button type="button" onClick={() => {
              const executedRoleId = lastDayExecutedPlayerId
                ? players.find(p => p.id === lastDayExecutedPlayerId)?.roleId
                : undefined;
              const falseRoleId = currentStep.roleId === 'nettoyeur'
                ? (Object.values(ROLES).find(r => r.id !== executedRoleId && r.id !== 'junkie')?.id ?? 'caid')
                : (Object.values(ROLES).find(r => r.isPerturbateur && !activePerturbatorRoleIds.includes(r.id))?.id ?? 'caid');
              setCardModalRoleId(falseRoleId);
            }} className="w-full py-3 rounded-lg bg-stone-900 text-white text-xs font-black">
              <Eye className="inline w-4 h-4 mr-1" /> MONTRER UNE FAUSSE CARTE
            </button>
          )}

          {!isJunkieStep && currentStep.roleId === 'chimiste' && (
            <div className="mt-4">
              <PlayerSelect
                value={chimisteTargetId}
                onChange={setChimisteTargetId}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                placeholder="Choisir un joueur…"
                accent="purple"
              />
            </div>
          )}

          {!isJunkieStep && currentStep.roleId === 'apprenti' && (
            <div className="mt-4">
              <PlayerSelect
                value={apprentiTargetId}
                onChange={setApprentiTargetId}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur…"
                accent="blue"
              />
            </div>
          )}

          {!isJunkieStep && currentStep.roleId === 'avocat_vereux' && (
            <div className="mt-4">
              <PlayerSelect
                value={avocateTargetId}
                onChange={setAvocateTargetId}
                players={players.filter((p) => p.isAlive && !p.isPrisoner)}
                excludePlayerId={actingPlayer?.id}
                placeholder="Choisir un joueur à protéger…"
                accent="blue"
              />
            </div>
          )}

          {!isJunkieStep && currentStep.roleId === 'hacker' && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <PlayerSelect value={hackerTargetOneId} onChange={(id) => { setHackerTargetOneId(id); if (id === hackerTargetTwoId) setHackerTargetTwoId(''); }} players={players.filter((p) => p.isAlive && !p.isPrisoner)} excludePlayerId={actingPlayer?.id} placeholder="1er joueur…" accent="purple" />
                <PlayerSelect value={hackerTargetTwoId} onChange={setHackerTargetTwoId} players={players.filter((p) => p.isAlive && !p.isPrisoner && p.id !== hackerTargetOneId)} excludePlayerId={actingPlayer?.id} placeholder="2e joueur…" accent="purple" />
              </div>
            </div>
          )}

          {!isJunkieStep && currentStep.roleId === 'nettoyeur' && (
            <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3">
              {lastDayExecutedPlayerId ? (() => {
                const execPlayer = players.find((p) => p.id === lastDayExecutedPlayerId);
                const execRole = execPlayer ? ROLES[execPlayer.roleId] : undefined;
                return (
                  <div className="space-y-2">
                    <div className="text-sm font-black">{execPlayer?.name}</div>
                    <div className="text-xs text-stone-500">{execRole?.nom ?? 'Inconnu'}</div>
                    {execRole && <button type="button" onClick={() => setCardModalRoleId(execRole.id)} className="w-full py-3 rounded-lg bg-stone-900 text-white text-xs font-black"><Eye className="inline w-4 h-4 mr-1" /> Montrer la carte</button>}
                  </div>
                );
              })() : <p className="text-xs text-stone-500 italic">Aucune exécution hier.</p>}
            </div>
          )}

          {!isJunkieStep && currentStep.roleId === 'revendeur_armes' && (
            <div className="mt-4 max-w-md mx-auto">
              {activePerturbatorRoleIds.length > 0 && (
                <>
                  {activePerturbatorRoleIds.length > 1 && (
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">
                      Carte à montrer
                    </div>
                  )}
                  <RoleSelect
                    value={revendeurCardRoleId ?? ''}
                    onChange={setRevendeurCardRoleId}
                    roleIds={activePerturbatorRoleIds}
                    placeholder="Choisir une carte…"
                    accent="purple"
                  />
                  <button
                    type="button"
                    disabled={!revendeurCardRoleId}
                    onClick={() => revendeurCardRoleId && setCardModalRoleId(revendeurCardRoleId)}
                    className="mt-3 w-full rounded-xl bg-stone-900 py-3.5 text-white text-xs font-black disabled:opacity-40"
                  >
                    MONTRER LA CARTE
                  </button>
                </>
              )}
              {activePerturbatorRoleIds.length === 0 && (
                <p className="text-xs text-red-700 font-bold text-center">
                  Aucun Perturbateur actif disponible.
                </p>
              )}
            </div>
          )}

          {noticeMessage && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">{noticeMessage}</div>
          )}


        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-stone-200 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0 && !(currentStep.roleId === 'agent_sous_couverture' && agentFlowStep > 0)}
            className="w-12 h-12 rounded-xl border border-stone-300 bg-[#faf8f2] text-stone-700 flex items-center justify-center disabled:opacity-25"
            aria-label="Précédent"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center">
            {currentStep.roleId === 'agent_sous_couverture' && (isJunkieStep ? junkieAgentFlowStep : agentFlowStep) > 0 && (
              <button
                type="button"
                onClick={() => isJunkieStep ? setJunkieAgentFlowStep((prev) => Math.max(0, prev - 1)) : setAgentFlowStep((prev) => Math.max(0, prev - 1))}
                className="text-xs font-medium text-stone-500 underline"
              >
                Retour
              </button>
            )}
            {currentStep.roleId !== 'agent_sous_couverture' && (
              <button type="button" onClick={goNext} className="text-xs text-stone-400 underline">
                Passer
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goNext}
            className={`h-12 px-5 rounded-xl ${roleAccent.button} text-white font-black text-sm flex items-center gap-2 shadow-sm active:scale-[0.98]`}
          >
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {cardModalRoleId && <RoleCardModal roleId={cardModalRoleId} onClose={() => setCardModalRoleId(null)} />}

      <ValidationAlertModal
        isOpen={validationModal.isOpen}
        title={validationModal.title}
        message={validationModal.message}
        onClose={() => setValidationModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};