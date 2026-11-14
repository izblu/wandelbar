import { useCallback, useId, useMemo, useState } from 'react';
import { dayPhase } from '../../model/sun.ts';
import { CardFooter, FactList, PriceTag } from '../card/PropertyCard.tsx';
import { Inspector } from '../card/Inspector.tsx';
import type { CardTarget } from '../card/placeCard.ts';
import { ThemeToggle } from '../controls/ThemeToggle.tsx';
import { formatNumber, formatPrice, INPUT_DECIMALS } from '../format.ts';
import { Checkbox, SwatchPicker } from '../forms/Choices.tsx';
import { DimensionFields } from '../forms/Fields.tsx';
import { useHotkeys } from '../hooks/useHotkeys.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { Brand } from '../icons/BrandMark.tsx';
import { icons } from '../icons/icons.ts';
import { StepBar, type Step } from '../navigation/StepBar.tsx';
import { ToolPalette, type Tool } from '../navigation/ToolPalette.tsx';
import {
  SegmentedControl,
  SunTimeSlider,
  ViewBar,
  ZoomControls,
  type SegmentOption,
} from '../navigation/ViewBar.tsx';
import { CommandSearch, SearchButton, type Command } from '../search/CommandSearch.tsx';
import { Stage, StageStatus, StageTools, StageTop, StageView } from '../stage/Stage.tsx';
import { useStage } from '../stage/stageContext.ts';
import { SaveStatus } from '../status/SaveStatus.tsx';
import {
  FABRICS,
  footprint,
  INITIAL_FURNITURE,
  sceneFrame,
  type Furniture,
  type SceneFrame,
} from './room.ts';
import { RoomScene } from './RoomScene.tsx';

const STEPS: readonly Step[] = [
  { id: 'plan', label: 'Grundriss', status: 'done' },
  { id: 'build', label: 'Bauen', status: 'done' },
  { id: 'furnish', label: 'Einrichten', status: 'current' },
  { id: 'experience', label: 'Erleben', status: 'upcoming' },
];

const TOOLS: readonly Tool[] = [
  { id: 'select', label: 'Auswählen', icon: icons.select, hotkey: 'v' },
  { id: 'furniture', label: 'Möbel', icon: icons.furniture, hotkey: 'm' },
  { id: 'surfaces', label: 'Flächen', icon: icons.surfaces, hotkey: 'f' },
  { id: 'measure', label: 'Messen', icon: icons.measure, hotkey: 'l' },
];

type View = 'dollhouse' | 'plan';

const VIEWS: readonly SegmentOption[] = [
  { id: 'dollhouse', label: 'Puppenhaus', icon: icons.dollhouse },
  { id: 'plan', label: 'Grundriss', icon: icons.floorPlan },
];

const KEYWORDS: Record<Furniture['kind'], string[]> = {
  sofa: ['Couch'],
  table: ['Tisch'],
  armchair: ['Stuhl'],
  lamp: ['Lampe', 'Licht'],
  shelf: ['Bücher'],
  plant: ['Grün'],
  rug: ['Boden'],
};

interface Model {
  items: Furniture[];
  past: Furniture[][];
  future: Furniture[][];
}

/**
 * „Am Werk“: die echte Bühne „Einrichten“ zweimal, als PC und als Handy, mit einem gemeinsamen
 * Zustand. Was man in einer Ansicht ändert, zeigt sofort auch die andere.
 */
