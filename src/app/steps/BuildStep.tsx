import { useId } from 'react';
import {
  Button,
  CardFooter,
  FactList,
  Icon,
  icons,
  Inspector,
  NumberField,
  StageTools,
  StageView,
  TextField,
  ToolPalette,
  ViewBar,
  ZoomControls,
  type CardTarget,
  type Tool,
} from '../../ui/index.ts';
import { useHotkeys } from '../../ui/hooks/useHotkeys.ts';
import { useApp } from '../AppContext.ts';
import { usePlanCamera } from '../camera.ts';
import type { Apartment, Opening, Point, Room, Wall } from '../prototype/apartment.ts';
import { compassPoint, sunHours } from '../prototype/directions.ts';
import {
  along,
  openingQuad,
  polygonArea,
  roomAt,
  roomSide,
  wallFrame,
  wallQuad,
} from '../prototype/geometry.ts';
import type { Selection } from '../prototype/PlanScene.tsx';
import { PlanView } from '../SceneViews.tsx';
import { formatArea, formatMeters, toCentimeters, toMeters, toRoom } from '../units.ts';
import type { ViewFrame } from '../viewport.ts';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../viewport.ts';

const TOOLS: readonly Tool[] = [
  { id: 'select', label: 'Auswählen', icon: icons.select, hotkey: 'v' },
  { id: 'wall', label: 'Wand', icon: icons.wall, hotkey: 'w' },
  { id: 'door', label: 'Tür', icon: icons.door, hotkey: 't' },
  { id: 'window', label: 'Fenster', icon: icons.window, hotkey: 'f' },
  { id: 'room', label: 'Raum', icon: icons.room, hotkey: 'r' },
  { id: 'measure', label: 'Messen', icon: icons.measure, hotkey: 'l' },
];

const LATER: Record<string, string> = {
  wall: 'Wände zeichnen',
  door: 'Türen setzen',
  window: 'Fenster setzen',
  room: 'Räume teilen',
  measure: 'Messen',
};

const UNCERTAIN = 0.7;

/** Schritt 2: Bauen. Erkannte Wände, Türen, Fenster und Räume prüfen und ändern. */
export function BuildStep() {
  const { apartment, project, selection, select, edit, dispatch, notify } = useApp();
  const camera = usePlanCamera({ banner: project.suggestions });

  const chooseTool = (id: string) => {
    if (id === 'select') return;
    notify(
      `${LATER[id] ?? 'Das'} kommt in einer späteren Version. Hier im Prototyp tippst du vorhandene Wände, Türen, Fenster und Räume an und änderst sie.`,
    );
  };

  useHotkeys(
    Object.fromEntries(
      TOOLS.map((tool) => [
        tool.hotkey ?? tool.id,
        () => {
          chooseTool(tool.id);
        },
      ]),
    ),
  );

  if (!apartment) return null;
  const uncertain = project.suggestions
    ? apartment.openings.filter((opening) => opening.confidence < UNCERTAIN)
    : [];

  const target = selection ? selectionTarget(apartment, selection, camera.frame) : null;

  return (
    <>
      <PlanView
        camera={camera}
        look="plan"
        label={`Grundriss ${apartment.name} zum Bearbeiten`}
        hint="Tippe Wände, Türen, Fenster oder Räume an. Pfeiltasten verschieben die Ansicht, Plus und Minus zoomen, 0 zeigt alles."
        sunTime={null}
        selection={selection}
        hitKinds={['wall', 'opening', 'room']}
        suggestion={project.suggestions}
        furnitureFilter={(item) =>
          item.kind === 'kitchen' ||
          item.kind === 'bathtub' ||
          item.kind === 'washbasin' ||
          item.kind === 'toilet'
        }
        onPick={select}
      />

      <StageTools id="app-tools">
        <ToolPalette
          label="Werkzeuge: Bauen"
          tools={TOOLS}
          activeTool="select"
          onToolChange={chooseTool}
          actions={[
            {
              id: 'undo',
              label: 'Rückgängig',
              icon: icons.undo,
              hotkey: 'mod+z',
              onPress: () => {
                dispatch({ type: 'undo' });
              },
              disabled: project.past.length === 0,
            },
            {
              id: 'redo',
              label: 'Wiederholen',
              icon: icons.redo,
              hotkey: 'mod+shift+z',
              onPress: () => {
                dispatch({ type: 'redo' });
              },
              disabled: project.future.length === 0,
            },
          ]}
        />
      </StageTools>

      <StageView>
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

      {project.suggestions && (
        <div className="app-banner" role="region" aria-label="Erkennung">
          <Icon
            icon={uncertain.length > 0 ? icons.warning : icons.check}
            size="m"
            className="app-banner-icon"
          />
          <p className="app-banner-text">
            {summary(apartment)} erkannt.
            {uncertain.length > 0 && (
              <>
                {' '}
                <strong>
                  {uncertain.length === 1
                    ? '1 Stelle ist'
                    : `${String(uncertain.length)} Stellen sind`}{' '}
                  unsicher.
                </strong>
              </>
            )}
          </p>
          <div className="app-banner-actions">
            {uncertain.length > 0 && (
              <Button
                size="s"
                onClick={() => {
                  const currentIndex = uncertain.findIndex(
                    (opening) => opening.id === selection?.id,
                  );
                  const next = uncertain[(currentIndex + 1) % uncertain.length];
                  if (next) select({ kind: 'opening', id: next.id });
                }}
              >
                Zeigen
              </Button>
            )}
            <Button
              size="s"
              variant="primary"
              onClick={() => {
                dispatch({ type: 'acceptSuggestions' });
                notify('Alles übernommen. Du kannst jedes Teil weiterhin antippen und ändern.');
              }}
            >
              Alles übernehmen
            </Button>
          </div>
        </div>
      )}

      {selection && (
        <BuildInspector
          apartment={apartment}
          selection={selection}
          target={target}
          suggestions={project.suggestions}
          edit={edit}
          onClear={() => {
            select(null);
          }}
        />
      )}
    </>
  );
}

