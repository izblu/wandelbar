import { useTheme } from '../hooks/useTheme.ts';
import { icons } from '../icons/icons.ts';
import { IconButton } from './Button.tsx';

/**
 * Umschalter für das dunkle Design. Ohne Wahl folgt die App dem System; ein Druck legt hell
 * oder dunkel fest. Hell zeigt den Mond (wohin es geht), dunkel die Sonne.
 */
export function ThemeToggle({ variant = 'floating' }: { variant?: 'ghost' | 'floating' }) {
  const { resolved, setPreference } = useTheme();
  const dark = resolved === 'dark';
  return (
    <IconButton
      icon={dark ? icons.sun : icons.moon}
      label="Dunkles Design"
      variant={variant}
      pressed={dark}
      onClick={() => {
        setPreference(dark ? 'light' : 'dark');
      }}
    />
  );
}
