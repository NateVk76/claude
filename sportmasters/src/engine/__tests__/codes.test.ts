import { describe, expect, it } from 'vitest';
import { hmacSha256, sha256, toHex, utf8 } from '../sha256';
import { MAX_CODE_BALLES, checkCode, cleanWord, createCode, isAdminPassword, normalizeInput, randomWord } from '../codes';
import { mulberry32 } from '../random';

// les mêmes calculs par la cryptographie intégrée (crypto.subtle), pour comparer
async function reference(text: string, key?: string): Promise<string> {
  if (key === undefined) return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(text))));
  const cryptoKey = await crypto.subtle.importKey('raw', utf8(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, utf8(text))));
}

describe('SHA-256 et HMAC', () => {
  it('donnent les mêmes empreintes que crypto.subtle, quelle que soit la longueur', async () => {
    for (const length of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const text = 'é'.repeat(length % 7) + 'a'.repeat(length);
      expect(toHex(sha256(utf8(text)))).toBe(await reference(text));
      for (const key of ['clé', 'k'.repeat(64), 'k'.repeat(100)]) {
        expect(toHex(hmacSha256(utf8(key), utf8(text)))).toBe(await reference(text, key));
      }
    }
  });

  it('retrouve les vecteurs de test officiels', () => {
    expect(toHex(sha256(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?')))).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
});

describe('codes cadeaux', () => {
  it('reconnaît un code créé, même tapé en minuscules, avec des espaces ou O à la place de 0', () => {
    const code = createCode('cadeau', 50_000);
    expect(code).toMatch(/^CADEAU-50000-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(checkCode(code)).toEqual({ code, balles: 50_000 });
    expect(checkCode(` ${code.toLowerCase().replace('-50000-', ' – 50 000 - ')} `)).toEqual({ code, balles: 50_000 });
    const withLetters = code.replace(/-([^-]+)$/, (_, key: string) => `-${key.replace(/0/g, 'O').replace(/1/g, 'I')}`);
    expect(checkCode(withLetters)?.code).toBe(code);
  });

  it('refuse un code inventé ou retouché', () => {
    const code = createCode('NATE', 1_000_000);
    expect(checkCode(code.replace('1000000', '9000000'))).toBeNull();
    expect(checkCode(code.replace('NATE', 'NATO'))).toBeNull();
    expect(checkCode('NATE-1000000-AAAAAA')).toBeNull();
    expect(checkCode(code.replace(/-/g, ''))).toBeNull();
    expect(checkCode('')).toBeNull();
    expect(checkCode('n’importe quoi')).toBeNull();
  });

  it('donne un code différent pour chaque mot, et le même code pour le même mot', () => {
    expect(createCode('A', 10_000)).not.toBe(createCode('B', 10_000));
    expect(createCode('été 2026', 10_000)).toBe(createCode('ETE2026', 10_000));
    const rng = mulberry32(7);
    const words = new Set(Array.from({ length: 200 }, () => randomWord(rng)));
    expect(words.size).toBeGreaterThan(195);
    for (const word of words) expect(checkCode(createCode(word, 1234))?.balles).toBe(1234);
  });

  it('limite le montant et le mot', () => {
    expect(() => createCode('X', 0)).toThrow();
    expect(() => createCode('X', MAX_CODE_BALLES + 1)).toThrow();
    expect(() => createCode('!!!', 100)).toThrow();
    expect(cleanWord('Joyeux anniversaire !')).toBe('JOYEUXANNIVE');
    expect(normalizeInput('  ab_cd—12 ')).toBe('AB-CD-12');
  });

  it('vérifie le mot de passe administrateur par son empreinte', () => {
    const hash = toHex(sha256(utf8('athleticards-admin:MOT-DE-PASSE-TEST')));
    expect(isAdminPassword('mot-de-passe-test', hash)).toBe(true);
    expect(isAdminPassword(' Mot - de - passe - test ', hash)).toBe(true);
    expect(isAdminPassword('mot-de-passe', hash)).toBe(false);
    expect(isAdminPassword('', hash)).toBe(false);
    expect(isAdminPassword('mot-de-passe-test')).toBe(false);
  });
});
