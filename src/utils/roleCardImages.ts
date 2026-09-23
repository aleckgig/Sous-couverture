/// <reference types="vite/client" />
import { DEFAULT_ROLE_IMAGE_MAP } from '../data/roleImageMap';
import { ROLES } from '../data/roles';
import { getLookupKeys } from './cardStorage';

// Dynamically import all images from assets, public, and subdirectories with eager loading
const importedImageModules: Record<string, { default?: string } | string> = import.meta.glob(
  [
    '../assets/images/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
    '../assets/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
    '/public/images/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
    '/public/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  ],
  { eager: true }
);

export interface ImageAsset {
  filename: string; // e.g. "Demon.png"
  fullPath: string; // e.g. "../assets/images/Demon.png"
  url: string; // resolved Vite asset URL
}

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Returns a list of all image assets uploaded to src/assets/images/
 */
export function getAllUploadedImages(): ImageAsset[] {
  const assets: ImageAsset[] = [];

  for (const [fullPath, module] of Object.entries(importedImageModules)) {
    const filename = fullPath.split('/').pop() || '';
    let url = '';
    if (typeof module === 'string') {
      url = module;
    } else if (module && typeof module === 'object' && 'default' in module && typeof module.default === 'string') {
      url = module.default;
    }
    if (url) {
      assets.push({
        filename,
        fullPath,
        url,
      });
    }
  }

  return assets;
}

/**
 * Resolve the image URL for a given role
 */
export function getRoleCardImageUrl(roleId: string): string | null {
  const allImages = getAllUploadedImages();

  // 1. Direct mapping via DEFAULT_ROLE_IMAGE_MAP & explicit known filenames
  const lookupKey = roleId.toLowerCase().trim();
  const defaultMappedFile = DEFAULT_ROLE_IMAGE_MAP[roleId] || DEFAULT_ROLE_IMAGE_MAP[lookupKey];
  const priorityFiles: string[] = [];
  if (defaultMappedFile) priorityFiles.push(defaultMappedFile);
  if (roleId === 'revendeur_armes') {
    priorityFiles.push('Revendeur d armes.png', 'revendeur_armes.png');
  } else if (roleId === 'trafiquant') {
    priorityFiles.push('Trafiquant.png', 'trafiquant.png');
  }

  for (const file of priorityFiles) {
    const matched = allImages.find(
      (img) =>
        img.filename.toLowerCase() === file.toLowerCase() ||
        normalize(img.filename) === normalize(file)
    );
    if (matched) return matched.url;
  }

  // 2. Normalize and compare roleId, aliases & role name with filenames
  const candidateKeys = getLookupKeys(roleId);
  const roleObj = ROLES[roleId as keyof typeof ROLES] || ROLES[lookupKey as keyof typeof ROLES];
  const roleNom = roleObj?.nom || (roleObj as any)?.name || '';
  if (roleNom) {
    candidateKeys.push(roleNom, normalize(roleNom));
  }

  const matchedByName = allImages.find((img) => {
    const normFileName = normalize(img.filename);
    return candidateKeys.some((candidate) => {
      const normCand = normalize(candidate);
      return (
        normFileName === normCand ||
        normFileName.includes(normCand) ||
        normCand.includes(normFileName)
      );
    });
  });

  if (matchedByName) {
    return matchedByName.url;
  }

  // 3. Check if role has an explicit cardImage/image property
  if (roleObj?.image) {
    return roleObj.image;
  }
  if ((roleObj as any)?.cardImage) {
    return (roleObj as any).cardImage;
  }

  // 4. Fallback to public images
  if (roleId === 'revendeur_armes') {
    return '/images/Revendeur d armes.png';
  }
  if (roleId === 'trafiquant') {
    return '/images/Trafiquant.png';
  }
  if (defaultMappedFile) {
    return `/images/${defaultMappedFile}`;
  }

  return null;
}
