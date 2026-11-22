import { describe, expect, it } from 'vitest';
import type { Bounds } from './prototype/geometry.ts';
import {
  areaCenter,
  BANNER_SPACE,
  boundsCenter,
  clampToBounds,
  clipToBounds,
  distanceToBounds,
  dollhouseProjection,
  fittedViewport,
  keepNearApartment,
  keepOverApartment,
  orbitDollhouseAround,
  PANEL_HEIGHT_COMPACT,
  PANEL_WIDTH,
  panPlan,
  planFrame,
  polygonCentroid,
  sceneArea,
  screenStepOnFloor,
  visibleCenter,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomDollhouseAt,
  zoomPlanAt,
  type Orbit,
  type Point2,
  type Viewport,
} from './viewport.ts';

const BOUNDS: Bounds = { x0: 0, y0: 0, x1: 10, y1: 8 };
const WIDE = sceneArea(1440, 900, 'wide');
const COMPACT = sceneArea(390, 844, 'compact');
const WALL_TOP = 1.15;
const ORBIT: Orbit = { yaw: -28, tilt: 50 };

function expectPoint(actual: Point2, expected: Point2, digits = 6) {
  expect(actual[0]).toBeCloseTo(expected[0], digits);
  expect(actual[1]).toBeCloseTo(expected[1], digits);
}

