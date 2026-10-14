import {
  COLS,
  DIR_VEC,
  EXTRA_LIFE_AT,
  FRUIT_LIFETIME,
  FRUIT_THRESHOLDS,
  MODE_SCHEDULE,
  POINTS,
  ELROY1,
  ELROY2,
  BULLET_SPEED,
  GUN_AIM_TIME,
  GUN_KILL_POINTS,
  GUN_LOS_RANGE,
  WEAPON_FIRST_SPAWN,
  WEAPON_LIFETIME,
  WEAPON_SPAWN_INTERVAL,
  frightTime,
  type Dir,
  type GhostKind,
} from './constants';
import { FRUIT_TILE, parseMaze, T, tileAt, passableBullet, type MazeData } from './map';
import { Pac } from './pac';
import { Ghost, type GhostHost } from './ghost';

export type GameState =
  | 'menu'
  | 'ready'
  | 'playing'
  | 'dying'
  | 'levelclear'
  | 'gameover'
  | 'paused';

export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  from: 'pac' | 'ghost';
}

export const FRUITS = [
  { kind: 'cherry', points: POINTS.cherry },
  { kind: 'key', points: POINTS.key },
] as const;

export interface GameEvents {
  onState?(s: GameState, prev: GameState): void;
  onScore?(score: number, record: number): void;
  onLives?(n: number): void;
  onLevel?(n: number): void;
  onApples?(eaten: number, total: number, power: number, powerTotal: number): void;
  onFright?(active: boolean, remaining: number, total: number): void;
  onCombo?(mult: number): void;
  onSecrets?(found: number, total: number): void;
  onCollectibles?(n: number, total: number): void;
  onFruit?(active: boolean, idx: number, remaining: number): void;
  onGhostEaten?(kind: GhostKind, points: number, x: number, y: number): void;
  onAppleEaten?(x: number, y: number, power: boolean): void;
  onSecretFound?(id: number, x: number, y: number): void;
  onFruitEaten?(idx: number, points: number, x: number, y: number): void;
  onDeath?(x: number, y: number): void;
  onLevelClear?(level: number): void;
  onExtraLife?(): void;
  onNote?(note: string): void;
  onWeaponPickup?(who: 'pac' | 'ghost', x: number, y: number): void;
  onShoot?(x: number, y: number, from: 'pac' | 'ghost'): void;
  onBulletGone?(x: number, y: number): void;
}

const RECORD_KEY = 'pacman26.record';

export class Game implements GhostHost {
  state: GameState = 'menu';
  prevState: GameState = 'menu';
  level = 1;
  score = 0;
  record = 0;
  lives = 3;
  maze: MazeData = parseMaze();
  apples: Uint8Array = this.maze.baseApples.slice();
  applesEaten = 0;
  powerEaten = 0;
  pac = new Pac();
  ghosts: Ghost[] = [
    new Ghost('blinky'),
    new Ghost('pinky'),
    new Ghost('inky'),
    new Ghost('clyde'),
  ];
  mode: 'scatter' | 'chase' = 'scatter';
  modeIdx = 0;
  modeT = 0;
  fright = 0;
  frightDur = 1;
  combo = 0;
  levelTime = 0;
  stateT = 0;
  fruitSpawned = [false, false];
  fruitActive = false;
  fruitIdx = 0;
  fruitT = 0;
  secretsFound = new Set<number>();
  collectibles = 0;
  nextExtra = EXTRA_LIFE_AT;
  pill: { x: number; y: number; t: number } | null = null;
  pillTimer = WEAPON_FIRST_SPAWN;
  bullets: Bullet[] = [];
  pacArmed = false;
  armedGhost: Ghost | null = null;
  ghostAimT = 0;
  events: GameEvents = {};
  pausedFrom: GameState = 'playing';

  constructor() {
    try {
      this.record = Number(localStorage.getItem(RECORD_KEY)) || 0;
    } catch {
      this.record = 0;
    }
    this.resetLevel(true);
  }

  get applesLeft(): number {
    return this.maze.totalApples + this.maze.totalPower - this.applesEaten - this.powerEaten;
  }

  get elroy(): number {
    const left = this.applesLeft;
    return left <= ELROY2 ? 2 : left <= ELROY1 ? 1 : 0;
  }

  get pacTile(): { x: number; y: number } {
    return this.pac.tile();
  }

  get pacFacing(): Dir {
    return this.pac.facing;
  }

  get blinkyTile(): { x: number; y: number } {
    return this.ghosts[0].tile();
  }

  get levelSpeed(): number {
    return 1;
  }

  random(): number {
    return Math.random();
  }

  private setState(s: GameState): void {
    const prev = this.state;
    this.state = s;
    this.stateT = 0;
    this.events.onState?.(s, prev);
  }

