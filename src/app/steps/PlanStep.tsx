import { useEffect, useId, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import {
  Button,
  FactList,
  formatNumber,
  Icon,
  icons,
  NumberField,
  StageView,
  ViewBar,
  ZoomControls,
} from '../../ui/index.ts';
import { prefersReducedMotion } from '../../ui/hooks/useMediaQuery.ts';
import { useStage } from '../../ui/stage/stageContext.ts';
import { useApp } from '../AppContext.ts';
import { usePlanCamera } from '../camera.ts';
import { recognizedApartment, type Apartment, type Point } from '../prototype/apartment.ts';
import { screenDirection } from '../prototype/directions.ts';
import { rescaleApartment, sunPatches, totalArea } from '../prototype/geometry.ts';
import { PaperPlan } from '../prototype/PaperPlan.tsx';
import { toCentimeters } from '../units.ts';
import { useSceneGestures } from '../useSceneGestures.ts';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../viewport.ts';

/** Ablauf der gespielten Erkennung in Millisekunden */
const PHASES = [
  { label: 'Wände finden', until: 1500 },
  { label: 'Türen und Fenster finden', until: 2600 },
  { label: 'Maße und Flächen lesen', until: 3500 },
] as const;
const RECOGNITION_MS = 3900;

/** Uhrzeit der Sonnenflecken beim Festlegen der Nordrichtung */
const NORTH_PREVIEW_TIME = 15.5;

/** Messstrecke beim Nachmessen: die Fensterwand im Wohnzimmer (innen), wie erkannt */
const REFERENCE: { from: Point; to: Point } = { from: [0, 8.2], to: [5.88, 8.2] };

/** Die Messstrecke im jetzigen Maßstab: nach einem Nachmessen ist sie mitgestreckt */
function referenceLine(apartment: Apartment): { from: Point; to: Point; centimeters: number } {
  const at = (point: Point): Point => [point[0] * apartment.scale, point[1] * apartment.scale];
  const from = at(REFERENCE.from);
  const to = at(REFERENCE.to);
  return { from, to, centimeters: toCentimeters(Math.hypot(to[0] - from[0], to[1] - from[1])) };
}

/**
 * Schritt 1: Grundriss. Datei ablegen, Erkennung (gespielt), Maßstab prüfen, Norden festlegen.
 */
export function PlanStep() {
  const { project } = useApp();
  if (project.planStage === 'empty') return <DropTable />;
  return <PlanSheet />;
}

/* ------------------------------------------------------------------ Ablegen */

function DropTable() {
  const { dispatch } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [over, setOver] = useState(false);

  const start = (source: string) => {
    dispatch({
      type: 'recognize',
      apartment: recognizedApartment('Meine Wohnung', source),
    });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file) start(file.name);
  };

  return (
    <section
      className="app-drop"
      aria-labelledby={titleId}
      data-over={over || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={onDrop}
    >
      <div className="app-drop-sheet">
        <span className="app-drop-icon" aria-hidden="true">
          <Icon icon={icons.floorPlan} size="l" />
        </span>
        <h2 id={titleId} className="app-drop-title">
          {over ? 'Loslassen, um den Plan zu laden' : 'Leg deinen Grundriss auf den Tisch'}
        </h2>
        <p className="app-drop-text">
          Ein Bild oder PDF vom Makler genügt, auch ein Foto vom Papierplan. Wandelbar erkennt
          Wände, Türen und Fenster und macht daraus deine Wohnung.
        </p>
        <div className="app-drop-actions">
          <Button
            variant="primary"
            icon={icons.upload}
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Datei auswählen
          </Button>
          <Button
            onClick={() => {
              start('lindenstrasse-12-grundriss.pdf');
            }}
          >
            Beispielplan nehmen
          </Button>
        </div>
        <p className="app-drop-note">JPG, PNG oder PDF · bleibt auf diesem Gerät</p>
        <input
          ref={inputRef}
          className="wb-visually-hidden"
          type="file"
          accept="image/*,application/pdf"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) start(file.name);
          }}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Plan auf dem Tisch */

