import type { CSSProperties, ReactNode } from 'react';
import './fields.css';

interface ToggleProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Häkchen für ein Ja oder Nein, das erst mit anderen zusammen wirkt, z. B. „Auf der Einkaufsliste“. */
export function Checkbox({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="wb-check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.checked);
        }}
      />
      <span>{label}</span>
    </label>
  );
}

/** Schalter für eine Einstellung, die sofort wirkt, z. B. „Maße anzeigen“. */
export function Switch({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="wb-switch">
      <span className="wb-switch-label">{label}</span>
      <input
        type="checkbox"
        role="switch"
        className="wb-switch-input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.checked);
        }}
      />
    </label>
  );
}

export interface Swatch {
  id: string;
  /** Name der Farbe, z. B. „Sand“; für das Auge versteckt, für Bildschirmleser immer da */
  name: string;
  /** Farbe des Materials (Daten, kein Design-Token) */
  color: string;
}

interface SwatchPickerProps {
  /** z. B. „Bezug“; die gewählte Farbe steht daneben */
  legend: string;
  swatches: readonly Swatch[];
  value: string;
  onChange: (id: string) => void;
  /** Gruppenname der Radios; muss je Seite eindeutig sein */
  name: string;
}

/**
 * Farbfelder als native Radios: ein Tab-Halt, Pfeiltasten wechseln die Farbe.
 * Die Legende nennt die Wahl mit, z. B. „Bezug · Sand“.
 */
export function SwatchPicker({ legend, swatches, value, onChange, name }: SwatchPickerProps) {
  const current = swatches.find((swatch) => swatch.id === value);
  return (
    <fieldset className="wb-swatches">
      <legend className="wb-row-label">
        {legend}
        {current && <span className="wb-row-value">{current.name}</span>}
      </legend>
      <div className="wb-swatch-row">
        {swatches.map((swatch) => (
          <label
            key={swatch.id}
            className="wb-swatch"
            title={swatch.name}
            style={{ '--swatch': swatch.color } as CSSProperties}
          >
            <input
              type="radio"
              name={name}
              value={swatch.id}
              checked={swatch.id === value}
              onChange={() => {
                onChange(swatch.id);
              }}
            />
            <span className="wb-visually-hidden">{swatch.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
