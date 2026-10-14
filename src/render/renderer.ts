import {
  COLS,
  DPR,
  ROWS,
  TILE,
  VIEW_H,
  VIEW_W,
  type Dir,
} from '../game/constants';
import { FRUIT_TILE, LAMPS, type MazeData } from '../game/map';
import type { Game } from '../game/engine';
import type { Ghost } from '../game/ghost';
import { Particles, FloatTexts } from './particles';
import { buildMazeLayer, buildVignette } from './maze';
import { drawGhost, drawPac, type GhostDrawMode, type ItemSprites } from './sprites';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private mazeLayer: HTMLCanvasElement | null = null;
  private mazeLevel = -1;
  private vignette = buildVignette();
  private shake = 0;
  private lastT = performance.now() / 1000;

  constructor(
    canvas: HTMLCanvasElement,
    private game: Game,
    private items: ItemSprites,
    private particles: Particles,
    private floats: FloatTexts,
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  kick(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  private ensureMaze(maze: MazeData, level: number): void {
    if (this.mazeLayer && this.mazeLevel === level) return;
    this.mazeLayer = buildMazeLayer(maze);
    this.mazeLevel = level;
  }

  draw(): void {
    const g = this.game;
    const now = performance.now() / 1000;
    const dt = Math.min(now - this.lastT, 0.05);
    this.lastT = now;
    const ctx = this.ctx;
    this.ensureMaze(g.maze, g.level);

    this.shake = Math.max(0, this.shake - dt * 14);
    const sx = (Math.random() - 0.5) * this.shake * 2;
    const sy = (Math.random() - 0.5) * this.shake * 2;

    ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
    ctx.clearRect(-8, -8, VIEW_W + 16, VIEW_H + 16);
    ctx.drawImage(this.mazeLayer!, 0, 0, VIEW_W, VIEW_H);

    this.drawFountain(now);
    this.drawLamps(now);
    this.drawSecrets(now);

    if (g.state !== 'levelclear') {
      this.drawApples(now);
      this.drawFruit(now);
    }

    if (g.state === 'dying') {
      this.drawPacDying(g.stateT);
      if (g.stateT < 0.35) this.drawGhosts(now);
    } else {
      this.drawPac();
      this.drawPac2();
      this.drawGhosts(now);
    }

    this.particles.update(dt);
    this.particles.draw(ctx);
    this.floats.update(dt);
    this.floats.draw(ctx);

    this.drawWeapon(now);

    ctx.drawImage(this.vignette, 0, 0, VIEW_W, VIEW_H);

    if (g.state === 'levelclear') {
      const a = 0.16 + 0.14 * Math.sin(now * 14);
      ctx.fillStyle = `rgba(255, 244, 200, ${Math.max(a, 0)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (g.state === 'ready') {
      ctx.textAlign = 'center';
      ctx.font = '700 22px Orbitron, sans-serif';
      ctx.fillStyle = '#ffe97a';
      ctx.shadowColor = '#ffb42e';
      ctx.shadowBlur = 14;
      if (Math.sin(now * 6) > -0.4) ctx.fillText('PREPARATE...', VIEW_W / 2, 15.9 * TILE);
      ctx.shadowBlur = 0;
    }
  }

  private drawFountain(t: number): void {
    const ctx = this.ctx;
    const x0 = 9 * TILE;
    const y0 = 11 * TILE;
    const w = 5 * TILE;
    const h = 2 * TILE;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#0d3552');
    g.addColorStop(0.5, '#12508a');
    g.addColorStop(1, '#0a2a44');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(160, 220, 255, 0.35)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const yy = y0 + ((t * 22 + i * 13) % h);
      ctx.globalAlpha = Math.max(0.5 - ((yy - y0) / h) * 0.5, 0);
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.bezierCurveTo(x0 + w * 0.3, yy - 3, x0 + w * 0.7, yy + 3, x0 + w, yy);
      ctx.stroke();
    }
    const phase = (t % 2.4) / 2.4;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;
    ctx.globalAlpha = 0.4 * (1 - phase);
    ctx.strokeStyle = 'rgba(190, 230, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 6 + phase * 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + (i * Math.PI) / 2;
      const px = cx + Math.cos(a) * (10 + Math.sin(t * 3 + i) * 6);
      const py = cy + Math.sin(a * 1.3) * 8;
      ctx.fillStyle = 'rgba(220, 245, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLamps(t: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < LAMPS.length; i++) {
      const lamp = LAMPS[i];
      const cx = lamp.x * TILE + TILE / 2;
      const cy = lamp.y * TILE + TILE / 2 - 10;
      const flicker = 0.82 + 0.18 * Math.sin(t * (9 + i) + i * 2.2) + 0.05 * Math.sin(t * 23 + i);
      const r = 52 * flicker;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      g.addColorStop(0, 'rgba(255, 200, 90, 0.34)');
      g.addColorStop(0.4, 'rgba(255, 170, 60, 0.12)');
      g.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSecrets(t: number): void {
    const g = this.game;
    const ctx = this.ctx;
    for (const [idx, id] of g.maze.secretTiles) {
      const x = idx % COLS;
      const y = (idx / COLS) | 0;
      const found = g.secretsFound.has(id);
      const dist = Math.hypot(x + 0.5 - g.pac.x, y + 0.5 - g.pac.y);
      if (!found && dist > 2.6) continue;
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      const pulse = 0.5 + 0.5 * Math.sin(t * (found ? 3 : 6));
      ctx.save();
      if (found) {
        ctx.globalAlpha = 0.35 + 0.25 * pulse;
        ctx.strokeStyle = '#ffd23f';
        ctx.shadowColor = '#ffb42e';
      } else {
        ctx.globalAlpha = 0.4 + 0.3 * pulse;
        ctx.strokeStyle = '#6ef7a5';
        ctx.shadowColor = '#3fdc8a';
      }
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8, 6);
      ctx.stroke();
      ctx.globalAlpha *= 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 4);
      ctx.quadraticCurveTo(cx, cy - 8, cx + 6, cy + 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawApples(t: number): void {
    const g = this.game;
    const ctx = this.ctx;
    const apples = g.apples;
    const spr = this.items.apple;
    const sprP = this.items.power;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const a = apples[y * COLS + x];
        if (a === 0) continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        if (a === 1) {
          ctx.drawImage(spr, cx - 9, cy - 9, 18, 18);
        } else {
          const pulse = 1 + 0.12 * Math.sin(t * 5 + x);
          const s = 26 * pulse;
          ctx.save();
          ctx.shadowColor = 'rgba(255, 214, 90, 0.95)';
          ctx.shadowBlur = 16;
          ctx.drawImage(sprP, cx - s / 2, cy - s / 2, s, s);
          ctx.restore();
        }
      }
    }
  }

  private drawFruit(t: number): void {
    const g = this.game;
    if (!g.fruitActive) return;
    const ctx = this.ctx;
    const spr = g.fruitIdx === 0 ? this.items.cherry : this.items.key;
    const bob = Math.sin(t * 4) * 2.5;
    const cx = FRUIT_TILE.x * TILE + TILE / 2;
    const cy = FRUIT_TILE.y * TILE + TILE / 2 + bob;
    ctx.save();
    ctx.shadowColor = g.fruitIdx === 0 ? 'rgba(255, 90, 110, 0.9)' : 'rgba(255, 214, 90, 0.95)';
    ctx.shadowBlur = 18;
    const s = 30 + Math.sin(t * 5) * 1.5;
    ctx.drawImage(spr, cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
  }

  private drawPac(): void {
    const g = this.game;
    const ctx = this.ctx;
    const jv = g.pac.jumpVisual();
    const gx = g.pac.x * TILE;
    const gy = g.pac.y * TILE;
    const dir: Dir = g.pac.dir ?? g.pac.facing;
    const d = g.pac.deform * (g.pac.dir ? 1 : 0.4);
    const sx = jv.sx * (1 + 0.3 * d);
    const sy = jv.sy * (1 - 0.16 * d);
    if (jv.dy < -1) {
      const h = Math.min(-jv.dy / 40, 1);
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * (1 - h * 0.6)})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy + 12, 10 * (1 - h * 0.4), 3.5 * (1 - h * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawPac(ctx, gx, gy + jv.dy, 13, dir, g.pac.mouthT * Math.PI, 0, sx, sy);
  }

  private drawPac2(): void {
    const p = this.game.pac2;
    if (p.condition === 'jailed') return;
    const ctx = this.ctx;
    const jv = p.jumpVisual();
    const dir: Dir = p.dir ?? p.facing;
    ctx.save();
    if (this.game.isInvisible(p)) ctx.globalAlpha = 0.28;
    drawPac(ctx, p.x * TILE, p.y * TILE + jv.dy, 13, dir, p.mouthT * Math.PI, 0, jv.sx, jv.sy);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff7f7f';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2', p.x * TILE, p.y * TILE + 23);
    ctx.restore();
  }

  private drawPacDying(stateT: number): void {
    const g = this.game;
    const ctx = this.ctx;
    const cx = g.pac.x * TILE;
    const cy = g.pac.y * TILE;
    if (stateT < 0.4) {
      drawPac(ctx, cx, cy, 13, g.pac.facing, g.pac.mouthT * Math.PI);
      return;
    }
    const p = Math.min((stateT - 0.4) / 1.3, 1);
    if (p >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.6;
    drawPac(ctx, cx, cy, 13 * (1 - p * 0.35), g.pac.facing, 0, p);
    ctx.restore();
  }

  private drawGhosts(t: number): void {
    const g = this.game;
    const flash = g.fright > 0 && g.fright < 2 && Math.floor(g.fright * 4) % 2 === 0;
    for (const ghost of g.ghosts) {
      this.drawGhostEntity(ghost, t, flash);
    }
  }

  private drawGhostEntity(ghost: Ghost, t: number, flash: boolean): void {
    const ctx = this.ctx;
    const cx = ghost.x * TILE;
    const cy = ghost.y * TILE;
    let mode: GhostDrawMode = 'normal';
    if (ghost.state === 'eyes') mode = 'eyes';
    else if (ghost.frightFlag) mode = flash ? 'flash' : 'fright';
    drawGhost(ctx, cx, cy, 13, ghost.kind, ghost.dir ?? 'left', t + ghost.bobT, mode, ghost.deform);
  }

  private drawWeapon(t: number): void {
    const g = this.game;
    const ctx = this.ctx;
    for (const item of g.items) {
      const cx = item.x * TILE + TILE / 2;
      const cy = item.y * TILE + TILE / 2 + Math.sin(t * 5 + item.x) * 2;
      const color = item.kind === 'ice' ? '#8eeeff' : item.kind === 'soap' ? '#b59cff' : item.kind === 'invisibility' ? '#b8ffce' : '#ffe97a';
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#172238';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.kind === 'gun' ? 'F' : item.kind === 'ice' ? 'H' : item.kind === 'soap' ? 'S' : 'I', cx, cy + 3);
      ctx.restore();
    }
    if (g.rescueKey) {
      const cx = g.rescueKey.x * TILE + TILE / 2;
      const cy = g.rescueKey.y * TILE + TILE / 2;
      ctx.save();
      ctx.strokeStyle = '#ffd23f';
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx - 5, cy, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillRect(cx, cy - 2, 11, 4); ctx.fillRect(cx + 7, cy + 2, 3, 5);
      ctx.restore();
    }
    if (g.pill) {
      const blink = g.pill.t < 3 && Math.sin(t * 12) < 0;
      if (!blink) {
        const cx = g.pill.x * TILE + TILE / 2;
        const cy = g.pill.y * TILE + TILE / 2;
        const pulse = 1 + 0.1 * Math.sin(t * 6);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.6);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#f4f6ff';
        ctx.beginPath();
        ctx.arc(-4, 0, 6, Math.PI / 2, Math.PI * 1.5);
        ctx.fill();
        ctx.fillRect(-4, -6, 8, 12);
        ctx.fillStyle = '#ff5b4d';
        ctx.shadowColor = 'rgba(255, 91, 77, 0.9)';
        ctx.beginPath();
        ctx.arc(4, 0, 6, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
        ctx.restore();
      }
    }
    for (const b of g.bullets) {
      const x = b.x * TILE;
      const y = b.y * TILE;
      const col = b.from === 'pac' ? '#ffe97a' : '#ff5b4d';
      ctx.save();
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(x - b.dx * 14, y - b.dy * 14);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (g.pacArmed) {
      drawPistol(ctx, g.pac.x * TILE, g.pac.y * TILE - 22 + Math.sin(t * 5) * 1.5, '#ffe97a');
    }
    if (g.pac2.weapon) drawPistol(ctx, g.pac2.x * TILE, g.pac2.y * TILE - 22 + Math.sin(t * 5) * 1.5, '#ff7f7f');
    if (g.armedGhost) {
      const ag = g.armedGhost;
      drawPistol(ctx, ag.x * TILE, ag.y * TILE - 22 + Math.sin(t * 5) * 1.5, '#ff5b4d');
      if (g.ghostAimT > 0) {
        const a = 0.22 + 0.35 * Math.abs(Math.sin(t * 10));
        ctx.save();
        ctx.strokeStyle = `rgba(255, 91, 77, ${a})`;
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ag.x * TILE, ag.y * TILE);
        ctx.lineTo(g.pac.x * TILE, g.pac.y * TILE);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawPistol(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(-7, -5, 14, 4);
  ctx.fillRect(-6, -1, 4.5, 6);
  ctx.fillRect(2, -1, 2.5, 4);
  ctx.restore();
}
