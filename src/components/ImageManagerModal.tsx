import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  X,
  Search,
  Check,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { ALL_ROLES_LIST, ROLES } from '../data/roles';
import { StructuredRole, RoleId } from '../types';
import { getRoleCardImageUrl, getAllUploadedImages, ImageAsset } from '../utils/roleCardImages';
import { DEFAULT_ROLE_IMAGE_MAP } from '../data/roleImageMap';
import { getLocalRoleImage, saveLocalRoleImage, getLookupKeys } from '../utils/cardStorage';
import { RoleCardModal } from './RoleCardModal';

interface ImageManagerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onImagesUpdated?: () => void;
}

export const ImageManagerModal: React.FC<ImageManagerModalProps> = ({
  isOpen = true,
  onClose,
  onImagesUpdated,
}) => {
  const [roleImages, setRoleImages] = useState<Record<string, string | null>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleForModal, setSelectedRoleForModal] = useState<string | null>(null);
  const [singleUploadTargetRoleId, setSingleUploadTargetRoleId] = useState<string | null>(null);

  const multipleFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  // Load image state for all 17 roles
  const loadAllImages = async () => {
    const map: Record<string, string | null> = {};
    for (const role of ALL_ROLES_LIST) {
      // 1. Check local storage / indexedDB
      const local = await getLocalRoleImage(role.id);
      if (local) {
        map[role.id] = local;
      } else {
        // 2. Check bundled or public asset
        const resolved = getRoleCardImageUrl(role.id);
        map[role.id] = resolved;
      }
    }
    setRoleImages(map);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllImages();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Multi-file upload handler
  const handleMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadSuccessMessage('');

    const filesPayload: Array<{ filename: string; dataUrl: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string) || '');
        reader.readAsDataURL(file);
      });

      if (dataUrl) {
        filesPayload.push({
          filename: file.name,
          dataUrl,
        });
      }
    }

    // 1. Send to server backend to write into public/images/
    try {
      await fetch('/api/images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload }),
      });
    } catch (err) {
      console.warn('Server upload failed, relying on local IndexedDB storage', err);
    }

    // 2. Normalize and automatically associate each image to roles in IndexedDB & LocalStorage
    let matchedCount = 0;
    for (const item of filesPayload) {
      const normFileName = item.filename
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      // Store by filename as direct cache
      try {
        localStorage.setItem(`card_img_${normFileName}`, item.dataUrl);
      } catch {}

      for (const role of ALL_ROLES_LIST) {
        if (role.id === 'trafiquant' && (normFileName.includes('arme') || normFileName.includes('revendeur'))) {
          continue;
        }
        if (role.id === 'revendeur_armes' && normFileName.includes('trafiquant')) {
          continue;
        }

        const candidateKeys = getLookupKeys(role.id);
        const normNom = role.nom
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        candidateKeys.push(normNom);

        const isMatch = candidateKeys.some((cand) => {
          const normCand = cand
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
          if (!normCand) return false;
          return (
            normFileName === normCand ||
            normFileName.includes(normCand) ||
            normCand.includes(normFileName)
          );
        });

        if (isMatch) {
          await saveLocalRoleImage(role.id, item.dataUrl);
          matchedCount++;
        }
      }
    }

    await loadAllImages();
    setIsUploading(false);
    setUploadSuccessMessage(
      `${filesPayload.length} image(s) importée(s) ! ${matchedCount} association(s) effectuée(s) avec succès.`
    );
    onImagesUpdated?.();
    e.target.value = '';
  };

  // Re-scan and auto-associate any stored or available assets
  const handleAutoAssociateAll = async () => {
    setIsUploading(true);
    let newlyAssociated = 0;

    // 1. Fetch server images if available
    try {
      const res = await fetch('/api/images/list');
      const data = await res.json();
      if (data?.images && Array.isArray(data.images)) {
        for (const filename of data.images) {
          const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
          const normFileName = nameWithoutExt
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');

          for (const role of ALL_ROLES_LIST) {
            if (role.id === 'trafiquant' && (normFileName.includes('arme') || normFileName.includes('revendeur'))) {
              continue;
            }
            if (role.id === 'revendeur_armes' && normFileName.includes('trafiquant')) {
              continue;
            }

            const candidateKeys = getLookupKeys(role.id);
            const normNom = role.nom
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            candidateKeys.push(normNom);

            const isMatch = candidateKeys.some((cand) => {
              const normCand = cand
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');
              return (
                normFileName === normCand ||
                normFileName.includes(normCand) ||
                (normCand.length >= 5 && normCand.includes(normFileName))
              );
            });

            if (isMatch) {
              const imgUrl = `/images/${filename}`;
              await saveLocalRoleImage(role.id, imgUrl);
              newlyAssociated++;
            }
          }
        }
      }
    } catch {}

    // 2. Check localStorage keys
    try {
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (!k.startsWith('card_img_')) continue;
        const val = localStorage.getItem(k);
        if (!val) continue;
        const rawKey = k.replace('card_img_', '');
        const normKey = rawKey
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');

        for (const role of ALL_ROLES_LIST) {
          if (role.id === 'trafiquant' && (normKey.includes('arme') || normKey.includes('revendeur'))) {
            continue;
          }
          if (role.id === 'revendeur_armes' && normKey.includes('trafiquant')) {
            continue;
          }

          const candidates = getLookupKeys(role.id);
          const isMatch = candidates.some((cand) => {
            const normCand = cand
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            return normKey === normCand || normKey.includes(normCand) || normCand.includes(normKey);
          });
          if (isMatch) {
            await saveLocalRoleImage(role.id, val);
            newlyAssociated++;
          }
        }
      }
    } catch {}

    await loadAllImages();
    setIsUploading(false);
    setUploadSuccessMessage(
      `Synchronisation terminée : illustrations associées automatiquement !`
    );
    onImagesUpdated?.();
  };

  // Single file direct replacement for a specific role
  const handleSingleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !singleUploadTargetRoleId) return;

    setIsUploading(true);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string) || '');
      reader.readAsDataURL(file);
    });

    if (dataUrl) {
      // Send to server
      try {
        await fetch('/api/images/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [{ filename: `${singleUploadTargetRoleId}.png`, dataUrl }],
          }),
        });
      } catch (err) {
        // ignore
      }

      await saveLocalRoleImage(singleUploadTargetRoleId, dataUrl);
      await loadAllImages();
      setUploadSuccessMessage(`Illustration mise à jour pour : ${ROLES[singleUploadTargetRoleId as RoleId]?.nom || singleUploadTargetRoleId}`);
      onImagesUpdated?.();
    }

    setIsUploading(false);
    setSingleUploadTargetRoleId(null);
    e.target.value = '';
  };

  // Reset a role's image to default
  const handleResetImage = async (roleId: string) => {
    await saveLocalRoleImage(roleId, '');
    try {
      localStorage.removeItem(`card_img_${roleId}`);
    } catch {
      // ignore
    }
    await loadAllImages();
    onImagesUpdated?.();
  };

  const filteredRoles = ALL_ROLES_LIST.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.nom.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.camp_initial.toLowerCase().includes(q)
    );
  });

  const totalAssigned = Object.values(roleImages).filter((val) => Boolean(val)).length;
  const missingCount = ALL_ROLES_LIST.length - totalAssigned;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/95 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[94vh] max-h-[900px] bg-stone-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden inputs */}
        <input
          ref={multipleFileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleMultipleFiles}
        />
        <input
          ref={singleFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSingleFileSelect}
        />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 text-lg shadow">
              🖼️
            </div>
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-white">
                Gestionnaire des Illustrations & Cartes
              </h2>
              <p className="text-xs text-stone-400">
                {totalAssigned} / {ALL_ROLES_LIST.length} rôles illustrés{' '}
                {missingCount > 0 && (
                  <span className="text-amber-400 font-bold ml-1">
                    ({missingCount} illustration(s) manquante(s))
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Associate Button */}
            <button
              type="button"
              onClick={handleAutoAssociateAll}
              id="btn-auto-associate-images"
              disabled={isUploading}
              className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Rescanner et associer automatiquement les images importées aux rôles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Associer automatiquement</span>
            </button>

            {/* Primary Multi-Upload Button */}
            <button
              type="button"
              onClick={() => multipleFileInputRef.current?.click()}
              id="btn-upload-multiple-images"
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Importation...' : 'Ajouter des images'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              id="btn-close-image-manager"
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Upload Success Alert */}
        {uploadSuccessMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-950/80 border border-emerald-500 rounded-2xl flex items-center justify-between gap-2 text-emerald-200 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadSuccessMessage('')}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar & Instructions */}
        <div className="p-3 sm:px-6 bg-stone-900/60 border-b border-stone-800 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un rôle par son nom ou son camp..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Roles Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRoles.map((role) => {
              const imageSrc = roleImages[role.id];
              const isMissing = !imageSrc;
              const expectedName = DEFAULT_ROLE_IMAGE_MAP[role.id] || `${role.nom}.png`;

              return (
                <div
                  key={role.id}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                    isMissing
                      ? 'bg-red-950/20 border-red-900/50 hover:border-red-700/60'
                      : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/50 shadow-md'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Role Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {role.icone && <span className="text-base">{role.icone}</span>}
                          <h3 className={`font-bold text-sm font-serif leading-tight ${role.id === 'agent_sous_couverture' ? 'text-blue-400' : 'text-white'}`}>
                            {role.nom}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                              role.camp_initial === 'Forces de l\'ordre'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                : 'bg-red-950 text-red-300 border border-red-800/60'
                            }`}
                          >
                            {role.camp_initial}
                          </span>
                          {role.isPerturbateur && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 uppercase">
                              Perturbateur
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Image Box */}
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black/60 border border-stone-800 flex items-center justify-center p-2 group">
                      {!isMissing ? (
                        <>
                          <img
                            src={imageSrc}
                            alt={role.nom}
                            className="max-w-full max-h-full object-contain drop-shadow transition-transform group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedRoleForModal(role.id)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-xs text-white font-bold transition-opacity cursor-pointer backdrop-blur-[2px]"
                          >
                            <Eye className="w-4 h-4 text-amber-300" />
                            <span>Agrandir</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-2 text-red-400 space-y-1">
                          <AlertCircle className="w-8 h-8 opacity-60 text-red-400" />
                          <span className="text-[11px] font-bold text-red-300">
                            Illustration manquante
                          </span>
                          <span className="text-[9px] text-stone-500 font-mono">
                            {expectedName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-3 mt-3 border-t border-stone-800/80 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSingleUploadTargetRoleId(role.id);
                        singleFileInputRef.current?.click();
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isMissing
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isMissing ? 'Associer' : 'Remplacer'}</span>
                    </button>

                    {!isMissing && (
                      <button
                        type="button"
                        onClick={() => handleResetImage(role.id)}
                        className="p-1.5 rounded-xl bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-300 border border-stone-700 transition-colors cursor-pointer"
                        title="Réinitialiser l'image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-stone-400">
            Toutes les images sont stockées localement et synchronisées avec le dossier public du projet.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Full Preview Modal if opened */}
      {selectedRoleForModal && (
        <RoleCardModal
          roleId={selectedRoleForModal}
          onClose={() => setSelectedRoleForModal(null)}
        />
      )}
    </div>
  );
};
