import type { LadderPath, Rung } from "./ladder-engine";

export interface LadderGeometry {
  players: number;
  rows: number;
  padX: number;
  colGap: number;
  startY: number;
  rowGap: number;
  endY: number;
  width: number;
  height: number;
}

export function createGeometry(players: number, rows: number): LadderGeometry {
  const padX = 48;
  const colGap = 90;
  const startY = 12;
  const rowGap = 28;
  const endY = startY + (rows + 1) * rowGap;
  return {
    players,
    rows,
    padX,
    colGap,
    startY,
    rowGap,
    endY,
    width: padX * 2 + (players - 1) * colGap,
    height: endY + 12,
  };
}

export function colX(geom: LadderGeometry, col: number): number {
  return geom.padX + col * geom.colGap;
}

export function rungY(geom: LadderGeometry, row: number): number {
  return geom.startY + (row + 1) * geom.rowGap;
}

export function buildPathD(path: LadderPath, geom: LadderGeometry): string {
  const x = (col: number) => colX(geom, col);
  let col = path.startCol;
  const parts = [`M ${x(col)} ${geom.startY}`];
  const stepsByRow = new Map(path.steps.map((step) => [step.row, step]));

  for (let row = 0; row < geom.rows; row++) {
    const y = rungY(geom, row);
    parts.push(`L ${x(col)} ${y}`);
    const step = stepsByRow.get(row);
    if (step) {
      col = step.to;
      parts.push(`L ${x(col)} ${y}`);
    }
  }
  parts.push(`L ${x(col)} ${geom.endY}`);
  return parts.join(" ");
}

export function rungSegments(rungs: readonly Rung[], geom: LadderGeometry) {
  return rungs.map((rung) => ({
    key: `${rung.row}-${rung.col}`,
    x1: colX(geom, rung.col),
    x2: colX(geom, rung.col + 1),
    y: rungY(geom, rung.row),
  }));
}
