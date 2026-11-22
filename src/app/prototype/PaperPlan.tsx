import { useId, type ReactNode } from 'react';
import { formatNumber } from '../../ui/format.ts';
import type { ViewFrame } from '../viewport.ts';
import type { Apartment, Point } from './apartment.ts';
import {
  apartmentBounds,
  doorSwingPath,
  openingQuad,
  polygonArea,
  wallPieces,
  wallQuad,
} from './geometry.ts';

const pts = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');

/** Rand des Papiers um den Bau in Metern */
const SHEET_MARGIN = 0.9;

interface PaperPlanProps {
  apartment: Apartment;
  frame: ViewFrame;
  /** Wie weit die Erkennung ist: 0 bis 1 je Ebene */
  detected: { walls: number; openings: number; labels: number };
  /** Hervorgehobene Messstrecke (Weltkoordinaten) */
  measure?: { from: Point; to: Point; label: string } | null;
  /** Sonnenflecken, z. B. beim Festlegen der Nordrichtung */
  sun?: ReactNode;
  /** Unsicher erkannte Öffnungen hervorheben, solange die Erkennung ein Vorschlag ist */
  markUncertain?: boolean;
}

/**
 * Der hochgeladene Plan als Papier, wie vom Makler: schwarze Wände, Raumnamen mit Fläche. Darüber
 * erscheint, was die (im Prototyp gespielte) Erkennung findet, und eine Lichtkante, die über das
 * Blatt wandert.
 */
