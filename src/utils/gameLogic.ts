import { Player, RoleId, NightStep, Team, StructuredRole } from '../types';
import { ROLES } from '../data/roles';
import {
  isPrisonerExcludedForPickpocket,
  isAgentImprisonmentImmediateGangWin,
  canPrisonerInformantsParticipateInAvocate,
} from './rulesConfig';

export interface GameComposition {
  agent: number; // Toujours 1
  gangStandard: number;
  perturbateurs: number;
}

export function getStandardComposition(playerCount: number): GameComposition {
  const count = Math.max(5, Math.min(17, playerCount));
  if (count <= 5) return { agent: 1, gangStandard: 3, perturbateurs: 1 };
  if (count === 6) return { agent: 1, gangStandard: 3, perturbateurs: 2 };
  if (count === 7) return { agent: 1, gangStandard: 4, perturbateurs: 2 };
  if (count === 8) return { agent: 1, gangStandard: 4, perturbateurs: 3 };
  if (count === 9) return { agent: 1, gangStandard: 5, perturbateurs: 3 };
  if (count === 10) return { agent: 1, gangStandard: 6, perturbateurs: 3 };
  if (count === 11) return { agent: 1, gangStandard: 6, perturbateurs: 4 };
  if (count === 12) return { agent: 1, gangStandard: 7, perturbateurs: 4 };
  if (count === 13) return { agent: 1, gangStandard: 8, perturbateurs: 4 };
  if (count === 14) return { agent: 1, gangStandard: 8, perturbateurs: 5 };
  return { agent: 1, gangStandard: 9, perturbateurs: 5 };
}

export function generateBalancedRandomRoles(count: number): RoleId[] {
  const comp = getStandardComposition(count);

  const perturbateursList = (Object.values(ROLES) as StructuredRole[])
    .filter((r) => r.isPerturbateur && r.id !== 'agent_sous_couverture')
    .map((r) => r.id);

  const gangStandardList = (Object.values(ROLES) as StructuredRole[])
    .filter((r) => !r.isPerturbateur && r.id !== 'agent_sous_couverture')
    .map((r) => r.id);

  const shuffledPerturbateurs = [...perturbateursList].sort(() => Math.random() - 0.5);
  const shuffledGang = [...gangStandardList].sort(() => Math.random() - 0.5);

  const selected: RoleId[] = ['agent_sous_couverture'];

  selected.push(...shuffledPerturbateurs.slice(0, comp.perturbateurs));
  selected.push(...shuffledGang.slice(0, comp.gangStandard));

  // If there are still seats remaining, fill with any remaining gang roles
  while (selected.length < count && shuffledGang.length > comp.gangStandard) {
    selected.push(shuffledGang[selected.length - 1]);
  }

  return selected.sort(() => Math.random() - 0.5);
}

/**
 * Calcule les 2 voisins vivants et libres (non en prison) dans le cercle des sièges.
 */
export function getLivingNeighbors(
  players: Player[],
  currentSeatNumber: number,
  excludePrisoners: boolean = true
): Player[] {
  if (players.length < 3) return [];

  const sorted = [...players].sort((a, b) => a.seatNumber - b.seatNumber);
  const eligible = sorted.filter((p) => p.isAlive && (!excludePrisoners || !p.isPrisoner));
  if (eligible.length <= 1) return [];

  const currentIndex = eligible.findIndex((p) => p.seatNumber === currentSeatNumber);
  if (currentIndex === -1) {
    // Le joueur est peut-être lui-même en prison ou mort, on cherche le plus proche
    return [];
  }

  const leftIndex = (currentIndex - 1 + eligible.length) % eligible.length;
  const rightIndex = (currentIndex + 1) % eligible.length;

  return [eligible[leftIndex], eligible[rightIndex]];
}

/**
 * Calcule le nombre de voisins appartenant aux Forces de l'ordre pour le Pickpocket.
 * Règle spéciale Arnaqueuse : apparaît inversée !
 */
export function getPickpocketForcesDeLOrdreCount(
  players: Player[],
  pickpocketPlayer: Player,
  excludePrisoners: boolean = isPrisonerExcludedForPickpocket()
): { count: number; neighbors: Player[] } {
  const neighbors = getLivingNeighbors(players, pickpocketPlayer.seatNumber, excludePrisoners);
  let count = 0;

  for (const n of neighbors) {
    const isArnaqueuse = n.roleId === 'arnaqueuse';
    // Équipe réelle :
    const realTeamIsForces = n.currentTeam === 'Forces de l\'ordre';

    let perceivedAsForces = realTeamIsForces;
    if (isArnaqueuse) {
      // Inverse son camp perçu
      perceivedAsForces = !realTeamIsForces;
    }

    if (perceivedAsForces) {
      count++;
    }
  }

  return { count, neighbors };
}

