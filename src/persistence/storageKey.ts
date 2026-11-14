/**
 * Schlüssel für localStorage und ähnliche Speicher, getrennt nach Basis-Pfad.
 *
 * Hauptversion (`/wandelbar/`) und Vorschau (`/wandelbar/preview/`) teilen sich eine Origin.
 * Wie beim Datenbanknamen (siehe `databaseName.ts`) trägt deshalb jeder Schlüssel den Basis-Pfad.
 */
export function storageKey(name: string, baseUrl: string = import.meta.env.BASE_URL): string {
  return `wandelbar:${baseUrl}:${name}`;
}
