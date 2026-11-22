import { useId, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { formatNumber } from '../../ui/format.ts';
import type { ViewFrame } from '../viewport.ts';
import {
  FABRICS,
  FLOORS,
  PAINTS,
  swatchColor,
  type Apartment,
  type Furniture,
  type Point,
} from './apartment.ts';
import {
  doorSwingPath,
  eveningAmount,
  footprint,
  furnitureCenter,
  openingQuad,
  polygonArea,
  roomAt,
  sunPatches,
  wallPieces,
  wallQuad,
} from './geometry.ts';

/** Was gerade gewählt ist */
export interface Selection {
  kind: 'furniture' | 'wall' | 'opening' | 'room';
  id: string;
}

export type PlanLook =
  /** Bauen: helle Böden, Raumnamen mit Fläche, Maßketten */
  | 'plan'
  /** Einrichten: Böden, Wandfarben, Möbel, Licht */
  | 'furnished';

export interface PlanSceneProps {
  apartment: Apartment;
  frame: ViewFrame;
  width: number;
  height: number;
  look: PlanLook;
  label: string;
  /** Licht: null = gleichmäßiges Planungslicht */
  sunTime: number | null;
  selection?: Selection | null;
  /** Möbel, das gerade gezogen wird, mit Versatz in Metern */
  dragging?: { id: string; dx: number; dy: number } | null;
  /** Was angetippt werden kann */
  hitKinds?: readonly Selection['kind'][];
  /** Erkannte Teile, die noch nicht bestätigt sind (gestrichelt), unsichere hervorgehoben */
  suggestion?: boolean;
  /** Raumnamen zeigen (Einrichten mit dem Werkzeug Flächen) */
  showRoomNames?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  /** Zusätzliche Zeichnung in Weltkoordinaten (Meter), z. B. eine Messstrecke */
  overlay?: ReactNode;
  /** Zusätzliche Zeichnung in Bildschirmpixeln */
  screenOverlay?: ReactNode;
  /** Möbel zeigen; in Bauen nur feste Teile wie Bad und Küche */
  furnitureFilter?: (item: Furniture) => boolean;
  tabIndex?: number;
  describedBy?: string;
  onKeyDown?: (event: KeyboardEvent<SVGSVGElement>) => void;
}

const UNCERTAIN = 0.7;

const pts = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');

/**
 * Vorläufige Szene des Prototyps: die ganze Wohnung von oben. Das 3D (M3) ersetzt sie; die
 * Bedienung darüber bleibt gleich.
 */
export function PlanScene({
  apartment,
  frame,
  width,
  height,
  look,
  label,
  sunTime,
  selection = null,
  dragging = null,
  hitKinds = [],
  suggestion = false,
  showRoomNames = false,
  svgRef,
  overlay,
  screenOverlay,
  furnitureFilter,
  tabIndex,
  describedBy,
  onKeyDown,
}: PlanSceneProps) {
  const id = useId();
  const furnished = look === 'furnished';
  const evening = furnished && sunTime !== null ? eveningAmount(sunTime) : 0;
  const patches = sunTime !== null ? sunPatches(apartment, sunTime) : [];
  const { scale, ox, oy } = frame;
  const hit = (kind: Selection['kind'], key: string) =>
    hitKinds.includes(kind) ? `${kind}:${key}` : undefined;
  const items = apartment.furniture.filter((item) =>
    furnitureFilter ? furnitureFilter(item) : true,
  );
  const lamps = items.filter((item) => item.kind === 'lamp');
  const moved = (item: Furniture): Furniture =>
    dragging?.id === item.id ? { ...item, x: item.x + dragging.dx, y: item.y + dragging.dy } : item;
  const selectedItem =
    selection?.kind === 'furniture' ? items.find((item) => item.id === selection.id) : undefined;
  const drawItem = (original: Furniture) => {
    const item = moved(original);
    return (
      <g
        key={item.id}
        className="app-item"
        data-kind={item.kind}
        data-hit={hit('furniture', item.id)}
        data-dragging={dragging?.id === item.id || undefined}
        transform={`rotate(${String(item.rotation)} ${String(item.x + item.w / 2)} ${String(item.y + item.d / 2)})`}
      >
        {drawFurniture(item, evening)}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      className="app-scene"
      data-look={look}
      data-suggestion={suggestion || undefined}
      viewBox={`0 0 ${String(Math.max(1, width))} ${String(Math.max(1, height))}`}
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      <defs>
        {apartment.rooms.map((room) => (
          <clipPath key={room.id} id={`${id}-clip-${room.id}`}>
            <polygon points={pts(room.polygon)} />
          </clipPath>
        ))}
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.05" />
        </filter>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" className="app-glow-core" />
          <stop offset="0.45" className="app-glow-mid" />
          <stop offset="1" className="app-glow-edge" />
        </radialGradient>
        <pattern id={`${id}-boards`} width="8" height="0.18" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.18" x2="8" y2="0.18" className="app-board" />
        </pattern>
        <pattern id={`${id}-tiles`} width="0.3" height="0.3" patternUnits="userSpaceOnUse">
          <path d="M0.3,0 V0.3 H0" className="app-tile-line" />
        </pattern>
      </defs>

      <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${scale.toFixed(5)})`}>
        {/* Böden */}
        {apartment.rooms.map((room) => {
          const floor = swatchColor(FLOORS, room.floor);
          const selected = selection?.kind === 'room' && selection.id === room.id;
          return (
            <g key={room.id} data-hit={hit('room', room.id)} className="app-room">
              <polygon
                className="app-floor"
                points={pts(room.polygon)}
                style={furnished ? { fill: floor } : undefined}
              />
              {furnished && room.floor !== 'tile' && room.floor !== 'terracotta' && (
                <polygon points={pts(room.polygon)} fill={`url(#${id}-boards)`} />
              )}
              {furnished && room.floor === 'tile' && (
                <polygon
                  points={pts(room.polygon)}
                  className="app-tiles"
                  fill={`url(#${id}-tiles)`}
                />
              )}
              {/* Wandfarbe als Saum an der Innenseite der Wände */}
              {furnished && (
                <polygon
                  className="app-paint"
                  points={pts(room.polygon)}
                  clipPath={`url(#${id}-clip-${room.id})`}
                  style={{ stroke: swatchColor(PAINTS, room.paint) }}
                />
              )}
              {selected && <polygon className="app-room-selected" points={pts(room.polygon)} />}
            </g>
          );
        })}

        {/* Teppiche liegen auf dem Boden: Die Sonne fällt auf sie */}
        {items.filter((item) => item.kind === 'rug').map(drawItem)}

        {/* Sonne auf dem Boden, je Raum abgeschnitten */}
        <g filter={`url(#${id}-blur)`} className="app-sun-layer">
          {patches.map((patch, index) => (
            <polygon
              key={index}
              className="app-sun"
              points={pts(patch.polygon)}
              clipPath={`url(#${id}-clip-${patch.roomId})`}
            />
          ))}
        </g>

        {/* Übrige Möbel über der Sonne */}
        {items.filter((item) => item.kind !== 'rug').map(drawItem)}

        {/* Abend: Schleier über der Wohnung, Lampen leuchten durch */}
        {evening > 0 && (
          <>
            {apartment.rooms.map((room) => (
              <polygon
                key={room.id}
                className="app-veil"
                points={pts(room.polygon)}
                style={{ opacity: evening * 0.62 }}
              />
            ))}
            <g className="app-glow" style={{ opacity: evening }}>
              {lamps.map((original) => {
                const lamp = moved(original);
                const room = roomAt(apartment.rooms, furnitureCenter(lamp));
                return (
                  <circle
                    key={lamp.id}
                    cx={lamp.x + lamp.w / 2}
                    cy={lamp.y + lamp.d / 2}
                    r={1.6}
                    fill={`url(#${id}-glow)`}
                    clipPath={room ? `url(#${id}-clip-${room.id})` : undefined}
                  />
                );
              })}
            </g>
          </>
        )}

        {selectedItem && <FurnitureSelection item={moved(selectedItem)} />}

        {/* Wände mit Öffnungen */}
        {apartment.walls.map((wall) => {
          const selected = selection?.kind === 'wall' && selection.id === wall.id;
          return (
            <g key={wall.id} className="app-wall" data-hit={hit('wall', wall.id)}>
              {wallPieces(wall, apartment.openings).map((piece) => (
                <polygon
                  key={`${String(piece.t0)}-${String(piece.t1)}`}
                  className="app-wall-piece"
                  data-exterior={wall.exterior || undefined}
                  data-selected={selected || undefined}
                  points={pts(wallQuad(wall, piece.t0, piece.t1))}
                />
              ))}
            </g>
          );
        })}
        {apartment.openings.map((opening) => {
          const wall = apartment.walls.find((candidate) => candidate.id === opening.wallId);
          if (!wall) return null;
          const room = apartment.rooms.find((candidate) => candidate.id === opening.roomId);
          const selected = selection?.kind === 'opening' && selection.id === opening.id;
          const uncertain = suggestion && opening.confidence < UNCERTAIN;
          return (
            <g
              key={opening.id}
              className="app-opening"
              data-kind={opening.kind}
              data-selected={selected || undefined}
              data-uncertain={uncertain || undefined}
              data-hit={hit('opening', opening.id)}
            >
              <polygon className="app-opening-gap" points={pts(openingQuad(wall, opening))} />
              {opening.kind === 'window' ? (
                <polygon className="app-window" points={pts(windowPane(wall, opening))} />
              ) : (
                <path className="app-door" d={doorSwingPath(wall, opening, room)} />
              )}
            </g>
          );
        })}

        {overlay}
      </g>

      {/* Raumnamen mit Fläche, in Bildschirmpixeln für scharfe Schrift */}
      {(look === 'plan' || showRoomNames) && (
        <g className="app-room-labels" aria-hidden="true">
          {apartment.rooms.map((room) => {
            const x = ox + room.label[0] * scale;
            const y = oy + room.label[1] * scale;
            return (
              <text key={room.id} x={x} y={y} textAnchor="middle">
                <tspan className="app-room-name" x={x} dy="-0.15em">
                  {room.name}
                </tspan>
                {scale > 34 && (
                  <tspan className="app-room-area" x={x} dy="1.25em">
                    {formatNumber(polygonArea(room.polygon), 1)} m²
                  </tspan>
                )}
              </text>
            );
          })}
        </g>
      )}

      {screenOverlay}
    </svg>
  );
}

