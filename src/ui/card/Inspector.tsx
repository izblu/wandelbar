import { useStage } from '../stage/stageContext.ts';
import { AnchoredCard } from './AnchoredCard.tsx';
import { BottomSheet } from './BottomSheet.tsx';
import type { CardTarget } from './placeCard.ts';
import { PropertyCard, type PropertyCardContent } from './PropertyCard.tsx';

interface InspectorProps extends PropertyCardContent {
  /** Lage des gewählten Objekts auf der Bühne (nur PC) */
  target: CardTarget | null;
  /** Kennung der Auswahl, z. B. die Objekt-ID */
  selectionKey: string;
  /** Ziel für den Sprunglink „Zu den Eigenschaften springen“ */
  id?: string;
}

/** Eigenschaftenkarte des gewählten Objekts: am PC neben dem Objekt, auf dem Handy von unten. */
export function Inspector({ target, selectionKey, id, ...content }: InspectorProps) {
  const { layout } = useStage();
  if (layout === 'compact') {
    return (
      <BottomSheet id={id} selectionKey={selectionKey}>
        {(frame) => <PropertyCard frame={frame} {...content} />}
      </BottomSheet>
    );
  }
  return (
    <AnchoredCard id={id} target={target} selectionKey={selectionKey}>
      {(frame) => <PropertyCard frame={frame} {...content} />}
    </AnchoredCard>
  );
}
