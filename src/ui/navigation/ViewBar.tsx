import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { dayPhase } from '../../model/sun.ts';
import { IconButton } from '../controls/Button.tsx';
import { formatClock } from '../format.ts';
import { Icon } from '../icons/Icon.tsx';
import { icons } from '../icons/icons.ts';
import './view-bar.css';

/** Ansichtsleiste: Ansicht, Zoom und Tageszeit. Am PC unten mittig, auf dem Handy oben. */
export function ViewBar({ children, label = 'Ansicht' }: { children: ReactNode; label?: string }) {
  return (
    <div className="wb-view-bar" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export interface SegmentOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SegmentedControlProps {
  options: readonly SegmentOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}

/** Umschalter zwischen wenigen gleichrangigen Möglichkeiten, z. B. Puppenhaus und Draufsicht. */
export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  return (
    <div className="wb-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => {
            onChange(option.id);
          }}
        >
          <Icon icon={option.icon} size="m" />
          <span className="wb-segmented-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Aktueller Zoom, 1 = eingepasst; zeigt dann die Prozentzahl */
  zoom?: number;
  /** Zeigt den Knopf „Einpassen“ */
  onFit?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}

/**
 * Zoom per Knopf am PC, stufenlos dazwischen mit Mausrad oder Touchpad. Auf dem Handy zoomt man
 * mit zwei Fingern, die Knöpfe entfallen. „Einpassen“ zeigt wieder die ganze Wohnung.
 */
export function ZoomControls({
  onZoomIn,
  onZoomOut,
  zoom,
  onFit,
  canZoomIn = true,
  canZoomOut = true,
}: ZoomControlsProps) {
  return (
    <div className="wb-zoom" role="group" aria-label="Zoom">
      <IconButton
        icon={icons.zoomOut}
        label="Verkleinern"
        size="s"
        onClick={onZoomOut}
        aria-disabled={canZoomOut ? undefined : true}
      />
      {zoom !== undefined && <output className="wb-zoom-value">{Math.round(zoom * 100)} %</output>}
      <IconButton
        icon={icons.zoomIn}
        label="Vergrößern"
        size="s"
        onClick={onZoomIn}
        aria-disabled={canZoomIn ? undefined : true}
      />
      {onFit && (
        <IconButton
          className="wb-zoom-fit"
          icon={icons.fit}
          label="Einpassen"
          size="s"
          onClick={onFit}
        />
      )}
    </div>
  );
}

interface SunTimeSliderProps {
  /** Uhrzeit in Stunden, z. B. 7.5 für 7:30 Uhr */
  value: number;
  onChange: (hours: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Tageszeit-Regler, die Signatur von A4 „Sonnenstand“: Die Sonne wandert durch die Fenster,
 * ab Sonnenuntergang leuchten die Lampen. Ein natives Schieberegler-Element mit Uhrzeit als Text.
 */
export function SunTimeSlider({
  value,
  onChange,
  min = 6,
  max = 22,
  step = 0.25,
}: SunTimeSliderProps) {
  const id = useId();
  const phase = dayPhase(value);
  const clock = formatClock(value);
  return (
    <div className="wb-sun-time" data-phase={phase}>
      <Icon icon={phase === 'day' ? icons.sun : icons.moon} size="m" className="wb-sun-time-icon" />
      <label className="wb-sun-time-label" htmlFor={id}>
        Tageszeit
      </label>
      <input
        id={id}
        className="wb-sun-time-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={`${clock} Uhr`}
        onChange={(event) => {
          onChange(Number(event.currentTarget.value));
        }}
      />
      <output className="wb-sun-time-output" htmlFor={id} aria-hidden="true">
        {clock}
      </output>
    </div>
  );
}