export function PaperPlan({
  apartment,
  frame,
  detected,
  measure,
  sun,
  markUncertain = false,
}: PaperPlanProps) {
  const id = useId();
  const bounds = apartmentBounds(apartment);
  const { scale, ox, oy } = frame;
  const sheet = {
    x: bounds.x0 - SHEET_MARGIN,
    y: bounds.y0 - SHEET_MARGIN,
    width: bounds.x1 - bounds.x0 + 2 * SHEET_MARGIN,
    height: bounds.y1 - bounds.y0 + 2 * SHEET_MARGIN + 0.6,
  };
  const sweepX = bounds.x0 + (bounds.x1 - bounds.x0) * detected.walls;
  const scanning = detected.walls > 0 && detected.walls < 1;
  const screen = (x: number, y: number): [number, number] => [ox + x * scale, oy + y * scale];
  const [titleX, titleY] = screen(sheet.x + sheet.width - 0.3, sheet.y + sheet.height - 0.3);
  const [barX, barY] = screen(sheet.x + 0.4, sheet.y + sheet.height - 0.45);

  return (
    <>
      <defs>
        <clipPath id={`${id}-sweep`}>
          <rect
            x={bounds.x0 - 1}
            y={bounds.y0 - 1}
            width={Math.max(0, sweepX - bounds.x0 + 1)}
            height={bounds.y1 - bounds.y0 + 2}
          />
        </clipPath>
        <linearGradient id={`${id}-beam`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="app-beam-edge" />
          <stop offset="0.85" className="app-beam-mid" />
          <stop offset="1" className="app-beam-core" />
        </linearGradient>
        {/* Sonne nur in den Räumen, mit weicher Kante wie echtes Licht */}
        <clipPath id={`${id}-rooms`}>
          {apartment.rooms.map((room) => (
            <polygon key={room.id} points={pts(room.polygon)} />
          ))}
        </clipPath>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.05" />
        </filter>
      </defs>

      {/* Papier, in Bildschirmpixeln: Der Schatten (CSS-Filter) soll nicht mitskalieren */}
      <rect
        className="app-paper"
        x={ox + sheet.x * scale}
        y={oy + sheet.y * scale}
        width={sheet.width * scale}
        height={sheet.height * scale}
      />

      <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${scale.toFixed(5)})`}>
        {/* Der Plan, wie er hochgeladen wurde */}
        <g className="app-paper-plan">
          {apartment.walls.map((wall) =>
            wallPieces(wall, apartment.openings).map((piece) => (
              <polygon
                key={`${wall.id}-${String(piece.t0)}`}
                className="app-paper-wall"
                points={pts(wallQuad(wall, piece.t0, piece.t1))}
              />
            )),
          )}
          {apartment.openings.map((opening) => {
            const wall = apartment.walls.find((candidate) => candidate.id === opening.wallId);
            if (!wall) return null;
            const room = apartment.rooms.find((candidate) => candidate.id === opening.roomId);
            return opening.kind === 'door' ? (
              <path
                key={opening.id}
                className="app-paper-line"
                d={doorSwingPath(wall, opening, room)}
              />
            ) : (
              <polygon
                key={opening.id}
                className="app-paper-window"
                points={pts(openingQuad(wall, opening))}
              />
            );
          })}
        </g>

        {sun && (
          <g clipPath={`url(#${id}-rooms)`}>
            <g filter={`url(#${id}-soft)`}>{sun}</g>
          </g>
        )}

        {/* Was die Erkennung gefunden hat */}
        <g className="app-detected" clipPath={`url(#${id}-sweep)`}>
          {apartment.walls.map((wall) =>
            wallPieces(wall, apartment.openings).map((piece) => (
              <polygon
                key={`${wall.id}-${String(piece.t0)}`}
                className="app-detected-wall"
                points={pts(wallQuad(wall, piece.t0, piece.t1))}
              />
            )),
          )}
        </g>
        <g className="app-detected" style={{ opacity: detected.openings }}>
          {apartment.openings.map((opening) => {
            const wall = apartment.walls.find((candidate) => candidate.id === opening.wallId);
            if (!wall) return null;
            return (
              <polygon
                key={opening.id}
                className="app-detected-opening"
                data-uncertain={(markUncertain && opening.confidence < 0.7) || undefined}
                points={pts(openingQuad(wall, opening))}
              />
            );
          })}
        </g>

        {/* Lichtkante, die über das Blatt wandert */}
        {scanning && (
          <rect
            className="app-beam"
            x={sweepX - 1.4}
            y={sheet.y}
            width={1.4}
            height={sheet.height}
            fill={`url(#${id}-beam)`}
          />
        )}

        {measure && <MeasureLine {...measure} scale={scale} />}
      </g>

      {/* Beschriftung des Papiers in Bildschirmpixeln */}
      <g className="app-paper-text" aria-hidden="true">
        {apartment.rooms.map((room) => {
          const [x, y] = screen(room.label[0], room.label[1]);
          return (
            <text key={room.id} x={x} y={y} textAnchor="middle">
              <tspan x={x} dy="-0.2em">
                {room.name.toUpperCase()}
              </tspan>
              {scale > 30 && (
                <tspan x={x} dy="1.3em">
                  {formatNumber(polygonArea(room.polygon), 2)} m²
                </tspan>
              )}
            </text>
          );
        })}
        <text x={titleX} y={titleY} textAnchor="end" className="app-paper-title">
          {apartment.name} · Wohnfläche ca. {formatNumber(apartment.statedArea, 0)} m²
        </text>
        <g transform={`translate(${barX.toFixed(1)} ${barY.toFixed(1)})`} className="app-paper-bar">
          <rect width={scale} height={5} />
          <rect x={scale} width={scale} height={5} className="app-paper-bar-light" />
          <text x={0} y={-5}>
            0
          </text>
          <text x={2 * scale} y={-5} textAnchor="middle">
            2 m
          </text>
        </g>
      </g>

      {/* Erkannte Beschriftung: Flächen leuchten kurz auf */}
      {detected.labels > 0 && (
        <g className="app-detected-labels" style={{ opacity: detected.labels }} aria-hidden="true">
          {apartment.rooms.map((room) => {
            const [x, y] = screen(room.label[0], room.label[1]);
            return <rect key={room.id} x={x - 46} y={y - 20} width={92} height={34} rx={8} />;
          })}
        </g>
      )}
    </>
  );
}

function MeasureLine({
  from,
  to,
  label,
  scale,
}: {
  from: Point;
  to: Point;
  label: string;
  scale: number;
}) {
  const tick = 10 / scale;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * tick;
  const ny = (dx / length) * tick;
  const mid: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const fontSize = 13 / scale;
  return (
    <g className="app-measure">
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} />
      <line x1={from[0] - nx} y1={from[1] - ny} x2={from[0] + nx} y2={from[1] + ny} />
      <line x1={to[0] - nx} y1={to[1] - ny} x2={to[0] + nx} y2={to[1] + ny} />
      <circle cx={from[0]} cy={from[1]} r={6 / scale} />
      <circle cx={to[0]} cy={to[1]} r={6 / scale} />
      <text x={mid[0]} y={mid[1] - fontSize * 0.7} textAnchor="middle" style={{ fontSize }}>
        {label}
      </text>
    </g>
  );
}
