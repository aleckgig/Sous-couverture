// IndexedDB utility to store and retrieve role card images locally in the browser
const DB_NAME = 'SousCouverture_CardImages';
const STORE_NAME = 'role_images';
const DB_VERSION = 2;

const ROLE_ALIASES: Record<string, string[]> = {
  agent_sous_couverture: [
    'agent_sous_couverture',
    'agent sous couverture',
    'agentsouscouverture',
    'agent',
    'l\'agent sous couverture',
    'l agent sous couverture',
  ],
  tueur_a_gages: ['tueur_a_gages', 'tueur a gages', 'tueur', 'tueuragages', 'le tueur a gages'],
  garde_du_corps: ['garde_du_corps', 'garde du corps', 'gardeducorps', 'garde', 'le garde du corps'],
  avocat_vereux: [
    'avocat_vereux',
    'avocate_vereuse',
    'avocate_verreuse',
    'avocate vereuse',
    'avocate verreuse',
    'avocatevereuse',
    'avocateverreuse',
    'l\'avocate vereuse',
    'l\'avocate verreuse',
    'l avocate vereuse',
    'l avocate verreuse',
    'avocate',
    'l\'avocate',
    'lavocate',
    'l avocate',
    'avocat vereux',
    'avocat',
    'l\'avocat',
    'lavocat',
    'avocatvereux',
  ],
  avocate_vereuse: [
    'avocate_vereuse',
    'avocate_verreuse',
    'avocate vereuse',
    'avocate verreuse',
    'avocatevereuse',
    'avocateverreuse',
    'l\'avocate vereuse',
    'l\'avocate verreuse',
    'avocate',
    'l\'avocate',
    'avocat_vereux',
    'avocat vereux',
  ],
  avocate_verreuse: [
    'avocate_verreuse',
    'avocate_vereuse',
    'avocate vereuse',
    'avocate verreuse',
    'avocatevereuse',
    'avocateverreuse',
    'l\'avocate vereuse',
    'l\'avocate verreuse',
    'avocate',
    'l\'avocate',
    'avocat_vereux',
    'avocat vereux',
  ],
  avocate: [
    'avocate',
    'avocate_vereuse',
    'avocate_verreuse',
    'avocate vereuse',
    'avocate verreuse',
    'l\'avocate',
    'lavocate',
    'l avocate',
    'avocat_vereux',
    'avocat vereux',
    'avocat',
    'avocatvereux',
  ],
  trafiquant: [
    'trafiquant',
    'revendeur d armes',
    'revendeur d\'armes',
    'revendeurdarmes',
    'revendeur_armes',
    'revendeur',
    'le revendeur d armes',
    'trafiquant d armes',
    'trafiquant d\'armes',
    'trafiquantdarmes',
    'trafiquant_d_armes',
    'trafiquant_armes',
    'le trafiquant d armes',
    'letrafiquantdarmes',
    'le trafiquant',
    'letrafiquant',
  ],
  trafiquant_armes: [
    'trafiquant d armes',
    'trafiquant d\'armes',
    'trafiquantdarmes',
    'trafiquant',
    'le trafiquant d armes',
    'revendeur d armes',
    'revendeur d\'armes',
    'revendeurdarmes',
    'le revendeur d armes',
  ],
  nettoyeur: [
    'nettoyeur',
    'nettoyeuse',
    'la nettoyeuse',
    'lanettoyeuse',
    'la_nettoyeuse',
    'le nettoyeur',
    'lenettoyeur',
    'le_nettoyeur',
  ],
  nettoyeuse: [
    'nettoyeuse',
    'la nettoyeuse',
    'lanettoyeuse',
    'nettoyeur',
    'le nettoyeur',
    'lenettoyeur',
  ],
  arnaqueuse: [
    'arnaqueuse',
    'l\'arnaqueuse',
    'larnaqueuse',
    'l arnaqueuse',
    'arnaqueur',
    'l\'arnaqueur',
    'larnaqueur',
    'l arnaqueur',
  ],
  arnaqueur: [
    'arnaqueur',
    'l\'arnaqueur',
    'larnaqueur',
    'arnaqueuse',
    'l\'arnaqueuse',
    'larnaqueuse',
  ],
  pickpocket: ['pickpocket', 'le pickpocket', 'lepickpocket'],
  apprenti: ['apprenti', 'l apprenti', 'l\'apprenti', 'lapprenti'],
  chauffeur: ['chauffeur', 'le chauffeur', 'lechauffeur'],
  caid: ['caid', 'caïd', 'le caid', 'le caïd'],
  chimiste: ['chimiste', 'le chimiste', 'lechimiste'],
  junkie: ['junkie', 'le junkie', 'lejunkie'],
  blanchisseur: ['blanchisseur', 'le blanchisseur', 'leblanchisseur'],
  hacker: ['hacker', 'le hacker', 'lehacker'],
  revendeur_armes: [
    'revendeur_armes',
    'trafiquant',
    'le trafiquant',
    'letrafiquant',
    'trafiquant d armes',
    'trafiquant d\'armes',
    'trafiquantdarmes',
    'revendeur d armes',
    'revendeur d\'armes',
    'revendeur',
    'armes',
    'revendeurdarmes',
    'le revendeur d armes',
  ],
  homme_de_main: ['homme_de_main', 'homme de main', 'hommedemain', 'l\'homme de main', 'l homme de main'],
};

