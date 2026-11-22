import type { ReactNode } from 'react';
import { Button, IconButton } from '../controls/Button.tsx';
import { icons } from '../icons/icons.ts';
import './card.css';

/** Was der Rahmen (PC-Karte oder Handy-Blatt) der Karte mitgibt. */
export interface CardFrame {
  titleId: string;
  bodyId: string;
  /** Handy, eingeklappt: Der Körper liegt außerhalb des Bildschirms und ist nicht erreichbar. */
  bodyInert?: boolean;
  /** Handy: Am Kopf lässt sich das Blatt ziehen. */
  draggableHead?: boolean;
}

export interface QuickActions {
  onRotate: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export interface PropertyCardContent {
  /** Kleine Zeile über dem Titel, z. B. „Wohnen · Bouclé“ */
  kicker: ReactNode;
  title: string;
  /** z. B. „228 × 94 × 82 cm“ */
  dimensions?: string;
  onMore?: () => void;
  quickActions?: QuickActions;
  /** Felder, Fakten und Fuß */
  children?: ReactNode;
}

interface PropertyCardProps extends PropertyCardContent {
  frame: CardFrame;
}

/** Inhalt der Eigenschaftenkarte: Kopf, Schnellaktionen und Körper. Der Rahmen kommt von außen. */
export function PropertyCard({
  frame,
  kicker,
  title,
  dimensions,
  onMore,
  quickActions,
  children,
}: PropertyCardProps) {
  return (
    <>
      <header className="wb-card-head" data-sheet-drag={frame.draggableHead ? '' : undefined}>
        <p className="wb-card-kicker">{kicker}</p>
        <h2 className="wb-card-title" id={frame.titleId}>
          {title}
        </h2>
        {dimensions && <p className="wb-card-dimensions">{dimensions}</p>}
        {onMore && (
          <IconButton
            className="wb-card-more"
            icon={icons.more}
            label="Weitere Aktionen"
            onClick={onMore}
          />
        )}
      </header>

      {quickActions && (
        <div className="wb-card-actions" role="group" aria-label="Schnellaktionen">
          <Button layout="stacked" icon={icons.rotate} onClick={quickActions.onRotate}>
            Drehen
          </Button>
          <Button layout="stacked" icon={icons.duplicate} onClick={quickActions.onDuplicate}>
            Duplizieren
          </Button>
          <Button
            layout="stacked"
            variant="danger"
            icon={icons.remove}
            onClick={quickActions.onRemove}
          >
            Löschen
          </Button>
        </div>
      )}

      {children && (
        <div className="wb-card-body" id={frame.bodyId} inert={frame.bodyInert}>
          {children}
        </div>
      )}
    </>
  );
}

/** Ruhige Liste von Angaben, z. B. Material und Lieferzeit. */
export function FactList({ items }: { items: readonly (readonly [string, string])[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="wb-facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Fuß der Karte mit Trennlinie, z. B. Preis und „Auf der Einkaufsliste“. */
export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="wb-card-foot">{children}</div>;
}

/** Preis mit kleiner Beschriftung darüber */
export function PriceTag({ label = 'Preis', value }: { label?: string; value: string }) {
  return (
    <p className="wb-price">
      <span className="wb-row-label">{label}</span> <span className="wb-price-value">{value}</span>
    </p>
  );
}
