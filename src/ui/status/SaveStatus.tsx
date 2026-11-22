import { Icon } from '../icons/Icon.tsx';
import { icons } from '../icons/icons.ts';
import './save-status.css';

export type SaveState = 'saved' | 'saving';

/**
 * Speicherstand unten links. Sagt immer mit, wo die Daten liegen: nur auf diesem Gerät.
 * Bewusst kein Wolken-Symbol, denn es gibt keine Cloud.
 */
export function SaveStatus({ state = 'saved' }: { state?: SaveState }) {
  return (
    <p className="wb-save-status" role="status" data-state={state}>
      <Icon icon={icons.saved} size="m" />
      <span>{state === 'saved' ? 'Gespeichert' : 'Speichert …'} · nur auf diesem Gerät</span>
    </p>
  );
}
