import { Fragment, useId, useMemo, type KeyboardEvent, type Ref } from 'react';
import type { Point2, Projection } from '../viewport.ts';
import type { Apartment } from './apartment.ts';
import { buildDollhouse, type Face } from './dollhouse.ts';
import type { LightFace } from './dollhouseLight.ts';
import { eveningAmount } from './geometry.ts';

interface DollhouseProps {
  apartment: Apartment;
  projection: Projection;
  width: number;
  height: number;
  label: string;
  /** null = gleichmäßiges Planungslicht */
  sunTime: number | null;
  selectedId?: string | null;
  hitFurniture?: boolean;
  hitRooms?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  describedBy?: string;
  onKeyDown?: (event: KeyboardEvent<SVGSVGElement>) => void;
}

const pts = (points: readonly Point2[]) =>
  points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Platzhalter-Puppenhaus des Prototyps: drehbar, mit Tageslicht und Sonne durch die Fenster und
 * Lampen am Abend. Das echte 3D (M3) ersetzt diese Zeichnung; Bedienung und Licht bleiben.
 */
export function Dollhouse({
  apartment,
  projection,
  width,
  height,
  label,
  sunTime,
  selectedId = null,
  hitFurniture = false,
  hitRooms = false,
  svgRef,
  describedBy,
  onKeyDown,
}: DollhouseProps) {
  const id = useId();
  const evening = sunTime === null ? 0 : eveningAmount(sunTime);
  const model = useMemo(
    () => buildDollhouse(apartment, projection, { sunTime, evening, hitFurniture }),
    [apartment, projection, sunTime, evening, hitFurniture],
  );
  const lit = model.light.daylight.length > 0 || model.light.glow.length > 0;
  /** Weiche Kante der Sonne auf dem Boden: etwa 5 cm */
  const blur = Math.max(0.5, 0.05 * projection.scale);

  const drawFace = (face: Face) => (
    <polygon
      key={face.key}
      className={face.className}
      data-selected={(face.itemId !== undefined && face.itemId === selectedId) || undefined}
      data-hit={face.hit}
      points={pts(face.points)}
      // Lange Wände bestehen aus Stücken: Seiten und Kappe in eigener Farbe umrandet, ohne Nähte
      style={{
        fill: face.fill,
        stroke: face.className.startsWith('app-dh-wall') ? face.fill : undefined,
      }}
    />
  );

  /** Sonne auf einer Fläche, danach ihre Schatten (Schwarz nimmt nur die Sonne weg) */
  const drawSun = (face: LightFace) => {
    const sun = face.sun?.opacity.toFixed(3);
    return (
      <Fragment key={face.key}>
        {face.sun?.patches.map((patch, index) => (
          <polygon
            key={`sun-${String(index)}`}
            className="app-light-sun"
            points={pts(patch)}
            fillOpacity={sun}
            strokeOpacity={sun}
          />
        ))}
        {face.shadows.map((shadow, index) => (
          <polygon
            key={`shadow-${String(index)}`}
            className="app-light-shadow"
            points={pts(shadow)}
          />
        ))}
      </Fragment>
    );
  };

  /** Eine Fläche einer Lichtebene in Malreihenfolge: abdecken, Sonne, Lichtflecken */
  const drawLight = (face: LightFace) => {
    const points = pts(face.points);
    return (
      <Fragment key={face.key}>
        {face.block !== 'none' && (
          <polygon
            className="app-light-block"
            data-glass={face.block === 'glass' || undefined}
            points={points}
          />
        )}
        {face.glow > 0 && (
          <polygon className="app-light-lamp" points={points} fillOpacity={face.glow.toFixed(3)} />
        )}
        {!face.floor && drawSun(face)}
        {face.spots.map((spot) => (
          <polygon
            key={spot}
            className="app-light-spot"
            points={points}
            fill={`url(#${id}-spot-${spot})`}
            stroke={`url(#${id}-spot-${spot})`}
          />
        ))}
        {/* Der Auswahlrand bleibt frei von Licht, damit er auch in der Sonne zu sehen ist */}
        {face.itemId !== undefined && face.itemId === selectedId && (
          <polygon className="app-light-keep" points={points} />
        )}
      </Fragment>
    );
  };

  return (
    <svg
      ref={svgRef}
      className="app-scene app-dollhouse"
      viewBox={`0 0 ${String(Math.max(1, width))} ${String(Math.max(1, height))}`}
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {lit && (
        <defs>
          <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={blur.toFixed(1)} />
          </filter>
          {/* Lichtflecken: Kreise in der Ebene der Fläche, auf dem Schirm Ellipsen */}
          {model.light.spots.map((spot) => (
            <radialGradient
              key={spot.id}
              id={`${id}-spot-${spot.id}`}
              data-kind={spot.kind}
              gradientUnits="userSpaceOnUse"
              cx={0}
              cy={0}
              r={1}
              gradientTransform={`matrix(${spot.matrix.map((value) => value.toFixed(2)).join(' ')})`}
            >
              {spot.stops.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset.toFixed(3)}
                  className="app-light-stop"
                  stopOpacity={stop.opacity.toFixed(3)}
                />
              ))}
            </radialGradient>
          ))}
        </defs>
      )}

      {/* Abends wird nur das Modell dunkler, nicht die Bühne: Texte darauf bleiben lesbar */}
      <g
        className="app-dh-model"
        style={
          evening > 0
            ? {
                filter: `brightness(${(1 - evening * 0.55).toFixed(3)}) saturate(${(1 - evening * 0.25).toFixed(3)})`,
              }
            : undefined
        }
      >
        {model.floors.map((floor) => (
          <polygon
            key={floor.roomId}
            className="app-dh-floor"
            points={pts(floor.points)}
            style={{ fill: floor.fill }}
            data-hit={hitRooms ? `room:${floor.roomId}` : undefined}
          />
        ))}

        {/* Teppiche liegen auf dem Boden, Wände und Möbel verdecken sie */}
        {model.flats.map(drawFace)}
        {model.faces.map(drawFace)}
      </g>

      {/* Tageslicht hebt die am Tag abgedunkelten Innenräume zum Fenster hin wieder an */}
      {model.light.daylight.length > 0 && (
        <g className="app-daylight">{model.light.daylight.map(drawLight)}</g>
      )}
      {/* Sonne und Lampen hellen auf, was sie treffen */}
      {model.light.glow.length > 0 && (
        <g className="app-glow">
          {/* Sonne auf den Böden mit weichen Kanten; Böden überlappen sich nicht, also vorab */}
          <g filter={`url(#${id}-blur)`}>
            {model.light.glow.filter((face) => face.floor).map(drawSun)}
          </g>
          {model.light.glow.map(drawLight)}
        </g>
      )}
    </svg>
  );
}
