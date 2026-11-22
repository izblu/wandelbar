/** Verbindet Klassennamen und lässt leere Werte weg. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
