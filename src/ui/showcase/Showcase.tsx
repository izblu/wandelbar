import { useState, type CSSProperties } from 'react';
import { sunPosition } from '../../model/sun.ts';
import { ThemeToggle } from '../controls/ThemeToggle.tsx';
import { formatClock } from '../format.ts';
import { Brand } from '../icons/BrandMark.tsx';
import {
  ColorsSection,
  ComponentsSection,
  IconsSection,
  MotionSection,
  Section,
  SpaceSection,
  TypeSection,
} from './Sections.tsx';
import { Workbench } from './Workbench.tsx';
import './showcase.css';

/**
 * Übersichtsseite des Design-Systems (`bausteine.html`). Ruhig gesetzt, mit einer Signatur:
 * Das Licht im Kopf der Seite wandert mit dem Tageszeit-Regler der Bühnen mit.
 */
export function Showcase() {
  const [sunTime, setSunTime] = useState(7.5);
  const { azimuth, elevation } = sunPosition(sunTime);
  // Osten links, Westen rechts, wie man auf einen Südhimmel schaut
  const sunX = Math.max(0, Math.min(100, ((azimuth - 60) / 240) * 100));
  const glow = Math.max(0, Math.min(1, elevation / 30));

  return (
    <div
      className="wb-showcase"
      style={{ '--sun-x': `${sunX.toFixed(1)}%`, '--sun-glow': glow.toFixed(2) } as CSSProperties}
    >
      <a className="wb-skip-link" href="#am-werk">
        Zur Vorführung springen
      </a>
      <header className="wb-showcase-bar">
        <Brand />
        <span className="wb-showcase-bar-title">Design-System</span>
        <ThemeToggle variant="ghost" />
      </header>

      <main>
        <section className="wb-showcase-hero" aria-labelledby="hero-title">
          <p className="wb-showcase-kicker">Sonnenstand · Stand November 2026</p>
          <h1 id="hero-title">Bausteine</h1>
          <p className="wb-showcase-lead">
            Alles, woraus Wandelbar gebaut wird: zuerst im Einsatz am PC und auf dem Handy, darunter
            Farben, Schrift, Maße, Bewegung und jeder Baustein mit seinen Zuständen. Es ist gerade{' '}
            <strong>{formatClock(sunTime)} Uhr</strong> im Wohnzimmer.
          </p>
        </section>

        <Section
          id="am-werk"
          title="Am Werk"
          intro={
            <>
              Beide Ansichten teilen sich einen Zustand. Zieh den Tageszeit-Regler, tipp ein
              Möbelstück an oder öffne die Suche mit <kbd className="wb-kbd">Strg</kbd>{' '}
              <kbd className="wb-kbd">K</kbd>.
            </>
          }
        >
          <Workbench sunTime={sunTime} onSunTimeChange={setSunTime} />
          <p className="wb-showcase-hint">
            Auf schmalen Bildschirmen steht hier nur die Handy-Ansicht.
          </p>
        </Section>

        <ColorsSection />
        <TypeSection />
        <SpaceSection />
        <MotionSection />
        <IconsSection />
        <ComponentsSection />
      </main>

      <footer className="wb-showcase-footer">
        <p>
          Wandelbar läuft vollständig auf diesem Gerät. Schrift: Albert Sans (OFL), Icons: Lucide
          (ISC).
        </p>
      </footer>
    </div>
  );
}
