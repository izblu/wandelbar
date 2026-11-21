import { useEffect, useId, useRef } from 'react';
import { formatNumber, formatPrice, IconButton, icons } from '../ui/index.ts';
import { CATALOG, CATALOG_GROUPS, type CatalogItem } from './prototype/apartment.ts';
import { toCentimeters } from './units.ts';

/** So viele Meter füllen das Vorschaubild ganz */
const THUMB_METERS = 2.4;

interface CatalogProps {
  onAdd: (item: CatalogItem) => void;
  onClose: () => void;
}

/**
 * Möbelkatalog: am PC neben der Werkzeugpalette, auf dem Handy von unten. Ein Tipp stellt das
 * Möbel mitten ins Bild. Die Vorschau zeigt die Grundfläche im gleichen Maßstab für alle.
 */
export function Catalog({ onAdd, onClose }: CatalogProps) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.app-catalog-item')?.focus();
  }, []);

  return (
    <section
      ref={ref}
      className="app-catalog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="app-catalog-head">
        <h2 id={titleId} className="app-catalog-title">
          Möbel
        </h2>
        <IconButton icon={icons.close} label="Katalog schließen" size="s" onClick={onClose} />
      </header>
      <p className="app-catalog-hint">Tipp ein Möbel an, es erscheint mitten im Bild.</p>
      <div className="app-catalog-groups">
        {CATALOG_GROUPS.map((group) => (
          <section key={group} className="app-catalog-group" aria-label={group}>
            <h3 className="app-catalog-group-title">{group}</h3>
            <ul>
              {CATALOG.filter((item) => item.group === group).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="app-catalog-item"
                    onClick={() => {
                      onAdd(item);
                    }}
                  >
                    <Thumb item={item} />
                    <span className="app-catalog-name">{item.name}</span>
                    <span className="app-catalog-meta">
                      {formatNumber(toCentimeters(item.w), 0)} ×{' '}
                      {formatNumber(toCentimeters(item.d), 0)} cm
                      {' · '}
                      {formatPrice(item.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function Thumb({ item }: { item: CatalogItem }) {
  const size = 40;
  const w = (item.w / THUMB_METERS) * size;
  const d = (item.d / THUMB_METERS) * size;
  const round = item.kind === 'lamp' || item.kind === 'plant';
  return (
    <svg
      className="app-catalog-thumb"
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      aria-hidden="true"
    >
      {round ? (
        <circle cx={size / 2} cy={size / 2} r={w / 2} data-kind={item.kind} />
      ) : (
        <rect
          x={(size - w) / 2}
          y={(size - d) / 2}
          width={w}
          height={d}
          rx={2}
          data-kind={item.kind}
        />
      )}
    </svg>
  );
}
