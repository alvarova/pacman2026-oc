import {
  BASE_SPEED,
  COLS,
  DIRS,
  DIR_VEC,
  ghostSpeedMul,
  HOUSE_RELEASE,
  opposite,
  ROWS,
  TUNNEL_ROW,
  type Dir,
  type GhostKind,
} from './constants';
import {
  advance,
  BLINKY_START,
  DOOR_OUTSIDE,
  EYES_TARGET,
  HOUSE_SLOTS,
  passableGhost,
  tileAt,
  wrapX,
  type MazeData,
} from './map';
import { chooseDir, ghostTarget } from './ghost-target';

export type GhostState = 'house' | 'exiting' | 'active' | 'eyes' | 'entering';

export interface GhostHost {
  maze: MazeData;
  mode: 'scatter' | 'chase';
  levelSpeed: number;
  fright: number;
  elroy: number;
  pacTile: { x: number; y: number };
  pacFacing: Dir;
  blinkyTile: { x: number; y: number };
  levelTime: number;
  applesEaten: number;
  random(): number;
}

export class Ghost {
  kind: GhostKind;
  x = 0;
  y = 0;
  dir: Dir | null = null;
  state: GhostState = 'house';
  frightFlag = false;
  wps: { x: number; y: number }[] = [];
  bobT = 0;
  deform = 0;

  constructor(kind: GhostKind) {
    this.kind = kind;
  }

  get slot(): { x: number; y: number } {
    return this.kind === 'blinky' ? BLINKY_START : HOUSE_SLOTS[this.kind];
  }

  resetForLife(): void {
    const s = this.slot;
    this.x = s.x;
    this.y = s.y;
    this.frightFlag = false;
    this.wps = [];
    if (this.kind === 'blinky') {
      this.state = 'active';
      this.dir = 'left';
    } else {
      this.state = 'house';
      this.dir = 'up';
    }
  }

  private releaseCondition(host: GhostHost): boolean {
    if (this.kind === 'blinky') return true;
    const cfg = HOUSE_RELEASE[this.kind];
    return host.applesEaten >= cfg.dots || host.levelTime >= cfg.time;
  }

  update(dt: number, host: GhostHost): void {
    this.bobT += dt;
    this.deform = Math.max(0, this.deform - dt * 3.2);
    switch (this.state) {
      case 'house': {
        this.y = this.slot.y + Math.sin(this.bobT * 4) * 0.12;
        if (this.releaseCondition(host)) {
          this.state = 'exiting';
          this.wps = [
            { x: 11.5, y: this.slot.y },
            { x: 11.5, y: DOOR_OUTSIDE.y },
          ];
        }
        break;
      }
      case 'exiting': {
        const speed = BASE_SPEED * (this.frightFlag ? 0.35 : 0.5);
        if (this.followWaypoints(dt, speed)) {
          this.state = 'active';
          this.dir = host.random() < 0.5 ? 'left' : 'right';
        }
        break;
      }
      case 'entering': {
        if (this.followWaypoints(dt, BASE_SPEED * 0.9)) {
          this.state = 'house';
          this.dir = 'up';
          this.bobT = 0;
        }
        break;
      }
      case 'eyes': {
        const step = BASE_SPEED * 1.8 * dt;
        advance(
          this,
          step,
          (tx, ty) => passableGhost(tileAt(host.maze, tx, ty), true),
          (tx, ty) => {
            if (tx < 0 || tx >= COLS) return;
            this.aiDecide(host, tx, ty, true);
          },
        );
        this.x = wrapX(this.x);
        if (Math.floor(this.x) === EYES_TARGET.x && Math.floor(this.y) === EYES_TARGET.y && Math.abs(this.y - (EYES_TARGET.y + 0.5)) < 0.1) {
          this.state = 'entering';
          this.wps = [
            { x: 11.5, y: 11.5 },
            { x: this.slot.x, y: this.slot.y },
          ];
        }
        break;
      }
      case 'active': {
        const mul = this.frightFlag ? 0.5 : ghostSpeedMul(host.levelSpeed ?? 1);
        let m = mul;
        if (this.y === TUNNEL_ROW + 0.5 && (this.x < 5.5 || this.x > 17.5)) m = 0.42;
        const step = BASE_SPEED * m * dt;
        advance(
          this,
          step,
          (tx, ty) => passableGhost(tileAt(host.maze, tx, ty), false),
          (tx, ty) => {
            if (tx < 0 || tx >= COLS) return;
            this.aiDecide(host, tx, ty, false);
          },
        );
        this.x = wrapX(this.x);
        break;
      }
    }
  }

