import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { ariaKeyShortcut, displayHotkey } from '../hotkeys.ts';
import { Icon } from '../icons/Icon.tsx';
import { useRovingFocus } from '../hooks/useRovingFocus.ts';
import { useStage } from '../stage/stageContext.ts';
import './tool-palette.css';

export interface Tool {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Tastenkürzel, z. B. „v“ oder „mod+z“ */
  hotkey?: string;
}

export interface ToolAction extends Tool {
  onPress: () => void;
  disabled?: boolean;
}

interface ToolPaletteProps {
  /** z. B. „Werkzeuge: Einrichten“ */
  label: string;
  tools: readonly Tool[];
  activeTool: string;
  onToolChange: (id: string) => void;
  /** Befehle hinter dem Trennstrich, z. B. Rückgängig */
  actions?: readonly ToolAction[];
}

/**
 * Schwebende Werkzeugpalette. Am PC senkrecht links, auf dem Handy waagerecht im Daumenbereich.
 * Ein Tab-Halt, innen Pfeiltasten. Der Name jedes Werkzeugs erscheint beim Zeigen als Hinweis.
 */
export function ToolPalette({
  label,
  tools,
  activeTool,
  onToolChange,
  actions = [],
}: ToolPaletteProps) {
  const { layout } = useStage();
  const orientation = layout === 'compact' ? 'horizontal' : 'vertical';
  const ids = useMemo(() => [...tools, ...actions].map((tool) => tool.id), [tools, actions]);
  const { containerProps, itemProps } = useRovingFocus(ids, orientation, activeTool);

  const renderButton = (
    tool: Tool,
    extra: { pressed?: boolean; onClick: () => void; disabled?: boolean },
  ) => (
    <button
      key={tool.id}
      type="button"
      className="wb-tool"
      aria-pressed={extra.pressed}
      aria-keyshortcuts={tool.hotkey ? ariaKeyShortcut(tool.hotkey) : undefined}
      aria-disabled={extra.disabled ? true : undefined}
      onClick={extra.disabled ? undefined : extra.onClick}
      {...itemProps(tool.id)}
    >
      <Icon icon={tool.icon} size="l" />
      <span className="wb-tool-tip">
        <span className="wb-tool-label">{tool.label}</span>
        {tool.hotkey && (
          <kbd className="wb-tool-key" aria-hidden="true">
            {displayHotkey(tool.hotkey)}
          </kbd>
        )}
      </span>
    </button>
  );

  return (
    <div
      className="wb-tool-palette"
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      data-orientation={orientation}
      {...containerProps}
    >
      {tools.map((tool) =>
        renderButton(tool, {
          pressed: tool.id === activeTool,
          onClick: () => {
            onToolChange(tool.id);
          },
        }),
      )}
      {actions.length > 0 && <span className="wb-tool-separator" aria-hidden="true" />}
      {actions.map((action) =>
        renderButton(action, { onClick: action.onPress, disabled: action.disabled }),
      )}
    </div>
  );
}
