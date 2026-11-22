import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useStage } from '../ui/stage/stageContext.ts';
import { useApp } from './AppContext.ts';
import type { Apartment } from './prototype/apartment.ts';
import { apartmentBounds } from './prototype/geometry.ts';
import { CUT_HEIGHT } from './prototype/dollhouse.ts';
import {
  areaCenter,
  clampTilt,
  dollhouseProjection,
  fittedViewport,
  keepNearApartment,
  orbitDollhouseAround,
  panDollhouse,
  panPlan,
  planFrame,
  sceneArea,
  visibleCenter,
  ZOOM_STEP,
  zoomDollhouseAt,
  zoomPlanAt,
  type Orbit,
  type Point2,
  type Viewport,
} from './viewport.ts';

const EMPTY_BOUNDS = { x0: 0, y0: 0, x1: 10, y1: 8 };

interface PlanCameraOptions {
  /** Andere Wohnung als die aktive, z. B. während der Erkennung */
  apartment?: Apartment | null;
  /** Zusätzlicher Rand in Metern, z. B. für das Papier des Plans */
  pad?: number;
  /** Platz für die Seitenleiste lassen (Schritt Grundriss) */
  panel?: boolean;
  /** Platz für den Hinweis der Erkennung oben lassen (Schritt Bauen) */
  banner?: boolean;
  /** Diese Ansicht ist sichtbar und bekommt die Zoom-Tasten */
  active?: boolean;
}

/** Kamera der Draufsicht: Rahmen für die Zeichnung und Befehle für Zoom und Verschieben */
export function usePlanCamera({
  apartment: override,
  pad = 0,
  panel = false,
  banner = false,
  active = true,
}: PlanCameraOptions = {}) {
  const app = useApp();
  const { planViewport, setPlanViewport, zoomApiRef } = app;
  const apartment = override ?? app.apartment;
  const { width, height, layout } = useStage();
  const bounds = useMemo(() => {
    const base = apartment ? apartmentBounds(apartment) : EMPTY_BOUNDS;
    return { x0: base.x0 - pad, y0: base.y0 - pad, x1: base.x1 + pad, y1: base.y1 + pad };
  }, [apartment, pad]);
  const area = useMemo(
    () => sceneArea(width, height, layout, { panel, banner }),
    [width, height, layout, panel, banner],
  );
  const viewport = planViewport ?? fittedViewport(bounds);
  const frame = planFrame(viewport, bounds, area);

  const zoomAt = useCallback(
    (factor: number, anchor?: Point2) => {
      setPlanViewport((current) =>
        zoomPlanAt(
          current ?? fittedViewport(bounds),
          bounds,
          area,
          factor,
          anchor ?? areaCenter(area),
        ),
      );
    },
    [bounds, area, setPlanViewport],
  );
  const pan = useCallback(
    (dx: number, dy: number) => {
      setPlanViewport((current) => {
        const base = current ?? fittedViewport(bounds);
        return panPlan(base, planFrame(base, bounds, area), dx, dy);
      });
    },
    [bounds, area, setPlanViewport],
  );
  const fit = useCallback(() => {
    setPlanViewport(null);
  }, [setPlanViewport]);

  useEffect(() => {
    if (!active) return;
    zoomApiRef.current = {
      zoomIn: () => {
        zoomAt(ZOOM_STEP);
      },
      zoomOut: () => {
        zoomAt(1 / ZOOM_STEP);
      },
      fit,
    };
    return () => {
      zoomApiRef.current = null;
    };
  }, [active, zoomApiRef, zoomAt, fit]);

  return { frame, area, bounds, viewport, zoomAt, pan, fit, fitted: planViewport === null };
}

interface DollhouseState {
  viewport: Viewport;
  orbit: Orbit;
}

/** Gleiche Kamera bis auf Rechenungenauigkeit (dann bleibt „eingepasst“ erhalten) */
function sameViewport(a: Viewport, b: Viewport): boolean {
  return (
    a.zoom === b.zoom &&
    Math.abs(a.center[0] - b.center[0]) < 1e-6 &&
    Math.abs(a.center[1] - b.center[1]) < 1e-6
  );
}

interface UpdateOptions {
  /** Ohne Sperre, für Drehen und Neigen: Der Drehpunkt bleibt so genau stehen */
  free?: boolean;
}

/**
 * Kamera des Puppenhauses: Drehen und Neigen um die Mitte des sichtbaren Teils der Wohnung,
 * Zoomen und Verschieben. Beim Verschieben und Zoomen entfernt sich die Bildmitte nie weiter von
 * der Wohnung (`keepNearApartment`); Drehen ist frei, der Drehpunkt liegt ja in der Wohnung.
 */
