import { GHOST_COLORS, type Dir, type GhostKind } from '../game/constants';

export interface ItemSprites {
  apple: HTMLCanvasElement;
  power: HTMLCanvasElement;
  cherry: HTMLCanvasElement;
  key: HTMLCanvasElement;
}

export type GhostDrawMode = 'normal' | 'fright' | 'flash' | 'eyes';

const DIR_ANGLE: Record<Dir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export function drawPac(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  dir: Dir,
  mouthPhase: number,
  deathOpen = 0,
  sx = 1,
  sy = 1,
): void {
  const wave = deathOpen > 0 ? 0 : 0.5 + 0.5 * Math.sin(mouthPhase);
  const half = deathOpen > 0 ? deathOpen * Math.PI * 0.98 : 0.06 + wave * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(DIR_ANGLE[dir]);
  ctx.scale(sx, sy);
  ctx.shadowColor = 'rgba(255, 205, 60, 0.9)';
  ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.45, '#ffd23f');
  g.addColorStop(1, '#d9930d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, half, Math.PI * 2 - half);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(120, 70, 0, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (deathOpen === 0) {
    ctx.fillStyle = '#3a2404';
    ctx.beginPath();
    ctx.arc(r * 0.12, -r * 0.48, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function ghostBodyPath(ctx: CanvasRenderingContext2D, r: number, t: number): void {
  const skirt = r * 0.72;
  ctx.beginPath();
  ctx.arc(0, -r * 0.12, r, Math.PI, 0);
  const waves = 4;
  const amp = r * 0.14;
  for (let i = 0; i <= waves; i++) {
    const x1 = r - ((i + 0.5) * (2 * r)) / waves;
    const x2 = r - ((i + 1) * (2 * r)) / waves;
    const dir = i % 2 === 0 ? 1 : -1;
    const wob = Math.sin(t * 7 + i * 1.7) * amp * 0.35;
    ctx.quadraticCurveTo(x1, skirt + dir * amp + wob, x2, skirt + (i === waves ? 0 : 0));
  }
  ctx.closePath();
}

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  kind: GhostKind,
  dir: Dir,
  t: number,
  mode: GhostDrawMode,
  deform = 0,
): void {
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t * 6) * 1.4);
  if (deform > 0.01) {
    const ang = DIR_ANGLE[dir];
    ctx.rotate(ang);
    ctx.scale(1 + 0.22 * deform, 1 - 0.13 * deform);
    ctx.rotate(-ang);
  }
  if (mode === 'eyes') {
    drawGhostEyes(ctx, r, dir);
    ctx.restore();
    return;
  }
  if (mode === 'flash') {
    ctx.shadowColor = 'rgba(240, 244, 255, 0.95)';
    ctx.shadowBlur = 16;
    const g = ctx.createRadialGradient(0, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#c9d2ee');
    ctx.fillStyle = g;
    ghostBodyPath(ctx, r, t);
    ctx.fill();
    ctx.shadowBlur = 0;
    drawFrightFace(ctx, r, '#d84343', '#e8ecff');
    ctx.restore();
    return;
  }
  if (mode === 'fright') {
    ctx.shadowColor = 'rgba(80, 110, 255, 0.9)';
    ctx.shadowBlur = 16;
    const g = ctx.createRadialGradient(0, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#4a5de8');
    g.addColorStop(1, '#131e78');
    ctx.fillStyle = g;
    ghostBodyPath(ctx, r, t);
    ctx.fill();
    ctx.shadowBlur = 0;
    drawFrightFace(ctx, r, '#cfd6ff', '#cfd6ff');
    ctx.restore();
    return;
  }
  const c = GHOST_COLORS[kind];
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = 16;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.5, r * 0.15, 0, 0, r * 1.05);
  g.addColorStop(0, c.light);
  g.addColorStop(0.55, c.main);
  g.addColorStop(1, c.dark);
  ctx.fillStyle = g;
  ghostBodyPath(ctx, r, t);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 1;
  ghostBodyPath(ctx, r, t);
  ctx.stroke();
  drawGhostEyes(ctx, r, dir);
  ctx.restore();
}