function PlanSheet() {
  const { project, dispatch, edit, goTo, notify } = useApp();
  const { layout, width, height } = useStage();
  const apartment = project.apartment ?? project.pending;
  const camera = usePlanCamera({ apartment, pad: 1.1, panel: true });
  const svgRef = useRef<SVGSVGElement>(null);
  const [measuring, setMeasuring] = useState(false);
  /** Eingegebene Länge in cm; null = die jetzige Länge der Messstrecke */
  const [typed, setTyped] = useState<number | null>(null);
  const progress = useRecognition(project.planStage === 'recognizing', () => {
    dispatch({ type: 'recognized' });
  });

  useSceneGestures(svgRef, { onPan: camera.pan, onZoom: camera.zoomAt });

  if (!apartment) return null;
  const stage = project.planStage;
  const line = referenceLine(apartment);
  const reference = typed ?? line.centimeters;
  const factor = measuring ? reference / line.centimeters : 1;
  const area = totalArea(apartment.rooms) * factor * factor;
  const detected =
    stage === 'recognizing'
      ? {
          walls: Math.min(1, progress / (PHASES[0].until - 100)),
          openings: clamp01((progress - PHASES[0].until) / 600),
          labels:
            progress > PHASES[1].until ? Math.max(0, 1 - (progress - PHASES[1].until) / 1200) : 0,
        }
      : { walls: 1, openings: 1, labels: 0 };

  const sun =
    stage === 'north' ? (
      <g className="app-paper-sun">
        {sunPatches(apartment, NORTH_PREVIEW_TIME).map((patch, index) => (
          <polygon
            key={index}
            points={patch.polygon.map(([x, y]) => `${String(x)},${String(y)}`).join(' ')}
          />
        ))}
      </g>
    ) : null;

  return (
    <>
      <svg
        ref={svgRef}
        className="app-scene app-sheet-scene"
        viewBox={`0 0 ${String(Math.max(1, width))} ${String(Math.max(1, height))}`}
        role="img"
        aria-label={`Grundriss ${apartment.name}${stage === 'recognizing' ? ', wird gelesen' : ''}`}
      >
        <PaperPlan
          apartment={apartment}
          frame={camera.frame}
          detected={detected}
          measure={
            measuring
              ? {
                  from: line.from,
                  to: line.to,
                  label: `${formatNumber(reference / 100, 2)} m`,
                }
              : null
          }
          sun={sun}
          markUncertain={project.suggestions}
        />
      </svg>

      {layout === 'wide' && (
        <StageView className="app-view-left">
          <ViewBar>
            <ZoomControls
              zoom={camera.viewport.zoom}
              onZoomIn={() => {
                camera.zoomAt(ZOOM_STEP);
              }}
              onZoomOut={() => {
                camera.zoomAt(1 / ZOOM_STEP);
              }}
              onFit={camera.fit}
              canZoomIn={camera.viewport.zoom < ZOOM_MAX}
              canZoomOut={camera.viewport.zoom > ZOOM_MIN}
            />
          </ViewBar>
        </StageView>
      )}

      <aside className="app-panel" aria-label="Grundriss">
        {stage === 'recognizing' && (
          <RecognitionPanel source={apartment.source} progress={progress} />
        )}

        {stage === 'scale' && (
          <ScalePanel
            apartment={apartment}
            area={area}
            measuring={measuring}
            reference={reference}
            measured={line.centimeters}
            onReference={setTyped}
            onMeasure={() => {
              setMeasuring(true);
            }}
            onCancel={() => {
              setMeasuring(false);
              setTyped(null);
            }}
            onConfirm={() => {
              edit((current) => ({ ...rescaleApartment(current, factor), scaleConfirmed: true }));
              setMeasuring(false);
              setTyped(null);
              dispatch({ type: 'planStage', stage: 'north' });
            }}
          />
        )}

        {stage === 'north' && (
          <NorthPanel
            north={apartment.north}
            onChange={(north) => {
              // Kompass und Regler sind ein Feld: eine Drehung ist ein Rückgängig-Schritt
              edit((current) => ({ ...current, north }), 'north');
            }}
            onDone={(confirmed) => {
              edit((current) => ({ ...current, northConfirmed: confirmed }));
              dispatch({ type: 'planStage', stage: 'done' });
              goTo('build');
              if (!confirmed) {
                notify(
                  'Norden zeigt vorerst nach oben. Du kannst es im Schritt Grundriss jederzeit ändern.',
                );
              }
            }}
          />
        )}

        {stage === 'done' && (
          <DonePanel
            apartment={apartment}
            onScale={() => {
              dispatch({ type: 'planStage', stage: 'scale' });
            }}
            onNorth={() => {
              dispatch({ type: 'planStage', stage: 'north' });
            }}
            onNext={() => {
              goTo('build');
            }}
            onNew={() => {
              dispatch({ type: 'newOwn' });
            }}
          />
        )}
      </aside>
    </>
  );
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Fortschritt der gespielten Erkennung in Millisekunden; ruft `onDone` am Ende */
function useRecognition(running: boolean, onDone: () => void): number {
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!running) return;
    if (prefersReducedMotion()) {
      const timer = window.setTimeout(() => {
        setElapsed(RECOGNITION_MS);
        done.current();
      }, 600);
      return () => {
        window.clearTimeout(timer);
      };
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = now - start;
      setElapsed(next);
      if (next >= RECOGNITION_MS) {
        done.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running]);

  return running ? elapsed : RECOGNITION_MS;
}

