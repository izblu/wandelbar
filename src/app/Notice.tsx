import { useEffect, useState } from 'react';
import { Icon, IconButton, icons } from '../ui/index.ts';

/** So lange bleibt ein Hinweis stehen */
const NOTICE_MS = 6000;

interface NoticeProps {
  notice: { text: string; key: number } | null;
}

/**
 * Kurzer Hinweis unten mittig, z. B. „Wände zeichnen kommt mit dem 2D-Editor“. Die Region ist
 * immer da, damit Bildschirmleser neue Hinweise ansagen.
 */
export function Notice({ notice }: NoticeProps) {
  const [shown, setShown] = useState(notice);
  const [shownKey, setShownKey] = useState(notice?.key);
  if (notice?.key !== shownKey) {
    setShownKey(notice?.key);
    setShown(notice);
  }

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => {
      setShown(null);
    }, NOTICE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [shown]);

  return (
    <div className="app-notice-region" role="status">
      {shown && (
        <p className="app-notice" key={shown.key}>
          <Icon icon={icons.info} size="m" className="app-notice-icon" />
          <span>{shown.text}</span>
          <IconButton
            icon={icons.close}
            label="Hinweis schließen"
            size="s"
            onClick={() => {
              setShown(null);
            }}
          />
        </p>
      )}
    </div>
  );
}
