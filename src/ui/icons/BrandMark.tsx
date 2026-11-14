import './icon.css';

interface BrandProps {
  /** Den Namen neben dem Zeichen zeigen (auf dem Handy nur für Bildschirmleser). */
  withName?: boolean;
}

/** Zeichen von Wandelbar: Haus mit Morgensonne. */
export function Brand({ withName = true }: BrandProps) {
  return (
    <span className="wb-brand">
      <svg className="wb-brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect className="wb-brand-tile" x="1" y="1" width="30" height="30" rx="10" />
        <path className="wb-brand-house" d="M10 23v-7.5L16 10l6 5.5V23" />
        <circle className="wb-brand-sun" cx="23.5" cy="8.5" r="3" />
      </svg>
      {withName ? (
        <span className="wb-brand-name">Wandelbar</span>
      ) : (
        <span className="wb-visually-hidden">Wandelbar</span>
      )}
    </span>
  );
}