const normalizeKey = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export function getLookupKeys(roleId: string): string[] {
  const raw = roleId.trim();
  const lower = raw.toLowerCase();
  const norm = normalizeKey(raw);
  const aliases = ROLE_ALIASES[lower] || ROLE_ALIASES[norm] || [];
  return Array.from(new Set([raw, lower, norm, ...aliases, ...aliases.map(normalizeKey)]));
}

// Auto-migration for legacy / alternate keys in localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToCheck = Object.keys(ROLE_ALIASES);
    for (const mainKey of keysToCheck) {
      const candidates = getLookupKeys(mainKey);
      let foundValue: string | null = null;
      for (const c of candidates) {
        const val = localStorage.getItem(`card_img_${c}`);
        if (val) {
          foundValue = val;
          break;
        }
      }
      if (foundValue) {
        for (const c of candidates) {
          if (!localStorage.getItem(`card_img_${c}`)) {
            localStorage.setItem(`card_img_${c}`, foundValue);
          }
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'roleId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalRoleImage(roleId: string, dataUrl: string): Promise<void> {
  const keys = getLookupKeys(roleId);

  // Always save to localStorage as instant sync
  for (const k of keys) {
    try {
      if (!dataUrl) {
        localStorage.removeItem(`card_img_${k}`);
      } else {
        localStorage.setItem(`card_img_${k}`, dataUrl);
      }
    } catch {
      // ignore storage quota errors
    }
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const k of keys) {
        if (!dataUrl) {
          store.delete(k);
        } else {
          store.put({ roleId: k, dataUrl, updatedAt: Date.now() });
        }
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // LocalStorage already updated
  }
}

export async function getLocalRoleImage(roleId: string): Promise<string | null> {
  const keys = getLookupKeys(roleId);

  // Check localStorage first
  for (const k of keys) {
    try {
      const val = localStorage.getItem(`card_img_${k}`);
      if (val) return val;
    } catch {
      // ignore
    }
  }

  // Check IndexedDB
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      let found: string | null = null;
      let completedCount = 0;

      for (const k of keys) {
        const req = store.get(k);
        req.onsuccess = () => {
          completedCount++;
          if (req.result?.dataUrl && !found) {
            found = req.result.dataUrl;
          }
          if (completedCount === keys.length) {
            resolve(found);
          }
        };
        req.onerror = () => {
          completedCount++;
          if (completedCount === keys.length) {
            resolve(found);
          }
        };
      }
    });
  } catch {
    return null;
  }
}

