import { describe, expect, it } from 'vitest';
import { filterCommands, groupCommands, normalizeSearch } from './filterCommands.ts';

const commands = [
  { id: 'sofa', label: 'Sofa, 3-Sitzer', group: 'Möbel', keywords: ['Couch'] },
  { id: 'kitchen', label: 'Küche', group: 'Räume' },
  { id: 'street', label: 'Lindenstraße 12', group: 'Projekte' },
  { id: 'shelf', label: 'Bücherregal', group: 'Möbel' },
  { id: 'night', label: 'Abendlicht zeigen', group: 'Befehle', keywords: ['Lampen'] },
  { id: 'lamp', label: 'Lampe hinzufügen', group: 'Befehle' },
];

const ids = (query: string) => filterCommands(commands, query).map((command) => command.id);

describe('normalizeSearch', () => {
  it('gleicht Umlaute, ß und Großschreibung an', () => {
    expect(normalizeSearch('Küche')).toBe(normalizeSearch('kueche'));
    expect(normalizeSearch('Küche')).toBe(normalizeSearch('KUCHE'));
    expect(normalizeSearch('Straße')).toBe(normalizeSearch('strasse'));
  });
});

describe('filterCommands', () => {
  it('zeigt ohne Eingabe alles in der ursprünglichen Reihenfolge', () => {
    expect(ids('')).toEqual(commands.map((command) => command.id));
  });

  it('findet Umlaute auch ohne Sonderzeichen', () => {
    expect(ids('kuche')).toEqual(['kitchen']);
    expect(ids('kueche')).toEqual(['kitchen']);
    expect(ids('strasse')).toEqual(['street']);
    expect(ids('bucher')).toEqual(['shelf']);
  });

  it('sucht auch in Suchwörtern und Gruppen', () => {
    expect(ids('couch')).toEqual(['sofa']);
    expect(ids('möbel')).toEqual(['sofa', 'shelf']);
  });

  it('verlangt alle Wörter', () => {
    expect(ids('sofa sitzer')).toEqual(['sofa']);
    expect(ids('sofa küche')).toEqual([]);
  });

  it('stellt Treffer am Wortanfang nach vorn', () => {
    expect(ids('lamp')).toEqual(['lamp', 'night']);
  });
});

describe('groupCommands', () => {
  it('fasst nach Gruppen zusammen, in der Reihenfolge des ersten Auftretens', () => {
    const groups = groupCommands(filterCommands(commands, ''));
    expect(groups.map((group) => group.group)).toEqual(['Möbel', 'Räume', 'Projekte', 'Befehle']);
    expect(groups[0]?.commands.map((command) => command.id)).toEqual(['sofa', 'shelf']);
  });
});
