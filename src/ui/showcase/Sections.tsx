import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { PropertyCard, CardFooter, FactList, PriceTag } from '../card/PropertyCard.tsx';
import { springFrames } from '../card/sheetPhysics.ts';
import { Button, IconButton, Kbd } from '../controls/Button.tsx';
import { formatNumber } from '../format.ts';
import { Checkbox, Switch, SwatchPicker } from '../forms/Choices.tsx';
import { DimensionFields, NumberField, TextField } from '../forms/Fields.tsx';
import { Icon } from '../icons/Icon.tsx';
import { icons, type IconName } from '../icons/icons.ts';
import { readDuration, readEasing } from '../motion.ts';
import { StepBar } from '../navigation/StepBar.tsx';
import { ToolPalette } from '../navigation/ToolPalette.tsx';
import { SegmentedControl, SunTimeSlider, ZoomControls } from '../navigation/ViewBar.tsx';
import { SaveStatus } from '../status/SaveStatus.tsx';
import { contrastLevel, contrastRatio, type Rgb } from './contrast.ts';
import { FABRICS } from './room.ts';

/* ------------------------------------------------------------------ Rahmen */

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="wb-showcase-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="wb-showcase-section-head">
        <h2 id={`${id}-title`}>{title}</h2>
        {intro && <p>{intro}</p>}
      </header>
      {children}
    </section>
  );
}

function Specimen({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <article className="wb-specimen">
      <h3>{title}</h3>
      {note && <p className="wb-specimen-note">{note}</p>}
      <div className="wb-specimen-body">{children}</div>
    </article>
  );
}

const tokenStyle = (property: string, token: string) =>
  ({ [property]: `var(${token})` }) as CSSProperties;

/* ------------------------------------------------------------------ Farben */

let colorContext: CanvasRenderingContext2D | null = null;

/** Wandelt jede CSS-Farbe (auch oklab aus color-mix) über eine 1-px-Leinwand in sRGB. */
function toRgb(css: string): Rgb {
  if (!colorContext) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    colorContext = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!colorContext) return [0, 0, 0];
  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillStyle = css;
  colorContext.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = colorContext.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

const PALETTE = [
  ['--palette-limewash', 'Kalkweiß'],
  ['--palette-slate', 'Schiefer'],
  ['--palette-fjord', 'Fjordblau'],
  ['--palette-oak', 'Eiche'],
  ['--palette-sun', 'Sonne'],
  ['--palette-night', 'Nacht'],
] as const;

const SURFACES = [
  ['--color-canvas', 'Grund'],
  ['--color-surface', 'Leisten'],
  ['--color-surface-raised', 'Karten'],
  ['--color-surface-sunk', 'Felder'],
  ['--color-accent-soft', 'Auswahl'],
  ['--color-sun-soft', 'Sonnenfläche'],
] as const;

const PAIRS = [
  ['--color-ink', '--color-canvas', 'Schrift auf Grund'],
  ['--color-ink-muted', '--color-canvas', 'Leise Schrift auf Grund'],
  ['--color-ink-muted', '--color-surface-raised', 'Leise Schrift auf Karte'],
  ['--color-ink', '--color-surface-sunk', 'Schrift im Feld'],
  ['--color-accent', '--color-surface-raised', 'Fjordblau auf Karte'],
  ['--color-on-accent', '--color-accent', 'Schrift auf Fjordblau'],
  ['--color-danger', '--color-surface-raised', 'Warnung auf Karte'],
  ['--color-sun-ink', '--color-sun-soft', 'Sonnenschrift auf Sonnenfläche'],
] as const;

export function ColorsSection() {
  // Die Hex-Werte stehen nur in tokens.css; hier werden sie einmal ausgelesen.
  const [hex] = useState<Record<string, string>>(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      PALETTE.map(([token]) => [token, style.getPropertyValue(token).trim()]),
    );
  });

  return (
    <Section
      id="farben"
      title="Farben"
      intro="Sechs Grundfarben, daraus Farben nach Aufgabe. Hell und dunkel stehen nebeneinander; der Kontrast wird hier im Browser aus den echten Werten gerechnet."
    >
      <ul className="wb-palette">
        {PALETTE.map(([token, name]) => (
          <li key={token}>
            <span className="wb-palette-chip" style={tokenStyle('background', token)} />
            <span className="wb-palette-name">{name}</span>
            <code>{hex[token] ?? token}</code>
          </li>
        ))}
      </ul>
      <div className="wb-schemes">
        <SchemePanel scheme="light" />
        <SchemePanel scheme="dark" />
      </div>
    </Section>
  );
}

