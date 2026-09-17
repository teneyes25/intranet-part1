export interface Rung {
  /** 가로줄이 놓인 행 (위에서부터 0) */
  row: number;
  /** 세로줄 col 과 col+1 을 잇는 가로줄 */
  col: number;
}

export interface PathStep {
  row: number;
  from: number;
  to: number;
}

export interface LadderPath {
  startCol: number;
  endCol: number;
  steps: PathStep[];
}

/** 결정적 PRNG — SSR/테스트에서 동일한 사다리를 만들기 위해 사용 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(items: T[], rng: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export function shuffled<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  return shuffleInPlace([...items], rng);
}

/**
 * 같은 행에서 가로줄이 맞닿지 않도록 사다리를 생성한다.
 * (맞닿으면 갈림길이 모호해진다)
 */
export function generateLadder(
  players: number,
  rows: number,
  rng: () => number = Math.random,
): Rung[] {
  if (players < 2) {
    throw new Error("사다리는 참가자가 2명 이상이어야 합니다.");
  }
  if (rows < 1) {
    throw new Error("사다리 행이 1개 이상이어야 합니다.");
  }

  const MIN_RUNGS = Math.max(players, rows);
  const MAX_ATTEMPTS = 24;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rungs: Rung[] = [];
    const connected = new Set<number>();

    for (let row = 0; row < rows; row++) {
      let col = 0;
      while (col < players - 1) {
        const chance = connected.has(col) ? 0.38 : 0.55;
        if (rng() < chance) {
          rungs.push({ row, col });
          connected.add(col);
          col += 2;
        } else {
          col += 1;
        }
      }
    }

    if (rungs.length >= MIN_RUNGS && connected.size === players - 1) {
      return rungs;
    }
    if (attempt === MAX_ATTEMPTS - 1) {
      return rungs.length > 0 ? rungs : fallbackLadder(players, rows);
    }
  }

  return fallbackLadder(players, rows);
}

/** 연결이 부족한 경우를 위한 지그재그 폴백 */
function fallbackLadder(players: number, rows: number): Rung[] {
  const rungs: Rung[] = [];
  for (let row = 0; row < rows; row++) {
    const offset = row % 2;
    for (let col = offset; col < players - 1; col += 2) {
      rungs.push({ row, col });
    }
  }
  return rungs;
}

export function rungsByRow(rungs: readonly Rung[]): Map<number, readonly Rung[]> {
  const map = new Map<number, Rung[]>();
  for (const rung of rungs) {
    const list = map.get(rung.row);
    if (list) list.push(rung);
    else map.set(rung.row, [rung]);
  }
  return map;
}

export function findRungAt(
  rowRungs: readonly Rung[] | undefined,
  col: number,
): Rung | undefined {
  if (!rowRungs) return undefined;
  return rowRungs.find((rung) => rung.col === col || rung.col === col - 1);
}

export function followPath(
  startCol: number,
  rungs: readonly Rung[],
  players: number,
  rows: number,
): LadderPath {
  if (startCol < 0 || startCol >= players) {
    throw new Error("출발 줄이 참가자 범위를 벗어났습니다.");
  }

  const byRow = rungsByRow(rungs);
  const steps: PathStep[] = [];
  let col = startCol;

  for (let row = 0; row < rows; row++) {
    const hit = findRungAt(byRow.get(row), col);
    if (!hit) continue;
    const to = hit.col === col ? col + 1 : col - 1;
    steps.push({ row, from: col, to });
    col = to;
  }

  return { startCol, endCol: col, steps };
}

export function resolveAll(
  rungs: readonly Rung[],
  players: number,
  rows: number,
): number[] {
  return Array.from({ length: players }, (_, start) => {
    return followPath(start, rungs, players, rows).endCol;
  });
}

export function validateRungs(
  rungs: readonly Rung[],
  players: number,
  rows: number,
): void {
  const seen = new Set<string>();
  const rowCols = new Map<number, number[]>();

  for (const rung of rungs) {
    if (rung.row < 0 || rung.row >= rows) {
      throw new Error(`행 범위 오류: ${rung.row}`);
    }
    if (rung.col < 0 || rung.col >= players - 1) {
      throw new Error(`열 범위 오류: ${rung.col}`);
    }
    const key = `${rung.row}:${rung.col}`;
    if (seen.has(key)) {
      throw new Error(`중복 가로줄: ${key}`);
    }
    seen.add(key);

    const cols = rowCols.get(rung.row) ?? [];
    cols.push(rung.col);
    rowCols.set(rung.row, cols);
  }

  for (const [row, cols] of rowCols) {
    const sorted = [...cols].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1]! + 1) {
        throw new Error(`같은 행에서 가로줄이 맞닿음: row=${row}`);
      }
    }
  }
}

export function isPermutation(mapping: readonly number[], players: number): boolean {
  if (mapping.length !== players) return false;
  const seen = new Set<number>();
  for (const dest of mapping) {
    if (!Number.isInteger(dest) || dest < 0 || dest >= players) return false;
    if (seen.has(dest)) return false;
    seen.add(dest);
  }
  return seen.size === players;
}
