import React, { useState } from 'react';
import {
  BookOpen,
  Shield,
  Skull,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Eye,
} from 'lucide-react';
import { ALL_ROLES_LIST, ROLES } from '../data/roles';
import { RoleId, StructuredRole } from '../types';
import { RoleCardImage } from './RoleCardImage';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'cards' | 'terms' | 'rules';
  initialRoleId?: string;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cards',
  initialRoleId = 'agent_sous_couverture',
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'terms' | 'rules'>(initialTab);
  const [currentRoleId, setCurrentRoleId] = useState<string>(initialRoleId);
  const [roleSearch, setRoleSearch] = useState<string>('');

  if (!isOpen) return null;

  const activeRole: StructuredRole | undefined = ROLES[currentRoleId];

  const filteredRolesList = ALL_ROLES_LIST.filter((r) => {
    const matchesSearch =
      !roleSearch ||
      r.nom.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.description.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.camp.toLowerCase().includes(roleSearch.toLowerCase());
    return matchesSearch;
  });

  const currentIndexInFiltered = filteredRolesList.findIndex((r) => r.id === currentRoleId);

  const handleNextRole = () => {
    if (filteredRolesList.length === 0) return;
    const nextIdx = (currentIndexInFiltered + 1) % filteredRolesList.length;
    setCurrentRoleId(filteredRolesList[nextIdx].id);
  };

  const handlePrevRole = () => {
    if (filteredRolesList.length === 0) return;
    const prevIdx = (currentIndexInFiltered - 1 + filteredRolesList.length) % filteredRolesList.length;
    setCurrentRoleId(filteredRolesList[prevIdx].id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 text-stone-100"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between gap-3 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 font-serif text-lg shadow">
              📖
            </div>
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-white">
                Guide Officiel • Sous Couverture
              </h2>
              <p className="text-xs text-stone-400">
                Fiches des rôles, règles du jeu et lexique opérationnel
              </p>
            </div>
          </div>

          {/* Tab switches */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-2xl border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Cartes & Rôles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Règles du Jeu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Lexique
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB 1: CARDS & ROLES */}
        {activeTab === 'cards' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Rechercher un rôle (ex: Agent, Caïd, Tueur, Hackeuse)..."
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-stone-500 outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left Column: Visual Card */}
              <div className="md:col-span-5 flex flex-col items-center gap-3">
                <div className="w-full max-w-[260px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-stone-800 bg-stone-950 flex items-center justify-center">
                  <RoleCardImage
                    roleId={currentRoleId}
                    roleName={activeRole?.nom || currentRoleId}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevRole}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                  <button
                    type="button"
                    onClick={handleNextRole}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: Role Specifications */}
              <div className="md:col-span-7 bg-stone-950 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div>
                    <h3 className="text-xl font-serif font-black flex items-center gap-2">
                      {activeRole?.icone && <span>{activeRole.icone}</span>}
                      <span className={activeRole?.id === 'agent_sous_couverture' ? 'text-blue-400' : 'text-white'}>
                        {activeRole?.nom}
                      </span>
                    </h3>
                  </div>
                  <div className="flex gap-1.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                        activeRole?.camp === "Forces de l'ordre"
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {activeRole?.camp}
                    </span>
                    {activeRole?.isPerturbateur && (
                      <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-purple-900 text-purple-200">
                        Perturbateur
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    Description & Capacité
                  </span>
                  <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
                    {activeRole?.description}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Effet dans le jeu
                  </span>
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                    {activeRole?.effet}
                  </p>
                </div>

                {activeRole?.noteConteur && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
                    <strong>Note Conteur :</strong> {activeRole.noteConteur}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RULES */}
        {activeTab === 'rules' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-stone-200">
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <h3 className="font-serif font-black text-base text-amber-300">
                1. But du Jeu & Deux Camps
              </h3>
              <p>
                <strong>Sous Couverture</strong> oppose le <strong>Gang</strong> (les criminels) à l’<strong>Agent sous couverture</strong> (infiltré) qui tente de recruter des informateurs et de démanteler le réseau policier par des arrestations ciblées.
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <h3 className="font-serif font-black text-base text-amber-300">
                2. Les Pouvoirs Uniques de l'Agent sous couverture
              </h3>
              <p>
                L'Agent est le <strong>seul</strong> rôle à posséder deux capacités exclusives :
              </p>
              <ul className="list-disc list-inside space-y-1 text-stone-300">
                <li>
                  <strong>Recrutement (Nuit 1 & nuits impaires) :</strong> L'Agent peut proposer à un membre du Gang de devenir son <em>Informateur</em>. Si accepté, l'informateur rejoint le camp des Forces de l'ordre, apprend l'identité de l'Agent, mais conserve son pouvoir et son rôle d'origine.
                </li>
                <li>
                  <strong>Incarcération (Prison) :</strong> L'Agent peut envoyer un membre suspect en prison. Le prisonnier ne peut ni parler, ni voter, ni être exécuté, mais son état est un statut réversible (il n'est pas mort).
                </li>
              </ul>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <h3 className="font-serif font-black text-base text-amber-300">
                3. Les Perturbateurs
              </h3>
              <p>
                Les <strong>Perturbateurs</strong> sont des membres du Gang aux intérêts imprévisibles, brouillant les déductions :
                La Balance emporte son accusateur dans sa chute, le Dealer altère temporairement les esprits, le Faussaire modifie les enregistrements de nuit...
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <h3 className="font-serif font-black text-base text-amber-300">
                4. Conditions de Victoire
              </h3>
              <ul className="list-disc list-inside space-y-1 text-stone-300">
                <li>
                  <strong className="text-blue-300">Victoire des Forces de l'Ordre :</strong> Le Caïd et ses lieutenants principaux sont neutralisés ou incarcérés, ou les Forces de l'Ordre sont majoritaires.
                </li>
                <li>
                  <strong className="text-red-300">Victoire du Gang :</strong> L'Agent sous couverture est exécuté par vote ou abattu par le Tueur à gages, ou le Gang élimine les informateurs.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: TERMS */}
        {activeTab === 'terms' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
            <h3 className="font-serif font-black text-base text-amber-300">
              Lexique Opérationnel Sous Couverture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                ['Agent sous couverture', 'Infiltré de la police cherchant à démanteler le Gang.'],
                ['Informateur', 'Membre du Gang recruté par l\'Agent. Connaît l\'Agent et sert la Police.'],
                ['Prison / Incarcération', 'Statut de détention. Le joueur ne parle ni ne vote, mais reste vivant.'],
                ['Perturbateur', 'Rôle aux pouvoirs déstabilisants et inattendus au sein du Gang.'],
                ['Plaidoyer de l\'Avocat', 'Action permettant aux Informateurs de revenir dans le Gang.'],
                ['Tir du Tueur', 'Action du Tueur à gages visant à éliminer l\'Agent sous couverture.'],
                ['Fausse Piste', 'Joueur renvoyant un faux signal lors des investigations de l\'Enquêteur.'],
              ].map(([term, desc]) => (
                <div key={term} className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-0.5">
                  <span className="font-black text-amber-400 block">{term}</span>
                  <span className="text-stone-300">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-stone-400 font-medium">
            Sous Couverture • Jeu de déduction sociale
          </p>
          <button
            type="button"
            onClick={onClose}
            id="btn-footer-close-rules"
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
