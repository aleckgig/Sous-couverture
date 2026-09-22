import { DEFAULT_RULES_VALIDATION_ITEMS } from '../data/roles';
import { RuleValidationItem } from '../types';

export const RULES_STORAGE_KEY = 'sous_couverture_rules_validation';

/**
 * Retourne la table canonique des options de règles par défaut
 */
export function getDefaultCanonRulesMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of DEFAULT_RULES_VALIDATION_ITEMS) {
    map[item.id] = item.selectedOption;
  }
  return map;
}

/**
 * Récupère les règles actives depuis le stockage local ou les valeurs par défaut
 */
export function getSavedRuleOptions(): Record<string, string> {
  const defaults = getDefaultCanonRulesMap();
  try {
    const saved = localStorage.getItem(RULES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    // ignore
  }
  return defaults;
}

/**
 * Sauvegarde une option de règle dans localStorage et synchronise avec le serveur
 */
export function saveRuleOption(ruleId: string, value: string): void {
  const current = getSavedRuleOptions();
  current[ruleId] = value;
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    // ignore
  }

  // Tente de synchroniser avec l'API serveur en arrière-plan
  try {
    fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: current }),
    }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

/**
 * Sauvegarde la totalité du dictionnaire de règles
 */
export function saveAllRuleOptions(rulesMap: Record<string, string>): void {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rulesMap));
  } catch (e) {
    // ignore
  }

  try {
    fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: rulesMap }),
    }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

/**
 * Synchronise les règles depuis le serveur au démarrage si disponible
 */
export async function syncRulesFromServer(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/rules');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.rules && typeof data.rules === 'object') {
        const merged = { ...getDefaultCanonRulesMap(), ...getSavedRuleOptions(), ...data.rules };
        try {
          localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}
        return merged;
      }
    }
  } catch (e) {
    // ignore
  }
  return getSavedRuleOptions();
}

// -------------------------------------------------------------
// Prédicats natifs pour l'arbitrage en jeu
// -------------------------------------------------------------

/**
 * Règle Pickpocket : Seuls les vivants et libres comptent (exclut les prisonniers) ?
 */
export function isPrisonerExcludedForPickpocket(): boolean {
  const options = getSavedRuleOptions();
  return options['rule_pickpocket_prisoners'] !== 'include';
}

/**
 * Règle Prisonnier Vote : Les prisonniers ont-ils le droit de voter de jour ?
 */
export function canPrisonersVoteDuringDay(): boolean {
  const options = getSavedRuleOptions();
  return options['rule_prison_vote'] === 'can_vote';
}

/**
 * Règle Recrutement en Prison : L'Agent sous couverture peut-il négocier un recrutement avec un détenu en cellule ?
 */
export function canRecruitPrisoners(): boolean {
  const options = getSavedRuleOptions();
  return options['rule_prison_recruit'] !== 'forbidden';
}

/**
 * Règle Agent Incarcéré : L'emprisonnement de l'Agent entraîne-t-il la victoire immédiate du Gang ?
 */
export function isAgentImprisonmentImmediateGangWin(): boolean {
  const options = getSavedRuleOptions();
  return options['rule_agent_in_prison'] !== 'informants_continue';
}

/**
 * Règle Caïd Incarcéré : Le Caïd est-il immunisé contre l'envoi en prison ?
 */
export function isCaidImmuneToPrison(): boolean {
  const options = getSavedRuleOptions();
  return options['rule_caid_prison'] === 'immune';
}

/**
 * Règle Avocate véreuse : Les informateurs en prison peuvent-ils répondre au plaidoyer ?
 */
export function canPrisonerInformantsParticipateInAvocate(): boolean {
  const options = getSavedRuleOptions();
  return options['rule_avocat_prisoners'] !== 'free_only';
}
