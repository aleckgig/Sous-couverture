import { Player, RoleId, NightStep, StructuredRole } from '../types';
import { ROLES } from '../data/roles';

export interface GameComposition {
  agent: number;
  gangStandard: number;
  perturbateurs: number;
}

export function getStandardComposition(playerCount: number): GameComposition {
  const count = Math.max(5, Math.min(17, playerCount));
  const perturbateurs = count <= 5 ? 1 : count <= 6 ? 2 : count <= 10 ? 3 : count <= 13 ? 4 : 5;
  return { agent: 1, gangStandard: count - 1 - perturbateurs, perturbateurs };
}

export function generateBalancedRandomRoles(count: number): RoleId[] {
  const comp = getStandardComposition(count);
  const perturbateurs = Object.values(ROLES).filter(r => r.isPerturbateur).map(r => r.id);
  const standards = Object.values(ROLES).filter(r => !r.isPerturbateur && r.id !== 'agent_sous_couverture').map(r => r.id);
  const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
  return shuffle([
    'agent_sous_couverture',
    ...shuffle(perturbateurs).slice(0, comp.perturbateurs),
    ...shuffle(standards).slice(0, comp.gangStandard),
  ]);
}

export function getLivingNeighbors(players: Player[], currentSeatNumber: number): Player[] {
  const active = [...players]
    .filter(p => p.isAlive && !p.isPrisoner)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  if (active.length <= 1) return [];
  const index = active.findIndex(p => p.seatNumber === currentSeatNumber);
  if (index < 0) return [];
  return [
    active[(index - 1 + active.length) % active.length],
    active[(index + 1) % active.length],
  ];
}

export function getPickpocketForcesDeLOrdreCount(
  players: Player[], pickpocketPlayer: Player
): { count: number; neighbors: Player[] } {
  const neighbors = getLivingNeighbors(players, pickpocketPlayer.seatNumber);
  const count = neighbors.filter(n => {
    const realForces = n.currentTeam === 'Forces de l\'ordre';
    return !n.isInformateur && (n.roleId === 'arnaqueuse' || n.perceivedRoleId === 'arnaqueuse') ? !realForces : realForces;
  }).length;
  return { count, neighbors };
}

export function getInformantsCount(players: Player[]): number {
  return players.filter(p => p.isInformateur && p.isAlive && !p.isPrisoner).length;
}

export function getPerturbateursCount(players: Player[]): number {
  return players.filter(p => p.currentTeam === 'Gang' && ROLES[p.roleId]?.isPerturbateur && p.isAlive && !p.isPrisoner).length;
}

export function getActivePerturbatorRoleIds(players: Player[]): RoleId[] {
  const ids = players
    .filter((p) => p.isAlive && !p.isPrisoner && ROLES[p.roleId]?.isPerturbateur)
    .map((p) => p.roleId);
  return Array.from(new Set(ids));
}

export function getActivePlayers(players: Player[]): Player[] {
  return players.filter(p => p.isAlive && !p.isPrisoner);
}

