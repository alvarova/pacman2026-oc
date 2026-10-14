import {
  BASE_SPEED,
  COLS,
  DIR_VEC,
  JUMP_AIR,
  JUMP_ANT,
  JUMP_HEIGHT,
  JUMP_LAND,
  JUMP_SPEED_BOOST,
  opposite,
  pacSpeedMul,
  type Dir,
} from './constants';
import { advance, PAC_START, PAC_START_DIR, passablePac, tileAt, wrapX, type MazeData } from './map';

export type JumpPhase = 'idle' | 'anticipate' | 'air' | 'land';

export interface JumpVisual {
  dy: number;
  sx: number;
  sy: number;
}

export class Pac {
  x = PAC_START.x;
  y = PAC_START.y;
  dir: Dir | null = PAC_START_DIR;
  want: Dir | null = null;
  facing: Dir = PAC_START_DIR;
  mouthT = 0;
  moving = false;
  deform = 0;
  jumpT = -1;

  reset(): void {
    this.x = PAC_START.x;
    this.y = PAC_START.y;
    this.dir = PAC_START_DIR;
    this.facing = PAC_START_DIR;
    this.want = null;
    this.mouthT = 0;
    this.moving = false;
    this.deform = 0;
    this.jumpT = -1;
  }

  tile(): { x: number; y: number } {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }

  jumpPhase(): JumpPhase {
    if (this.jumpT < 0) return 'idle';
    if (this.jumpT < JUMP_ANT) return 'anticipate';
    if (this.jumpT < JUMP_ANT + JUMP_AIR) return 'air';
    return 'land';
  }

  airborne(): boolean {
    return this.jumpPhase() === 'air';
  }

  tryJump(): boolean {
    if (this.jumpT >= 0) return false;
    if (!this.dir) return false;
    this.jumpT = 0;
    return true;
  }

  jumpVisual(): JumpVisual {
    const phase = this.jumpPhase();
    if (phase === 'idle') return { dy: 0, sx: 1, sy: 1 };
    if (phase === 'anticipate') {
      const p = this.jumpT / JUMP_ANT;
      return { dy: 0, sx: 1 + 0.16 * p, sy: 1 - 0.3 * p };
    }
    if (phase === 'air') {
      const p = (this.jumpT - JUMP_ANT) / JUMP_AIR;
      const lift = Math.sin(p * Math.PI);
      const s = 1 + lift;
      const launch = 1 - p;
      return {
        dy: -lift * JUMP_HEIGHT,
        sx: s * (1 + 0.12 * launch),
        sy: s * (1 - 0.05 * launch),
      };
    }
    const p = (this.jumpT - JUMP_ANT - JUMP_AIR) / JUMP_LAND;
    return { dy: 0, sx: 1 + 0.18 * (1 - p), sy: 1 - 0.28 * (1 - p) };
  }

  private canGo(tx: number, ty: number, d: Dir, maze: MazeData): boolean {
    return passablePac(tileAt(maze, tx + DIR_VEC[d].x, ty + DIR_VEC[d].y));
  }

  update(dt: number, maze: MazeData, level: number, frightActive: boolean): void {
    this.mouthT += dt * (this.dir ? 11 : 2.5);
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      if (this.jumpT >= JUMP_ANT + JUMP_AIR + JUMP_LAND) this.jumpT = -1;
    }
    this.deform = Math.max(0, this.deform - dt * 4.5);
    if (this.jumpPhase() === 'anticipate') {
      this.moving = false;
      return;
    }
    const mul = frightActive ? 0.9 + Math.min(level - 1, 4) * 0.02 : pacSpeedMul(level);
    const airMul = this.airborne() ? JUMP_SPEED_BOOST : 1;
    const step = BASE_SPEED * mul * airMul * dt;
    const before = this.dir;
    if (this.want && this.dir && this.want === opposite(this.dir)) {
      this.dir = this.want;
      this.facing = this.want;
      this.want = null;
    }
    if (!this.dir && this.want) {
      const t = this.tile();
      if (t.x >= 0 && t.x < COLS && this.canGo(t.x, t.y, this.want, maze)) {
        this.dir = this.want;
        this.facing = this.want;
        this.want = null;
      }
    }
    advance(
      this,
      step,
      (tx, ty) => passablePac(tileAt(maze, tx, ty)),
      (tx, ty) => {
        if (tx < 0 || tx >= COLS) return;
        if (this.want && this.want !== this.dir && this.canGo(tx, ty, this.want, maze)) {
          this.dir = this.want;
          this.facing = this.want;
          this.want = null;
        }
        if (this.dir && !this.canGo(tx, ty, this.dir, maze)) {
          this.dir = null;
        }
      },
    );
    if (this.dir && this.dir !== before) this.deform = 1;
    this.x = wrapX(this.x);
    this.moving = this.dir !== null;
  }
}
