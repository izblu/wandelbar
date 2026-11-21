import { useId, useState } from 'react';
import {
  CardFooter,
  Checkbox,
  DimensionFields,
  FactList,
  formatNumber,
  formatPrice,
  icons,
  INPUT_DECIMALS,
  Inspector,
  PriceTag,
  SegmentedControl,
  StageTools,
  StageView,
  SunTimeSlider,
  SwatchPicker,
  ToolPalette,
  ViewBar,
  ZoomControls,
  type CardTarget,
  type SegmentOption,
  type Tool,
} from '../../ui/index.ts';
import { useHotkeys } from '../../ui/hooks/useHotkeys.ts';
import { useStage } from '../../ui/stage/stageContext.ts';
import { useApp } from '../AppContext.ts';
import { useDollhouseCamera, usePlanCamera } from '../camera.ts';
import { Catalog } from '../Catalog.tsx';
import {
  FABRICS,
  FLOORS,
  PAINTS,
  placeFromCatalog,
  type Apartment,
  type CatalogItem,
  type Furniture,
} from '../prototype/apartment.ts';
import { itemScreenBounds } from '../prototype/dollhouse.ts';
import { footprint, polygonArea, roomAt } from '../prototype/geometry.ts';
import { DollhouseView, PlanView } from '../SceneViews.tsx';
import { useSpaceGrab } from '../useSpaceGrab.ts';
import { formatArea, inRoom, toCentimeters, toMeters } from '../units.ts';
import {
  areaCenter,
  screenStepOnFloor,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type Point2,
  type ViewFrame,
} from '../viewport.ts';

const TOOLS: readonly Tool[] = [
  { id: 'select', label: 'Auswählen', icon: icons.select, hotkey: 'v' },
  { id: 'pan', label: 'Verschieben', icon: icons.pan, hotkey: 'h' },
  { id: 'furniture', label: 'Möbel', icon: icons.furniture, hotkey: 'm' },
  { id: 'surfaces', label: 'Flächen', icon: icons.surfaces, hotkey: 'f' },
  { id: 'measure', label: 'Messen', icon: icons.measure, hotkey: 'l' },
];

type FurnishView = 'top' | 'dollhouse';

const VIEWS: readonly SegmentOption[] = [
  { id: 'top', label: 'Draufsicht', icon: icons.floorPlan },
  { id: 'dollhouse', label: 'Puppenhaus', icon: icons.dollhouse },
];

/** Pfeiltasten verschieben das gewählte Möbel um 5 cm, mit Umschalt um 50 cm */
const NUDGE = 0.05;

let copyCount = 0;
/**
 * Kennung, die es unter `taken` noch nicht gibt (die Beispielwohnung hat z. B. schon
 * `nightstand-1`). `crypto.randomUUID` fehlt über http im WLAN (Handy-Test).
 */
function nextId(base: string, taken: readonly { id: string }[]): string {
  const ids = new Set(taken.map((item) => item.id));
  let id: string;
  do {
    copyCount += 1;
    id = `${base}-${String(copyCount)}`;
  } while (ids.has(id));
  return id;
}