  startGame(): void {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.collectibles = 0;
    this.nextExtra = EXTRA_LIFE_AT;
    this.resetLevel(true);
    this.events.onScore?.(this.score, this.record);
    this.events.onLives?.(this.lives);
    this.events.onLevel?.(this.level);
    this.setState('ready');
  }

  resetLevel(fullReset: boolean): void {
    if (fullReset) {
      this.apples = this.maze.baseApples.slice();
      this.applesEaten = 0;
      this.powerEaten = 0;
      this.secretsFound = new Set();
      this.fruitSpawned = [false, false];
      this.events.onSecrets?.(0, this.maze.secretCount);
      this.events.onApples?.(0, this.maze.totalApples, 0, this.maze.totalPower);
    }
    this.resetPositions();
  }

  resetPositions(): void {
    this.pac.reset();
    for (const g of this.ghosts) g.resetForLife();
    this.fright = 0;
    this.combo = 0;
    this.modeIdx = 0;
    this.modeT = 0;
    this.mode = MODE_SCHEDULE[0].mode;
    this.levelTime = 0;
    this.fruitActive = false;
    this.bullets = [];
    this.pacArmed = false;
    this.armedGhost = null;
    this.ghostAimT = 0;
    this.events.onFright?.(false, 0, 1);
    this.events.onCombo?.(1);
    this.events.onFruit?.(false, 0, 0);
  }

  togglePause(): void {
    if (this.state === 'paused') {
      this.state = this.pausedFrom;
      this.events.onState?.(this.state, 'paused');
    } else if (this.state === 'playing' || this.state === 'ready') {
      this.pausedFrom = this.state;
      const prev = this.state;
      this.state = 'paused';
      this.events.onState?.('paused', prev);
    }
  }

  setStatePublic(s: GameState): void {
    this.setState(s);
  }

  update(dt: number): void {
    switch (this.state) {
      case 'ready': {
        this.stateT += dt;
        if (this.stateT >= 2) this.setState('playing');
        break;
      }
      case 'playing': {
        this.updatePlaying(dt);
        break;
      }
      case 'dying': {
        this.stateT += dt;
        if (this.stateT >= 2.4) {
          this.lives--;
          this.events.onLives?.(this.lives);
          if (this.lives < 0) {
            this.gameOver();
          } else {
            this.resetPositions();
            this.setState('ready');
          }
        }
        break;
      }
      case 'levelclear': {
        this.stateT += dt;
        if (this.stateT >= 2.8) {
          this.level++;
          this.events.onLevel?.(this.level);
          this.resetLevel(true);
          this.setState('ready');
        }
        break;
      }
      default:
        break;
    }
  }

  private updatePlaying(dt: number): void {
    this.levelTime += dt;
    if (this.fright > 0) {
      this.fright -= dt;
      this.events.onFright?.(true, Math.max(this.fright, 0), this.frightDur);
      if (this.fright <= 0) {
        this.fright = 0;
        for (const g of this.ghosts) g.endFright();
        this.combo = 0;
        this.events.onCombo?.(1);
        this.events.onFright?.(false, 0, this.frightDur);
      }
    } else {
      this.modeT += dt;
      while (this.modeIdx < MODE_SCHEDULE.length - 1 && this.modeT >= MODE_SCHEDULE[this.modeIdx].t) {
        this.modeT -= MODE_SCHEDULE[this.modeIdx].t;
        this.modeIdx++;
        this.mode = MODE_SCHEDULE[this.modeIdx].mode;
        for (const g of this.ghosts) g.reverse();
      }
    }

    this.pac.update(dt, this.maze, this.level, this.fright > 0);
    this.eatAtPac();

    for (const g of this.ghosts) g.update(dt, this);
    this.checkCollisions();
    if (this.state !== 'playing') return;

    this.updateFruit(dt);
    this.updateWeapon(dt);
    this.updateBullets(dt);
    if (this.state !== 'playing') return;

    if (this.applesLeft === 0) {
      this.setState('levelclear');
      this.events.onLevelClear?.(this.level);
    }
  }

  private eatAtPac(): void {
    const t = this.pac.tile();
    if (t.x < 0 || t.x >= COLS) return;
    const i = t.y * COLS + t.x;
    const a = this.apples[i];
    if (a === 0) return;
    this.apples[i] = 0;
    if (a === 1) {
      this.applesEaten++;
      this.addScore(POINTS.apple);
      this.events.onAppleEaten?.(t.x, t.y, false);
    } else {
      this.powerEaten++;
      this.addScore(POINTS.power);
      this.startFright();
      this.events.onAppleEaten?.(t.x, t.y, true);
    }
    this.events.onApples?.(
      this.applesEaten,
      this.maze.totalApples,
      this.powerEaten,
      this.maze.totalPower,
    );
    const tile = this.maze.tiles[i];
    if (tile === T.Secret) {
      const id = this.maze.secretTiles.get(i)!;
      if (!this.secretsFound.has(id)) {
        this.secretsFound.add(id);
        this.addScore(POINTS.secret);
        this.events.onSecretFound?.(id, t.x, t.y);
        this.events.onSecrets?.(this.secretsFound.size, this.maze.secretCount);
      }
    }
  }

