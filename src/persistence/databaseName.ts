/**
 * Name der IndexedDB-Datenbank.
 *
 * Er enthält den Basis-Pfad der App, weil Hauptversion (`/wandelbar/`) und Vorschau
 * (`/wandelbar/preview/`) auf derselben Origin liegen und IndexedDB pro Origin geteilt wird.
 * So berührt die Vorschau nie die Daten der Hauptversion.
 */
export function databaseName(baseUrl: string = import.meta.env.BASE_URL): string {
  return `wandelbar:${baseUrl}`;
}
