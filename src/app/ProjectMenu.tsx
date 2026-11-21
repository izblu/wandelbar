import { useId, useRef } from 'react';
import { Brand, Icon, icons } from '../ui/index.ts';
import { useApp } from './AppContext.ts';

/**
 * Marke und Name der Wohnung in der Kopfzeile; öffnet ein kleines Menü zum Wechseln
 * (natives Popover: schließt mit Esc und beim Tippen daneben).
 */
export function ProjectMenu() {
  const { state, apartment, dispatch, goTo, startTour } = useApp();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const name = apartment?.name ?? (state.active === 'own' ? 'Neue Wohnung' : 'Lindenstraße 12');

  const choose = (action: () => void) => {
    menuRef.current?.hidePopover();
    action();
  };

  return (
    <>
      <button type="button" className="app-project" popoverTarget={menuId}>
        <Brand />
        <span className="app-project-divider" aria-hidden="true" />
        <span className="app-project-name">
          <span className="wb-visually-hidden">Wohnung: </span>
          {name}
        </span>
        <Icon icon={icons.chevronDown} size="s" className="app-project-chevron" />
      </button>
      <div id={menuId} ref={menuRef} className="app-menu" popover="auto">
        <p className="app-menu-title">Wohnungen</p>
        <ul className="app-menu-list">
          <li>
            <button
              type="button"
              className="app-menu-item"
              aria-current={state.active === 'sample' || undefined}
              onClick={() => {
                choose(() => {
                  // Zurück in den Schritt, in dem man in dieser Wohnung zuletzt war
                  dispatch({ type: 'switch', id: 'sample' });
                });
              }}
            >
              <Icon icon={icons.dollhouse} size="m" />
              <span>
                Lindenstraße 12<span className="app-menu-meta">Beispiel, eingerichtet</span>
              </span>
            </button>
          </li>
          {state.own && (
            <li>
              <button
                type="button"
                className="app-menu-item"
                aria-current={state.active === 'own' || undefined}
                onClick={() => {
                  choose(() => {
                    // Zurück in den Schritt, in dem man in dieser Wohnung zuletzt war
                    dispatch({ type: 'switch', id: 'own' });
                  });
                }}
              >
                <Icon icon={icons.floorPlan} size="m" />
                <span>
                  {state.own.apartment?.name ?? 'Neue Wohnung'}
                  <span className="app-menu-meta">deine Wohnung</span>
                </span>
              </button>
            </li>
          )}
        </ul>
        <div className="app-menu-actions">
          <button
            type="button"
            className="app-menu-item"
            onClick={() => {
              choose(() => {
                dispatch({ type: 'newOwn' });
                goTo('plan');
              });
            }}
          >
            <Icon icon={icons.upload} size="m" />
            <span>Neue Wohnung aus Grundriss</span>
          </button>
          <button
            type="button"
            className="app-menu-item"
            onClick={() => {
              choose(startTour);
            }}
          >
            <Icon icon={icons.help} size="m" />
            <span>Einführung zeigen</span>
          </button>
        </div>
      </div>
    </>
  );
}
