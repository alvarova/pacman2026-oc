export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: Dir[] = ['up', 'left', 'down', 'right'];

export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function opposite(d: Dir): Dir {
  return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
}

export const TILE = 32;
export const COLS = 23;
export const ROWS = 25;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;
export const DPR = 2;

export const BASE_SPEED = 9.2;

export const POINTS = {
  apple: 10,
  power: 50,
  ghost: [200, 400, 800, 1600],
  secret: 100,
  cherry: 100,
  key: 1000,
};

export const FRUIT_THRESHOLDS = [88, 177];
export const FRUIT_LIFETIME = 10;
export const EXTRA_LIFE_AT = 10000;
export const ELROY1 = 30;
export const ELROY2 = 15;

export const FRIGHT_TABLE = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 1, 0];

export interface ModePhase {
  mode: 'scatter' | 'chase';
  t: number;
}

export const MODE_SCHEDULE: ModePhase[] = [
  { mode: 'scatter', t: 7 },
  { mode: 'chase', t: 20 },
  { mode: 'scatter', t: 7 },
  { mode: 'chase', t: 20 },
  { mode: 'scatter', t: 5 },
  { mode: 'chase', t: 20 },
  { mode: 'scatter', t: 5 },
  { mode: 'chase', t: Infinity },
];

export type GhostKind = 'blinky' | 'pinky' | 'inky' | 'clyde';

export const SCATTER_TARGETS: Record<GhostKind, { x: number; y: number }> = {
  blinky: { x: 21, y: 1 },
  pinky: { x: 1, y: 1 },
  inky: { x: 21, y: 23 },
  clyde: { x: 1, y: 23 },
};

export const HOUSE_RELEASE: Record<Exclude<GhostKind, 'blinky'>, { dots: number; time: number }> = {
  pinky: { dots: 0, time: 1.2 },
  inky: { dots: 30, time: 5 },
  clyde: { dots: 60, time: 8 },
};

export const TUNNEL_ROW = 12;
export const TUNNEL_SLOW_LEFT = 5.5;
export const TUNNEL_SLOW_RIGHT = 17.5;

export const GHOST_COLORS: Record<GhostKind, { main: string; light: string; dark: string; glow: string }> = {
  blinky: { main: '#ff3b30', light: '#ff9a90', dark: '#8f0f06', glow: '#ff5b4d' },
  pinky: { main: '#ff6ec7', light: '#ffc0e8', dark: '#a12272', glow: '#ff8ad2' },
  inky: { main: '#29d8ff', light: '#b0f2ff', dark: '#00698f', glow: '#5ce1ff' },
  clyde: { main: '#ff9f2e', light: '#ffd9a0', dark: '#a35a00', glow: '#ffb45e' },
};

export const GHOST_ROLES: Record<GhostKind, { name: string; role: string; tag: string }> = {
  blinky: { name: 'BLINKY', role: 'El Perseguidor', tag: 'AGRESIVO' },
  pinky: { name: 'PINKY', role: 'La Emboscadora', tag: 'PREDICTIVA' },
  inky: { name: 'INKY', role: 'El Estratega', tag: 'TÁCTICO' },
  clyde: { name: 'CLYDE', role: 'El Errante', tag: 'IMPREDECIBLE' },
};

export const JUMP_ANT = 0.13;
export const JUMP_AIR = 0.52;
export const JUMP_LAND = 0.14;
export const JUMP_HEIGHT = 40;
export const JUMP_SPEED_BOOST = 1.14;

export const WEAPON_FIRST_SPAWN = 18;
export const WEAPON_SPAWN_INTERVAL = 35;
export const WEAPON_LIFETIME = 12;
export const BULLET_SPEED = 20;
export const GUN_LOS_RANGE = 7;
export const GUN_AIM_TIME = 0.45;
export const GUN_KILL_POINTS = 300;

export function frightTime(level: number): number {
  return FRIGHT_TABLE[Math.min(level - 1, FRIGHT_TABLE.length - 1)];
}

export function pacSpeedMul(level: number): number {
  return 0.8 + Math.min(level - 1, 4) * 0.02;
}

export function ghostSpeedMul(level: number): number {
  return 0.75 + Math.min(level - 1, 4) * 0.03;
}