/**
 * Nombre d'Informateurs actuellement dans la partie.
 */
export function getInformantsCount(players: Player[]): number {
  return players.filter((p) => p.isInformateur && p.isAlive).length;
}

/**
 * Nombre de membres du Gang possédant un pouvoir perturbateur.
 */
export function getPerturbateursCount(players: Player[]): number {
  return players.filter((p) => {
    const role = ROLES[p.roleId];
    return p.currentTeam === 'Gang' && role?.isPerturbateur;
  }).length;
}

/**
 * Génération de la séquence d'étapes de nuit pour le jeu Sous Couverture.
 */
export function generateNightSteps(
  isFirstNight: boolean,
  players: Player[],
  options?: {
    lastExecutedRole?: RoleId;
    recruitmentAcceptedTonight?: boolean;
    avocatPlaidoyerActive?: boolean;
    faussePistePlayerId?: string;
    rules?: Record<string, string>;
  }
): NightStep[] {
  const steps: NightStep[] = [];

  const getPlayer = (roleId: RoleId): Player | undefined => {
    return players.find((p) => p.roleId === roleId && p.isAlive && !p.isPrisoner);
  };

  // 1. Chimiste (order 5)
  const chimiste = getPlayer('chimiste');
  if (chimiste) {
    steps.push({
      roleId: 'chimiste',
      title: 'Le Chimiste (Information faussée)',
      order: 5,
      instruction: 'Réveillez le Chimiste. Il pointe 1 joueur dont l\'information sera délibérément faussée cette nuit.',
      reminder: 'Si cette personne reçoit une information cette nuit, l\'application l\'indiquera et le Conteur devra mentir.',
      actionType: 'select_player',
      activePlayerIds: [chimiste.id],
    });
  }

  // 2. Apprenti (order 10)
  const apprenti = getPlayer('apprenti');
  if (apprenti) {
    steps.push({
      roleId: 'apprenti',
      title: 'L\'Apprenti (Vote lié)',
      order: 10,
      instruction: 'Réveillez l\'Apprenti. Il pointe 1 joueur. Le lendemain lors du vote, il devra voter pour la même personne que ce joueur.',
      reminder: 'Ce choix est secret. L\'Apprenti a l\'obligation stricte de suivre le vote de cette cible demain.',
      actionType: 'select_player',
      activePlayerIds: [apprenti.id],
    });
  }

  // 3. Garde du corps (order 15)
  const garde = getPlayer('garde_du_corps');
  if (garde) {
    steps.push({
      roleId: 'garde_du_corps',
      title: 'Le Garde du corps (Protection nocturne)',
      order: 15,
      instruction: 'Réveillez le Garde du corps. Il pointe 1 joueur à protéger contre la prison cette nuit.',
      reminder: 'Si l\'Agent sous couverture tente d\'envoyer ce joueur en prison cette nuit, l\'arrestation échoue. Le Garde du corps ne sait pas si sa protection a servi.',
      actionType: 'select_player',
      activePlayerIds: [garde.id],
    });
  }

  // 4. Agent sous couverture (order 20)
  const agent = getPlayer('agent_sous_couverture');
  if (agent) {
    if (isFirstNight) {
      steps.push({
        roleId: 'agent_sous_couverture',
        title: 'Agent sous couverture (Recrutement Nuit 1)',
        order: 20,
        instruction: 'Réveillez l\'Agent sous couverture. Il pointe 1 joueur à recruter (ou passe son tour). La prison est désactivée la 1ère nuit.',
        reminder: 'Rappelez à l\'Agent qu\'il ne peut PAS emprisonner la première nuit. S\'il recrute, demandez ensuite secrètement à la cible si elle accepte.',
        actionType: 'agent_choice',
        activePlayerIds: [agent.id],
      });
    } else {
      steps.push({
        roleId: 'agent_sous_couverture',
        title: 'Agent sous couverture (Recrutement ou Prison)',
        order: 20,
        instruction: 'L\'Agent sous couverture choisit soit de recruter 1 joueur, soit d\'en envoyer 1 en prison (ou ne rien faire).',
        reminder: 'Choix exclusif : recruter OU envoyer en prison. Le Chauffeur et la cible protégée par le Garde du corps ne peuvent pas être emprisonnés. L\'Homme de main refuse toujours le recrutement.',
        actionType: 'agent_choice',
        activePlayerIds: [agent.id],
      });
    }
  }

  // 4.5 L'Avocate véreuse (order 22 - si plaidoyer activé le jour)
  if (!isFirstNight && options?.avocatPlaidoyerActive) {
    const allowPrisoners = options?.rules
      ? options.rules['rule_avocat_prisoners'] !== 'free_only'
      : canPrisonerInformantsParticipateInAvocate();
    const informants = players.filter((p) => p.isInformateur && p.isAlive && (allowPrisoners || !p.isPrisoner));
    if (informants.length > 0) {
      steps.push({
        roleId: 'avocat_vereux',
        title: 'L\'Avocate véreuse (Plaidoyer — Choix des Informateurs)',
        order: 22,
        instruction: 'L\'Avocate véreuse a fait son plaidoyer aujourd\'hui. Réveillez chaque Informateur un par un et demandez-lui en secret s\'il souhaite réintégrer le Gang.',
        reminder: `Chaque Informateur décide secrètement s'il quitte les Forces de l'ordre pour revenir dans le Gang (${allowPrisoners ? 'Informateurs libres et détenus inclus' : 'seuls les Informateurs libres participent'}). Aucun résultat n'est révélé publiquement.`,
        actionType: 'avocat_informateurs_choice',
        activePlayerIds: informants.map((p) => p.id),
      });
    }
  }

  // 5. Le Trafiquant (order 25 - 1ère nuit seulement)
  if (isFirstNight) {
    const revendeur = getPlayer('revendeur_armes');
    if (revendeur) {
      const pertCount = getPerturbateursCount(players);
      steps.push({
        roleId: 'revendeur_armes',
        title: 'Le Trafiquant (Compte des perturbateurs)',
        order: 25,
        instruction: `Réveillez le Trafiquant. Montrez-lui avec vos doigts le nombre de membres du Gang ayant un pouvoir perturbateur (${pertCount}).`,
        reminder: `Nombre exact calculé : ${pertCount} perturbateur(s) dans le Gang.`,
        actionType: 'info_only',
        activePlayerIds: [revendeur.id],
      });
    }
  }

  // 6. Hacker (order 30)
  const hacker = getPlayer('hacker');
  if (hacker) {
    steps.push({
      roleId: 'hacker',
      title: 'Le Hacker (Détection & Fausse piste)',
      order: 30,
      instruction: 'Réveillez le Hacker. Il pointe 2 joueurs. Indiquez OUI de la tête si l\'Agent sous couverture ou la Fausse piste est parmi eux, sinon NON.',
      reminder: 'Le Hacker ne distingue pas l\'Agent sous couverture de la Fausse piste. L\'application calcule automatiquement la réponse.',
      actionType: 'select_two_players',
      activePlayerIds: [hacker.id],
    });
  }

  // 7. Blanchisseur (order 35)
  const blanchisseur = getPlayer('blanchisseur');
  if (blanchisseur) {
    const currentInformants = getInformantsCount(players);
    steps.push({
      roleId: 'blanchisseur',
      title: 'Le Blanchisseur (Nombre d\'Informateurs)',
      order: 35,
      instruction: `Réveillez le Blanchisseur. Montrez-lui avec vos doigts le nombre d'Informateurs actuellement en jeu (${currentInformants}).`,
      reminder: `Nombre exact d'Informateurs : ${currentInformants}.`,
      actionType: 'info_only',
      activePlayerIds: [blanchisseur.id],
    });
  }

  // 8. Le Revendeur d'armes (order 40)
  const trafiquant = getPlayer('trafiquant');
  if (trafiquant) {
    const accepted = !!options?.recruitmentAcceptedTonight;
    steps.push({
      roleId: 'trafiquant',
      title: 'Le Revendeur d\'armes (Recrutement accepté cette nuit)',
      order: 40,
      instruction: `Réveillez le Revendeur d'armes. Indiquez ${accepted ? 'OUI' : 'NON'} de la tête pour lui dire si un recrutement a été accepté cette nuit.`,
      reminder: `Statut de recrutement cette nuit : ${accepted ? 'OUI (un membre a accepté)' : 'NON (aucun recrutement accepté)'}.`,
      actionType: 'info_only',
      activePlayerIds: [trafiquant.id],
    });
  }

  // 9. La Nettoyeuse (order 45 - Nuit 2+)
  if (!isFirstNight) {
    const nettoyeur = getPlayer('nettoyeur');
    if (nettoyeur) {
      const roleExecuted = options?.lastExecutedRole ? ROLES[options.lastExecutedRole] : undefined;
      steps.push({
        roleId: 'nettoyeur',
        title: 'La Nettoyeuse (Rôle du dernier exécuté)',
        order: 45,
        instruction: roleExecuted
          ? `Réveillez la Nettoyeuse. Montrez-lui la carte du rôle exécuté le jour précédent : ${roleExecuted.nom}.`
          : 'Réveillez la Nettoyeuse. Faites un signe négatif de la tête (aucune exécution n\'a eu lieu le jour précédent).',
        reminder: roleExecuted
          ? `Dernier exécuté : ${roleExecuted.nom} (${roleExecuted.camp_initial})`
          : 'Aucune exécution enregistrée au tour précédent.',
        actionType: 'info_only',
        activePlayerIds: [nettoyeur.id],
      });
    }
  }

  // 10. Pickpocket (order 50)
  const pickpocket = getPlayer('pickpocket');
  if (pickpocket) {
    const excludePrisoners = options?.rules
      ? options.rules['rule_pickpocket_prisoners'] !== 'include'
      : isPrisonerExcludedForPickpocket();
    const { count, neighbors } = getPickpocketForcesDeLOrdreCount(players, pickpocket, excludePrisoners);
    const neighborNames = neighbors.map((n) => n.name).join(' & ');
    steps.push({
      roleId: 'pickpocket',
      title: 'Le Pickpocket (Voisins Forces de l\'ordre)',
      order: 50,
      instruction: `Réveillez le Pickpocket. Montrez-lui avec vos doigts (0, 1 ou 2) combien de ses 2 voisins les plus proches sont des Forces de l'ordre (${count}).`,
      reminder: `Nombre exact calculé : ${count} voisin(s) Forces de l'ordre (voisins pris en compte : ${neighborNames || 'aucun'} ; ${excludePrisoners ? 'prisonniers exclus' : 'prisonniers inclus'} ; Informateurs et Agent comptent ; L'Arnaqueuse apparaît inversée).`,
      actionType: 'info_only',
      activePlayerIds: [pickpocket.id],
    });
  }

  return steps.sort((a, b) => a.order - b.order);
}