function drawGhostEyes(ctx: CanvasRenderingContext2D, r: number, dir: Dir): void {
  const ex = r * 0.36;
  const ey = -r * 0.22;
  const v = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#f4f6ff';
    ctx.beginPath();
    ctx.ellipse(s * ex, ey, r * 0.27, r * 0.33, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2f9e';
    ctx.beginPath();
    ctx.arc(s * ex + v * r * 0.12, ey + vy * r * 0.12, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFrightFace(ctx: CanvasRenderingContext2D, r: number, eyeColor: string, mouthColor: string): void {
  const ex = r * 0.34;
  const ey = -r * 0.24;
  for (const s of [-1, 1]) {
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(s * ex, ey, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = mouthColor;
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  const my = r * 0.3;
  const seg = r * 0.22;
  ctx.moveTo(-r * 0.5, my);
  let i = 0;
  for (let x = -r * 0.5; x < r * 0.5; x += seg, i++) {
    ctx.lineTo(x + seg / 2, my + (i % 2 === 0 ? -r * 0.1 : r * 0.1));
    ctx.lineTo(x + seg, my);
  }
  ctx.stroke();
}

function canvasOf(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size * 2;
  c.height = size * 2;
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  return [c, ctx];
}

function glowCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  blur: number,
): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function proceduralApple(ctx: CanvasRenderingContext2D, size: number, golden: boolean): void {
  const cx = size / 2;
  const cy = size / 2 + 1;
  const r = size * 0.34;
  const body = golden ? '#ffd23f' : '#e8352b';
  const light = golden ? '#fff3b0' : '#ff9a8a';
  const dark = golden ? '#a86a00' : '#8f0f06';
  const glow = golden ? 'rgba(255, 214, 90, 0.95)' : 'rgba(255, 120, 90, 0.8)';
  ctx.shadowColor = glow;
  ctx.shadowBlur = golden ? 14 : 8;
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r);
  g.addColorStop(0, light);
  g.addColorStop(0.6, body);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = golden ? '#7a4d00' : '#5a3418';
  ctx.fillRect(cx - 1, cy - r - 4, 2, 5);
  ctx.fillStyle = golden ? '#c9e05a' : '#3fae4e';
  ctx.beginPath();
  ctx.ellipse(cx + 4.5, cy - r - 2.5, 4, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.2, r * 0.32, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function proceduralCherry(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2 + 2;
  const r = size * 0.2;
  ctx.strokeStyle = '#4a7a2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.9, cy + r * 0.4);
  ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 2.1, cx + r * 1.1, cy - r * 2.3);
  ctx.moveTo(cx + r * 1.0, cy + r * 0.2);
  ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 1.2, cx + r * 1.1, cy - r * 2.3);
  ctx.stroke();
  for (const [dx, dy] of [
    [-r * 0.9, r * 0.5],
    [r * 1.0, r * 0.3],
  ]) {
    const g = ctx.createRadialGradient(cx + dx - 1, cy + dy - 1, 1, cx + dx, cy + dy, r);
    g.addColorStop(0, '#ff7a6e');
    g.addColorStop(0.6, '#e01b3c');
    g.addColorStop(1, '#7a0616');
    ctx.fillStyle = g;
    glowCircle(ctx, cx + dx, cy + dy, r, 'rgba(255, 80, 100, 0.7)', 8);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx + dx - r * 0.3, cy + dy - r * 0.3, r * 0.22, r * 0.34, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function proceduralKey(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.5);
  ctx.shadowColor = 'rgba(255, 214, 90, 0.9)';
  ctx.shadowBlur = 10;
  const g = ctx.createLinearGradient(-size * 0.3, -size * 0.3, size * 0.3, size * 0.3);
  g.addColorStop(0, '#ffe289');
  g.addColorStop(0.6, '#e8b23c');
  g.addColorStop(1, '#a86a10');
  ctx.strokeStyle = g;
  ctx.lineWidth = size * 0.09;
  ctx.beginPath();
  ctx.arc(-size * 0.16, -size * 0.16, size * 0.15, 0, Math.PI * 2);
  ctx.moveTo(-size * 0.06, -size * 0.06);
  ctx.lineTo(size * 0.3, size * 0.3);
  ctx.moveTo(size * 0.16, size * 0.3);
  ctx.lineTo(size * 0.3, size * 0.16);
  ctx.moveTo(size * 0.24, size * 0.38);
  ctx.lineTo(size * 0.38, size * 0.24);
  ctx.stroke();
  ctx.restore();
}

export function makeItemSprites(
  sheet: Partial<Record<string, HTMLCanvasElement>> | null,
): ItemSprites {
  const appleSize = 24;
  const powerSize = 34;
  const fruitSize = 36;
  const [appleC, appleCtx] = canvasOf(appleSize);
  const [powerC, powerCtx] = canvasOf(powerSize);
  const [cherryC, cherryCtx] = canvasOf(fruitSize);
  const [keyC, keyCtx] = canvasOf(fruitSize);
  proceduralApple(appleCtx, appleSize, false);
  proceduralApple(powerCtx, powerSize, true);
  proceduralCherry(cherryCtx, fruitSize);
  proceduralKey(keyCtx, fruitSize);
  const place = (spr: HTMLCanvasElement | undefined, target: HTMLCanvasElement): HTMLCanvasElement =>
    spr ?? target;
  return {
    apple: place(sheet?.apple, appleC),
    power: place(sheet?.golden, powerC),
    cherry: place(sheet?.cherry, cherryC),
    key: place(sheet?.key, keyC),
  };
}
