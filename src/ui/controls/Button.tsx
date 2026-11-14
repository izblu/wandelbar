import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.ts';
import { Icon } from '../icons/Icon.tsx';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: eine Hauptaktion je Bereich; secondary: Standard; ghost: ruhig; danger: Löschen */
  variant?: ButtonVariant;
  size?: 's' | 'm';
  /** stacked: Icon über dem Text, für Schnellaktionen in Karten */
  layout?: 'inline' | 'stacked';
  icon?: LucideIcon;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'm',
  layout = 'inline',
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('wb-button', className)}
      data-variant={variant}
      data-size={size}
      data-layout={layout}
      {...rest}
    >
      {icon && <Icon icon={icon} size={layout === 'stacked' ? 'l' : 'm'} />}
      <span className="wb-button-label">{children}</span>
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Name des Knopfs; für das Auge versteckt, für Bildschirmleser immer da */
  label: string;
  /** ghost: auf Flächen; floating: eigene deckende Fläche über der Szene */
  variant?: 'ghost' | 'floating';
  size?: 's' | 'm';
  /** Für Umschalter: gedrückt oder nicht */
  pressed?: boolean;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'm',
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx('wb-icon-button', className)}
      data-variant={variant}
      data-size={size}
      aria-pressed={pressed}
      {...rest}
    >
      <Icon icon={icon} />
      <span className="wb-visually-hidden">{label}</span>
    </button>
  );
}

/** Taste in Hinweisen, z. B. Strg K. Für Bildschirmleser meist versteckt (aria-keyshortcuts). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx('wb-kbd', className)}>{children}</kbd>;
}