  private followWaypoints(dt: number, speed: number): boolean {
    const wp = this.wps[0];
    if (!wp) return true;
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    const m = speed * dt;
    if (d <= m) {
      this.x = wp.x;
      this.y = wp.y;
      this.wps.shift();
      return this.wps.length === 0;
    }
    this.x += (dx / d) * m;
    this.y += (dy / d) * m;
    return false;
  }

  private aiDecide(host: GhostHost, tx: number, ty: number, eyes: boolean): void {
    const prev = this.dir;
    const reverse = prev ? opposite(prev) : null;
    const opts: Dir[] = [];
    for (const d of DIRS) {
      if (!eyes && d === reverse) continue;
      const t = tileAt(host.maze, tx + DIR_VEC[d].x, ty + DIR_VEC[d].y);
      if (passableGhost(t, eyes)) opts.push(d);
    }
    if (opts.length === 0) {
      this.dir = reverse;
    } else if (eyes) {
      const d = this.eyesDir(host, tx, ty);
      this.dir = d && opts.includes(d) ? d : chooseDir(opts, { x: tx, y: ty }, EYES_TARGET);
    } else if (this.frightFlag) {
      this.dir = opts[Math.floor(host.random() * opts.length)];
    } else {
      const target = ghostTarget(this.kind, {
        pacTile: host.pacTile,
        pacFacing: host.pacFacing,
        blinkyTile: host.blinkyTile,
        selfTile: { x: tx, y: ty },
        mode: host.mode,
        elroy: host.elroy,
      });
      this.dir = chooseDir(opts, { x: tx, y: ty }, target);
    }
    if (this.dir !== prev) this.deform = 1;
  }

  private eyesDir(host: GhostHost, tx: number, ty: number): Dir | null {
    const start = ty * COLS + tx;
    const goal = EYES_TARGET.y * COLS + EYES_TARGET.x;
    if (start === goal) return null;
    const prev = new Int16Array(COLS * ROWS).fill(-1);
    prev[start] = start;
    const queue: number[] = [start];
    let head = 0;
    let found = false;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur === goal) {
        found = true;
        break;
      }
      const cx = cur % COLS;
      const cy = (cur / COLS) | 0;
      for (const d of DIRS) {
        const nx = cx + DIR_VEC[d].x;
        const ny = cy + DIR_VEC[d].y;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const ni = ny * COLS + nx;
        if (prev[ni] !== -1) continue;
        if (!passableGhost(tileAt(host.maze, nx, ny), true)) continue;
        prev[ni] = cur;
        queue.push(ni);
      }
    }
    if (!found) return null;
    let cur = goal;
    while (prev[cur] !== start) cur = prev[cur];
    const bx = cur % COLS;
    const by = (cur / COLS) | 0;
    for (const d of DIRS) {
      if (tx + DIR_VEC[d].x === bx && ty + DIR_VEC[d].y === by) return d;
    }
    return null;
  }

  reverse(): void {
    if (this.state !== 'active' || !this.dir) return;
    this.dir = opposite(this.dir);
    this.deform = 1;
  }

  startFright(): boolean {
    if (this.state === 'eyes' || this.state === 'entering') return false;
    this.frightFlag = true;
    this.reverse();
    return true;
  }

  endFright(): void {
    this.frightFlag = false;
  }

  eaten(): void {
    this.state = 'eyes';
    this.frightFlag = false;
    this.wps = [];
  }

  tile(): { x: number; y: number } {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }

  isDeadly(): boolean {
    return this.state === 'active' || this.state === 'exiting';
  }
}
