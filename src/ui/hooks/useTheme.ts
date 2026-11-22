import { useSyncExternalStore } from 'react';
import {
  getThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../theme.ts';

export interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
}

const serverPreference = (): ThemePreference => 'system';
const serverResolved = (): ResolvedTheme => 'light';

export function useTheme(): ThemeState {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, serverPreference);
  const resolved = useSyncExternalStore(subscribeTheme, resolveTheme, serverResolved);
  return { preference, resolved, setPreference: setThemePreference };
}
