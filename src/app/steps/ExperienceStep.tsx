import { useState } from 'react';
import {
  formatClock,
  icons,
  SegmentedControl,
  StageTools,
  StageView,
  SunTimeSlider,
  ToolPalette,
  ViewBar,
  ZoomControls,
  type SegmentOption,
  type Tool,
} from '../../ui/index.ts';
import { useHotkeys } from '../../ui/hooks/useHotkeys.ts';
import { useStage } from '../../ui/stage/stageContext.ts';
import { dayPhase } from '../../model/sun.ts';
import { useApp } from '../AppContext.ts';
import { useDollhouseCamera } from '../camera.ts';
import { DollhouseView } from '../SceneViews.tsx';
import { useSpaceGrab } from '../useSpaceGrab.ts';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../viewport.ts';

const TOOLS: readonly Tool[] = [
  { id: 'look', label: 'Umsehen', icon: icons.dollhouse, hotkey: 'u' },
  { id: 'pan', label: 'Verschieben', icon: icons.pan, hotkey: 'h' },
  { id: 'walk', label: 'Rundgang', icon: icons.walk, hotkey: 'g' },
  { id: 'photo', label: 'Foto', icon: icons.photo, hotkey: 'p' },
];

const LIGHTS: readonly SegmentOption[] = [
  { id: 'plan', label: 'Planung', icon: icons.planLight },
  { id: 'day', label: 'Tag', icon: icons.sun },
  { id: 'evening', label: 'Abend', icon: icons.moon },
];

/** Schritt 4: Erleben. Das Puppenhaus drehen und das Licht über den Tag sehen. */
export function ExperienceStep() {
  const { apartment, light, setLight, sunTime, setSunTime, notify } = useApp();
  const { layout } = useStage();
  const camera = useDollhouseCamera();
  const [tool, setTool] = useState<'look' | 'pan'>('look');
  const spaceHeld = useSpaceGrab();

  const chooseTool = (id: string) => {
    if (id === 'look' || id === 'pan') {
      setTool(id);
    } else if (id === 'walk') {
      notify(
        'Der Rundgang kommt mit dem echten 3D: am PC mit Maus und Pfeiltasten, auf dem Handy mit einem Joystick.',
      );
    } else if (id === 'photo') {
      notify('Fotos der Wohnung kommen in einer späteren Version.');
    }
  };

  useHotkeys({
    u: () => {
      chooseTool('look');
    },
    h: () => {
      chooseTool('pan');
    },
    g: () => {
      chooseTool('walk');
    },
    p: () => {
      chooseTool('photo');
    },
  });

  if (!apartment) return null;
  const mode = light === 'plan' ? 'plan' : dayPhase(sunTime) === 'day' ? 'day' : 'evening';

  return (
    <>
      <DollhouseView
        camera={camera}
        label={`${apartment.name} als Puppenhaus${light === 'sun' ? ` um ${formatClock(sunTime)} Uhr` : ''}`}
        hint={
          tool === 'pan'
            ? 'Zieh oder nutze die Pfeiltasten, um die Ansicht zu verschieben. Plus und Minus zoomen, 0 zeigt alles.'
            : 'Zieh, um das Puppenhaus zu drehen. Verschieben: Werkzeug Verschieben, Leertaste halten, rechte Maustaste oder zwei Finger. Pfeiltasten drehen und neigen, mit Umschalt verschieben sie. Plus und Minus zoomen, 0 zeigt alles.'
        }
        sunTime={light === 'sun' ? sunTime : null}
        grab={tool === 'pan' || spaceHeld}
      />

      <StageTools id="app-tools">
        <ToolPalette
          label="Werkzeuge: Erleben"
          tools={TOOLS}
          activeTool={tool}
          onToolChange={chooseTool}
        />
      </StageTools>

      <StageView>
        <ViewBar>
          <SegmentedControl
            label="Licht"
            options={LIGHTS}
            value={mode}
            onChange={(next) => {
              if (next === 'plan') setLight('plan');
              else if (next === 'day') setSunTime(dayPhase(sunTime) === 'day' ? sunTime : 14);
              else setSunTime(dayPhase(sunTime) === 'night' ? sunTime : 21.5);
            }}
          />
          {light === 'sun' && <SunTimeSlider value={sunTime} onChange={setSunTime} />}
          {layout === 'wide' && (
            <ZoomControls
              zoom={camera.viewport.zoom}
              onZoomIn={() => {
                camera.zoomAt(ZOOM_STEP);
              }}
              onZoomOut={() => {
                camera.zoomAt(1 / ZOOM_STEP);
              }}
              onFit={camera.fit}
              canZoomIn={camera.viewport.zoom < ZOOM_MAX}
              canZoomOut={camera.viewport.zoom > ZOOM_MIN}
            />
          )}
        </ViewBar>
      </StageView>
    </>
  );
}
