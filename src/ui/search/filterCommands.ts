/**
 * Suche in der Befehlssuche: tolerant gegenüber Umlauten, ß und Groß- und Kleinschreibung.
 * „kuche“, „kueche“ und „Küche“ finden dasselbe, „strasse“ findet „Straße“.
 */

export interface SearchableCommand {
  id: string;
  label: string;
  /** Gruppe, z. B. „Möbel“, „Räume“, „Befehle“ */
  group: string;
  /** Weitere Suchwörter, z. B. Synonyme */
  keywords?: readonly string[];
}

/** Macht Text vergleichbar: klein, ohne Akzente, Umlaute und ß wie getippt ohne Sonderzeichen. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Je kleiner, desto besser: 0 = Name beginnt mit der Suche, 1 = ein Wort beginnt so, 2 = irgendwo */
function rank(haystack: string, label: string, words: string[]): number | null {
  if (!words.every((word) => haystack.includes(word))) return null;
  const query = words.join(' ');
  if (label.startsWith(query)) return 0;
  if (words.every((word) => label.split(/[\s,-]+/).some((part) => part.startsWith(word)))) return 1;
  return 2;
}

/**
 * Filtert Befehle nach der Eingabe. Alle Suchwörter müssen vorkommen (in Name, Gruppe oder
 * Suchwörtern). Treffer am Wortanfang zuerst; sonst bleibt die ursprüngliche Reihenfolge.
 */
export function filterCommands<T extends SearchableCommand>(
  commands: readonly T[],
  query: string,
): T[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return [...commands];
  const ranked: { command: T; score: number; index: number }[] = [];
  commands.forEach((command, index) => {
    const label = normalizeSearch(command.label);
    const haystack = normalizeSearch(
      [command.label, command.group, ...(command.keywords ?? [])].join(' '),
    );
    const score = rank(haystack, label, words);
    if (score !== null) ranked.push({ command, score, index });
  });
  ranked.sort((a, b) => a.score - b.score || a.index - b.index);
  return ranked.map((entry) => entry.command);
}

/** Fasst Treffer zu Gruppen zusammen, in der Reihenfolge ihres ersten Auftretens. */
export function groupCommands<T extends SearchableCommand>(
  commands: readonly T[],
): { group: string; commands: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const command of commands) {
    const list = groups.get(command.group);
    if (list) list.push(command);
    else groups.set(command.group, [command]);
  }
  return [...groups].map(([group, list]) => ({ group, commands: list }));
}