  private startFright(): void {
    const ft = frightTime(this.level);
    if (ft <= 0) {
      for (const g of this.ghosts) g.reverse();
      return;
    }
    this.fright = ft;
    this.frightDur = ft;
    this.combo = 0;
    this.events.onCombo?.(1);
    for (const g of this.ghosts) g.startFright();
  }

  private checkCollisions(): void {
    const px = this.pac.x;
    const py = this.pac.y;
    for (const g of this.ghosts) {
      if (!g.isDeadly()) continue;
      if (this.pac.airborne()) continue;
      const d = Math.hypot(g.x - px, g.y - py);
      if (d >= 0.75) continue;
      if (g.frightFlag) {
        const pts = POINTS.ghost[Math.min(this.combo, POINTS.ghost.length - 1)];
        this.combo++;
        this.addScore(pts);
        if (this.armedGhost === g) this.armedGhost = null;
        g.eaten();
        this.events.onGhostEaten?.(g.kind, pts, g.x, g.y);
        this.events.onCombo?.(Math.min(this.combo + 1, 4));
      } else {
        this.setState('dying');
        this.fright = 0;
        this.events.onDeath?.(px, py);
        return;
      }
    }
  }

  private updateFruit(dt: number): void {
    for (let i = 0; i < FRUIT_THRESHOLDS.length; i++) {
      if (!this.fruitSpawned[i] && this.applesEaten >= FRUIT_THRESHOLDS[i]) {
        this.fruitSpawned[i] = true;
        this.fruitActive = true;
        this.fruitIdx = i;
        this.fruitT = FRUIT_LIFETIME;
      }
    }
    if (this.fruitActive) {
      this.fruitT -= dt;
      this.events.onFruit?.(true, this.fruitIdx, Math.max(this.fruitT, 0));
      if (this.fruitT <= 0) {
        this.fruitActive = false;
        this.events.onFruit?.(false, this.fruitIdx, 0);
      } else {
        const t = this.pac.tile();
        if (t.x === FRUIT_TILE.x && t.y === FRUIT_TILE.y) {
          this.fruitActive = false;
          this.collectibles++;
          const pts = FRUITS[this.fruitIdx].points;
          this.addScore(pts);
          this.events.onFruitEaten?.(this.fruitIdx, pts, FRUIT_TILE.x, FRUIT_TILE.y);
          this.events.onCollectibles?.(this.collectibles, FRUIT_THRESHOLDS.length);
          this.events.onFruit?.(false, this.fruitIdx, 0);
        }
      }
    }
  }

  firePac(): boolean {
    if (!this.pacArmed || this.state !== 'playing') return false;
    const d = DIR_VEC[this.pac.facing];
    this.bullets.push({
      x: this.pac.x,
      y: this.pac.y,
      dx: d.x,
      dy: d.y,
      from: 'pac',
    });
    this.pacArmed = false;
    this.events.onShoot?.(this.pac.x, this.pac.y, 'pac');
    return true;
  }

  private spawnPill(): void {
    const cands: number[] = [];
    for (let i = 0; i < this.maze.tiles.length; i++) {
      if (this.maze.tiles[i] !== T.Path) continue;
      const x = i % COLS;
      const y = (i / COLS) | 0;
      if (x === FRUIT_TILE.x && y === FRUIT_TILE.y) continue;
      const d = Math.hypot(x + 0.5 - this.pac.x, y + 0.5 - this.pac.y);
      if (d < 4) continue;
      cands.push(i);
    }
    if (!cands.length) return;
    const idx = cands[Math.floor(Math.random() * cands.length)];
    this.pill = { x: idx % COLS, y: (idx / COLS) | 0, t: WEAPON_LIFETIME };
  }

