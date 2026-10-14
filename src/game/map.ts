import { COLS, ROWS, TUNNEL_ROW, type Dir } from './constants';

export const T = {
  Wall: 0,
  Path: 1,
  House: 2,
  Door: 3,
  Secret: 4,
  Void: 5,
} as const;

export type TileId = (typeof T)[keyof typeof T];

export const MAP: string[] = [
  '#######################',
  '#.....................#',
  '#.####S####.#########.#',
  '#.####S####.#########.#',
  '#o...................o#',
  '#.####.####.####.####.#',
  '#.####.####.####.####.#',
  '#.....................#',
  '#.####.####.####.####.#',
  '#.....................#',
  '#.......###D###.......#',
  '#.......#HHHHH#.......#',
  '   .....#HHHHH#.....   ',
  '#.......#######.......#',
  '#.....................#',
  '#.####.####.####.####.#',
  '#.####.####.####.####.#',
  '#o...................o#',
  '#.#########.#####S###.#',
  '#.#########.#####S###.#',
  '#.....................#',
  '#.#S##.####.####.####.#',
  '#.#S##.####.####.####.#',
  '#.....................#',
  '#######################',
];

export const PAC_START = { x: 11.5, y: 14.5 };
export const PAC_START_DIR: Dir = 'left';
export const DOOR_TILE = { x: 11, y: 10 };
export const DOOR_OUTSIDE = { x: 11.5, y: 9.5 };
export const EYES_TARGET = { x: 11, y: 9 };
export const FRUIT_TILE = { x: 11, y: 17 };

export const HOUSE_SLOTS: Record<string, { x: number; y: number }> = {
  pinky: { x: 11.5, y: 11.5 },
  inky: { x: 9.5, y: 12.5 },
  clyde: { x: 13.5, y: 12.5 },
};

export const BLINKY_START = { x: 11.5, y: 9.5 };

export const LAMPS: { x: number; y: number }[] = [
  { x: 5, y: 1 },
  { x: 17, y: 1 },
  { x: 1, y: 7 },
  { x: 21, y: 7 },
  { x: 1, y: 17 },
  { x: 21, y: 17 },
  { x: 5, y: 23 },
  { x: 17, y: 23 },
];

export interface MazeData {
  tiles: Uint8Array;
  baseApples: Uint8Array;
  totalApples: number;
  totalPower: number;
  secretTiles: Map<number, number>;
  secretCount: number;
}

export function parseMaze(): MazeData {
  const tiles = new Uint8Array(COLS * ROWS);
  const apples = new Uint8Array(COLS * ROWS);
  let totalApples = 0;
  let totalPower = 0;
  for (let y = 0; y < ROWS; y++) {
    const row = MAP[y];
    for (let x = 0; x < COLS; x++) {
      const c = row[x];
      const i = y * COLS + x;
      let t: TileId = T.Wall;
      if (c === '.') {
        t = T.Path;
        apples[i] = 1;
        totalApples++;
      } else if (c === 'o') {
        t = T.Path;
        apples[i] = 2;
        totalPower++;
      } else if (c === 'H') {
        t = T.House;
      } else if (c === 'D') {
        t = T.Door;
      } else if (c === 'S') {
        t = T.Secret;
      } else if (c === ' ') {
        t = T.Void;
      }
      tiles[i] = t;
    }
  }
  const secretTiles = new Map<number, number>();
  let secretCount = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      if (tiles[i] !== T.Secret || secretTiles.has(i)) continue;
      const stack = [i];
      secretTiles.set(i, secretCount);
      while (stack.length) {
        const cur = stack.pop()!;
        const cx = cur % COLS;
        const cy = (cur / COLS) | 0;
        const nb = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of nb) {
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const ni = ny * COLS + nx;
          if (tiles[ni] === T.Secret && !secretTiles.has(ni)) {
            secretTiles.set(ni, secretCount);
            stack.push(ni);
          }
        }
      }
      secretCount++;
    }
  }
  return { tiles, baseApples: apples, totalApples, totalPower, secretTiles, secretCount };
}

export function tileAt(maze: MazeData, x: number, y: number): TileId {
  if (x < 0 || x >= COLS) {
    if (y === TUNNEL_ROW) return T.Void;
    return T.Wall;
  }
  if (y < 0 || y >= ROWS) return T.Wall;
  return maze.tiles[y * COLS + x] as TileId;
}

export function passablePac(t: TileId): boolean {
  return t === T.Path || t === T.Secret || t === T.Void;
}

export function passableGhost(t: TileId, eyes: boolean): boolean {
  if (t === T.Wall || t === T.Secret) return false;
  if (eyes) return true;
  return t === T.Path || t === T.Void;
}

export function passableBullet(t: TileId): boolean {
  return t === T.Path || t === T.Void || t === T.Secret;
}

export interface Mover {
  x: number;
  y: number;
  dir: Dir | null;
}

export function advance(
  e: Mover,
  step: number,
  canPass: (tx: number, ty: number) => boolean,
  onCenter: (tx: number, ty: number) => void,
): boolean {
  let s = step;
  let guard = 8;
  while (s > 1e-6 && guard-- > 0) {
    if (!e.dir) return true;
    const vx = e.dir === 'left' ? -1 : e.dir === 'right' ? 1 : 0;
    const vy = e.dir === 'up' ? -1 : e.dir === 'down' ? 1 : 0;
    const sign = vx !== 0 ? vx : vy;
    const horizontal = vx !== 0;
    const pos = horizontal ? e.x : e.y;
    let nc =
      sign > 0
        ? Math.floor(pos + 0.5 - 1e-6) + 0.5
        : Math.ceil(pos - 0.5 + 1e-6) - 0.5;
    let d = (nc - pos) * sign;
    if (d <= 1e-6) {
      d += 1;
      nc += sign;
    }
    const curT = Math.floor(pos);
    const curC = curT + 0.5;
    const crossing = sign > 0 ? nc > curC + 1e-6 : nc < curC - 1e-6;
    if (crossing) {
      const ncTile = Math.floor(nc - 0.5 + 1e-6);
      const pass = horizontal
        ? canPass(ncTile, Math.floor(e.y))
        : canPass(Math.floor(e.x), ncTile);
      if (!pass) {
        const toCur = (curC - pos) * sign;
        if (toCur > 1e-6) {
          const m = Math.min(s, toCur);
          if (horizontal) e.x += sign * m;
          else e.y += sign * m;
          s -= m;
          if (m >= toCur - 1e-9) {
            if (horizontal) e.x = curC;
            else e.y = curC;
            onCenter(curT, Math.floor(horizontal ? e.y : e.x));
            if (!e.dir) return true;
          }
          continue;
        }
        onCenter(curT, Math.floor(horizontal ? e.y : e.x));
        return true;
      }
    }
    const m = Math.min(s, d);
    if (horizontal) e.x += sign * m;
    else e.y += sign * m;
    s -= m;
    if (m >= d - 1e-9) {
      if (horizontal) {
        e.x = nc;
        e.y = Math.floor(e.y) + 0.5;
      } else {
        e.y = nc;
        e.x = Math.floor(e.x) + 0.5;
      }
      const tx = Math.floor(e.x);
      const ty = Math.floor(e.y);
      onCenter(tx, ty);
      if (tx < 0 || tx >= COLS) return false;
      if (!e.dir) return true;
    }
  }
  return false;
}

export function wrapX(x: number): number {
  if (x <= -0.5) return x + COLS;
  if (x >= COLS + 0.5) return x - COLS;
  return x;
}