export function Workbench({
  sunTime,
  onSunTimeChange,
}: {
  sunTime: number;
  onSunTimeChange: (hours: number) => void;
}) {
  const [model, setModel] = useState<Model>({
    items: [...INITIAL_FURNITURE],
    past: [],
    future: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>('sofa');
  const [tool, setTool] = useState('select');
  const [view, setView] = useState<View>('dollhouse');
  const [zoom, setZoom] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const { resolved, setPreference } = useTheme();

  const change = useCallback((update: (items: Furniture[]) => Furniture[]) => {
    setModel((m) => ({
      items: update(m.items),
      past: [...m.past, m.items].slice(-50),
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setModel((m) => {
      const previous = m.past.at(-1);
      return previous
        ? { items: previous, past: m.past.slice(0, -1), future: [m.items, ...m.future] }
        : m;
    });
  }, []);

  const redo = useCallback(() => {
    setModel((m) => {
      const next = m.future[0];
      return next ? { items: next, past: [...m.past, m.items], future: m.future.slice(1) } : m;
    });
  }, []);

  useHotkeys({
    v: () => {
      setTool('select');
    },
    m: () => {
      setTool('furniture');
    },
    f: () => {
      setTool('surfaces');
    },
    l: () => {
      setTool('measure');
    },
    'mod+z': undo,
    'mod+shift+z': redo,
  });

  const commands = useMemo<Command[]>(
    () => [
      ...model.items.map((item) => ({
        id: `item-${item.id}`,
        label: item.name,
        group: 'Möbel',
        icon: item.kind === 'lamp' ? icons.lamp : icons.furniture,
        meta: 'Wohnen',
        keywords: KEYWORDS[item.kind],
        run: () => {
          setSelectedId(item.id);
        },
      })),
      {
        id: 'view-dollhouse',
        label: 'Puppenhaus zeigen',
        group: 'Ansicht',
        icon: icons.dollhouse,
        run: () => {
          setView('dollhouse');
        },
      },
      {
        id: 'view-plan',
        label: 'Grundriss mit Maßen zeigen',
        group: 'Ansicht',
        icon: icons.floorPlan,
        run: () => {
          setView('plan');
        },
      },
      {
        id: 'light-morning',
        label: 'Morgenlicht zeigen',
        group: 'Licht',
        icon: icons.sun,
        meta: '7:30 Uhr',
        keywords: ['Sonne', 'Morgen'],
        run: () => {
          onSunTimeChange(7.5);
        },
      },
      {
        id: 'light-noon',
        label: 'Mittagslicht zeigen',
        group: 'Licht',
        icon: icons.sun,
        meta: '13:00 Uhr',
        keywords: ['Sonne'],
        run: () => {
          onSunTimeChange(13);
        },
      },
      {
        id: 'light-evening',
        label: 'Abendlicht zeigen',
        group: 'Licht',
        icon: icons.lamp,
        meta: '21:30 Uhr',
        keywords: ['Lampen', 'Nacht'],
        run: () => {
          onSunTimeChange(21.5);
        },
      },
      {
        id: 'undo',
        label: 'Rückgängig',
        group: 'Befehle',
        icon: icons.undo,
        hotkey: 'mod+z',
        run: undo,
      },
      {
        id: 'theme',
        label: resolved === 'dark' ? 'Helles Design' : 'Dunkles Design',
        group: 'Befehle',
        icon: resolved === 'dark' ? icons.sun : icons.moon,
        keywords: ['Thema', 'Farben'],
        run: () => {
          setPreference(resolved === 'dark' ? 'light' : 'dark');
        },
      },
    ],
    [model.items, onSunTimeChange, undo, resolved, setPreference],
  );

  const shared: DemoStageProps = {
    items: model.items,
    canUndo: model.past.length > 0,
    canRedo: model.future.length > 0,
    undo,
    redo,
    change,
    selectedId,
    onSelect: setSelectedId,
    tool,
    onToolChange: setTool,
    view,
    onViewChange: setView,
    zoom,
    onZoomChange: setZoom,
    sunTime,
    onSunTimeChange,
    onOpenSearch: () => {
      setSearchOpen(true);
    },
  };

  return (
    <>
      <div className="wb-showcase-devices">
        <figure className="wb-showcase-device" data-device="desktop">
          <figcaption>PC</figcaption>
          <DemoStage {...shared} label="Einrichten am PC" />
        </figure>
        <figure className="wb-showcase-device" data-device="phone">
          <figcaption>Handy</figcaption>
          <DemoStage {...shared} label="Einrichten auf dem Handy" />
        </figure>
      </div>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} commands={commands} />
    </>
  );
}

interface DemoStageProps {
  items: Furniture[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  change: (update: (items: Furniture[]) => Furniture[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  tool: string;
  onToolChange: (id: string) => void;
  view: View;
  onViewChange: (view: View) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  sunTime: number;
  onSunTimeChange: (hours: number) => void;
  onOpenSearch: () => void;
  label?: string;
}

function DemoStage(props: DemoStageProps) {
  return (
    <Stage
      className="wb-showcase-stage"
      phase={dayPhase(props.sunTime)}
      role="region"
      aria-label={props.label}
    >
      <StageContent {...props} />
    </Stage>
  );
}

/**
 * Meter in Zentimeter, ungerundet. Nur das Rauschen der Gleitkommarechnung fällt weg
 * (2,2825 · 100 = 228,25000000000003), damit das Feld genau den getippten Wert zurückbekommt.
 */
function metersToCentimeters(meters: number): number {
  return Math.round(meters * 1e8) / 1e6;
}

let copyCount = 0;

/** Eindeutige Kennung für eine Kopie. `crypto.randomUUID` fehlt über http im WLAN (Handy-Test). */
function nextCopyId(id: string): string {
  copyCount += 1;
  return `${id}-kopie-${String(copyCount)}`;
}

function toTarget(item: Furniture, frame: SceneFrame): CardTarget {
  const box = footprint(item);
  const x0 = frame.ox + box.x0 * frame.scale;
  const x1 = frame.ox + box.x1 * frame.scale;
  const y0 = frame.oy + box.y0 * frame.scale;
  const y1 = frame.oy + box.y1 * frame.scale;
  return { x0, y0, x1, y1, anchorX: (x0 + x1) / 2, anchorY: (y0 + y1) / 2 };
}

function StageContent({
  items,
  canUndo,
  canRedo,
  undo,
  redo,
  change,
  selectedId,
  onSelect,
  tool,
  onToolChange,
  view,
  onViewChange,
  zoom,
  onZoomChange,
  sunTime,
  onSunTimeChange,
  onOpenSearch,
}: DemoStageProps) {
  const { layout, width, height } = useStage();
  const id = useId();
  const frame = sceneFrame(width, height, layout, zoom);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const target = selected && view === 'dollhouse' ? toTarget(selected, frame) : null;
  const compact = layout === 'compact';

  const update = (patch: Partial<Furniture>) => {
    if (!selected) return;
    change((list) => list.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
  };

  return (
    <>
      <RoomScene
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        sunTime={sunTime}
        view={view}
        frame={frame}
        width={width}
        height={height}
      />

      <StageTop>
        <Brand withName={!compact} />
        <StepBar steps={STEPS} />
        <div className="wb-showcase-top-actions">
          <SearchButton onClick={onOpenSearch} />
          <ThemeToggle />
        </div>
      </StageTop>

      <StageTools>
        <ToolPalette
          label="Werkzeuge: Einrichten"
          tools={TOOLS}
          activeTool={tool}
          onToolChange={onToolChange}
          actions={[
            {
              id: 'undo',
              label: 'Rückgängig',
              icon: icons.undo,
              hotkey: 'mod+z',
              onPress: undo,
              disabled: !canUndo,
            },
            {
              id: 'redo',
              label: 'Wiederholen',
              icon: icons.redo,
              hotkey: 'mod+shift+z',
              onPress: redo,
              disabled: !canRedo,
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
              onViewChange(next === 'plan' ? 'plan' : 'dollhouse');
            }}
          />
          {!compact && (
            <ZoomControls
              onZoomIn={() => {
                onZoomChange(Math.min(1.4, zoom + 0.1));
              }}
              onZoomOut={() => {
                onZoomChange(Math.max(0.7, zoom - 0.1));
              }}
            />
          )}
          <SunTimeSlider value={sunTime} onChange={onSunTimeChange} />
        </ViewBar>
      </StageView>

      <StageStatus>
        <SaveStatus />
      </StageStatus>

      {selected && (
        <Inspector
          id={`${id}-inspector`}
          target={target}
          selectionKey={selected.id}
          kicker={`Wohnen · ${selected.material}`}
          title={selected.name}
          dimensions={`${formatNumber(metersToCentimeters(selected.w), INPUT_DECIMALS)} × ${formatNumber(metersToCentimeters(selected.d), INPUT_DECIMALS)} × ${formatNumber(selected.height, INPUT_DECIMALS)} cm`}
          onMore={onOpenSearch}
          quickActions={{
            onRotate: () => {
              update({ rotation: ((selected.rotation + 90) % 360) as Furniture['rotation'] });
            },
            onDuplicate: () => {
              const copy = {
                ...selected,
                id: nextCopyId(selected.id),
                x: selected.x + 0.3,
                y: selected.y + 0.3,
              };
              change((list) => [...list, copy]);
              onSelect(copy.id);
            },
            onRemove: () => {
              change((list) => list.filter((item) => item.id !== selected.id));
              onSelect(null);
            },
          }}
        >
          {selected.kind !== 'rug' && (
            <DimensionFields
              value={{
                width: metersToCentimeters(selected.w),
                depth: metersToCentimeters(selected.d),
                height: selected.height,
              }}
              onChange={(next) => {
                update({ w: next.width / 100, d: next.depth / 100, height: next.height });
              }}
              max={600}
            />
          )}
          {selected.swatch && (
            <SwatchPicker
              legend="Bezug"
              name={`${id}-fabric`}
              swatches={FABRICS}
              value={selected.swatch}
              onChange={(swatch) => {
                update({ swatch });
              }}
            />
          )}
          <FactList items={[['Material', selected.material], ...selected.facts]} />
          <CardFooter>
            <PriceTag value={formatPrice(selected.price)} />
            <Checkbox
              label="Auf der Einkaufsliste"
              checked={selected.onList}
              onChange={(onList) => {
                update({ onList });
              }}
            />
          </CardFooter>
        </Inspector>
      )}
    </>
  );
}
