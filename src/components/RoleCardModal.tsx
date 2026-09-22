import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ROLES } from '../data/roles';
import { RoleId, Role, Player } from '../types';
import { getRoleCardImageUrl, getAllUploadedImages, ImageAsset } from '../utils/roleCardImages';
import { DEFAULT_ROLE_IMAGE_MAP } from '../data/roleImageMap';
import { getLocalRoleImage, saveLocalRoleImage } from '../utils/cardStorage';
import { ZoomIn, ZoomOut, RotateCcw, ImageOff, Upload, RefreshCw, X, FolderOpen, Check } from 'lucide-react';

interface RoleCardModalProps {
  roleId?: RoleId | string | null;
  customRole?: Role | null;
  selectableRoles?: RoleId[];
  players?: Player[];
  onClose: () => void;
}

export const RoleCardModal: React.FC<RoleCardModalProps> = ({
  roleId,
  customRole,
  selectableRoles,
  players,
  onClose,
}) => {
  const [currentRoleId, setCurrentRoleId] = useState<string>(() => {
    if (roleId) return roleId;
    if (customRole?.id) return customRole.id;
    return 'agent_sous_couverture';
  });

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [loadingImage, setLoadingImage] = useState<boolean>(true);
  const [hasCustomOverride, setHasCustomOverride] = useState<boolean>(false);
  const [showAssetPicker, setShowAssetPicker] = useState<boolean>(false);

  // Zoom & Pan state for 2-finger pinch and drag
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for tracking touch gestures & file input
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Load resolved image URL whenever role changes
  const updateImages = useCallback(async () => {
    if (!currentRoleId) return;
    setLoadingImage(true);

    // 1. Check local indexedDB / localStorage first
    const localImg = await getLocalRoleImage(currentRoleId);
    if (localImg) {
      setImageSrc(localImg);
      setImageError(false);
      setHasCustomOverride(true);
      setLoadingImage(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }

    setHasCustomOverride(false);

    // 2. Check bundled asset / public image
    const resolved = getRoleCardImageUrl(currentRoleId);
    if (resolved) {
      setImageSrc(resolved);
      setImageError(false);
    } else {
      setImageSrc(null);
      setImageError(true);
    }
    setLoadingImage(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentRoleId]);

  useEffect(() => {
    updateImages();
  }, [updateImages]);

  // Sync roleId if prop changes
  useEffect(() => {
    if (roleId && roleId !== currentRoleId) {
      setCurrentRoleId(roleId);
    }
  }, [roleId]);

  const activeRole: Role | undefined =
    customRole && customRole.id === currentRoleId
      ? customRole
      : currentRoleId && ROLES[currentRoleId]
      ? ROLES[currentRoleId]
      : undefined;

  // Available roles for the dropdown
  const availableRoleIds: string[] =
    selectableRoles && selectableRoles.length > 0
      ? selectableRoles
      : Object.keys(ROLES);

  // All bundled image assets
  const bundledAssets = getAllUploadedImages();

  // Direct file upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        await saveLocalRoleImage(currentRoleId, dataUrl);
        setImageSrc(dataUrl);
        setImageError(false);
        setHasCustomOverride(true);
        setShowAssetPicker(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Associate with an existing project asset in 1 click
  const handleSelectAsset = async (asset: ImageAsset) => {
    await saveLocalRoleImage(currentRoleId, asset.url);
    setImageSrc(asset.url);
    setImageError(false);
    setHasCustomOverride(true);
    setShowAssetPicker(false);
  };

  // Reset custom override to default image
  const handleResetToDefault = async () => {
    await saveLocalRoleImage(currentRoleId, '');
    try {
      localStorage.removeItem(`card_img_${currentRoleId}`);
    } catch {
      // ignore
    }
    setHasCustomOverride(false);
    setShowAssetPicker(false);
    updateImages();
  };

  // --- TOUCH PINCH-TO-ZOOM & PAN HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        if (scale > 1.2) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2.2);
        }
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
      }

      lastTouchPosRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
      isDraggingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialTouchDistanceRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * ratio, 1), 4.5);
      setScale(newScale);

      if (newScale <= 1.05) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDraggingRef.current && lastTouchPosRef.current && scale > 1) {
      const newX = e.touches[0].clientX - lastTouchPosRef.current.x;
      const newY = e.touches[0].clientY - lastTouchPosRef.current.y;

      const maxOffset = (scale - 1) * 180;
      setPosition({
        x: Math.max(Math.min(newX, maxOffset), -maxOffset),
        y: Math.max(Math.min(newY, maxOffset), -maxOffset),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      lastTouchPosRef.current = null;
      if (scale <= 1.05) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.005;
    const newScale = Math.min(Math.max(scale + delta, 1), 4.5);
    setScale(newScale);
    if (newScale <= 1.05) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const expectedFile = DEFAULT_ROLE_IMAGE_MAP[currentRoleId] || `${activeRole?.name || currentRoleId}.png`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/92 backdrop-blur-md overflow-hidden touch-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md h-[95vh] max-h-[860px] flex flex-col justify-between items-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden input for direct card file pick */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* ========================================================================= */}
        {/* 1. TOP SECTION: DROPDOWN MENU FITTED TO MOBILE SCREEN & CLOSE X */}
        {/* ========================================================================= */}
        <div className="w-full shrink-0 z-20 px-1 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <select
              value={currentRoleId}
              onChange={(e) => {
                setCurrentRoleId(e.target.value);
                setImageError(false);
                setShowAssetPicker(false);
              }}
              id="role-card-dropdown"
              className="w-full bg-stone-900 border-2 border-amber-500/70 hover:border-amber-400 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-amber-200 font-serif font-black focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xl cursor-pointer transition-colors appearance-none truncate pr-10"
            >
              {players && players.length > 0 && (
                <optgroup label="— Cartes des Joueurs Assis —" className="bg-stone-950 text-amber-300 font-bold">
                  {players.map((p) => {
                    const r = ROLES[p.roleId];
                    return (
                      <option key={`p_${p.id}`} value={p.roleId} className="bg-stone-900 text-stone-100 font-sans py-1.5 text-xs sm:text-sm">
                        👤 {p.name} — {r?.nom || r?.name || p.roleId} ({r?.camp_initial || r?.team || 'Gang'})
                      </option>
                    );
                  })}
                </optgroup>
              )}

              <optgroup label={players && players.length > 0 ? "— Tous les Rôles —" : "— Rôles disponibles —"} className="bg-stone-950 text-stone-400 font-bold">
                {availableRoleIds.map((rId) => {
                  const r = ROLES[rId];
                  if (!r) return null;
                  const emoji = r.camp_initial === 'Forces de l\'ordre' ? '🕵️‍♂️' : r.isPerturbateur ? '🟣' : '🕶️';
                  return (
                    <option key={rId} value={rId} className="bg-stone-900 text-stone-100 font-sans py-1.5 text-xs sm:text-sm">
                      {emoji} {r.nom || r.name} ({r.camp_initial || r.team})
                    </option>
                  );
                })}
              </optgroup>
            </select>

            {/* Custom dropdown arrow */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-amber-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Top X Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 sm:p-3 rounded-2xl bg-stone-900 border-2 border-stone-700 hover:border-amber-400 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0 shadow-xl"
            title="Fermer (X)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. MIDDLE SECTION: THE ROLE CARD PNG WITH PINCH-TO-ZOOM & PAN */}
        {/* ========================================================================= */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="relative w-full flex-1 min-h-0 my-2 flex items-center justify-center overflow-hidden rounded-3xl bg-stone-950/60 border border-stone-800/80 cursor-grab active:cursor-grabbing"
        >
          {/* --- MAIN CARD DISPLAY (ONLY PURE PNG PHOTO) --- */}
          {!loadingImage && imageSrc && !imageError ? (
            <div
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                transformOrigin: 'center center',
                transition: initialTouchDistanceRef.current ? 'none' : 'transform 0.15s ease-out',
              }}
              className="relative w-full h-full flex items-center justify-center p-2 pointer-events-none"
            >
              <img
                src={imageSrc}
                alt={activeRole?.name || 'Rôle'}
                onError={() => setImageError(true)}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] pointer-events-auto"
                draggable={false}
              />
            </div>
          ) : (
            /* Missing-Image Screen with Instant Direct Photo Picker */
            <div className="p-6 text-center space-y-4 max-w-xs z-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-stone-900 border border-stone-700 flex items-center justify-center text-amber-400">
                <ImageOff className="w-8 h-8 opacity-70" />
              </div>

              <div>
                <h3 className="font-serif font-black text-xl text-amber-200">
                  {activeRole?.name || currentRoleId}
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Fichier requis : <span className="text-amber-300 font-mono font-bold">{expectedFile}</span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 w-full">
                {bundledAssets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAssetPicker(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Choisir parmi les images du jeu</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer depuis l'appareil (PNG)</span>
                </button>
              </div>
            </div>
          )}

          {/* Asset Picker Modal Overlay */}
          {showAssetPicker && (
            <div className="absolute inset-0 z-30 bg-stone-950/95 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-150">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div>
                    <h4 className="font-serif font-black text-amber-200 text-sm">
                      Associer une image à : {activeRole?.name}
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      Cliquez sur une carte pour la lier instantanément à ce rôle
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAssetPicker(false)}
                    className="p-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Available Bundled Assets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {bundledAssets.map((asset) => {
                    const isSelected = imageSrc === asset.url;
                    return (
                      <button
                        key={asset.filename}
                        type="button"
                        onClick={() => handleSelectAsset(asset)}
                        className={`group relative p-2 rounded-xl border text-left flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/40'
                            : 'bg-stone-900/90 border-stone-800 hover:border-amber-500/50 hover:bg-stone-850'
                        }`}
                      >
                        <div className="w-full h-24 sm:h-28 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center p-1">
                          <img
                            src={asset.url}
                            alt={asset.filename}
                            className="max-w-full max-h-full object-contain drop-shadow"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-stone-200 truncate w-full text-center group-hover:text-amber-300">
                          {asset.filename.replace(/\.png$/i, '')}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom option to import custom PNG from device */}
              <div className="pt-3 border-t border-stone-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Importer un fichier externe PNG</span>
                </button>

                {hasCustomOverride && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                    title="Rétablir l'image automatique"
                  >
                    Rétablir défaut
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Floating Zoom Controls & Reset */}
          {imageSrc && !imageError && !showAssetPicker && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-stone-950/90 border border-stone-800 p-1 rounded-2xl shadow-xl backdrop-blur-md">
              {scale > 1.05 && (
                <button
                  type="button"
                  onClick={() => {
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-stone-800 transition-colors cursor-pointer"
                  title="Réinitialiser zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const next = Math.max(scale - 0.5, 1);
                  setScale(next);
                  if (next <= 1.05) setPosition({ x: 0, y: 0 });
                }}
                disabled={scale <= 1.05}
                className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30 transition-colors cursor-pointer"
                title="Dézoomer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = Math.min(scale + 0.5, 4.5);
                  setScale(next);
                }}
                disabled={scale >= 4.5}
                className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30 transition-colors cursor-pointer"
                title="Zoomer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM SECTION: ONLY CLOSE BUTTON */}
        {/* ========================================================================= */}
        <div className="w-full shrink-0 pt-1 z-20 px-1">
          <button
            type="button"
            onClick={onClose}
            id="btn-close-role-card-modal"
            className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 border-2 border-stone-700 hover:border-amber-500/50 text-stone-100 font-serif font-black text-sm sm:text-base shadow-2xl shadow-black/80 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Fermer le visualisateur de carte</span>
          </button>
        </div>
      </div>
    </div>
  );
};