function summary(apartment: Apartment): string {
  const doors = apartment.openings.filter((opening) => opening.kind === 'door').length;
  const windows = apartment.openings.length - doors;
  return `${String(apartment.walls.length)} Wände, ${String(doors)} Türen und ${String(windows)} Fenster`;
}

/* ------------------------------------------------------------------ Karte */

function screenBox(points: readonly Point[], frame: ViewFrame): CardTarget {
  const xs = points.map((p) => frame.ox + p[0] * frame.scale);
  const ys = points.map((p) => frame.oy + p[1] * frame.scale);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { x0, y0, x1, y1, anchorX: (x0 + x1) / 2, anchorY: (y0 + y1) / 2 };
}

function selectionTarget(
  apartment: Apartment,
  selection: Selection,
  frame: ViewFrame,
): CardTarget | null {
  if (selection.kind === 'wall') {
    const wall = apartment.walls.find((candidate) => candidate.id === selection.id);
    return wall ? screenBox(wallQuad(wall, 0, wallFrame(wall).length), frame) : null;
  }
  if (selection.kind === 'opening') {
    const opening = apartment.openings.find((candidate) => candidate.id === selection.id);
    const wall = apartment.walls.find((candidate) => candidate.id === opening?.wallId);
    return opening && wall ? screenBox(openingQuad(wall, opening), frame) : null;
  }
  if (selection.kind === 'room') {
    const room = apartment.rooms.find((candidate) => candidate.id === selection.id);
    return room ? screenBox(room.polygon, frame) : null;
  }
  return null;
}

/** Räume links und rechts einer Wand */
function wallRooms(apartment: Apartment, wall: Wall): Room[] {
  const { length } = wallFrame(wall);
  const reach = wall.thickness / 2 + 0.08;
  return [1, -1]
    .map((side) => roomAt(apartment.rooms, along(wall, length / 2, side * reach)))
    .filter((room): room is Room => room !== null);
}

/** Himmelsrichtung, in die ein Fenster nach außen schaut */
function windowBearing(apartment: Apartment, wall: Wall, opening: Opening): number {
  const room = apartment.rooms.find((candidate) => candidate.id === opening.roomId);
  const side = roomSide(wall, room);
  const { normal } = wallFrame(wall);
  const outward: Point = [-normal[0] * side, -normal[1] * side];
  const screenAngle = (Math.atan2(outward[0], -outward[1]) * 180) / Math.PI;
  return (((screenAngle - apartment.north) % 360) + 360) % 360;
}

