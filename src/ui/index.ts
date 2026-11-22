/**
 * Design-System von Wandelbar (A4 „Sonnenstand“): ein Einstieg für Seiten und Abläufe.
 *
 * Der Import lädt Tokens, Schrift und Grundlage. Hooks bleiben in eigenen Dateien
 * (`./hooks/…`), damit Fast Refresh die Bausteine sauber neu laden kann.
 */
import './styles/index.css';

// Bühne
export { Stage, StageStatus, StageTools, StageTop, StageView } from './stage/Stage.tsx';
export { useStage, type StageInfo, type StageLayout } from './stage/stageContext.ts';

// Icons und Marke
export { Icon, type IconSize } from './icons/Icon.tsx';
export { icons, FloorPlan, type IconName } from './icons/icons.ts';
export { Brand } from './icons/BrandMark.tsx';

// Bedienung
export { Button, IconButton, Kbd, type ButtonVariant } from './controls/Button.tsx';
export { ThemeToggle } from './controls/ThemeToggle.tsx';
export { StepBar, type Step, type StepStatus } from './navigation/StepBar.tsx';
export { ToolPalette, type Tool, type ToolAction } from './navigation/ToolPalette.tsx';
export {
  SegmentedControl,
  SunTimeSlider,
  ViewBar,
  ZoomControls,
  type SegmentOption,
} from './navigation/ViewBar.tsx';
export { CommandSearch, SearchButton, type Command } from './search/CommandSearch.tsx';
export { SaveStatus, type SaveState } from './status/SaveStatus.tsx';

// Eigenschaftenkarte
export { Inspector } from './card/Inspector.tsx';
export {
  CardFooter,
  FactList,
  PriceTag,
  PropertyCard,
  type PropertyCardContent,
  type QuickActions,
} from './card/PropertyCard.tsx';
export type { CardTarget } from './card/placeCard.ts';

// Felder
export { DimensionFields, NumberField, TextField, type Dimensions } from './forms/Fields.tsx';
export { Checkbox, Switch, SwatchPicker, type Swatch } from './forms/Choices.tsx';

// Formate
export { formatClock, formatNumber, formatPrice, INPUT_DECIMALS, parseDecimal } from './format.ts';
