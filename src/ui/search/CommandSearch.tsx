import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton, Kbd } from '../controls/Button.tsx';
import { useHotkeys } from '../hooks/useHotkeys.ts';
import { ariaKeyShortcut, displayHotkey } from '../hotkeys.ts';
import { Icon } from '../icons/Icon.tsx';
import { icons } from '../icons/icons.ts';
import { readDuration, readEasing } from '../motion.ts';
import { filterCommands, groupCommands, type SearchableCommand } from './filterCommands.ts';
import './command-search.css';

export interface Command extends SearchableCommand {
  icon: LucideIcon;
  /** Leise Angabe rechts, z. B. der Raum eines Möbels */
  meta?: string;
  /** Tastenkürzel, rechts als Taste gezeigt */
  hotkey?: string;
  run: () => void;
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly Command[];
  /** Kürzel zum Öffnen; je Seite nur eine Befehlssuche damit anmelden */
  hotkey?: string;
}

const PLACEHOLDER = 'Möbel, Raum oder Befehl suchen';

/**
 * Befehlssuche als natives modales `<dialog>`: Fokus bleibt darin, Esc und Klick daneben schließen,
 * danach kehrt der Fokus an seinen Platz zurück. Innen eine Combobox mit Liste nach dem Muster
 * der ARIA Authoring Practices: Der Fokus bleibt im Suchfeld, die Pfeiltasten bewegen die Auswahl.
 */
export function CommandSearch({
  open,
  onOpenChange,
  commands,
  hotkey = 'mod+k',
}: CommandSearchProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  /** Gewählter Befehl; er läuft erst nach dem Schließen, wenn der Fokus zurückgegeben ist. */
  const pending = useRef<Command | null>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo(() => groupCommands(filterCommands(commands, query)), [commands, query]);
  // Pfeiltasten folgen der sichtbaren Reihenfolge, also Gruppe für Gruppe
  const results = useMemo(() => groups.flatMap((group) => group.commands), [groups]);
  const active = results.find((command) => command.id === activeId) ?? results[0];
  const optionId = (command: Command) => `${listId}-${command.id}`;

  useHotkeys(
    {
      [hotkey]: () => {
        onOpenChange(!open);
      },
    },
    { allowInFields: true },
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      const duration = readDuration(dialog, '--duration-slow');
      if (duration > 0) {
        dialog.animate(
          [
            { opacity: 0, transform: 'translateY(6px) scale(0.985)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration, easing: readEasing(dialog, '--ease-standard') },
        );
      }
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !active) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // optionId hängt nur an listId, das sich nie ändert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const onClose = () => {
    setQuery('');
    setActiveId(null);
    onOpenChange(false);
    returnFocus.current?.focus();
    returnFocus.current = null;
    // Erst jetzt ausführen: Setzt der Befehl den Fokus selbst, bleibt er dort.
    const command = pending.current;
    pending.current = null;
    command?.run();
  };

  const run = (command: Command) => {
    pending.current = command;
    dialogRef.current?.close();
  };

  const move = (step: number) => {
    if (results.length === 0) return;
    const index = active ? results.indexOf(active) : -1;
    const next = results[(index + step + results.length) % results.length];
    if (next) setActiveId(next.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter' && active) {
      event.preventDefault();
      run(active);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="wb-cmdk"
      aria-label="Befehlssuche"
      onClose={onClose}
      onClick={(event) => {
        // Klick auf den Hintergrund: Der Dialog selbst ist nur dort Ziel, innen liegt der Inhalt.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="wb-cmdk-inner">
        <div className="wb-cmdk-field">
          <Icon icon={icons.search} className="wb-cmdk-field-icon" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active) : undefined}
            aria-label={PLACEHOLDER}
            placeholder={PLACEHOLDER}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActiveId(null);
            }}
            onKeyDown={onKeyDown}
          />
          <IconButton
            icon={icons.close}
            label="Schließen"
            size="s"
            onClick={() => dialogRef.current?.close()}
          />
        </div>

        <div className="wb-cmdk-list" id={listId} role="listbox" aria-label="Ergebnisse">
          {groups.map(({ group, commands: items }, groupIndex) => (
            <div key={group} role="group" aria-labelledby={`${listId}-group-${String(groupIndex)}`}>
              <div
                className="wb-cmdk-group"
                id={`${listId}-group-${String(groupIndex)}`}
                role="presentation"
              >
                {group}
              </div>
              {items.map((command) => (
                <div
                  key={command.id}
                  id={optionId(command)}
                  className="wb-cmdk-option"
                  role="option"
                  aria-selected={command === active}
                  aria-keyshortcuts={command.hotkey ? ariaKeyShortcut(command.hotkey) : undefined}
                  onPointerMove={() => {
                    if (command !== active) setActiveId(command.id);
                  }}
                  onClick={() => {
                    run(command);
                  }}
                >
                  <Icon icon={command.icon} />
                  <span className="wb-cmdk-label">{command.label}</span>
                  {command.meta && <span className="wb-cmdk-meta">{command.meta}</span>}
                  {command.hotkey && (
                    <Kbd className="wb-cmdk-key">{displayHotkey(command.hotkey)}</Kbd>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <p className="wb-cmdk-empty">
            Nichts gefunden für „{query.trim()}“. Versuch es mit einem Raum oder einem Möbelstück.
          </p>
        )}
        <p className="wb-visually-hidden" role="status">
          {query.trim()
            ? `${String(results.length)} ${results.length === 1 ? 'Ergebnis' : 'Ergebnisse'}`
            : ''}
        </p>

        <p className="wb-cmdk-hint">
          <span>
            <Kbd>
              <Icon icon={icons.keyUp} size="s" />
              <span className="wb-visually-hidden">Pfeil hoch</span>
            </Kbd>
            <Kbd>
              <Icon icon={icons.keyDown} size="s" />
              <span className="wb-visually-hidden">Pfeil runter</span>
            </Kbd>
            auswählen
          </span>
          <span>
            <Kbd>Enter</Kbd> ausführen
          </span>
          <span>
            <Kbd>Esc</Kbd> schließen
          </span>
        </p>
      </div>
    </dialog>
  );
}

interface SearchButtonProps {
  onClick: () => void;
  hotkey?: string;
}

/** Knopf zur Befehlssuche in der Kopfzeile. Auf dem Handy nur das Icon, der Name bleibt hörbar. */
export function SearchButton({ onClick, hotkey = 'mod+k' }: SearchButtonProps) {
  return (
    <button
      type="button"
      className="wb-search-button"
      aria-haspopup="dialog"
      aria-keyshortcuts={ariaKeyShortcut(hotkey)}
      onClick={onClick}
    >
      <Icon icon={icons.search} size="m" />
      <span className="wb-search-button-label">Suchen oder Befehl</span>
      <span className="wb-search-button-keys" aria-hidden="true">
        {displayHotkey(hotkey)
          .split(' ')
          .map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
      </span>
    </button>
  );
}