/** Glasscheibe: ein schmaler Streifen in der Mitte der Wand */
function windowPane(
  wall: Apartment['walls'][number],
  opening: Apartment['openings'][number],
): Point[] {
  const quad = openingQuad(wall, opening);
  const [a, b, c, d] = quad as [Point, Point, Point, Point];
  const mix = (p: Point, q: Point, t: number): Point => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
  ];
  return [mix(a, d, 0.38), mix(b, c, 0.38), mix(b, c, 0.62), mix(a, d, 0.62)];
}

function FurnitureSelection({ item }: { item: Furniture }) {
  const box = footprint(item);
  const pad = 0.06;
  return (
    <rect
      className="app-selection"
      x={box.x0 - pad}
      y={box.y0 - pad}
      width={box.x1 - box.x0 + 2 * pad}
      height={box.y1 - box.y0 + 2 * pad}
      rx={0.08}
    />
  );
}

/** Möbel von oben, ungedreht gezeichnet; die Drehung kommt von außen */
function drawFurniture(item: Furniture, evening: number): ReactNode {
  const { x, y, w, d } = item;
  const fabric: CSSProperties = { fill: swatchColor(FABRICS, item.swatch) };
  switch (item.kind) {
    case 'rug':
      return (
        <>
          <rect className="app-rug" x={x} y={y} width={w} height={d} rx={0.04} />
          <rect
            className="app-detail"
            x={x + 0.1}
            y={y + 0.1}
            width={w - 0.2}
            height={d - 0.2}
            rx={0.02}
          />
        </>
      );
    case 'sofa':
    case 'armchair': {
      const arm = item.kind === 'sofa' ? Math.min(0.2, w * 0.08) : w * 0.16;
      const seats = item.kind === 'sofa' ? Math.max(2, Math.round(w / 0.75)) : 1;
      const seatWidth = (w - 2 * arm) / seats;
      return (
        <>
          <rect className="app-fabric" style={fabric} x={x} y={y} width={w} height={d} rx={0.1} />
          <rect className="app-shade" x={x} y={y} width={w} height={d * 0.26} rx={0.1} />
          <rect className="app-shade" x={x} y={y} width={arm} height={d} rx={0.08} />
          <rect className="app-shade" x={x + w - arm} y={y} width={arm} height={d} rx={0.08} />
          {Array.from({ length: seats - 1 }, (_, index) => (
            <line
              key={index}
              className="app-detail"
              x1={x + arm + seatWidth * (index + 1)}
              y1={y + d * 0.3}
              x2={x + arm + seatWidth * (index + 1)}
              y2={y + d - 0.06}
            />
          ))}
        </>
      );
    }
    case 'coffeeTable':
    case 'desk':
    case 'nightstand':
    case 'sideboard':
      return (
        <>
          <rect className="app-wood" x={x} y={y} width={w} height={d} rx={0.04} />
          <rect
            className="app-detail"
            x={x + 0.05}
            y={y + 0.05}
            width={w - 0.1}
            height={d - 0.1}
            rx={0.02}
          />
        </>
      );
    case 'dining': {
      const chair = 0.42;
      return (
        <>
          {[0.25, 0.75].flatMap((t) => [
            <rect
              key={`n${String(t)}`}
              className="app-furniture"
              x={x + w * t - chair / 2}
              y={y - chair * 0.75}
              width={chair}
              height={chair}
              rx={0.06}
            />,
            <rect
              key={`s${String(t)}`}
              className="app-furniture"
              x={x + w * t - chair / 2}
              y={y + d + chair * 0.75 - chair}
              width={chair}
              height={chair}
              rx={0.06}
            />,
          ])}
          <rect className="app-wood" x={x} y={y} width={w} height={d} rx={0.05} />
        </>
      );
    }
    case 'officeChair':
      return (
        <>
          <circle className="app-furniture" cx={x + w / 2} cy={y + d / 2} r={w * 0.42} />
          <rect
            className="app-shade"
            x={x + w * 0.15}
            y={y + d * 0.72}
            width={w * 0.7}
            height={d * 0.16}
            rx={0.04}
          />
        </>
      );
    case 'bed':
      return (
        <>
          <rect className="app-furniture" x={x} y={y} width={w} height={d} rx={0.04} />
          <rect
            className="app-linen"
            x={x + 0.05}
            y={y + 0.06}
            width={w - 0.1}
            height={d - 0.1}
            rx={0.05}
          />
          <rect
            className="app-linen-fold"
            x={x + 0.05}
            y={y + d * 0.42}
            width={w - 0.1}
            height={d * 0.55}
            rx={0.05}
          />
          <rect
            className="app-pillow"
            x={x + 0.12}
            y={y + 0.14}
            width={w / 2 - 0.18}
            height={0.38}
            rx={0.08}
          />
          <rect
            className="app-pillow"
            x={x + w / 2 + 0.06}
            y={y + 0.14}
            width={w / 2 - 0.18}
            height={0.38}
            rx={0.08}
          />
        </>
      );
    case 'wardrobe':
    case 'shelf': {
      const parts = item.kind === 'wardrobe' ? 4 : 5;
      return (
        <>
          <rect className="app-furniture" x={x} y={y} width={w} height={d} rx={0.02} />
          {Array.from({ length: parts - 1 }, (_, index) => (
            <line
              key={index}
              className="app-detail"
              x1={x + (w / parts) * (index + 1)}
              y1={y + 0.03}
              x2={x + (w / parts) * (index + 1)}
              y2={y + d - 0.03}
            />
          ))}
        </>
      );
    }
    case 'lamp':
      return (
        <>
          <circle className="app-furniture" cx={x + w / 2} cy={y + d / 2} r={w / 2} />
          <circle
            className="app-lamp"
            cx={x + w / 2}
            cy={y + d / 2}
            r={w * 0.3}
            data-lit={evening > 0.4 || undefined}
          />
        </>
      );
    case 'plant':
      return (
        <>
          <circle className="app-pot" cx={x + w / 2} cy={y + d / 2} r={w * 0.3} />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse
              key={angle}
              className="app-plant"
              cx={x + w / 2}
              cy={y + d / 2 - w * 0.24}
              rx={w * 0.12}
              ry={w * 0.26}
              transform={`rotate(${String(angle)} ${String(x + w / 2)} ${String(y + d / 2)})`}
            />
          ))}
        </>
      );
    case 'kitchen':
      return (
        <>
          <rect className="app-furniture" x={x} y={y} width={w} height={d} />
          <rect
            className="app-counter"
            x={x + 0.02}
            y={y + 0.02}
            width={w - 0.04}
            height={d - 0.04}
          />
          <rect
            className="app-detail"
            x={x + w * 0.18}
            y={y + 0.12}
            width={0.5}
            height={0.38}
            rx={0.04}
          />
          {[0, 1, 2, 3].map((index) => (
            <circle
              key={index}
              className="app-detail"
              cx={x + w * 0.62 + (index % 2) * 0.26}
              cy={y + 0.18 + Math.floor(index / 2) * 0.26}
              r={0.09}
            />
          ))}
        </>
      );
    case 'bathtub':
      return (
        <>
          <rect className="app-furniture" x={x} y={y} width={w} height={d} rx={0.06} />
          <rect
            className="app-water"
            x={x + 0.08}
            y={y + 0.08}
            width={w - 0.16}
            height={d - 0.16}
            rx={0.22}
          />
        </>
      );
    case 'washbasin':
      return (
        <>
          <rect className="app-furniture" x={x} y={y} width={w} height={d} rx={0.04} />
          <ellipse
            className="app-water"
            cx={x + w / 2}
            cy={y + d * 0.55}
            rx={w * 0.34}
            ry={d * 0.3}
          />
        </>
      );
    case 'toilet':
      return (
        <>
          <rect className="app-furniture" x={x} y={y} width={w} height={d * 0.3} rx={0.03} />
          <ellipse
            className="app-furniture"
            cx={x + w / 2}
            cy={y + d * 0.62}
            rx={w * 0.44}
            ry={d * 0.36}
          />
        </>
      );
  }
}
