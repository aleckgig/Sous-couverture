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
    return n.roleId === 'arnaqueuse' ? !realForces : realForces;
  }).length;
  return { count, neighbors };
}

export function getInformantsCount(players: Player[]): number {
  return players.filter(p => p.isInformateur && p.isAlive && !p.isPrisoner).length;
}

export function getPerturbateursCount(players: Player[]): number {
  return players.filter(p => p.currentTeam === 'Gang' && ROLES[p.roleId]?.isPerturbateur && p.isAlive && !p.isPrisoner).length;
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
  const active = (roleId: RoleId) => players.find(p => p.roleId === roleId && p.isAlive && !p.isPrisoner);

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
  return steps.sort((a, b) => a.order - b.order);
}

export function checkVictory(players: Player[], lastExecutionPlayerId?: string): { winner: 'Gang' | 'Forces de l\'ordre'; reason: string } | null {
  if (lastExecutionPlayerId) {
    const executed = players.find(p => p.id === lastExecutionPlayerId);
    if (executed?.roleId === 'caid') {
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