/** Schritt 3: Einrichten. Möbel stellen, Wände streichen, Böden wählen. */
export function FurnishStep() {
  const app = useApp();
  const { apartment, selection, select, edit, dispatch, notify, project, light, sunTime } = app;
  const { layout } = useStage();
  const [tool, setTool] = useState('select');
  const [view, setView] = useState<FurnishView>('top');
  const plan = usePlanCamera({ active: view === 'top' });
  const dollhouse = useDollhouseCamera(view === 'dollhouse');
  const camera = view === 'top' ? plan : dollhouse;
  const compact = layout === 'compact';
  const spaceHeld = useSpaceGrab();
  const grab = tool === 'pan' || spaceHeld;

  const chooseTool = (id: string) => {
    if (id === 'measure') {
      notify(
        'Messen kommt in einer späteren Version. Maße stehen bis dahin in der Karte jedes Möbels.',
      );
      return;
    }
    setTool(id);
    // Verschieben ändert nur die Ansicht; das gewählte Möbel bleibt gewählt
    if (id !== 'select' && id !== 'pan') select(null);
  };

  const selected =
    selection?.kind === 'furniture'
      ? (apartment?.furniture.find((item) => item.id === selection.id) ?? null)
      : null;

  const nudgeAllowed = () => {
    const active = document.activeElement;
    return active === document.body || active?.classList.contains('app-scene') === true;
  };

  /**
   * Verschiebt das gewählte Möbel in Bildschirmrichtung (im Puppenhaus auch gedreht);
   * `false`, wenn es keins gibt oder der Fokus woanders liegt
   */
  const nudge = (dx: number, dy: number): boolean => {
    if (!selected || !nudgeAllowed()) return false;
    const [mx, my] =
      view === 'dollhouse' ? screenStepOnFloor(dollhouse.projection, dx, dy) : [dx, dy];
    edit((current) => ({
      ...current,
      furniture: current.furniture.map((item) =>
        item.id === selected.id ? { ...item, x: item.x + mx, y: item.y + my } : item,
      ),
    }));
    return true;
  };

  // Ohne gewähltes Möbel geben die Kürzel die Taste frei (Rückgabe `false`, siehe useHotkeys)
  useHotkeys({
    v: () => {
      chooseTool('select');
    },
    h: () => {
      chooseTool('pan');
    },
    m: () => {
      chooseTool('furniture');
    },
    f: () => {
      chooseTool('surfaces');
    },
    l: () => {
      chooseTool('measure');
    },
    r: () => {
      if (!selected) return false;
      rotate(selected);
      return true;
    },
    delete: () => {
      if (!selected) return false;
      remove(selected);
      return true;
    },
    arrowleft: () => nudge(-NUDGE, 0),
    arrowright: () => nudge(NUDGE, 0),
    arrowup: () => nudge(0, -NUDGE),
    arrowdown: () => nudge(0, NUDGE),
    'shift+arrowleft': () => nudge(-NUDGE * 10, 0),
    'shift+arrowright': () => nudge(NUDGE * 10, 0),
    'shift+arrowup': () => nudge(0, -NUDGE * 10),
    'shift+arrowdown': () => nudge(0, NUDGE * 10),
    escape: () => {
      if (!selection) return false;
      select(null);
      return true;
    },
  });

  if (!apartment) return null;

  function update(item: Furniture, patch: Partial<Furniture>) {
    edit((current) => ({
      ...current,
      furniture: current.furniture.map((candidate) =>
        candidate.id === item.id ? { ...candidate, ...patch } : candidate,
      ),
    }));
  }
  function rotate(item: Furniture) {
    update(item, { rotation: ((item.rotation + 90) % 360) as Furniture['rotation'] });
  }
  function remove(item: Furniture) {
    edit((current) => ({
      ...current,
      furniture: current.furniture.filter((candidate) => candidate.id !== item.id),
    }));
    select(null);
  }

  /** Neues Möbel in die Mitte des sichtbaren Bereichs, in den Raum darunter */
  const add = (entry: CatalogItem) => {
    const [sx, sy] = areaCenter(plan.area);
    const center: Point2 =
      view === 'top'
        ? [(sx - plan.frame.ox) / plan.frame.scale, (sy - plan.frame.oy) / plan.frame.scale]
        : dollhouse.projection.unproject(...areaCenter(dollhouse.area));
    const inside = roomAt(apartment.rooms, center) ? center : roomCenter(apartment, 'living');
    const item = placeFromCatalog(entry, nextId(entry.kind, apartment.furniture), inside);
    edit((current) => ({ ...current, furniture: [...current.furniture, item] }));
    setTool('select');
    select({ kind: 'furniture', id: item.id });
    notify(
      `${entry.name} steht jetzt ${inRoom(roomAt(apartment.rooms, inside)?.name ?? 'Raum')}. Zieh das Möbel an seinen Platz.`,
    );
  };

  const target: CardTarget | null =
    selected && view === 'top'
      ? furnitureTarget(selected, plan.frame)
      : selected
        ? toTarget(itemScreenBounds(selected, dollhouse.projection))
        : selection?.kind === 'room' && view === 'top'
          ? roomTarget(apartment, selection.id, plan.frame)
          : null;

  const shownTime = light === 'sun' ? sunTime : null;
  const surfaces = tool === 'surfaces';

  return (
    <>
      {view === 'top' ? (
        <PlanView
          camera={plan}
          look="furnished"
          label={`${apartment.name} von oben, eingerichtet`}
          hint={
            grab
              ? 'Zieh, um die Ansicht zu verschieben, auch über Möbeln. Antippen wählt ein Möbel aus.'
              : 'Tippe ein Möbel an und zieh es an seinen Platz. Mit dem gewählten Möbel: Pfeiltasten verschieben, R dreht, Entf löscht.'
          }
          sunTime={shownTime}
          selection={selection}
          hitKinds={surfaces ? ['room'] : ['furniture']}
          showRoomNames={surfaces}
          dragFurniture={!surfaces}
          grab={grab}
          onPick={(next) => {
            select(next);
          }}
        />
      ) : (
        <DollhouseView
          camera={dollhouse}
          label={`${apartment.name} als Puppenhaus`}
          hint={
            grab
              ? 'Zieh, um die Ansicht zu verschieben, auch über Möbeln. Antippen wählt ein Möbel aus. Ohne gewähltes Möbel verschieben auch die Pfeiltasten.'
              : 'Zieh auf freier Fläche, um das Puppenhaus zu drehen. Verschieben: Werkzeug Verschieben, Leertaste halten, rechte Maustaste oder zwei Finger. Pfeiltasten drehen und neigen, mit Umschalt verschieben sie. Plus und Minus zoomen.'
          }
          sunTime={shownTime}
          selectedId={selected?.id ?? null}
          dragFurniture={!surfaces}
          hitRooms={surfaces}
          grab={grab}
          onPick={(next) => {
            select(
              surfaces
                ? next?.kind === 'room'
                  ? next
                  : null
                : next?.kind === 'furniture'
                  ? next
                  : null,
            );
          }}
        />
      )}

      <StageTools id="app-tools">
        <ToolPalette
          label="Werkzeuge: Einrichten"
          tools={TOOLS}
          activeTool={tool}
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
          <SegmentedControl
            label="Ansicht"
            options={VIEWS}
            value={view}
            onChange={(next) => {
              setView(next === 'dollhouse' ? 'dollhouse' : 'top');
            }}
          />
          {!compact && (
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
          )}
          <SunTimeSlider value={sunTime} onChange={app.setSunTime} />
        </ViewBar>
      </StageView>

      {tool === 'furniture' && (
        <Catalog
          onAdd={add}
          onClose={() => {
            setTool('select');
            // Esc und X: Der Fokus kehrt auf das Werkzeug zurück, das den Katalog geöffnet hat.
            // Nach dem Hinzufügen nicht, dann verschieben die Pfeiltasten das neue Möbel.
            document.querySelector<HTMLElement>('#app-tools [data-roving-id="furniture"]')?.focus();
          }}
        />
      )}

      {surfaces && !selection && (
        <p className="app-hint-chip" role="status">
          Tippe einen Raum an, um Wände und Boden zu ändern.
        </p>
      )}

      {selected && (
        <FurnitureInspector
          item={selected}
          target={target}
          onUpdate={(patch) => {
            update(selected, patch);
          }}
          onRotate={() => {
            rotate(selected);
          }}
          onDuplicate={() => {
            const copy = {
              ...selected,
              id: nextId(selected.id, apartment.furniture),
              x: selected.x + 0.3,
              y: selected.y + 0.3,
            };
            edit((current) => ({ ...current, furniture: [...current.furniture, copy] }));
            select({ kind: 'furniture', id: copy.id });
          }}
          onRemove={() => {
            remove(selected);
          }}
          onMore={app.openSearch}
        />
      )}

      {selection?.kind === 'room' && (
        <SurfaceInspector apartment={apartment} roomId={selection.id} target={target} edit={edit} />
      )}
    </>
  );
}

