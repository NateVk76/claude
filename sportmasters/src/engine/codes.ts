import { hmacSha256, sha256, toHex, utf8 } from './sha256';

// Codes cadeaux : « MOT-MONTANT-CLÉ », par exemple « CADEAU-50000-K7QX4M ».
// La clé (6 caractères) signe le mot et le montant : un code inventé ou retouché est refusé.
// Les codes se fabriquent dans la boutique avec le créateur de codes, débloqué en tapant le mot de passe
// administrateur dans la case « Code cadeau » (voir le README pour le changer).
// Le jeu tourne entièrement dans le navigateur : c'est un verrou pour jouer entre amis, pas un coffre-fort.

/** Empreinte SHA-256 de « athleticards-admin: » suivi du mot de passe administrateur (en majuscules). */
export const ADMIN_HASH = '4abc784091fda71002555b09992365c3580f1f4e6fb77465af0f879a38fa4a5f';
const ADMIN_SALT = 'athleticards-admin:';
/** Clé de signature des codes : la changer rend invalides tous les codes déjà créés. */
const SECRET = utf8('ea0f74d2a7e2b3887afcaec12019cce7');

export const MAX_CODE_BALLES = 100_000_000;
export const MAX_WORD_LENGTH = 12;
const KEY_LENGTH = 6;
/** Base 32 de Crockford : pas de I, L, O ni U, qu'on confondrait en recopiant un code. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LETTERS = 'ABCDEFGHJKMNPQRSTVWXYZ';

const stripAccents = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Ce que le joueur a tapé, en majuscules : espaces et points retirés, tirets de toutes sortes unifiés. */
export function normalizeInput(text: string): string {
  return stripAccents(text)
    .toUpperCase()
    .replace(/[\s.]+/g, '')
    .replace(/[_‐-―−]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Mot d'un code : lettres et chiffres seulement, 12 au plus. */
export function cleanWord(word: string): string {
  return stripAccents(word)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, MAX_WORD_LENGTH);
}

/** Mot tiré au hasard (5 lettres faciles à lire), pour que chaque code créé soit différent. */
export function randomWord(rng: () => number = Math.random): string {
  return Array.from({ length: 5 }, () => LETTERS[Math.floor(rng() * LETTERS.length)]).join('');
}

function signature(word: string, balles: number): string {
  const mac = hmacSha256(SECRET, utf8(`${word}-${balles}`));
  // les 30 premiers bits, en 6 caractères de 5 bits
  let bits = ((mac[0] << 22) | (mac[1] << 14) | (mac[2] << 6) | (mac[3] >> 2)) >>> 0;
  let key = '';
  for (let i = 0; i < KEY_LENGTH; i++) {
    key = ALPHABET[bits & 31] + key;
    bits >>>= 5;
  }
  return key;
}

export function createCode(word: string, balles: number): string {
  const clean = cleanWord(word);
  const amount = Math.round(balles);
  if (!clean) throw new Error('Il faut un mot (lettres ou chiffres) pour créer un code.');
  if (!(amount >= 1 && amount <= MAX_CODE_BALLES)) throw new Error(`Un code vaut entre 1 et ${MAX_CODE_BALLES} balles.`);
  return `${clean}-${amount}-${signature(clean, amount)}`;
}

/** Code valable : sa forme officielle et ce qu'il rapporte. null si le code n'existe pas. */
export function checkCode(input: string): { code: string; balles: number } | null {
  const parts = normalizeInput(input).split('-');
  if (parts.length !== 3) return null;
  const [word, amount, typedKey] = parts;
  if (!/^[A-Z0-9]+$/.test(word) || word.length > MAX_WORD_LENGTH || !/^\d{1,9}$/.test(amount)) return null;
  const balles = Number(amount);
  if (balles < 1 || balles > MAX_CODE_BALLES) return null;
  // O tapé pour 0, I ou L pour 1
  const key = typedKey.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (key !== signature(word, balles)) return null;
  return { code: `${word}-${balles}-${key}`, balles };
}

/** Le mot de passe qui débloque le créateur de codes (majuscules et minuscules indifférentes). */
export function isAdminPassword(input: string, hash: string = ADMIN_HASH): boolean {
  const text = normalizeInput(input);
  return text.length > 0 && toHex(sha256(utf8(ADMIN_SALT + text))) === hash;
}
