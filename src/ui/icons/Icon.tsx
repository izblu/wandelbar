import type { LucideIcon } from 'lucide-react';
import { cx } from '../cx.ts';
import './icon.css';

export type IconSize = 's' | 'm' | 'l';

interface IconProps {
  icon: LucideIcon;
  /** s = 16 px, m = 18 px, l = 22 px; ohne Angabe 20 px */
  size?: IconSize;
  className?: string;
}

/** Dekoratives Icon. Den Namen trägt immer der umgebende Knopf oder ein Text daneben. */
export function Icon({ icon: Glyph, size, className }: IconProps) {
  return <Glyph className={cx('wb-icon', className)} data-size={size} aria-hidden="true" />;
}
