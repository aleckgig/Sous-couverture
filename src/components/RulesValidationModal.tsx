import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, AlertTriangle, X, Settings2, Info } from 'lucide-react';
import { RuleValidationItem } from '../types';
import { DEFAULT_RULES_VALIDATION_ITEMS } from '../data/roles';
import {
  getSavedRuleOptions,
  saveRuleOption,
  syncRulesFromServer,
  RULES_STORAGE_KEY,
} from '../utils/rulesConfig';

// Re-export for compatibility
export { getSavedRuleOptions, saveRuleOption };

interface RulesValidationModalProps {
  isOpen?: boolean;
  onClose: () => void;
  rules?: RuleValidationItem[];
  onUpdateRules?: (updatedRules: RuleValidationItem[]) => void;
}

export const RulesValidationModal: React.FC<RulesValidationModalProps> = ({
  isOpen = true,
  onClose,
  rules = DEFAULT_RULES_VALIDATION_ITEMS,
  onUpdateRules,
}) => {
  const [currentRules, setCurrentRules] = useState<RuleValidationItem[]>(() => {
    const savedMap = getSavedRuleOptions();
    return rules.map((r) => ({
      ...r,
      selectedOption: savedMap[r.id] || r.selectedOption,
    }));
  });

  useEffect(() => {
    syncRulesFromServer().then((latestMap) => {
      setCurrentRules((prev) =>
        prev.map((r) => ({
          ...r,
          selectedOption: latestMap[r.id] || r.selectedOption,
        }))
      );
    });
  }, []);

  if (!isOpen) return null;

  const handleSelectOption = (ruleId: string, val: string) => {
    saveRuleOption(ruleId, val);
    const updated = currentRules.map((r) =>
      r.id === ruleId ? { ...r, selectedOption: val } : r
    );
    setCurrentRules(updated);
    onUpdateRules?.(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/92 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-stone-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-lg">
              ⚖️
            </div>
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-white">
                Règles & Interactions à Valider
              </h2>
              <p className="text-xs text-stone-400">
                Interactions ouvertes ou spécifiques au jeu. Choisissez la règle appliquée pour cette partie.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-amber-200/90 text-xs">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Pour respecter l'intégrité du jeu sans inventer de choix arbitraire, chaque interaction de pouvoirs non tranchée par les règles canoniques est listée ici et peut être ajustée selon vos préférences de table.
          </p>
        </div>

        {/* List of Validation Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {currentRules.map((item) => {
            return (
              <div
                key={item.id}
                className="bg-stone-950/90 border border-stone-800 rounded-2xl p-4 space-y-3 shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-base text-amber-200">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-300 mt-0.5 font-medium">
                      {item.question}
                    </p>
                  </div>
                </div>

                <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800 text-[11px] text-stone-400">
                  <strong className="text-stone-300 font-semibold block mb-0.5">Règle actuelle par défaut :</strong>
                  <span>{item.currentRule}</span>
                </div>

                {/* Options selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                    Option choisie :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.options.map((opt) => {
                      const isSelected = item.selectedOption === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption(item.id, opt.value)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between gap-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-400/30 shadow'
                              : 'bg-stone-900 border-stone-800 hover:border-stone-700 text-stone-300'
                          }`}
                        >
                          <span className="leading-snug">{opt.label}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Valider et fermer
          </button>
        </div>
      </div>
    </div>
  );
};
