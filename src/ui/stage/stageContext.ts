import { createContext, useContext } from 'react';

/**
 * Die Bühne ist die Fläche, auf der die Wohnung liegt (später das 3D). Alle schwebenden Bausteine
 * richten sich nach ihrer Breite, nicht nach dem Fenster: So lassen sich PC- und Handy-Ansicht
 * auch nebeneinander zeigen. Bis 720 px Breite gilt die Handy-Anordnung.
 */
export const COMPACT_MAX_WIDTH = 720;

export type StageLayout = 'wide' | 'compact';

export interface StageInfo {
  layout: StageLayout;
  width: number;
  height: number;
}

export const StageContext = createContext<StageInfo>({ layout: 'wide', width: 0, height: 0 });

export function useStage(): StageInfo {
  return useContext(StageContext);
}

export function layoutForWidth(width: number): StageLayout {
  return width > 0 && width <= COMPACT_MAX_WIDTH ? 'compact' : 'wide';
}