function SchemePanel({ scheme }: { scheme: 'light' | 'dark' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ratios, setRatios] = useState<number[]>([]);
  useLayoutEffect(() => {
    const samples = ref.current?.querySelectorAll<HTMLElement>('[data-contrast-sample]') ?? [];
    setRatios(
      [...samples].map((sample) => {
        const style = getComputedStyle(sample);
        return contrastRatio(toRgb(style.color), toRgb(style.backgroundColor));
      }),
    );
  }, []);

  return (
    <div className="wb-scheme" data-scheme={scheme} ref={ref}>
      <h3>{scheme === 'light' ? 'Hell' : 'Dunkel'}</h3>
      <ul className="wb-surfaces">
        {SURFACES.map(([token, name]) => (
          <li key={token}>
            <span className="wb-surface-chip" style={tokenStyle('background', token)} />
            {name}
          </li>
        ))}
      </ul>
      <ul className="wb-pairs">
        {PAIRS.map(([fg, bg, name], index) => {
          const ratio = ratios[index];
          return (
            <li key={name}>
              <span
                className="wb-pair-sample"
                data-contrast-sample=""
                style={{ color: `var(${fg})`, background: `var(${bg})` }}
                aria-hidden="true"
              >
                Aa
              </span>
              <span className="wb-pair-name">{name}</span>
              <span className="wb-pair-ratio">
                {ratio === undefined ? '…' : `${formatNumber(ratio, 1)} : 1`}
                {ratio !== undefined && (
                  <span className="wb-pair-level" data-level={contrastLevel(ratio)}>
                    {contrastLevel(ratio)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Schrift */

const TYPE_SCALE = [
  ['--text-4xl', 44, 'Große Überschriften'],
  ['--text-3xl', 28, 'Seitentitel'],
  ['--text-2xl', 21, 'Titel der Eigenschaftenkarte'],
  ['--text-xl', 19, 'Preise, Titel auf dem Handy'],
  ['--text-l', 17, 'Markenname'],
  ['--text-m', 15, 'Fließtext, Eingaben, Befehle'],
  ['--text-s', 13.5, 'Bedienelemente, Hinweise'],
  ['--text-xs', 12.5, 'Beschriftungen über Feldern'],
  ['--text-2xs', 11.5, 'Tastenkürzel, Schrittnummern'],
] as const;

const WEIGHTS = [
  ['--weight-regular', 'Normal', 400],
  ['--weight-medium', 'Mittel', 550],
  ['--weight-semibold', 'Halbfett', 600],
  ['--weight-bold', 'Fett', 650],
] as const;

export function TypeSection() {
  return (
    <Section
      id="schrift"
      title="Schrift"
      intro="Albert Sans, eine Schrift für alles. Größen in rem, damit die Schriftgröße des Systems gilt. Ziffern stehen in Maßen und Preisen gleich breit."
    >
      <ol className="wb-type-scale">
        {TYPE_SCALE.map(([token, px, role]) => (
          <li key={token}>
            <span className="wb-type-meta">
              <code>{token.replace('--text-', '')}</code> {formatNumber(px, 1)} px
            </span>
            <span className="wb-type-sample" style={tokenStyle('fontSize', token)}>
              Das Sofa steht im Morgenlicht
            </span>
            <span className="wb-type-role">{role}</span>
          </li>
        ))}
      </ol>
      <ul className="wb-weights">
        {WEIGHTS.map(([token, name, value]) => (
          <li key={token} style={tokenStyle('fontWeight', token)}>
            {name} <span>{value}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ Maße */

const SPACES = [
  ['--space-1', 4],
  ['--space-2', 8],
  ['--space-3', 12],
  ['--space-4', 16],
  ['--space-5', 20],
  ['--space-6', 24],
  ['--space-8', 32],
  ['--space-10', 40],
  ['--space-12', 48],
  ['--space-16', 64],
  ['--space-20', 80],
] as const;

const RADII = [
  ['--radius-xs', 'xs'],
  ['--radius-s', 's'],
  ['--radius-m', 'm'],
  ['--radius-l', 'l'],
  ['--radius-xl', 'xl'],
  ['--radius-2xl', '2xl'],
  ['--radius-sheet', 'Blatt'],
] as const;

const ELEVATIONS = [
  ['--edge', 'Kante', 'Trennt deckende Flächen ruhig vom Grund'],
  ['--elevation-float', 'Schweben', 'Leisten über der Szene'],
  ['--elevation-card', 'Karte', 'Eigenschaftenkarte, Befehlssuche'],
  ['--elevation-sheet', 'Blatt', 'Handy-Karte von unten'],
] as const;

export function SpaceSection() {
  return (
    <Section
      id="masse"
      title="Abstände, Radien, Kanten"
      intro="Ein 4-px-Raster. Flächen sind deckend, ohne Milchglas: eine feine Kante und ein weicher Schatten heben sie ab."
    >
      <div className="wb-measure-grid">
        <ul className="wb-spaces" aria-label="Abstände">
          {SPACES.map(([token, px]) => (
            <li key={token}>
              <code>{token.replace('--space-', '')}</code>
              <span className="wb-space-bar" style={tokenStyle('width', token)} />
              <span>{px} px</span>
            </li>
          ))}
        </ul>
        <ul className="wb-radii" aria-label="Radien">
          {RADII.map(([token, name]) => (
            <li key={token}>
              <span className="wb-radius-tile" style={tokenStyle('borderTopLeftRadius', token)} />
              {name}
            </li>
          ))}
        </ul>
      </div>
      <ul className="wb-elevations">
        {ELEVATIONS.map(([token, name, role]) => (
          <li key={token}>
            <span className="wb-elevation-tile" style={tokenStyle('boxShadow', token)} />
            <strong>{name}</strong>
            <span>{role}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ Bewegung */

const MOTIONS = [
  ['--duration-quick', '--ease-standard', 'Hinweise', 'Name eines Werkzeugs erscheint'],
  ['--duration-base', '--ease-standard', 'Farbwechsel', 'Überfahren mit der Maus'],
  ['--duration-moderate', '--ease-standard', 'Auswahl', 'Schalter, Farbfelder'],
  ['--duration-enter', '--ease-standard', 'Erscheinen', 'Karte am Objekt'],
] as const;

export function MotionSection() {
  const ref = useRef<HTMLOListElement>(null);
  const [reduced, setReduced] = useState(false);

  const play = () => {
    const list = ref.current;
    if (!list) return;
    setReduced(readDuration(list, '--duration-enter') <= 0);
    for (const dot of list.querySelectorAll<HTMLElement>('[data-motion]')) {
      const track = dot.parentElement;
      if (!track) continue;
      const distance = track.clientWidth - dot.offsetWidth;
      const keyframes =
        dot.dataset.motion === 'spring'
          ? springFrames(0, distance, 0).frames.map((x) => ({
              transform: `translateX(${x.toFixed(1)}px)`,
            }))
          : [{ transform: 'none' }, { transform: `translateX(${String(distance)}px)` }];
      const duration =
        dot.dataset.motion === 'spring'
          ? springFrames(0, distance, 0).durationMs
          : readDuration(dot, dot.dataset.motion ?? '');
      if (readDuration(list, '--duration-enter') <= 0) continue;
      dot.animate(keyframes, {
        duration,
        easing: dot.dataset.motion === 'spring' ? 'linear' : readEasing(dot, '--ease-standard'),
        fill: 'forwards',
      });
    }
  };

  return (
    <Section
      id="bewegung"
      title="Bewegung"
      intro="Kurz und weich auslaufend, nie verspielt. Die Handy-Karte federt mit selbst gerechneter Physik. Wer reduzierte Bewegung eingestellt hat, sieht alles sofort am Ziel."
    >
      <ol className="wb-motions" ref={ref}>
        {MOTIONS.map(([duration, , name, use]) => (
          <li key={duration}>
            <span className="wb-motion-name">
              <strong>{name}</strong> {use}
            </span>
            <span className="wb-motion-track">
              <span className="wb-motion-dot" data-motion={duration} />
            </span>
          </li>
        ))}
        <li>
          <span className="wb-motion-name">
            <strong>Feder</strong> Handy-Karte loslassen
          </span>
          <span className="wb-motion-track">
            <span className="wb-motion-dot" data-motion="spring" />
          </span>
        </li>
      </ol>
      <div className="wb-motion-actions">
        <Button icon={icons.next} onClick={play}>
          Abspielen
        </Button>
        {reduced && (
          <p className="wb-specimen-note" role="status">
            Reduzierte Bewegung ist eingestellt: Alles springt sofort an sein Ziel.
          </p>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Icons */

const ICON_NAMES: Record<IconName, string> = {
  select: 'Auswählen',
  pan: 'Verschieben',
  furniture: 'Möbel',
  surfaces: 'Flächen',
  measure: 'Messen',
  wall: 'Wand',
  door: 'Tür',
  window: 'Fenster',
  room: 'Raum',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  dollhouse: 'Puppenhaus',
  floorPlan: 'Grundriss',
  walk: 'Begehen',
  zoomIn: 'Vergrößern',
  zoomOut: 'Verkleinern',
  fit: 'Einpassen',
  north: 'Norden',
  photo: 'Foto',
  sun: 'Sonne, Tag',
  planLight: 'Planungslicht',
  moon: 'Mond, Abend',
  lamp: 'Lampe',
  rotate: 'Drehen',
  duplicate: 'Duplizieren',
  remove: 'Löschen',
  more: 'Weitere Aktionen',
  upload: 'Grundriss laden',
  recognize: 'Erkennen',
  info: 'Hinweis',
  search: 'Suchen',
  check: 'Erledigt',
  close: 'Schließen',
  chevronDown: 'Aufklappen',
  next: 'Weiter',
  variants: 'Varianten',
  shoppingList: 'Einkaufsliste',
  saved: 'Gespeichert',
  export: 'Exportieren',
  settings: 'Einstellungen',
  help: 'Hilfe',
  warning: 'Warnung',
  keyUp: 'Taste Pfeil hoch',
  keyDown: 'Taste Pfeil runter',
  keyEnter: 'Taste Enter',
};

export function IconsSection() {
  return (
    <Section
      id="icons"
      title="Icons"
      intro="Lucide, Strichstärke 1,6, benannt nach Aufgabe statt nach Bild. Den Grundriss gibt es bei Lucide nicht; er ist im selben Stil ergänzt."
    >
      <ul className="wb-icon-grid">
        {(Object.keys(ICON_NAMES) as IconName[]).map((name) => (
          <li key={name}>
            <Icon icon={icons[name]} size="l" />
            <span>{ICON_NAMES[name]}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ Bausteine */

export function ComponentsSection() {
  const id = useId();
  const [view, setView] = useState('dollhouse');
  const [time, setTime] = useState(19.75);
  const [projectName, setProjectName] = useState('Lindenstraße 12');
  const [ceiling, setCeiling] = useState(250);
  const [dims, setDims] = useState({ width: 228, depth: 94, height: 82 });
  const [onList, setOnList] = useState(true);
  const [showMeasures, setShowMeasures] = useState(true);
  const [fabric, setFabric] = useState('dove');
  const [tool, setTool] = useState('furniture');

  return (
    <Section
      id="bausteine"
      title="Bausteine"
      intro="Jeder Baustein mit seinen Zuständen. Alles ist echt bedienbar: mit Maus, Finger und Tastatur."
    >
      <div className="wb-specimens">
        <Specimen title="Knöpfe" note="Eine Hauptaktion je Bereich. Löschen ist rot, aber ruhig.">
          <div className="wb-row">
            <Button variant="primary" icon={icons.next}>
              Weiter zu Erleben
            </Button>
            <Button icon={icons.export}>Exportieren</Button>
            <Button variant="ghost">Abbrechen</Button>
            <Button variant="danger" icon={icons.remove}>
              Löschen
            </Button>
          </div>
          <div className="wb-row">
            <Button variant="primary" disabled>
              Gesperrt
            </Button>
            <Button size="s">Klein</Button>
            <Button size="s" variant="ghost" icon={icons.help}>
              Hilfe
            </Button>
          </div>
        </Specimen>

        <Specimen
          title="Icon-Knöpfe und Tasten"
          note="Der Name ist immer da, auch wenn man ihn nicht sieht."
        >
          <div className="wb-row">
            <IconButton icon={icons.settings} label="Einstellungen" />
            <IconButton icon={icons.variants} label="Varianten" variant="floating" />
            <IconButton
              icon={icons.shoppingList}
              label="Einkaufsliste"
              variant="floating"
              pressed
            />
            <IconButton icon={icons.export} label="Exportieren" disabled />
          </div>
          <div className="wb-row">
            <Kbd>Strg</Kbd>
            <Kbd>K</Kbd>
            <Kbd>Esc</Kbd>
            <Kbd>V</Kbd>
          </div>
        </Specimen>

        <Specimen
          title="Schritte und Speicherstand"
          note="Wo man steht und dass nichts verloren geht."
        >
          <StepBar
            steps={[
              { id: 'plan', label: 'Grundriss', status: 'done' },
              { id: 'build', label: 'Bauen', status: 'current' },
              { id: 'furnish', label: 'Einrichten', status: 'upcoming' },
              { id: 'experience', label: 'Erleben', status: 'upcoming' },
            ]}
            label="Arbeitsschritte (Beispiel)"
          />
          <div className="wb-column">
            <SaveStatus />
            <SaveStatus state="saving" />
          </div>
        </Specimen>

        <Specimen
          title="Ansicht und Tageszeit"
          note="Der Regler nennt die Uhrzeit auch für Bildschirmleser."
        >
          <div className="wb-column">
            <SegmentedControl
              label="Ansicht (Beispiel)"
              value={view}
              onChange={setView}
              options={[
                { id: 'dollhouse', label: 'Puppenhaus', icon: icons.dollhouse },
                { id: 'plan', label: 'Grundriss', icon: icons.floorPlan },
              ]}
            />
            <div className="wb-row">
              <ZoomControls onZoomIn={() => undefined} onZoomOut={() => undefined} />
              <SunTimeSlider value={time} onChange={setTime} />
            </div>
          </div>
        </Specimen>

        <Specimen
          title="Werkzeugpalette"
          note="Ein Tab-Halt, innen Pfeiltasten. Gesperrtes bleibt erreichbar."
        >
          <ToolPalette
            label="Werkzeuge (Beispiel)"
            tools={[
              { id: 'select', label: 'Auswählen', icon: icons.select, hotkey: 'v' },
              { id: 'furniture', label: 'Möbel', icon: icons.furniture, hotkey: 'm' },
              { id: 'measure', label: 'Messen', icon: icons.measure, hotkey: 'l' },
            ]}
            activeTool={tool}
            onToolChange={setTool}
            actions={[
              {
                id: 'undo',
                label: 'Rückgängig',
                icon: icons.undo,
                onPress: () => undefined,
                disabled: true,
              },
            ]}
          />
        </Specimen>

        <Specimen
          title="Felder"
          note="Zahlen dürfen Komma oder Punkt haben. Tipp Buchstaben und verlass das Feld: Die Meldung sagt, was zu tun ist."
        >
          <TextField
            label="Name des Projekts"
            value={projectName}
            onChange={setProjectName}
            hint="Steht nur auf diesem Gerät."
          />
          <NumberField
            label="Raumhöhe"
            unit="cm"
            value={ceiling}
            onChange={setCeiling}
            min={180}
            max={400}
            example={250}
          />
          <DimensionFields value={dims} onChange={setDims} />
        </Specimen>

        <Specimen
          title="Auswahl"
          note="Häkchen für Angaben, Schalter für sofort Wirksames, Farbfelder per Pfeiltasten."
        >
          <Checkbox label="Auf der Einkaufsliste" checked={onList} onChange={setOnList} />
          <Checkbox label="Schon bestellt" checked={false} onChange={() => undefined} disabled />
          <Switch
            label="Maße im Grundriss zeigen"
            checked={showMeasures}
            onChange={setShowMeasures}
          />
          <SwatchPicker
            legend="Bezug"
            name={`${id}-fabric`}
            swatches={FABRICS}
            value={fabric}
            onChange={setFabric}
          />
        </Specimen>

        <Specimen
          title="Eigenschaftenkarte"
          note="Am PC mit Spitze zum Objekt, auf dem Handy als Blatt von unten."
        >
          <section
            className="wb-card wb-specimen-card"
            aria-labelledby={`${id}-card-title`}
            data-side="none"
          >
            <PropertyCard
              frame={{ titleId: `${id}-card-title`, bodyId: `${id}-card-body` }}
              kicker="Essen · Eiche"
              title="Esstisch, ausziehbar"
              dimensions="180 × 90 × 75 cm"
              onMore={() => undefined}
              quickActions={{
                onRotate: () => undefined,
                onDuplicate: () => undefined,
                onRemove: () => undefined,
              }}
            >
              <FactList
                items={[
                  ['Ausgezogen', '260 cm'],
                  ['Plätze', '6 bis 10'],
                ]}
              />
              <CardFooter>
                <PriceTag value="1.640 €" />
              </CardFooter>
            </PropertyCard>
          </section>
        </Specimen>
      </div>
    </Section>
  );
}