export function useDollhouseCamera(active = true) {
  const { apartment, dollViewport, setDollViewport, orbit, setOrbit, zoomApiRef } = useApp();
  const { width, height, layout } = useStage();
  const bounds = useMemo(
    () => (apartment ? apartmentBounds(apartment) : EMPTY_BOUNDS),
    [apartment],
  );
  const area = useMemo(() => sceneArea(width, height, layout), [width, height, layout]);
  const viewport = useMemo(() => dollViewport ?? fittedViewport(bounds), [dollViewport, bounds]);
  const projection = useMemo(
    () => dollhouseProjection(viewport, orbit, bounds, area, CUT_HEIGHT),
    [viewport, orbit, bounds, area],
  );

  // Drehung und Mitte hängen voneinander ab und kommen aus zwei Zuständen. Mehrere
  // Zeigerbewegungen vor dem nächsten Bild bauen über diesen Stand aufeinander auf.
  const live = useRef({ viewport: dollViewport, orbit });
  useLayoutEffect(() => {
    live.current = { viewport: dollViewport, orbit };
  }, [dollViewport, orbit]);

  const update = useCallback(
    (change: (state: DollhouseState) => DollhouseState, { free = false }: UpdateOptions = {}) => {
      const current = live.current;
      const base = current.viewport ?? fittedViewport(bounds);
      const next = change({ viewport: base, orbit: current.orbit });
      // Die Sperre beim Drehen würde die Mitte klemmen und den Drehpunkt wandern lassen (D-031)
      const kept = free ? next.viewport : keepNearApartment(next.viewport, base, bounds);
      const nextViewport = current.viewport === null && sameViewport(kept, base) ? null : kept;
      live.current = { viewport: nextViewport, orbit: next.orbit };
      if (nextViewport !== current.viewport) setDollViewport(nextViewport);
      if (next.orbit !== current.orbit) setOrbit(next.orbit);
    },
    [bounds, setDollViewport, setOrbit],
  );

  const zoomAt = useCallback(
    (factor: number, anchor?: Point2) => {
      update((state) => {
        const at = dollhouseProjection(state.viewport, state.orbit, bounds, area, CUT_HEIGHT);
        return {
          ...state,
          viewport: zoomDollhouseAt(state.viewport, at, factor, anchor ?? areaCenter(area)),
        };
      });
    },
    [update, bounds, area],
  );
  const pan = useCallback(
    (dx: number, dy: number) => {
      update((state) => {
        const at = dollhouseProjection(state.viewport, state.orbit, bounds, area, CUT_HEIGHT);
        return { ...state, viewport: panDollhouse(state.viewport, at, dx, dy) };
      });
    },
    [update, bounds, area],
  );
  /** Drehpunkt für eine ganze Geste: einmal am Anfang bestimmen, dann festhalten */
  const pivot = useCallback((): Point2 => {
    const current = live.current;
    const base = current.viewport ?? fittedViewport(bounds);
    return visibleCenter(
      dollhouseProjection(base, current.orbit, bounds, area, CUT_HEIGHT),
      bounds,
      area,
    );
  }, [bounds, area]);
  /** Dreht und neigt um `around`; ohne Angabe um die Mitte des sichtbaren Teils der Wohnung */
  const turn = useCallback(
    (yaw: number, tilt: number, around?: Point2) => {
      const at = around ?? pivot();
      update(
        (state) => {
          const to: Orbit = {
            yaw: (state.orbit.yaw + yaw) % 360,
            tilt: clampTilt(state.orbit.tilt + tilt),
          };
          return {
            orbit: to,
            viewport: orbitDollhouseAround(
              state.viewport,
              state.orbit,
              to,
              at,
              bounds,
              area,
              CUT_HEIGHT,
            ),
          };
        },
        { free: true },
      );
    },
    [update, pivot, bounds, area],
  );
  const fit = useCallback(() => {
    setDollViewport(null);
  }, [setDollViewport]);

  useEffect(() => {
    if (!active) return;
    zoomApiRef.current = {
      zoomIn: () => {
        zoomAt(ZOOM_STEP);
      },
      zoomOut: () => {
        zoomAt(1 / ZOOM_STEP);
      },
      fit,
    };
    return () => {
      zoomApiRef.current = null;
    };
  }, [active, zoomApiRef, zoomAt, fit]);

  return {
    projection,
    area,
    viewport,
    zoomAt,
    pan,
    turn,
    pivot,
    fit,
    fitted: dollViewport === null,
  };
}
