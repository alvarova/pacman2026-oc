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

export interface SantaFeRoad { name: string; points: readonly (readonly [number, number])[]; }

/**
 * Extracto de vías de OpenStreetMap (2026-10-15), centrado en Bv. Gálvez y
 * Av. Rivadavia. Coordenadas [longitud, latitud]. Se empaqueta localmente para
 * que una partida no dependa del servicio de OSM.
 * © OpenStreetMap contributors, ODbL.
 */
export const SANTA_FE_ROADS: readonly SantaFeRoad[] = [
  { name: 'Bulevar Gálvez', points: [[-60.701107,-31.636118],[-60.700318,-31.636123],[-60.699696,-31.636262],[-60.69865,-31.636478],[-60.697573,-31.63672],[-60.69657,-31.637089],[-60.695496,-31.637307]] },
  { name: 'Avenida Rivadavia', points: [[-60.701061,-31.635958],[-60.701107,-31.636118],[-60.701468,-31.637272],[-60.701786,-31.638334],[-60.702117,-31.639408],[-60.702472,-31.640587],[-60.702844,-31.641776]] },
  { name: 'Bulevar Pellegrini', points: [[-60.707225,-31.634798],[-60.705895,-31.635079],[-60.704648,-31.635181],[-60.703242,-31.63564],[-60.702483,-31.635802],[-60.701061,-31.635958]] },
  { name: '25 de Mayo', points: [[-60.701707,-31.633117],[-60.702097,-31.634395],[-60.702483,-31.635648],[-60.702542,-31.635802],[-60.7029,-31.636973],[-60.703217,-31.638031],[-60.703899,-31.640249],[-60.70458,-31.642364]] },
  { name: 'San Jerónimo', points: [[-60.703866,-31.632629],[-60.704263,-31.633917],[-60.704648,-31.635181],[-60.705061,-31.636496],[-60.705686,-31.638603],[-60.70604,-31.639785],[-60.707078,-31.643113]] },
  { name: 'Cándido Pujato', points: [[-60.706611,-31.6334],[-60.705289,-31.633684],[-60.704263,-31.633917],[-60.702932,-31.634202],[-60.700683,-31.634708],[-60.700579,-31.634831],[-60.700653,-31.635089]] },
  { name: 'Santiago del Estero', points: [[-60.706549,-31.63729],[-60.705366,-31.637547],[-60.703915,-31.637862],[-60.701786,-31.638334],[-60.700595,-31.638599],[-60.699352,-31.638875]] },
  { name: 'San Luis', points: [[-60.699734,-31.636403],[-60.700003,-31.637328],[-60.700289,-31.638226],[-60.700595,-31.638599],[-60.701052,-31.639627],[-60.701756,-31.641909],[-60.70239,-31.644018]] },
  { name: 'Belgrano', points: [[-60.698104,-31.634664],[-60.69865,-31.636478],[-60.698965,-31.637551],[-60.699217,-31.638454],[-60.699665,-31.639919],[-60.700061,-31.641108],[-60.700705,-31.643236]] },
  { name: 'Balcarce', points: [[-60.695761,-31.638225],[-60.697744,-31.637805],[-60.698965,-31.637551],[-60.700003,-31.637328],[-60.701017,-31.637292],[-60.701468,-31.637272]] },
  { name: 'Pedro Vittori', points: [[-60.699667,-31.63142],[-60.700297,-31.633418],[-60.700683,-31.634708],[-60.700791,-31.635058],[-60.701061,-31.635958]] },
  { name: 'Mariano Comas', points: [[-60.707779,-31.631787],[-60.70621,-31.632117],[-60.70526,-31.632322],[-60.703866,-31.632629],[-60.701707,-31.633117],[-60.700297,-31.633418]] },
];

const SANTA_FE_CENTER: readonly [number, number] = [-60.701107, -31.636118];
const SANTA_FE_SCALE = 2200;

/** Proyección local de OSM a las coordenadas del motor, centrada en el cruce. */
export function projectSantaFePoint([lon, lat]: readonly [number, number]): { x: number; y: number } {
  return { x: 11.5 + (lon - SANTA_FE_CENTER[0]) * SANTA_FE_SCALE, y: 14.5 - (lat - SANTA_FE_CENTER[1]) * SANTA_FE_SCALE };
}

/** Rasteriza los trazos de OSM en corredores ortogonales que usa el motor. */
function buildSantaFeMap(): string[] {
  const street = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => false));
  const paint = (x: number, y: number): void => {
    if (x > 0 && x < COLS - 1 && y > 0 && y < ROWS - 1) street[y][x] = true;
  };
  for (const road of SANTA_FE_ROADS) for (let i = 1; i < road.points.length; i++) {
    const a = projectSantaFePoint(road.points[i - 1]), b = projectSantaFePoint(road.points[i]);
    let x = Math.round(a.x), y = Math.round(a.y);
    const targetX = Math.round(b.x), targetY = Math.round(b.y);
    paint(x, y);
    // Cada diagonal de OSM se convierte en dos tramos: Pac-Man no atraviesa
    // esquinas ni edificios, sólo dobla en una calle visible.
    while (x !== targetX || y !== targetY) {
      if (x !== targetX) x += Math.sign(targetX - x);
      paint(x, y);
      if (y !== targetY) y += Math.sign(targetY - y);
      paint(x, y);
    }
  }
  // Asegura el cruce de aparición entre Gálvez y Rivadavia.
  paint(11, 14);
  const power = new Set(['14,3', '19,6', '5,20', '17,20']);
  const rows = street.map((line, y) => line.map((onStreet, x) => onStreet ? (power.has(`${x},${y}`) ? 'o' : '.') : '#').join(''));
  // Casa de los fantasmas: edificio con acceso desde Av. Rivadavia.
  const edit = (x: number, y: number, value: string): void => {
    rows[y] = `${rows[y].slice(0, x)}${value}${rows[y].slice(x + 1)}`;
  };
  edit(11, 11, 'D');
  for (const y of [12, 13]) for (const x of [10, 11, 12]) edit(x, y, 'H');
  return rows;
}

export const SANTA_FE_MAP = buildSantaFeMap();

export const PAC_START = { x: 11.5, y: 14.5 };
export const PAC2_START = { x: 12.5, y: 14.5 };
export const PAC_START_DIR: Dir = 'left';
export const DOOR_TILE = { x: 11, y: 10 };
export const DOOR_OUTSIDE = { x: 11.5, y: 9.5 };
export const JAIL_TILE = { x: 11.5, y: 11.5 };
export const JAIL_RELEASE_TILE = { x: 11.5, y: 9.5 };
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

export function parseMaze(mapId: 'garden' | 'santa-fe' = 'garden'): MazeData {
  const source = mapId === 'santa-fe' ? SANTA_FE_MAP : MAP;
  const tiles = new Uint8Array(COLS * ROWS);
  const apples = new Uint8Array(COLS * ROWS);
  let totalApples = 0;
  let totalPower = 0;
  for (let y = 0; y < ROWS; y++) {
    const row = source[y];
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