/**
 * Vérification des conditions de victoire pour Sous Couverture.
 */
export function checkVictory(
  players: Player[],
  lastExecutionPlayerId?: string
): { winner: 'Gang' | 'Forces de l\'ordre'; reason: string } | null {
  const livingPlayers = players.filter((p) => p.isAlive);
  const agent = players.find((p) => p.roleId === 'agent_sous_couverture');

  // Condition 1 : L'Agent sous couverture est mort (exécuté par vote ou abattu par le Tueur à gages)
  if (agent && !agent.isAlive) {
    return {
      winner: 'Gang',
      reason: 'L\'Agent sous couverture a été neutralisé ! Le Gang l\'emporte et garde le contrôle total de la ville.',
    };
  }

  // Condition 1bis : L'Agent sous couverture est en prison (règle canon agent_in_prison)
  if (agent && agent.isPrisoner && isAgentImprisonmentImmediateGangWin()) {
    return {
      winner: 'Gang',
      reason: 'L\'Agent sous couverture a été incarcéré en prison ! Sans leur infiltration opérationnelle pour diriger l\'enquête, la police perd le contrôle et le Gang triomphe.',
    };
  }

  // Condition 2 : Le Caïd est exécuté par vote du Gang
  if (lastExecutionPlayerId) {
    const executedPlayer = players.find((p) => p.id === lastExecutionPlayerId);
    if (executedPlayer && executedPlayer.roleId === 'caid') {
      return {
        winner: 'Forces de l\'ordre',
        reason: 'Le Gang a exécuté son propre Caïd lors du vote ! Selon la règle, le Gang perd immédiatement la partie.',
      };
    }
  }

  // Condition 3 : Les Forces de l'ordre (Agent + Informateurs vivants et libres) atteignent la parité ou dépassent le Gang loyal libre
  const loyalGangLivingAndFree = livingPlayers.filter(
    (p) => p.currentTeam === 'Gang' && !p.isPrisoner
  ).length;

  const forcesLivingAndFree = livingPlayers.filter(
    (p) => p.currentTeam === 'Forces de l\'ordre' && !p.isPrisoner
  ).length;

  if (loyalGangLivingAndFree === 0) {
    return {
      winner: 'Forces de l\'ordre',
      reason: 'Tous les membres actifs du Gang sont emprisonnés ou ont rallié les Forces de l\'ordre ! Victoire des Forces de l\'ordre.',
    };
  }

  // S'il ne reste que 2 joueurs vivants au total et l'un est l'Agent
  if (livingPlayers.length <= 2 && agent && agent.isAlive && !agent.isPrisoner) {
    return {
      winner: 'Forces de l\'ordre',
      reason: 'L\'étau s\'est refermé sur le Gang ! L\'Agent sous couverture et ses informateurs ont le contrôle.',
    };
  }

  return null;
}

export const generateBalancedSousCouvertureRoles = generateBalancedRandomRoles;
export const getRecommendedGangComposition = getStandardComposition;