  private ghostLineOfSight(g: Ghost): { dx: number; dy: number } | null {
    const gt = g.tile();
    const pt = this.pacTile;
    if (gt.y === pt.y && gt.x !== pt.x) {
      const dir = pt.x > gt.x ? 1 : -1;
      const dist = Math.abs(pt.x - gt.x);
      if (dist > GUN_LOS_RANGE) return null;
      for (let x = gt.x + dir; x !== pt.x; x += dir) {
        if (!passableBullet(tileAt(this.maze, x, gt.y))) return null;
      }
      return { dx: dir, dy: 0 };
    }
    if (gt.x === pt.x && gt.y !== pt.y) {
      const dir = pt.y > gt.y ? 1 : -1;
      const dist = Math.abs(pt.y - gt.y);
      if (dist > GUN_LOS_RANGE) return null;
      for (let y = gt.y + dir; y !== pt.y; y += dir) {
        if (!passableBullet(tileAt(this.maze, gt.x, y))) return null;
      }
      return { dx: 0, dy: dir };
    }
    return null;
  }

  private updateWeapon(dt: number): void {
    if (
      this.armedGhost &&
      (this.armedGhost.state === 'eyes' ||
        this.armedGhost.state === 'entering' ||
        this.armedGhost.state === 'house')
    ) {
      this.armedGhost = null;
      this.ghostAimT = 0;
    }
    if (!this.pill && !this.pacArmed && !this.armedGhost) {
      this.pillTimer -= dt;
      if (this.pillTimer <= 0) this.spawnPill();
    }
    if (this.pill) {
      this.pill.t -= dt;
      if (this.pill.t <= 0) {
        this.pill = null;
        this.pillTimer = WEAPON_SPAWN_INTERVAL;
      } else {
        const pt = this.pac.tile();
        if (this.pill.x === pt.x && this.pill.y === pt.y) {
          this.pacArmed = true;
          this.events.onWeaponPickup?.('pac', this.pill.x, this.pill.y);
          this.pill = null;
          this.pillTimer = WEAPON_SPAWN_INTERVAL;
        } else {
          for (const g of this.ghosts) {
            if (!g.isDeadly()) continue;
            const gt = g.tile();
            if (gt.x === this.pill.x && gt.y === this.pill.y) {
              this.armedGhost = g;
              this.ghostAimT = 0;
              this.events.onWeaponPickup?.('ghost', this.pill.x, this.pill.y);
              this.pill = null;
              this.pillTimer = WEAPON_SPAWN_INTERVAL;
              break;
            }
          }
        }
      }
    }
    if (this.armedGhost) {
      const los = this.ghostLineOfSight(this.armedGhost);
      if (los) {
        this.ghostAimT += dt;
        if (this.ghostAimT >= GUN_AIM_TIME) {
          this.bullets.push({
            x: this.armedGhost.x,
            y: this.armedGhost.y,
            dx: los.dx,
            dy: los.dy,
            from: 'ghost',
          });
          this.events.onShoot?.(this.armedGhost.x, this.armedGhost.y, 'ghost');
          this.armedGhost = null;
          this.ghostAimT = 0;
        }
      } else {
        this.ghostAimT = Math.max(0, this.ghostAimT - dt * 2);
      }
    }
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.dx * BULLET_SPEED * dt;
      b.y += b.dy * BULLET_SPEED * dt;
      if (b.x <= -0.5) b.x += COLS;
      else if (b.x >= COLS + 0.5) b.x -= COLS;
      const t = tileAt(this.maze, Math.floor(b.x), Math.floor(b.y));
      if (!passableBullet(t)) {
        this.bullets.splice(i, 1);
        this.events.onBulletGone?.(b.x, b.y);
        continue;
      }
      if (b.from === 'pac') {
        let hit = false;
        for (const g of this.ghosts) {
          if (!g.isDeadly()) continue;
          if (Math.hypot(g.x - b.x, g.y - b.y) < 0.65) {
            this.addScore(GUN_KILL_POINTS);
            if (this.armedGhost === g) this.armedGhost = null;
            g.eaten();
            this.events.onGhostEaten?.(g.kind, GUN_KILL_POINTS, g.x, g.y);
            hit = true;
            break;
          }
        }
        if (hit) this.bullets.splice(i, 1);
      } else if (
        !this.pac.airborne() &&
        Math.hypot(this.pac.x - b.x, this.pac.y - b.y) < 0.65
      ) {
        this.bullets.splice(i, 1);
        this.setState('dying');
        this.fright = 0;
        this.events.onDeath?.(this.pac.x, this.pac.y);
        return;
      }
    }
  }

  private addScore(pts: number): void {
    this.score += pts;
    if (this.score >= this.nextExtra) {
      this.nextExtra += EXTRA_LIFE_AT;
      this.lives++;
      this.events.onExtraLife?.();
      this.events.onLives?.(this.lives);
    }
    if (this.score > this.record) {
      this.record = this.score;
      try {
        localStorage.setItem(RECORD_KEY, String(this.record));
      } catch {
        console.warn('No se pudo guardar el récord');
      }
    }
    this.events.onScore?.(this.score, this.record);
  }

  private gameOver(): void {
    this.setState('gameover');
  }
}
