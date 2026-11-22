import { useCallback, useState, type FocusEvent, type KeyboardEvent } from 'react';

export type Orientation = 'horizontal' | 'vertical';

const NEXT: Record<Orientation, string[]> = {
  horizontal: ['ArrowRight'],
  vertical: ['ArrowDown'],
};
const PREVIOUS: Record<Orientation, string[]> = {
  horizontal: ['ArrowLeft'],
  vertical: ['ArrowUp'],
};

/**
 * Bewegliche Tab-Position für Werkzeugleisten (Muster „Toolbar“ der ARIA Authoring Practices):
 * Die Leiste ist ein einziger Tab-Halt, innen wandert der Fokus mit den Pfeiltasten, Pos1 und Ende.
 * Elemente tragen `data-roving-id`. Gibt Props für den Container und je Element zurück.
 */
export function useRovingFocus(
  ids: readonly string[],
  orientation: Orientation,
  initialId?: string,
) {
  const [focusId, setFocusId] = useState<string | undefined>(initialId);
  const current = focusId !== undefined && ids.includes(focusId) ? focusId : ids[0];

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const from = target.closest<HTMLElement>('[data-roving-id]');
      if (!from) return;
      const index = ids.indexOf(from.dataset.rovingId ?? '');
      if (index < 0) return;
      let nextIndex: number | null = null;
      if (NEXT[orientation].includes(event.key)) nextIndex = (index + 1) % ids.length;
      else if (PREVIOUS[orientation].includes(event.key))
        nextIndex = (index - 1 + ids.length) % ids.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = ids.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextId = ids[nextIndex];
      if (nextId === undefined) return;
      setFocusId(nextId);
      event.currentTarget
        .querySelector<HTMLElement>(`[data-roving-id="${CSS.escape(nextId)}"]`)
        ?.focus();
    },
    [ids, orientation],
  );

  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const item =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>('[data-roving-id]')
        : null;
    if (item?.dataset.rovingId) setFocusId(item.dataset.rovingId);
  }, []);

  const itemProps = (id: string) => ({
    'data-roving-id': id,
    tabIndex: id === current ? 0 : -1,
  });

  return { containerProps: { onKeyDown, onFocus }, itemProps };
}
