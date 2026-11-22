import { Icon } from '../icons/Icon.tsx';
import { icons } from '../icons/icons.ts';
import './step-bar.css';

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface StepBarProps {
  steps: readonly Step[];
  onSelect?: (id: string) => void;
  label?: string;
}

/**
 * Schlanke Schrittleiste: Grundriss → Bauen → Einrichten → Erleben.
 * Erledigte Schritte tragen ein Häkchen, der aktuelle die Sonne, kommende ihre Nummer.
 * Auf dem Handy steht nur der aktuelle Name sichtbar da; die anderen bleiben für Bildschirmleser.
 */
export function StepBar({ steps, onSelect, label = 'Arbeitsschritte' }: StepBarProps) {
  return (
    <nav className="wb-step-bar" aria-label={label}>
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              className="wb-step"
              data-status={step.status}
              aria-current={step.status === 'current' ? 'step' : undefined}
              onClick={() => onSelect?.(step.id)}
            >
              {step.status === 'done' && (
                <Icon icon={icons.check} size="s" className="wb-step-check" />
              )}
              {step.status === 'current' && <span className="wb-step-sun" aria-hidden="true" />}
              {step.status === 'upcoming' && (
                <span className="wb-step-number" aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <span className="wb-step-label">{step.label}</span>
              {step.status === 'done' && <span className="wb-visually-hidden">, erledigt</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