function roomCenter(apartment: Apartment, roomId: string): [number, number] {
  const room = apartment.rooms.find((candidate) => candidate.id === roomId) ?? apartment.rooms[0];
  return room ? [room.label[0], room.label[1]] : [0, 0];
}

function toTarget(box: { x0: number; y0: number; x1: number; y1: number }): CardTarget {
  return { ...box, anchorX: (box.x0 + box.x1) / 2, anchorY: (box.y0 + box.y1) / 2 };
}

function furnitureTarget(item: Furniture, frame: ViewFrame): CardTarget {
  const box = footprint(item);
  return toTarget({
    x0: frame.ox + box.x0 * frame.scale,
    x1: frame.ox + box.x1 * frame.scale,
    y0: frame.oy + box.y0 * frame.scale,
    y1: frame.oy + box.y1 * frame.scale,
  });
}

function roomTarget(apartment: Apartment, roomId: string, frame: ViewFrame): CardTarget | null {
  const room = apartment.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return null;
  const xs = room.polygon.map((p) => frame.ox + p[0] * frame.scale);
  const ys = room.polygon.map((p) => frame.oy + p[1] * frame.scale);
  return toTarget({
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  });
}

interface FurnitureInspectorProps {
  item: Furniture;
  target: CardTarget | null;
  onUpdate: (patch: Partial<Furniture>) => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMore: () => void;
}

