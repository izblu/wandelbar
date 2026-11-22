import { useId, type CSSProperties, type ReactNode } from 'react';
import { formatClock, formatNumber } from '../format.ts';
import {
  eveningAmount,
  FABRICS,
  footprint,
  ROOM,
  sunPatches,
  WINDOWS,
  type Furniture,
  type SceneFrame,
} from './room.ts';

interface RoomSceneProps {
  items: readonly Furniture[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  sunTime: number;
  view: 'dollhouse' | 'plan';
  frame: SceneFrame;
  width: number;
  height: number;
}

const fabricColor = (id: string | undefined) =>
  FABRICS.find((fabric) => fabric.id === id)?.color ?? FABRICS[0].color;

/**
 * Vorläufige Szene der Übersichtsseite: das Wohnzimmer als ruhige Draufsicht. Das Licht ist die
 * Signatur: Die Sonne fällt nach Uhrzeit durch die Fenster, abends leuchten die Lampen.
 * Später ersetzt das 3D diese Zeichnung; die Bedienung darüber bleibt gleich.
 */
export function RoomScene({
  items,
  selectedId,
  onSelect,
  sunTime,
  view,
  frame,
  width,
  height,
}: RoomSceneProps) {
  const id = useId();
  const clipId = `${id}-clip`;
  const blurId = `${id}-blur`;
  const glowId = `${id}-glow`;
  const boardsId = `${id}-boards`;
  const evening = view === 'dollhouse' ? eveningAmount(sunTime) : 0;
  const patches = view === 'dollhouse' ? sunPatches(sunTime) : [];
  const selected = items.find((item) => item.id === selectedId);
  const lamps = items.filter((item) => item.kind === 'lamp');
  const { scale, ox, oy } = frame;
  const wall = ROOM.wall;

  const label =
    view === 'plan'
      ? `Grundriss Wohnzimmer, ${formatNumber(ROOM.width, 2)} mal ${formatNumber(ROOM.depth, 2)} Meter`
      : `Wohnzimmer von oben um ${formatClock(sunTime)} Uhr`;

  return (
    <svg
      className="wb-room"
      viewBox={`0 0 ${String(Math.max(1, width))} ${String(Math.max(1, height))}`}
      role="img"
      aria-label={label}
      data-view={view}
      onClick={() => {
        onSelect(null);
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={ROOM.width} height={ROOM.depth} />
        </clipPath>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.05" />
        </filter>
        <radialGradient id={glowId}>
          <stop offset="0" className="wb-room-glow-core" />
          <stop offset="0.45" className="wb-room-glow-mid" />
          <stop offset="1" className="wb-room-glow-edge" />
        </radialGradient>
        <pattern id={boardsId} width="6" height="0.2" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.2" x2="6" y2="0.2" className="wb-room-board" />
        </pattern>
      </defs>

      <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${scale.toFixed(4)})`}>
        {/* Boden */}
        <rect className="wb-room-floor" width={ROOM.width} height={ROOM.depth} />
        {view === 'dollhouse' && (
          <rect width={ROOM.width} height={ROOM.depth} fill={`url(#${boardsId})`} />
        )}

        {/* Sonne auf dem Boden */}
        <g clipPath={`url(#${clipId})`} filter={`url(#${blurId})`}>
          {patches.map((patch, index) => (
            <polygon
              key={index}
              className="wb-room-sun"
              points={patch.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ')}
            />
          ))}
        </g>

        {/* Möbel, der Teppich zuerst */}
        {[...items]
          .sort((a, b) => Number(b.kind === 'rug') - Number(a.kind === 'rug'))
          .map((item) => (
            <g
              key={item.id}
              className="wb-room-item"
              data-kind={item.kind}
              transform={`rotate(${String(item.rotation)} ${String(item.x + item.w / 2)} ${String(item.y + item.d / 2)})`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(item.id);
              }}
            >
              {drawFurniture(item, evening)}
            </g>
          ))}

        {/* Abend: Schleier über dem Raum, Lampen leuchten durch */}
        <rect
          className="wb-room-veil"
          width={ROOM.width}
          height={ROOM.depth}
          style={{ opacity: evening * 0.62 }}
        />
        <g className="wb-room-glow" style={{ opacity: evening }}>
          {lamps.map((lamp) => (
            <circle
              key={lamp.id}
              cx={lamp.x + lamp.w / 2}
              cy={lamp.y + lamp.d / 2}
              r={1.35}
              fill={`url(#${glowId})`}
              clipPath={`url(#${clipId})`}
            />
          ))}
        </g>

        {/* Auswahl */}
        {selected && <Selection item={selected} />}

        {/* Wände mit Fenstern */}
        <path
          className="wb-room-wall"
          fillRule="evenodd"
          d={`M${String(-wall)},${String(-wall)}h${String(ROOM.width + 2 * wall)}v${String(ROOM.depth + 2 * wall)}h${String(-(ROOM.width + 2 * wall))}z M0,0v${String(ROOM.depth)}h${String(ROOM.width)}v${String(-ROOM.depth)}z`}
        />
        {WINDOWS.map((window) =>
          window.wall === 'east' ? (
            <rect
              key={window.wall}
              className="wb-room-window"
              x={ROOM.width}
              y={window.from}
              width={wall}
              height={window.to - window.from}
            />
          ) : (
            <rect
              key={window.wall}
              className="wb-room-window"
              x={window.from}
              y={ROOM.depth}
              width={window.to - window.from}
              height={wall}
            />
          ),
        )}
      </g>

      {view === 'plan' && <Measures frame={frame} />}
    </svg>
  );
}

function Selection({ item }: { item: Furniture }) {
  const box = footprint(item);
  const pad = 0.06;
  return (
    <rect
      className="wb-room-selection"
      x={box.x0 - pad}
      y={box.y0 - pad}
      width={box.x1 - box.x0 + 2 * pad}
      height={box.y1 - box.y0 + 2 * pad}
      rx={0.08}
    />
  );
}

/** Maßketten im Grundriss, in Bildschirmpixeln gesetzt, damit die Schrift scharf bleibt. */
function Measures({ frame }: { frame: SceneFrame }) {
  const { scale, ox, oy } = frame;
  const top = oy - ROOM.wall * scale - 18;
  const left = ox - ROOM.wall * scale - 18;
  const right = ox + ROOM.width * scale;
  const bottom = oy + ROOM.depth * scale;
  return (
    <g className="wb-room-measures" aria-hidden="true">
      <line x1={ox} y1={top} x2={right} y2={top} />
      <line x1={ox} y1={top - 5} x2={ox} y2={top + 5} />
      <line x1={right} y1={top - 5} x2={right} y2={top + 5} />
      <text x={(ox + right) / 2} y={top - 8} textAnchor="middle">
        {formatNumber(ROOM.width, 2)} m
      </text>
      <line x1={left} y1={oy} x2={left} y2={bottom} />
      <line x1={left - 5} y1={oy} x2={left + 5} y2={oy} />
      <line x1={left - 5} y1={bottom} x2={left + 5} y2={bottom} />
      <text
        x={left - 8}
        y={(oy + bottom) / 2}
        textAnchor="middle"
        transform={`rotate(-90 ${String(left - 8)} ${String((oy + bottom) / 2)})`}
      >
        {formatNumber(ROOM.depth, 2)} m
      </text>
    </g>
  );
}

function drawFurniture(item: Furniture, evening: number): ReactNode {
  const { x, y, w, d } = item;
  const fabric = { fill: fabricColor(item.swatch) } as CSSProperties;
  switch (item.kind) {
    case 'rug':
      return (
        <>
          <rect className="wb-room-rug" x={x} y={y} width={w} height={d} rx={0.04} />
          <rect
            className="wb-room-detail"
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
      const arm = item.kind === 'sofa' ? w * 0.08 : w * 0.16;
      const seats = item.kind === 'sofa' ? 3 : 1;
      const seatWidth = (w - 2 * arm) / seats;
      return (
        <>
          <rect
            className="wb-room-fabric"
            style={fabric}
            x={x}
            y={y}
            width={w}
            height={d}
            rx={0.1}
          />
          <rect className="wb-room-shadow" x={x} y={y} width={w} height={d * 0.26} rx={0.1} />
          <rect className="wb-room-shadow" x={x} y={y} width={arm} height={d} rx={0.08} />
          <rect className="wb-room-shadow" x={x + w - arm} y={y} width={arm} height={d} rx={0.08} />
          {Array.from({ length: seats - 1 }, (_, index) => (
            <line
              key={index}
              className="wb-room-detail"
              x1={x + arm + seatWidth * (index + 1)}
              y1={y + d * 0.3}
              x2={x + arm + seatWidth * (index + 1)}
              y2={y + d - 0.06}
            />
          ))}
        </>
      );
    }
    case 'table':
      return (
        <>
          <rect className="wb-room-wood" x={x} y={y} width={w} height={d} rx={0.05} />
          <rect
            className="wb-room-detail"
            x={x + 0.06}
            y={y + 0.06}
            width={w - 0.12}
            height={d - 0.12}
            rx={0.03}
          />
        </>
      );
    case 'lamp':
      return (
        <>
          <circle className="wb-room-furniture" cx={x + w / 2} cy={y + d / 2} r={w / 2} />
          <circle
            className="wb-room-lamp"
            cx={x + w / 2}
            cy={y + d / 2}
            r={w * 0.3}
            data-lit={evening > 0.4 || undefined}
          />
        </>
      );
    case 'shelf':
      return (
        <>
          <rect className="wb-room-furniture" x={x} y={y} width={w} height={d} rx={0.02} />
          {[1, 2, 3, 4].map((index) => (
            <line
              key={index}
              className="wb-room-detail"
              x1={x + (w / 5) * index}
              y1={y + 0.03}
              x2={x + (w / 5) * index}
              y2={y + d - 0.03}
            />
          ))}
        </>
      );
    case 'plant':
      return (
        <>
          <circle className="wb-room-furniture" cx={x + w / 2} cy={y + d / 2} r={w * 0.3} />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse
              key={angle}
              className="wb-room-plant"
              cx={x + w / 2}
              cy={y + d / 2 - w * 0.24}
              rx={w * 0.12}
              ry={w * 0.26}
              transform={`rotate(${String(angle)} ${String(x + w / 2)} ${String(y + d / 2)})`}
            />
          ))}
        </>
      );
  }
}