/* ------------------------------------------------------------------ Seitenleisten */

function RecognitionPanel({ source, progress }: { source: string; progress: number }) {
  return (
    <>
      <p className="app-panel-kicker">{source}</p>
      <h2 className="app-panel-title">Wandelbar liest den Plan</h2>
      <ol className="app-checklist">
        {PHASES.map((phase, index) => {
          const from = index === 0 ? 0 : (PHASES[index - 1]?.until ?? 0);
          const state = progress >= phase.until ? 'done' : progress >= from ? 'running' : 'waiting';
          return (
            <li key={phase.label} data-state={state}>
              <span className="app-checklist-mark" aria-hidden="true">
                {state === 'done' && <Icon icon={icons.check} size="s" />}
              </span>
              {phase.label}
              <span className="wb-visually-hidden">
                {state === 'done' ? ', fertig' : state === 'running' ? ', läuft' : ', wartet'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="app-panel-note">
        <Icon icon={icons.info} size="s" />
        Im Prototyp gespielt: Aus jeder Datei wird die Beispielwohnung.
      </p>
    </>
  );
}

interface ScalePanelProps {
  apartment: Apartment;
  area: number;
  measuring: boolean;
  /** Angezeigte Länge der Messstrecke in cm (getippt oder wie gemessen) */
  reference: number;
  /** Länge der Messstrecke im jetzigen Maßstab in cm */
  measured: number;
  onReference: (centimeters: number) => void;
  onMeasure: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function ScalePanel({
  apartment,
  area,
  measuring,
  reference,
  measured,
  onReference,
  onMeasure,
  onCancel,
  onConfirm,
}: ScalePanelProps) {
  const difference = Math.abs(area - apartment.statedArea) / apartment.statedArea;
  const fits = difference <= 0.05;
  return (
    <>
      <p className="app-panel-kicker">Maßstab</p>
      <h2 className="app-panel-title">Stimmt der Maßstab?</h2>
      <p className="app-panel-text">
        Im Plan steht „Wohnfläche ca. {formatNumber(apartment.statedArea, 0)} m²“. Die erkannten
        Räume ergeben zusammen <strong>{formatNumber(area, 1)} m²</strong>.
      </p>
      <p className="app-verdict" data-fits={fits || undefined} role="status">
        <Icon icon={fits ? icons.check : icons.warning} size="s" />
        {fits
          ? `Passt, nur ${formatNumber(difference * 100, 1)} % Unterschied`
          : measuring
            ? `${formatNumber(difference * 100, 0)} % Unterschied zum Plan: Stimmt die Länge?`
            : `${formatNumber(difference * 100, 0)} % Unterschied: Miss am besten eine Strecke nach.`}
      </p>
      {measuring ? (
        <>
          <p className="app-panel-text">
            Miss eine Wand nach, deren Länge du kennst. Markiert ist die Fensterwand im Wohnzimmer.
          </p>
          <NumberField
            label="Länge der markierten Wand"
            unit="cm"
            value={reference}
            min={50}
            max={3000}
            example={Math.round(measured)}
            onChange={onReference}
          />
          <div className="app-panel-actions">
            <Button variant="primary" onClick={onConfirm}>
              Maßstab übernehmen
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Abbrechen
            </Button>
          </div>
        </>
      ) : (
        <div className="app-panel-actions">
          <Button variant="primary" icon={icons.check} onClick={onConfirm}>
            Stimmt so
          </Button>
          <Button icon={icons.measure} onClick={onMeasure}>
            Strecke nachmessen
          </Button>
        </div>
      )}
    </>
  );
}

function NorthPanel({
  north,
  onChange,
  onDone,
}: {
  north: number;
  onChange: (north: number) => void;
  onDone: (confirmed: boolean) => void;
}) {
  const id = useId();
  const direction = screenDirection(north);
  return (
    <>
      <p className="app-panel-kicker">Norden</p>
      <h2 className="app-panel-title">Wo ist Norden?</h2>
      <p className="app-panel-text">
        Damit die Sonne später richtig durch die Fenster fällt. Hat dein Plan einen Nordpfeil, dreh
        den Kompass genauso.
      </p>
      <div className="app-north">
        <NorthDial value={north} onChange={onChange} />
        <div className="app-north-control">
          <label className="wb-field-label" htmlFor={id}>
            Norden
          </label>
          <input
            id={id}
            className="app-north-range"
            type="range"
            min={0}
            max={355}
            step={5}
            value={north}
            aria-valuetext={`zeigt nach ${direction}, ${String(north)} Grad`}
            onChange={(event) => {
              onChange(Number(event.currentTarget.value));
            }}
          />
          <p className="app-north-value" aria-hidden="true">
            zeigt nach <strong>{direction}</strong> · {north}°
          </p>
        </div>
      </div>
      <p className="app-panel-note app-panel-note-sun">
        <Icon icon={icons.sun} size="s" />
        So fällt um 15:30 Uhr die Sonne herein.
      </p>
      <div className="app-panel-actions">
        <Button
          variant="primary"
          icon={icons.next}
          onClick={() => {
            onDone(true);
          }}
        >
          Weiter zu Bauen
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onDone(false);
          }}
        >
          Weiß ich nicht
        </Button>
      </div>
    </>
  );
}

/** Kompass zum Drehen mit Finger oder Maus; die Tastatur nutzt den Regler daneben */
function NorthDial({ value, onChange }: { value: number; onChange: (north: number) => void }) {
  const dragging = useRef(false);

  const fromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    onChange((Math.round(((degrees + 360) % 360) / 5) * 5) % 360);
  };

  return (
    <svg
      className="app-dial"
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current) fromPointer(event);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <circle className="app-dial-face" r={56} />
      {Array.from({ length: 24 }, (_, index) => (
        <line
          key={index}
          className="app-dial-tick"
          data-major={index % 6 === 0 || undefined}
          x1={0}
          y1={-50}
          x2={0}
          y2={index % 6 === 0 ? -42 : -46}
          transform={`rotate(${String(index * 15)})`}
        />
      ))}
      <g transform={`rotate(${String(value)})`} className="app-dial-needle">
        <path className="app-dial-north" d="M0,-29 L7,0 L-7,0 Z" />
        <path className="app-dial-south" d="M0,29 L7,0 L-7,0 Z" />
        <circle r={4} className="app-dial-hub" />
        <text y={-32} textAnchor="middle" className="app-dial-letter">
          N
        </text>
      </g>
    </svg>
  );
}

function DonePanel({
  apartment,
  onScale,
  onNorth,
  onNext,
  onNew,
}: {
  apartment: Apartment;
  onScale: () => void;
  onNorth: () => void;
  onNext: () => void;
  onNew: () => void;
}) {
  const area = totalArea(apartment.rooms);
  return (
    <>
      <p className="app-panel-kicker">{apartment.source}</p>
      <h2 className="app-panel-title">Grundriss</h2>
      <FactList
        items={[
          [
            'Wohnfläche',
            `${formatNumber(area, 1)} m² (Plan: ca. ${formatNumber(apartment.statedArea, 0)} m²)`,
          ],
          ['Maßstab', apartment.scaleConfirmed ? 'geprüft' : 'noch nicht geprüft'],
          [
            'Norden',
            apartment.northConfirmed
              ? `zeigt nach ${screenDirection(apartment.north)}`
              : 'noch nicht festgelegt',
          ],
        ]}
      />
      <div className="app-panel-actions">
        <Button variant="primary" icon={icons.next} onClick={onNext}>
          Weiter zu Bauen
        </Button>
        <Button icon={icons.measure} onClick={onScale}>
          Maßstab prüfen
        </Button>
        <Button icon={icons.north} onClick={onNorth}>
          Norden ändern
        </Button>
      </div>
      <div className="app-panel-foot">
        <Button variant="ghost" icon={icons.upload} onClick={onNew}>
          Neue Wohnung aus Grundriss
        </Button>
      </div>
    </>
  );
}