export function generateNightSteps(
  isFirstNight: boolean,
  players: Player[],
  options?: {
    lastExecutedRole?: RoleId;
    recruitmentAcceptedTonight?: boolean;
    avocatPlaidoyerActive?: boolean;
    faussePistePlayerId?: string;
  }
): NightStep[] {
  const steps: NightStep[] = [];
  const active = (roleId: RoleId) => players.find(p => p.roleId === roleId && p.isAlive && !p.isPrisoner && !p.isInformateur);

  const push = (roleId: RoleId, order: number, title: string, instruction: string, actionType: NightStep['actionType'], reminder?: string) => {
    const p = active(roleId);
    if (!p) return;
    steps.push({ roleId, order, title, instruction, reminder, actionType, activePlayerIds: [p.id] });
  };

  push('chimiste', 5, 'Le Chimiste', 'Réveillez le Chimiste. Il choisit 1 joueur à empoisonner.', 'select_player',
    'Le joueur sera affecté jusqu’à la prochaine nuit. Ses informations seront fausses et ses actions réelles échoueront silencieusement.');
  push('avocat_vereux', 10, 'L’Avocate', 'Réveillez l’Avocate. Elle choisit 1 joueur à protéger contre la prison cette nuit.', 'select_player',
    'La protection échoue si l’Avocate est empoisonnée.');
  push('apprenti', 15, 'L’Apprenti', 'Réveillez l’Apprenti. Il choisit secrètement 1 joueur à suivre lors du vote de demain.', 'select_player');
  if (isFirstNight) {
    push('revendeur_armes', 20, 'Le Revendeur d’armes', 'Montrez au Revendeur d’armes une carte Perturbateur actuellement en jeu.', 'info_only');
  }
  push('agent_sous_couverture', 30, isFirstNight ? 'Agent sous couverture' : 'Agent sous couverture',
    isFirstNight
      ? 'L’Agent choisit de recruter 1 membre du Gang ou de ne rien faire.'
      : 'L’Agent choisit de recruter 1 membre du Gang, d’en envoyer 1 en prison ou de ne rien faire.',
    'agent_choice',
    isFirstNight ? 'La prison est impossible la première nuit.' : 'Maximum 2 Informateurs. Les prisonniers sont exclus des cibles. Le Chauffeur ne peut pas être emprisonné.');
  push('trafiquant', 40, 'Le Trafiquant', 'Indiquez au Trafiquant OUI si au moins une personne a accepté un recrutement cette nuit, sinon NON.', 'info_only',
    options?.recruitmentAcceptedTonight ? 'OUI : au moins un recrutement a été accepté.' : 'NON : aucun recrutement accepté.');
  push('blanchisseur', 50, 'Le Blanchisseur', 'Indiquez au Blanchisseur le nombre actuel d’Informateurs.', 'info_only',
    `Nombre actuel : ${getInformantsCount(players)}.`);
  if (!isFirstNight) {
    const roleExecuted = options?.lastExecutedRole ? ROLES[options.lastExecutedRole] : undefined;
    push('nettoyeur', 60, 'La Nettoyeuse',
      roleExecuted ? `Montrez à la Nettoyeuse la carte de ${roleExecuted.nom}.` : 'Indiquez à la Nettoyeuse qu’aucune exécution par vote n’a eu lieu hier.',
      'info_only');
  }
  const pick = active('pickpocket');
  if (pick) {
    const { count } = getPickpocketForcesDeLOrdreCount(players, pick);
    steps.push({ roleId: 'pickpocket', order: 70, title: 'Le Pickpocket',
      instruction: `Indiquez au Pickpocket ${count} (0, 1 ou 2).`,
      reminder: `Nombre calculé : ${count}. Prisonniers/exécutés exclus de la chaîne des voisins.`,
      actionType: 'info_only', activePlayerIds: [pick.id] });
  }
  push('hacker', 80, 'Le Hacker', 'Le Hacker choisit 2 joueurs. Répondez OUI si l’Agent ou la Fausse piste est parmi eux, sinon NON.', 'select_two_players',
    'La réponse est OUI si l’un des deux joueurs est l’Agent ou la Fausse piste.');

  // The Junkie performs the nightly action of the role shown on their false card.
  // Their real role remains "Junkie"; only the simulated power is used here.
  const junkie = players.find(p =>
    p.roleId === 'junkie' && p.isAlive && !p.isPrisoner && !p.isInformateur && p.perceivedRoleId && p.perceivedRoleId !== 'junkie'
  );
  const perceived = junkie?.perceivedRoleId ? ROLES[junkie.perceivedRoleId] : undefined;

  if (junkie && perceived) {
    const order = (isFirstNight ? perceived.firstNightOrder : perceived.eachNightOrder) ?? 100;
    const pushJunkie = (
      roleId: RoleId,
      instruction: string,
      actionType: NightStep['actionType'],
      reminder?: string,
      stepOrder = order
    ) => {
      steps.push({
        roleId,
        order: stepOrder + 0.5,
        title: `Le Junkie — croit être ${perceived.nom}`,
        instruction,
        reminder,
        actionType,
        activePlayerIds: [junkie.id],
        isJunkieSimulation: true,
        realRoleId: 'junkie',
      });
    };

    switch (junkie.perceivedRoleId) {
      case 'chimiste':
        pushJunkie('chimiste',
          'Le pouvoir du Junkie est réel : il choisit 1 joueur à empoisonner. Appliquez normalement l’empoisonnement.',
          'select_player',
          '⚠️ FAUSSE IDENTITÉ : le Junkie croit être Le Chimiste. Si le Junkie est empoisonné, son action échoue silencieusement.');
        break;
      case 'avocat_vereux':
        pushJunkie('avocat_vereux',
          'Le pouvoir du Junkie est réel : il choisit 1 joueur à protéger contre la prison cette nuit.',
          'select_player',
          '⚠️ FAUSSE IDENTITÉ : le Junkie croit être L’Avocate. Si le Junkie est empoisonné, la protection échoue silencieusement.');
        break;
      case 'apprenti':
        pushJunkie('apprenti',
          'Le pouvoir du Junkie est réel : il choisit 1 joueur à suivre lors du vote de demain.',
          'select_player',
          '⚠️ FAUSSE IDENTITÉ : le Junkie croit être L’Apprenti. Si le Junkie est empoisonné, son action échoue silencieusement.');
        break;
      case 'revendeur_armes':
        if (isFirstNight) {
          pushJunkie('revendeur_armes',
            '⚠️ FAUSSE INFORMATION : montrez au Junkie une carte Perturbateur actuellement en jeu, mais pas la carte qui devrait lui être donnée.',
            'info_only',
            'Le Junkie croit être Le Revendeur d’armes. La révélation doit être fausse.');
        }
        break;
      case 'agent_sous_couverture':
        pushJunkie('agent_sous_couverture',
          isFirstNight
            ? 'Le pouvoir du Junkie est réel : il choisit de recruter 1 membre du Gang ou de ne rien faire.'
            : 'Le pouvoir du Junkie est réel : il choisit de recruter 1 membre du Gang, d’en envoyer 1 en prison ou de ne rien faire.',
          'agent_choice',
          '⚠️ FAUSSE IDENTITÉ : le Junkie croit être l’Agent sous couverture. Si le Junkie est empoisonné, son action échoue silencieusement.');
        break;
      case 'trafiquant':
        pushJunkie('trafiquant',
          '⚠️ FAUSSE INFORMATION : indiquez au Junkie si au moins une personne a accepté un recrutement cette nuit. La réponse doit être fausse.',
          'info_only',
          'Le Junkie croit être Le Trafiquant. Sa donnée doit être fausse.');
        break;
      case 'blanchisseur':
        pushJunkie('blanchisseur',
          '⚠️ FAUSSE INFORMATION : indiquez au Junkie un nombre incorrect d’Informateurs.',
          'info_only',
          'Le Junkie croit être Le Blanchisseur. Sa donnée doit être fausse.');
        break;
      case 'nettoyeur':
        if (!isFirstNight) {
          pushJunkie('nettoyeur',
            '⚠️ FAUSSE INFORMATION : montrez au Junkie une carte de rôle incorrecte pour l’exécution précédente.',
            'info_only',
            'Le Junkie croit être La Nettoyeuse. La carte montrée doit être fausse.');
        }
        break;
      case 'pickpocket':
        pushJunkie('pickpocket',
          '⚠️ FAUSSE INFORMATION : indiquez au Junkie 0, 1 ou 2, mais la valeur doit être incorrecte.',
          'info_only',
          'Le Junkie croit être Le Pickpocket. La donnée doit être fausse.');
        break;
      case 'hacker':
        pushJunkie('hacker',
          'Le Junkie choisit 2 joueurs. ⚠️ FAUSSE INFORMATION : répondez OUI ou NON, mais la réponse doit être fausse.',
          'select_two_players',
          'Le Junkie croit être Le Hacker. Le résultat de son investigation doit être faux.');
        break;
      default:
        // Passive/day roles do not create a night step.
        break;
    }
  }

  return steps.sort((a, b) => a.order - b.order);
}

export function checkVictory(players: Player[], lastExecutionPlayerId?: string): { winner: 'Gang' | 'Forces de l\'ordre'; reason: string } | null {
  if (lastExecutionPlayerId) {
    const executed = players.find(p => p.id === lastExecutionPlayerId);
    if (!executed?.isInformateur && (executed?.roleId === 'caid' || executed?.perceivedRoleId === 'caid')) {
      return { winner: 'Forces de l\'ordre', reason: 'Le Caïd a été exécuté par vote. Le Gang perd immédiatement.' };
    }
  }

  const active = getActivePlayers(players);
  const forces = active.filter(p => p.currentTeam === 'Forces de l\'ordre').length;
  const gang = active.filter(p => p.currentTeam === 'Gang').length;

  if (forces === 0) {
    return { winner: 'Gang', reason: 'Il ne reste aucune Force de l’ordre active.' };
  }
  if (forces >= gang) {
    return { winner: 'Forces de l\'ordre', reason: 'Les Forces de l’ordre sont au moins aussi nombreuses que le Gang parmi les joueurs actifs.' };
  }
  return null;
}

export const generateBalancedSousCouvertureRoles = generateBalancedRandomRoles;
export const getRecommendedGangComposition = getStandardComposition;