function FurnitureInspector({
  item,
  target,
  onUpdate,
  onRotate,
  onDuplicate,
  onRemove,
  onMore,
}: FurnitureInspectorProps) {
  const id = useId();
  const fixed = item.price === 0;
  return (
    <Inspector
      id={`${id}-inspector`}
      target={target}
      selectionKey={item.id}
      kicker={`Einrichten · ${item.material}`}
      title={item.name}
      dimensions={`${formatNumber(toCentimeters(item.w), INPUT_DECIMALS)} × ${formatNumber(toCentimeters(item.d), INPUT_DECIMALS)} × ${formatNumber(item.height, INPUT_DECIMALS)} cm`}
      onMore={onMore}
      quickActions={{ onRotate, onDuplicate, onRemove }}
    >
      {item.kind !== 'rug' && (
        <DimensionFields
          value={{
            width: toCentimeters(item.w),
            depth: toCentimeters(item.d),
            height: item.height,
          }}
          onChange={(next) => {
            onUpdate({ w: toMeters(next.width), d: toMeters(next.depth), height: next.height });
          }}
          max={600}
        />
      )}
      {item.swatch && (
        <SwatchPicker
          legend="Bezug"
          name={`${id}-fabric`}
          swatches={FABRICS}
          value={item.swatch}
          onChange={(swatch) => {
            onUpdate({ swatch });
          }}
        />
      )}
      <FactList items={[['Material', item.material], ...item.facts]} />
      {!fixed && (
        <CardFooter>
          <PriceTag value={formatPrice(item.price)} />
          <Checkbox
            label="Auf der Einkaufsliste"
            checked={item.onList}
            onChange={(onList) => {
              onUpdate({ onList });
            }}
          />
        </CardFooter>
      )}
    </Inspector>
  );
}

function SurfaceInspector({
  apartment,
  roomId,
  target,
  edit,
}: {
  apartment: Apartment;
  roomId: string;
  target: CardTarget | null;
  edit: (update: (apartment: Apartment) => Apartment) => void;
}) {
  const id = useId();
  const room = apartment.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return null;
  const change = (patch: { paint?: string; floor?: string }) => {
    edit((current) => ({
      ...current,
      rooms: current.rooms.map((candidate) =>
        candidate.id === room.id ? { ...candidate, ...patch } : candidate,
      ),
    }));
  };
  return (
    <Inspector
      id={`${id}-inspector`}
      target={target}
      selectionKey={`flaechen-${room.id}`}
      kicker={`Flächen · ${formatArea(polygonArea(room.polygon))}`}
      title={room.name}
    >
      <SwatchPicker
        legend="Wände"
        name={`${id}-paint`}
        swatches={PAINTS}
        value={room.paint}
        onChange={(paint) => {
          change({ paint });
        }}
      />
      <SwatchPicker
        legend="Boden"
        name={`${id}-floor`}
        swatches={FLOORS}
        value={room.floor}
        onChange={(floor) => {
          change({ floor });
        }}
      />
      <p className="app-card-note">Tapeten und Fliesen kommen in einer späteren Version.</p>
    </Inspector>
  );
}
