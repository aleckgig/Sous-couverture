import { DEFAULT_RULES_VALIDATION_ITEMS } from '../data/roles';
export const RULES_STORAGE_KEY = 'sous_couverture_rules_validation';

/** Les règles de Sous Couverture sont désormais canoniques et non configurables. */
export function getDefaultCanonRulesMap(): Record<string, string> { return {}; }
export function getSavedRuleOptions(): Record<string, string> { return {}; }
export function saveRuleOption(_ruleId: string, _value: string): void {}
export function saveAllRuleOptions(_rulesMap: Record<string, string>): void {}
export async function syncRulesFromServer(): Promise<Record<string, string>> { return {}; }

export function isPrisonerExcludedForPickpocket(): boolean { return true; }
export function canPrisonersVoteDuringDay(): boolean { return false; }
export function canRecruitPrisoners(): boolean { return false; }
export function isAgentImprisonmentImmediateGangWin(): boolean { return false; }
export function isCaidImmuneToPrison(): boolean { return false; }
export function canPrisonerInformantsParticipateInAvocate(): boolean { return false; }

void DEFAULT_RULES_VALIDATION_ITEMS;