function polygonArea(points: readonly Point2[]): number {
  let sum = 0;
  points.forEach((p, index) => {
    const q = points[(index + 1) % points.length] ?? p;
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(sum) / 2;
}

describe('sceneArea', () => {
  it('lässt am PC Platz für Werkzeugpalette und Leisten', () => {
    expect(WIDE).toEqual({ x0: 104, y0: 92, x1: 1400, y1: 808 });
  });

  it('lässt am PC rechts Platz für die Seitenleiste im Schritt Grundriss', () => {
    const area = sceneArea(1440, 900, 'wide', { panel: true });
    expect(area.x0).toBe(40);
    expect(area.x1).toBe(1440 - PANEL_WIDTH);
  });

  it('lässt oben Platz für den Hinweis der Erkennung', () => {
    expect(sceneArea(1440, 900, 'wide', { banner: true }).y0).toBe(92 + BANNER_SPACE.wide);
    expect(sceneArea(390, 844, 'compact', { banner: true }).y0).toBe(128 + BANNER_SPACE.compact);
  });

  it('liegt auf dem Handy zwischen den Leisten', () => {
    expect(COMPACT).toEqual({ x0: 12, y0: 128, x1: 378, y1: 844 - 262 });
  });

  it('lässt auf dem Handy unten Platz für die Seitenleiste, oben fehlt die Ansichtsleiste', () => {
    const area = sceneArea(390, 844, 'compact', { panel: true });
    expect(area.y0).toBe(76);
    expect(area.y1).toBe(844 - PANEL_HEIGHT_COMPACT);
  });

  it('bleibt auch auf einer winzigen Bühne mindestens 120 px groß', () => {
    for (const area of [sceneArea(150, 150, 'wide'), sceneArea(100, 300, 'compact')]) {
      expect(area.x1 - area.x0).toBeGreaterThanOrEqual(120);
      expect(area.y1 - area.y0).toBeGreaterThanOrEqual(120);
    }
  });
});

describe('Draufsicht', () => {
  it('passt die Wohnung eingepasst mittig und ganz in die freie Fläche', () => {
    const frame = planFrame(fittedViewport(BOUNDS), BOUNDS, WIDE);
    const toScreen = ([x, y]: Point2): Point2 => [
      frame.ox + x * frame.scale,
      frame.oy + y * frame.scale,
    ];
    expectPoint(toScreen(boundsCenter(BOUNDS)), areaCenter(WIDE));
    const [left, top] = toScreen([BOUNDS.x0, BOUNDS.y0]);
    const [right, bottom] = toScreen([BOUNDS.x1, BOUNDS.y1]);
    expect(left).toBeGreaterThanOrEqual(WIDE.x0);
    expect(top).toBeGreaterThanOrEqual(WIDE.y0);
    expect(right).toBeLessThanOrEqual(WIDE.x1);
    expect(bottom).toBeLessThanOrEqual(WIDE.y1);
  });

  it('zoomt mit festem Anker: Der Punkt unter dem Zeiger bleibt stehen', () => {
    const before: Viewport = { zoom: 1.6, center: [3, 5] };
    const anchor: Point2 = [300, 250];
    for (const factor of [1.25, 1 / 1.25, 3, 0.4]) {
      const frameBefore = planFrame(before, BOUNDS, WIDE);
      const world: Point2 = [
        (anchor[0] - frameBefore.ox) / frameBefore.scale,
        (anchor[1] - frameBefore.oy) / frameBefore.scale,
      ];
      const after = zoomPlanAt(before, BOUNDS, WIDE, factor, anchor);
      expect(after.zoom).toBeCloseTo(before.zoom * factor, 9);
      const frameAfter = planFrame(after, BOUNDS, WIDE);
      expectPoint(
        [frameAfter.ox + world[0] * frameAfter.scale, frameAfter.oy + world[1] * frameAfter.scale],
        anchor,
      );
    }
  });

  it('begrenzt den Zoom auf 25 bis 800 % und hält den Anker auch an der Grenze', () => {
    const atMax: Viewport = { zoom: ZOOM_MAX, center: [5, 4] };
    expect(zoomPlanAt(atMax, BOUNDS, WIDE, 1.25, [500, 500])).toBe(atMax);
    const atMin: Viewport = { zoom: ZOOM_MIN, center: [5, 4] };
    expect(zoomPlanAt(atMin, BOUNDS, WIDE, 0.8, [500, 500])).toBe(atMin);

    const near: Viewport = { zoom: 6, center: [5, 4] };
    const anchor: Point2 = [900, 300];
    const frameBefore = planFrame(near, BOUNDS, WIDE);
    const world: Point2 = [
      (anchor[0] - frameBefore.ox) / frameBefore.scale,
      (anchor[1] - frameBefore.oy) / frameBefore.scale,
    ];
    const after = zoomPlanAt(near, BOUNDS, WIDE, 2, anchor);
    expect(after.zoom).toBe(ZOOM_MAX);
    const frameAfter = planFrame(after, BOUNDS, WIDE);
    expectPoint(
      [frameAfter.ox + world[0] * frameAfter.scale, frameAfter.oy + world[1] * frameAfter.scale],
      anchor,
    );
  });

  it('verschiebt die Zeichnung um genau die gezogene Strecke', () => {
    const before: Viewport = { zoom: 2, center: [4, 4] };
    const frameBefore = planFrame(before, BOUNDS, WIDE);
    const after = panPlan(before, frameBefore, 30, -12);
    const frameAfter = planFrame(after, BOUNDS, WIDE);
    expect(frameAfter.ox - frameBefore.ox).toBeCloseTo(30, 9);
    expect(frameAfter.oy - frameBefore.oy).toBeCloseTo(-12, 9);
  });
});

describe('Puppenhaus', () => {
  const project = (viewport: Viewport, orbit: Orbit = ORBIT, area = WIDE) =>
    dollhouseProjection(viewport, orbit, BOUNDS, area, WALL_TOP);

  it('zeigt die Mitte der Kamera in der Mitte der freien Fläche', () => {
    const viewport: Viewport = { zoom: 2.5, center: [2, 6] };
    const projection = project(viewport);
    expectPoint(projection.project(2, 6, 0), areaCenter(WIDE));
    expectPoint(projection.unproject(...areaCenter(WIDE)), [2, 6]);
  });

  it('zoomt mit festem Anker: Der Bodenpunkt unter dem Zeiger bleibt stehen', () => {
    for (const [viewport, anchor, factor] of [
      [{ zoom: 1, center: [5, 4] }, [300, 200], 1.25],
      [{ zoom: 3, center: [1, 7] }, [1200, 700], 1 / 1.25],
      [{ zoom: 0.5, center: [5, 4] }, [752, 450], 4],
    ] as const satisfies readonly (readonly [Viewport, Point2, number])[]) {
      const before = project(viewport);
      const world = before.unproject(anchor[0], anchor[1]);
      const next = zoomDollhouseAt(viewport, before, factor, anchor);
      expect(next.zoom).toBeCloseTo(viewport.zoom * factor, 9);
      expectPoint(project(next).project(world[0], world[1], 0), anchor);
    }
  });

  it('ändert beim Zoom an der Grenze nichts', () => {
    const viewport: Viewport = { zoom: ZOOM_MAX, center: [5, 4] };
    expect(zoomDollhouseAt(viewport, project(viewport), 1.25, [400, 400])).toBe(viewport);
  });

  it('dreht und neigt um den Drehpunkt: Er bleibt auf dem Bildschirm an seiner Stelle', () => {
    const viewport: Viewport = { zoom: 2.4, center: [7, 2] };
    const pivot: Point2 = [6.5, 2.5];
    for (const to of [
      { yaw: 17, tilt: 50 },
      { yaw: -28, tilt: 70 },
      { yaw: 152, tilt: 22 },
      { yaw: -200, tilt: 40 },
    ]) {
      const before = project(viewport).project(pivot[0], pivot[1], 0);
      const next = orbitDollhouseAround(viewport, ORBIT, to, pivot, BOUNDS, WIDE, WALL_TOP);
      expect(next.zoom).toBe(viewport.zoom);
      expectPoint(project(next, to).project(pivot[0], pivot[1], 0), before);
    }
  });

  describe('screenStepOnFloor', () => {
    const viewport: Viewport = { zoom: 1.6, center: [5, 4] };
    const sofa: Point2 = [5.4, 6.7];

    /** Wohin ein Möbel auf dem Bildschirm wandert, wenn es um `step` auf dem Boden rückt */
    function onScreen(orbit: Orbit, step: Point2): Point2 {
      const projection = project(viewport, orbit);
      const before = projection.project(sofa[0], sofa[1], 0);
      const after = projection.project(sofa[0] + step[0], sofa[1] + step[1], 0);
      return [after[0] - before[0], after[1] - before[1]];
    }

    it('schiebt mit Pfeil rechts nach rechts im Bild, auch im gedrehten Puppenhaus', () => {
      for (const orbit of [
        ORBIT,
        { yaw: 0, tilt: 50 },
        { yaw: 90, tilt: 30 },
        { yaw: 152, tilt: 50 },
        { yaw: 180, tilt: 72 },
        { yaw: -245, tilt: 18 },
      ]) {
        const projection = project(viewport, orbit);
        const right = onScreen(orbit, screenStepOnFloor(projection, 0.05, 0));
        expect(right[0], `rechts bei ${String(orbit.yaw)}°`).toBeGreaterThan(0);
        expect(right[1]).toBeCloseTo(0, 9);
        const left = onScreen(orbit, screenStepOnFloor(projection, -0.05, 0));
        expect(left[0]).toBeLessThan(0);
        expect(left[1]).toBeCloseTo(0, 9);
        // Hoch und runter: senkrecht im Bild, runter zeigt nach unten
        const down = onScreen(orbit, screenStepOnFloor(projection, 0, 0.05));
        expect(down[0]).toBeCloseTo(0, 9);
        expect(down[1], `runter bei ${String(orbit.yaw)}°`).toBeGreaterThan(0);
        const up = onScreen(orbit, screenStepOnFloor(projection, 0, -0.05));
        expect(up[0]).toBeCloseTo(0, 9);
        expect(up[1]).toBeLessThan(0);
      }
    });

    it('schiebt auf dem Boden immer genau die Schrittweite, wie gedreht und gezoomt auch', () => {
      for (const [orbit, zoom] of [
        [ORBIT, 1],
        [{ yaw: 152, tilt: 50 }, 4],
        [{ yaw: 90, tilt: 72 }, 0.25],
      ] as const) {
        const projection = project({ ...viewport, zoom }, orbit);
        for (const [dx, dy] of [
          [0.05, 0],
          [0, -0.5],
          [0.5, 0],
        ] as const) {
          const [wx, wy] = screenStepOnFloor(projection, dx, dy);
          expect(Math.hypot(wx, wy)).toBeCloseTo(Math.hypot(dx, dy), 9);
        }
      }
      expect(screenStepOnFloor(project(viewport), 0, 0)).toEqual([0, 0]);
    });
  });

  describe('visibleCenter', () => {
    it('ist im Überblick die Mitte der Wohnung, aus jedem Winkel', () => {
      for (const yaw of [-28, 0, 45, 90, 180, 245]) {
        const projection = project(fittedViewport(BOUNDS), { yaw, tilt: 50 });
        expectPoint(visibleCenter(projection, BOUNDS, WIDE), boundsCenter(BOUNDS), 4);
      }
    });

    it('ist herangezoomt die Mitte des Bildes, solange sie über der Wohnung liegt', () => {
      const projection = project({ zoom: 6, center: [3, 3] });
      expectPoint(visibleCenter(projection, BOUNDS, WIDE), [3, 3], 4);
    });

    it('rückt am Rand in den sichtbaren Teil der Wohnung', () => {
      const projection = project({ zoom: 6, center: [0.3, 4] });
      const [x, y] = visibleCenter(projection, BOUNDS, WIDE);
      expect(x).toBeGreaterThan(0.3);
      expect(x).toBeLessThan(BOUNDS.x1);
      expect(y).toBeGreaterThan(BOUNDS.y0);
      expect(y).toBeLessThan(BOUNDS.y1);
    });

    it('nimmt den Punkt der Wohnung nächst der Bildmitte, wenn nichts zu sehen ist', () => {
      const projection = project({ zoom: 6, center: [30, 20] });
      expectPoint(visibleCenter(projection, BOUNDS, WIDE), [BOUNDS.x1, BOUNDS.y1]);
    });

    it('rechnet auch auf dem Handy mit der freien Fläche', () => {
      const projection = project(fittedViewport(BOUNDS), ORBIT, COMPACT);
      expectPoint(visibleCenter(projection, BOUNDS, COMPACT), boundsCenter(BOUNDS), 4);
    });
  });

  describe('keepOverApartment', () => {
    it('lässt eine Kamera über der Wohnung unverändert', () => {
      const viewport: Viewport = { zoom: 2, center: [3, 7.5] };
      expect(keepOverApartment(viewport, BOUNDS)).toBe(viewport);
    });

    it('holt die Bildmitte an den Rand der Wohnung zurück und behält den Zoom', () => {
      expect(keepOverApartment({ zoom: 2, center: [-3, 12] }, BOUNDS)).toEqual({
        zoom: 2,
        center: [0, 8],
      });
      expect(keepOverApartment({ zoom: 0.5, center: [4, -1] }, BOUNDS)).toEqual({
        zoom: 0.5,
        center: [4, 0],
      });
    });
  });

  describe('keepNearApartment', () => {
    it('lässt Bewegungen über der Wohnung unverändert', () => {
      const next: Viewport = { zoom: 2, center: [3, 7] };
      expect(keepNearApartment(next, { zoom: 2, center: [5, 4] }, BOUNDS)).toBe(next);
    });

    it('lässt die Bildmitte von innen nur bis an den Rand gleiten', () => {
      const previous: Viewport = { zoom: 2, center: [9, 4] };
      expect(keepNearApartment({ zoom: 2, center: [12, 5] }, previous, BOUNDS)).toEqual({
        zoom: 2,
        center: [10, 5],
      });
    });

    it('springt nach einer Drehung neben die Wohnung nicht zurück', () => {
      // Die Mitte liegt 2 m rechts neben der Wohnung: Verschieben quer dazu oder näher heran geht
      const previous: Viewport = { zoom: 1, center: [12, 4] };
      const along: Viewport = { zoom: 1, center: [12, 6] };
      expect(keepNearApartment(along, previous, BOUNDS)).toBe(along);
      const closer: Viewport = { zoom: 1, center: [11, 4] };
      expect(keepNearApartment(closer, previous, BOUNDS)).toBe(closer);
    });

    it('lässt die Bildmitte nicht weiter von der Wohnung weg als vorher', () => {
      const previous: Viewport = { zoom: 1, center: [12, 4] };
      const kept = keepNearApartment({ zoom: 1, center: [15, 4] }, previous, BOUNDS);
      expect(kept.center[0]).toBeCloseTo(12, 9);
      expect(kept.center[1]).toBeCloseTo(4, 9);
      // An der Ecke: Abstand bleibt, die Richtung von der Ecke aus auch
      const corner = keepNearApartment({ zoom: 1, center: [14, 12] }, previous, BOUNDS);
      expect(distanceToBounds(corner.center, BOUNDS)).toBeCloseTo(2, 9);
      expect((corner.center[1] - 8) / (corner.center[0] - 10)).toBeCloseTo(1, 9);
    });

    it('misst den Abstand im Maß des Bildschirms: Heranzoomen holt die Wohnung näher', () => {
      const previous: Viewport = { zoom: 1, center: [12, 4] };
      const zoomed = keepNearApartment({ zoom: 2, center: [12, 4] }, previous, BOUNDS);
      expect(zoomed.zoom).toBe(2);
      expect(distanceToBounds(zoomed.center, BOUNDS)).toBeCloseTo(1, 9);
      // Herauszoomen darf weiter weg, denn auf dem Bildschirm bleibt der Abstand gleich
      const out: Viewport = { zoom: 0.5, center: [14, 4] };
      expect(keepNearApartment(out, previous, BOUNDS)).toBe(out);
    });
  });
});

describe('distanceToBounds', () => {
  it('ist innen und auf dem Rand 0, außen der Abstand zum nächsten Randpunkt', () => {
    expect(distanceToBounds([4, 4], BOUNDS)).toBe(0);
    expect(distanceToBounds([10, 8], BOUNDS)).toBe(0);
    expect(distanceToBounds([-3, 4], BOUNDS)).toBe(3);
    expect(distanceToBounds([13, 12], BOUNDS)).toBeCloseTo(5, 9);
  });
});

describe('clampToBounds', () => {
  it('lässt Punkte innen und auf dem Rand stehen', () => {
    expect(clampToBounds([4, 4], BOUNDS)).toEqual([4, 4]);
    expect(clampToBounds([0, 8], BOUNDS)).toEqual([0, 8]);
  });

  it('schiebt Punkte außen auf den nächsten Randpunkt', () => {
    expect(clampToBounds([-2, 4], BOUNDS)).toEqual([0, 4]);
    expect(clampToBounds([12, -1], BOUNDS)).toEqual([10, 0]);
  });
});

describe('clipToBounds', () => {
  it('lässt ein Vieleck innen unverändert', () => {
    const inside: Point2[] = [
      [1, 1],
      [3, 1],
      [2, 4],
    ];
    expect(clipToBounds(inside, BOUNDS)).toEqual(inside);
  });

  it('schneidet ein Vieleck an den Grenzen ab', () => {
    const square: Point2[] = [
      [-2, -2],
      [2, -2],
      [2, 2],
      [-2, 2],
    ];
    const clipped = clipToBounds(square, BOUNDS);
    expect(polygonArea(clipped)).toBeCloseTo(4, 9);
    for (const [x, y] of clipped) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  it('schneidet eine gedrehte Raute über einer Ecke richtig', () => {
    const diamond: Point2[] = [
      [10, 6],
      [12, 8],
      [10, 10],
      [8, 8],
    ];
    // Ein Viertel der Raute (Fläche 8) liegt in der Wohnung
    expect(polygonArea(clipToBounds(diamond, BOUNDS))).toBeCloseTo(2, 9);
  });

  it('liefert nichts, wenn das Vieleck ganz außerhalb liegt', () => {
    const outside: Point2[] = [
      [20, 20],
      [22, 20],
      [22, 22],
    ];
    expect(clipToBounds(outside, BOUNDS)).toEqual([]);
  });
});

describe('polygonCentroid', () => {
  it('findet die Mitte eines Rechtecks, egal in welcher Umlaufrichtung', () => {
    const rectangle: Point2[] = [
      [1, 2],
      [5, 2],
      [5, 4],
      [1, 4],
    ];
    expectPoint(polygonCentroid(rectangle) ?? [NaN, NaN], [3, 3]);
    expectPoint(polygonCentroid([...rectangle].reverse()) ?? [NaN, NaN], [3, 3]);
  });

  it('gewichtet nach Fläche, nicht nach Ecken', () => {
    // L-Form: 2×2-Quadrat und 2×1-Streifen rechts daneben unten
    const shape: Point2[] = [
      [0, 0],
      [2, 0],
      [2, 1],
      [4, 1],
      [4, 2],
      [0, 2],
    ];
    // Schwerpunkt: (4 · (1; 1) + 2 · (3; 1,5)) / 6
    expectPoint(polygonCentroid(shape) ?? [NaN, NaN], [10 / 6, 7 / 6]);
  });

  it('liefert null für Vielecke ohne Fläche', () => {
    expect(polygonCentroid([])).toBeNull();
    expect(
      polygonCentroid([
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
    ).toBeNull();
  });
});
