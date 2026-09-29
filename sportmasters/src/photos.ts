import { useSyncExternalStore } from 'react';
import credits from './data/photos.json';
import type { Athlete } from './engine/types';

// Photos des athlètes : fichiers de Wikimedia Commons (licences libres), récupérés par
// scripts/photos/telecharger-photos.mjs. Chaque photo garde son auteur et sa licence.

export interface PhotoCredit {
  file: string;
  /** photo détourée (fond transparent) : l'athlète « sort » de la carte */
  cutout: boolean;
  author: string;
  license: string;
  licenseUrl: string;
  page: string;
}

const CREDITS = credits as Record<string, PhotoCredit>;

export function photoCredit(athleteId: string): PhotoCredit | undefined {
  return CREDITS[athleteId];
}

export function photoCount(): number {
  return Object.keys(CREDITS).length;
}

// Version « un seul fichier » : les images ne peuvent pas être de simples fichiers liés,
// elles arrivent par paquets (un par sport) chargés à la demande.
const SINGLE_FILE = import.meta.env.MODE === 'single';
const cache = new Map<string, string>();
const requested = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadChunk(sport: string) {
  if (requested.has(sport)) return;
  requested.add(sport);
  fetch(`photos/${sport}.json`)
    .then((response) => (response.ok ? response.json() : {}))
    .then((map: Record<string, string>) => {
      for (const [id, src] of Object.entries(map)) cache.set(id, src);
      version += 1;
      listeners.forEach((listener) => listener());
    })
    .catch(() => {
      /* sans photos, la carte garde son pictogramme */
    });
}

export function usePhoto(athlete: Athlete): { src?: string; cutout: boolean } {
  useSyncExternalStore(subscribe, () => version);
  const credit = CREDITS[athlete.id];
  if (!credit) return { cutout: false };
  if (!SINGLE_FILE) return { src: `${import.meta.env.BASE_URL}photos/${credit.file}`, cutout: credit.cutout };
  const src = cache.get(athlete.id);
  if (!src) loadChunk(athlete.sport);
  return { src, cutout: credit.cutout };
}
