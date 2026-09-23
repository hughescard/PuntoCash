import * as React from "react";

/** Modules per side — the size of a version-2 QR code. */
const SIZE = 25;

/** FNV-1a, enough to turn the payload into a stable pseudo-random stream. */
function seedFrom(payload: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function* bits(seed: number): Generator<boolean> {
  let state = seed || 1;
  for (;;) {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    yield (state >>> 0) % 2 === 0;
  }
}

function inFinder(x: number, y: number): boolean {
  const corner = (cx: number, cy: number) => x >= cx && x < cx + 8 && y >= cy && y < cy + 8;
  return corner(0, 0) || corner(SIZE - 8, 0) || corner(0, SIZE - 8);
}

/** Dark cell of a 7×7 finder pattern whose top-left corner is (cx, cy). */
function finderDark(x: number, y: number, cx: number, cy: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
  const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
  return ring !== 2;
}

/**
 * DEMO-ONLY pairing QR.
 *
 * Draws a QR-shaped matrix (finder and timing patterns, data modules derived
 * deterministically from `payload`) so the pairing screen looks and lays out
 * exactly as it will in production — but it is NOT a scannable code: this
 * demo ships no QR encoder, and the admin's scan is simulated anyway (see
 * `/kiosk/simulador-admin`). The real kiosk renders a real QR carrying a
 * signed, single-use pairing token (Autoservicio FRD FR-AS-LINK-3).
 */
export function PairingQr({ payload, className }: { payload: string; className?: string }): React.JSX.Element {
  const stream = bits(seedFrom(payload));
  const cells: React.ReactNode[] = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let dark: boolean;
      if (inFinder(x, y)) {
        dark = finderDark(x, y, 0, 0) || finderDark(x, y, SIZE - 7, 0) || finderDark(x, y, 0, SIZE - 7);
      } else if (y === 6 || x === 6) {
        dark = (y === 6 ? x : y) % 2 === 0; // timing patterns
      } else if (x >= 16 && x <= 20 && y >= 16 && y <= 20) {
        const ring = Math.max(Math.abs(x - 18), Math.abs(y - 18));
        dark = ring !== 1; // alignment pattern
      } else {
        dark = stream.next().value as boolean;
      }
      if (dark) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} />);
    }
  }

  return (
    <svg
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      role="img"
      aria-label="Código QR de vinculación"
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} fill="#fff" />
      <g fill="currentColor">{cells}</g>
    </svg>
  );
}
