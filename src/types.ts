export type Team = 'Gang' | 'Forces de l\'ordre';

export type RoleCategory = 'Gang' | 'Perturbateur' | 'Forces de l\'ordre';

export type RoleId =
  | 'agent_sous_couverture'
  | 'hacker'
  | 'blanchisseur'
  | 'trafiquant'
  | 'nettoyeur'
  | 'pickpocket'
  | 'tueur_a_gages'
  | 'apprenti'
  | 'garde_du_corps'
  | 'chauffeur'
  | 'caid'
  | 'chimiste'
  | 'junkie'
  | 'arnaqueuse'
  | 'avocat_vereux'
  | 'revendeur_armes'
  | 'homme_de_main';

export type MomentDuPouvoir =
  | 'chaque_nuit'
  | 'premiere_nuit'
  | 'chaque_nuit_sauf_premiere'
  | 'jour'
  | 'passif'
  | 'conditionnel';

export type TypeDePouvoir =
  | 'recrutement_ou_prison'
  | 'detection'
  | 'compte'
  | 'information'
  | 'protection'
  | 'elimination'
  | 'perturbation'
  | 'immunite'
  | 'conversion'
  | 'tromperie';

export interface StructuredRole {
  id: RoleId;
  nom: string;
  camp_initial: Team;
  image?: string;
  icone: string;
  description: string;
  type_de_pouvoir: TypeDePouvoir;
  moment_du_pouvoir: MomentDuPouvoir;
  cible: string;
  frequence: string;
  restrictions?: string;
  informations_reçues?: string;
  effets: string;
  isPerturbateur: boolean;
  firstNightOrder?: number;
  eachNightOrder?: number;
  firstNightInstruction?: string;
  eachNightInstruction?: string;
  setupNote?: string;
  // Convenience aliases for backward compatibility with UI components
  name?: string;
  type?: string;
  team?: string;
  camp?: string;
  effet?: string;
  noteConteur?: string;
}

// Backward compatibility alias for UI components
export type Role = StructuredRole;

export interface Player {
  id: string;
  name: string;
  seatNumber: number;
  roleId: RoleId;
  perceivedRoleId?: RoleId; // For Junkie who thinks they are another role
  currentTeam: Team; // 'Gang' or 'Forces de l\'ordre' (Informateur or Agent)
  isInformateur: boolean; // Recruited gang member
  isPrisoner: boolean; // Currently in prison
  isAlive: boolean; // Alive or executed/killed
  isProtected: boolean; // Protected tonight by Garde du corps
  isInformationPoisoned: boolean; // Targeted by Chimiste tonight
  isFaussePiste: boolean; // Designated false lead for Hacker
  linkedVoteTargetId?: string; // Apprenti's target to mimic next day
  deathReason?: 'execution' | 'tueur_a_gages' | 'other';
  notes?: string;
}

export type GamePhase =
  | 'setup_player_count'
  | 'setup_roles'
  | 'setup_players'
  | 'night'
  | 'day'
  | 'game_over';

export type NightActionType =
  | 'agent_choice' // Recruter ou Prison
  | 'select_player'
  | 'select_two_players'
  | 'info_only'
  | 'avocat_informateurs_choice';

export interface NightStep {
  roleId: RoleId;
  title: string;
  order: number;
  instruction: string;
  reminder?: string;
  actionType: NightActionType;
  activePlayerIds?: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  phase: string;
  dayOrNightNumber: number;
  text: string;
  type: 'info' | 'prison' | 'death' | 'recruitment' | 'protection' | 'action' | 'victory';
}

export type GameMode = 'physical' | 'phone';

export interface ConnectedPlayer {
  id: string;
  name: string;
  joinedAt?: number;
  isReady?: boolean;
}

export interface PlayerSecretViewData {
  roomCode: string;
  storytellerName: string;
  status: 'lobby' | 'playing' | 'ended';
  player: {
    id: string;
    name: string;
    seatNumber?: number;
    roleId?: RoleId;
    perceivedRoleId?: RoleId;
    currentTeam: Team;
    isInformateur: boolean;
    isPrisoner: boolean;
    isAlive: boolean;
    isReady?: boolean;
    agentSousCouvertureName?: string; // Revealed ONLY if Informateur or Agent!
  };
  allLivingPlayers: {
    id: string;
    name: string;
    seatNumber?: number;
    isAlive: boolean;
    isPrisoner: boolean;
  }[];
  gameState?: {
    phase: string;
    dayCount: number;
    nightCount: number;
    lastAnnouncement?: string;
    winner?: string;
  } | null;
}

export interface RuleValidationItem {
  id: string;
  title: string;
  question: string;
  currentRule: string;
  options: { label: string; value: string }[];
  selectedOption: string;
}


