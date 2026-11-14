import { useId, useState, type InputHTMLAttributes } from 'react';
import { formatNumber, INPUT_DECIMALS } from '../format.ts';
import { Icon } from '../icons/Icon.tsx';
import { icons } from '../icons/icons.ts';
import { validateNumber, type NumberRules } from './validateNumber.ts';
import './fields.css';

/* ------------------------------------------------------------------ Textfeld */

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'id'
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Kurzer Hinweis unter dem Feld */
  hint?: string;
}

export function TextField({ label, value, onChange, hint, ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="wb-field">
      <label className="wb-field-label" htmlFor={id}>
        {label}
      </label>
      <span className="wb-field-box">
        <input
          id={id}
          type="text"
          value={value}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          {...rest}
        />
      </span>
      {hint && (
        <p className="wb-field-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Zahlenfeld */

interface NumberInputProps extends NumberRules {
  id: string;
  value: number;
  onChange: (value: number) => void;
  /** Meldet die aktuelle Meldung nach außen (oder null) */
  onMessage: (message: string | null) => void;
  invalid: boolean;
  describedBy?: string;
  /** Die Einheit steht schon in der Überschrift (Maße); im Feld bleibt Platz für den Wert. */
  unitInLegend?: boolean;
}

/**
 * Zahleneingabe mit Einheit. Der Wert gilt erst mit Enter („Fertig“ auf dem Handy) oder beim
 * Verlassen des Feldes, ungerundet: keine Zwischengrößen beim Tippen, ein Rückgängig-Schritt pro
 * Eingabe. Eine Meldung erscheint ebenfalls erst dann; steht sie schon, folgt sie der Eingabe und
 * verschwindet bei einer gültigen Zahl („früh belohnen, spät bemängeln“).
 */
function NumberInput({
  id,
  value,
  onChange,
  onMessage,
  invalid,
  describedBy,
  unitInLegend = false,
  ...rules
}: NumberInputProps) {
  const format = (n: number) => formatNumber(n, INPUT_DECIMALS);
  const [draft, setDraft] = useState(() => format(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(format(value));
  }

  const commit = () => {
    const check = validateNumber(draft, rules);
    if (check.ok) {
      setDraft(format(check.value));
      onMessage(null);
      if (check.value !== value) {
        setSynced(check.value);
        onChange(check.value);
      }
    } else {
      onMessage(check.message);
    }
  };

  return (
    <span className="wb-field-box" data-invalid={invalid || undefined}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const text = event.currentTarget.value;
          setDraft(text);
          if (!invalid) return;
          const check = validateNumber(text, rules);
          onMessage(check.ok ? null : check.message);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
      />
      {rules.unit && !unitInLegend && (
        <span className="wb-field-unit" aria-hidden="true">
          {rules.unit}
        </span>
      )}
    </span>
  );
}

function FieldMessage({ id, message }: { id: string; message: string | null }) {
  return (
    <p className="wb-field-message" id={id} hidden={!message}>
      {message && <Icon icon={icons.warning} size="s" />}
      {message}
    </p>
  );
}

interface NumberFieldProps extends NumberRules {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/** Zahl mit Einheit, z. B. Breite in cm. Die Einheit gehört zum Namen des Feldes. */
export function NumberField({ label, value, onChange, ...rules }: NumberFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="wb-field">
      <label className="wb-field-label" htmlFor={id}>
        {label}
        {rules.unit && <span className="wb-visually-hidden"> in {rules.unit}</span>}
      </label>
      <NumberInput
        id={id}
        value={value}
        onChange={onChange}
        onMessage={setMessage}
        invalid={message !== null}
        describedBy={message ? messageId : undefined}
        {...rules}
      />
      <FieldMessage id={messageId} message={message} />
    </div>
  );
}

/* ------------------------------------------------------------------ Maße */

export interface Dimensions {
  width: number;
  depth: number;
  height: number;
}

interface DimensionFieldsProps {
  value: Dimensions;
  onChange: (value: Dimensions) => void;
  legend?: string;
  unit?: string;
  min?: number;
  max?: number;
}

const DIMENSION_LABELS: Record<keyof Dimensions, string> = {
  width: 'Breite',
  depth: 'Tiefe',
  height: 'Höhe',
};

/**
 * Breite, Tiefe und Höhe nebeneinander. Die Einheit steht einmal in der Überschrift („Maße in cm“),
 * damit die schmalen Felder Platz für ungerundete Werte wie „1.999,25“ haben. Meldungen stehen
 * gesammelt unter den drei Feldern, damit die Spalten nicht umbrechen; das betroffene Feld verweist
 * darauf.
 */
export function DimensionFields({
  value,
  onChange,
  legend = 'Maße',
  unit = 'cm',
  min = 1,
  max = 2000,
}: DimensionFieldsProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [messages, setMessages] = useState<Partial<Record<keyof Dimensions, string>>>({});
  const keys = Object.keys(DIMENSION_LABELS) as (keyof Dimensions)[];
  const firstInvalid = keys.find((key) => messages[key]);
  const shown = firstInvalid
    ? `${DIMENSION_LABELS[firstInvalid]}: ${messages[firstInvalid] ?? ''}`
    : null;

  return (
    <fieldset className="wb-dimensions">
      <legend className="wb-row-label">
        {legend} in {unit}
      </legend>
      <div className="wb-dimensions-grid">
        {keys.map((key) => (
          <div className="wb-field" key={key}>
            <label className="wb-field-label" htmlFor={`${id}-${key}`}>
              {DIMENSION_LABELS[key]}
              <span className="wb-visually-hidden"> in {unit}</span>
            </label>
            <NumberInput
              id={`${id}-${key}`}
              value={value[key]}
              unit={unit}
              unitInLegend
              min={min}
              max={max}
              example={value[key]}
              invalid={Boolean(messages[key])}
              describedBy={messages[key] ? messageId : undefined}
              onChange={(next) => {
                onChange({ ...value, [key]: next });
              }}
              onMessage={(message) => {
                setMessages((previous) => {
                  return { ...previous, [key]: message ?? undefined };
                });
              }}
            />
          </div>
        ))}
      </div>
      <FieldMessage id={messageId} message={shown} />
    </fieldset>
  );
}