interface BuildInspectorProps {
  apartment: Apartment;
  selection: Selection;
  target: CardTarget | null;
  suggestions: boolean;
  edit: (update: (apartment: Apartment) => Apartment, merge?: string) => void;
  onClear: () => void;
}

function BuildInspector({
  apartment,
  selection,
  target,
  suggestions,
  edit,
  onClear,
}: BuildInspectorProps) {
  const id = useId();

  const updateWall = (wallId: string, patch: Partial<Wall>) => {
    edit((current) => ({
      ...current,
      walls: current.walls.map((wall) => (wall.id === wallId ? { ...wall, ...patch } : wall)),
    }));
  };
  const updateOpening = (openingId: string, patch: Partial<Opening>) => {
    edit((current) => ({
      ...current,
      openings: current.openings.map((opening) =>
        opening.id === openingId ? { ...opening, ...patch } : opening,
      ),
    }));
  };
  const updateRoom = (roomId: string, patch: Partial<Room>, merge?: string) => {
    edit(
      (current) => ({
        ...current,
        rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)),
      }),
      merge,
    );
  };
  const removeOpening = (openingId: string) => {
    edit((current) => ({
      ...current,
      openings: current.openings.filter((opening) => opening.id !== openingId),
    }));
    onClear();
  };

  if (selection.kind === 'wall') {
    const wall = apartment.walls.find((candidate) => candidate.id === selection.id);
    if (!wall) return null;
    const rooms = wallRooms(apartment, wall);
    const openings = apartment.openings.filter((opening) => opening.wallId === wall.id);
    const doors = openings.filter((opening) => opening.kind === 'door').length;
    const windows = openings.length - doors;
    const title = wall.exterior
      ? `Außenwand ${rooms.map((room) => room.name).join(', ')}`.trim()
      : `Wand ${rooms.map((room) => room.name).join(' | ')}`;
    return (
      <Inspector
        id={`${id}-inspector`}
        target={target}
        selectionKey={wall.id}
        kicker={wall.exterior ? 'Bauen · Außenwand' : 'Bauen · Innenwand'}
        title={title}
        dimensions={`Länge ${formatMeters(wallFrame(wall).length)}`}
      >
        <div className="app-field-pair">
          <NumberField
            label="Dicke"
            unit="cm"
            value={toCentimeters(wall.thickness)}
            min={5}
            max={80}
            example={12}
            onChange={(value) => {
              updateWall(wall.id, { thickness: toMeters(value) });
            }}
          />
          <NumberField
            label="Raumhöhe"
            unit="cm"
            value={toCentimeters(wall.height)}
            min={180}
            max={600}
            example={260}
            onChange={(value) => {
              updateWall(wall.id, { height: toMeters(value) });
            }}
          />
        </div>
        <FactList
          items={[
            [
              'Öffnungen',
              openings.length === 0
                ? 'keine'
                : [
                    doors > 0 ? `${String(doors)} Tür${doors > 1 ? 'en' : ''}` : '',
                    windows > 0 ? `${String(windows)} Fenster` : '',
                  ]
                    .filter(Boolean)
                    .join(', '),
            ],
          ]}
        />
      </Inspector>
    );
  }

  if (selection.kind === 'opening') {
    const opening = apartment.openings.find((candidate) => candidate.id === selection.id);
    const wall = apartment.walls.find((candidate) => candidate.id === opening?.wallId);
    if (!opening || !wall) return null;
    const room = apartment.rooms.find((candidate) => candidate.id === opening.roomId);
    const isDoor = opening.kind === 'door';
    const bearing = isDoor ? 0 : windowBearing(apartment, wall, opening);
    const title = isDoor
      ? opening.entrance
        ? 'Wohnungstür'
        : `Tür ${toRoom(room?.name ?? 'Raum')}`
      : `Fenster ${room?.name ?? ''}`.trim();
    const uncertain = suggestions && opening.confidence < UNCERTAIN;
    return (
      <Inspector
        id={`${id}-inspector`}
        target={target}
        selectionKey={opening.id}
        kicker={isDoor ? 'Bauen · Tür' : `Bauen · Fenster nach ${compassPoint(bearing)}`}
        title={title}
        dimensions={`${formatMeters(opening.width)} breit`}
      >
        {uncertain && (
          <div className="app-card-alert" role="note">
            <p>
              <Icon icon={icons.warning} size="s" />
              Unsicher erkannt: Ist hier wirklich {isDoor ? 'eine Tür' : 'ein Fenster'}?
            </p>
            <div className="app-card-alert-actions">
              <Button
                size="s"
                variant="primary"
                onClick={() => {
                  updateOpening(opening.id, { confidence: 1 });
                }}
              >
                Ja, stimmt
              </Button>
              <Button
                size="s"
                variant="ghost"
                onClick={() => {
                  removeOpening(opening.id);
                }}
              >
                Nein, entfernen
              </Button>
            </div>
          </div>
        )}
        <div className="app-field-pair" data-count={isDoor ? 2 : 3}>
          <NumberField
            label="Breite"
            unit="cm"
            value={toCentimeters(opening.width)}
            min={40}
            max={400}
            example={90}
            onChange={(value) => {
              updateOpening(opening.id, { width: toMeters(value) });
            }}
          />
          <NumberField
            label="Höhe"
            unit="cm"
            value={toCentimeters(opening.height)}
            min={40}
            max={300}
            example={isDoor ? 200 : 140}
            onChange={(value) => {
              updateOpening(opening.id, { height: toMeters(value) });
            }}
          />
          {!isDoor && (
            <NumberField
              label="Brüstung"
              unit="cm"
              value={toCentimeters(opening.sill)}
              min={0}
              max={200}
              example={90}
              onChange={(value) => {
                updateOpening(opening.id, { sill: toMeters(value) });
              }}
            />
          )}
        </div>
        {isDoor ? (
          <Button
            size="s"
            icon={icons.rotate}
            onClick={() => {
              updateOpening(opening.id, { hinge: opening.hinge === 'end' ? 'start' : 'end' });
            }}
          >
            Anschlag wechseln
          </Button>
        ) : (
          <FactList
            items={[
              ['Himmelsrichtung', compassPoint(bearing)],
              ['Sonne', sunHours(bearing)],
            ]}
          />
        )}
        {!opening.entrance && (
          <CardFooter>
            <Button
              size="s"
              variant="danger"
              icon={icons.remove}
              onClick={() => {
                removeOpening(opening.id);
              }}
            >
              {isDoor ? 'Tür entfernen' : 'Fenster entfernen'}
            </Button>
          </CardFooter>
        )}
      </Inspector>
    );
  }

  if (selection.kind === 'room') {
    const room = apartment.rooms.find((candidate) => candidate.id === selection.id);
    if (!room) return null;
    const area = polygonArea(room.polygon);
    const windows = apartment.openings.filter(
      (opening) => opening.kind === 'window' && opening.roomId === room.id,
    ).length;
    return (
      <Inspector
        id={`${id}-inspector`}
        target={target}
        selectionKey={room.id}
        kicker={`Bauen · Raum · ${formatArea(area)}`}
        title={room.name}
      >
        <TextField
          key={room.id}
          label="Name"
          value={room.name}
          requiredMessage="Pflichtfeld: Gib dem Raum einen Namen."
          onChange={(name) => {
            // Ein Rückgängig-Schritt pro Umbenennung, nicht pro Tastendruck
            updateRoom(room.id, { name }, `room-name:${room.id}`);
          }}
        />
        <NumberField
          label="Deckenhöhe"
          unit="cm"
          value={toCentimeters(room.ceiling)}
          min={180}
          max={600}
          example={260}
          onChange={(value) => {
            updateRoom(room.id, { ceiling: toMeters(value) });
          }}
        />
        <FactList
          items={[
            ['Fläche', formatArea(area)],
            ['Fenster', windows === 0 ? 'keine' : String(windows)],
          ]}
        />
      </Inspector>
    );
  }

  return null;
}
