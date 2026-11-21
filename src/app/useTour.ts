import { useCallback, useState } from 'react';
import { storageKey } from '../persistence/storageKey.ts';

const SEEN_KEY = storageKey('einfuehrung-gesehen');

function seen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === 'ja';
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, 'ja');
  } catch {
    // Ohne Speicher erscheint die Einführung beim nächsten Start eben wieder
  }
}

export interface TourState {
  /** Aktueller Schritt ab 0, null = geschlossen */
  index: number | null;
  start: () => void;
  next: () => void;
  back: () => void;
  close: () => void;
}

/** Einführung beim ersten Start; jederzeit über Menü oder Suche wieder aufrufbar */
export function useTourState(): TourState {
  const [index, setIndex] = useState<number | null>(() => (seen() ? null : 0));
  const start = useCallback(() => {
    setIndex(0);
  }, []);
  const next = useCallback(() => {
    setIndex((current) => (current === null ? null : current + 1));
  }, []);
  const back = useCallback(() => {
    setIndex((current) => (current === null ? null : Math.max(0, current - 1)));
  }, []);
  const close = useCallback(() => {
    remember();
    setIndex(null);
  }, []);
  return { index, start, next, back, close };
}
