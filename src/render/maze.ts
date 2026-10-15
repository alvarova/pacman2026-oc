import { COLS, ROWS, TILE, TUNNEL_ROW, VIEW_H, VIEW_W } from '../game/constants';
import { LAMPS, T, type MazeData } from '../game/map';

function hash2(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function solidForRender(maze: MazeData, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  const t = maze.tiles[y * COLS + x];
  return t === T.Wall || t === T.Secret;
}

function isBorder(x: number, y: number): boolean {
  return x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
}

function touchesHouse(maze: MazeData, x: number, y: number): boolean {
  const nb: [number, number][] = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [nx, ny] of nb) {
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    if (maze.tiles[ny * COLS + nx] === T.House) return true;
  }
  return false;
}

function drawHedge(
  ctx: CanvasRenderingContext2D,
  maze: MazeData,
  x: number,
  y: number,
): void {
  const px = x * TILE;
  const py = y * TILE;
  const r = 6 + hash2(x, y) * 3;
  const exL = solidForRender(maze, x - 1, y) ? 3 : 0;
  const exR = solidForRender(maze, x + 1, y) ? 3 : 0;
  const exU = solidForRender(maze, x, y - 1) ? 3 : 0;
  const exD = solidForRender(maze, x, y + 1) ? 3 : 0;
  const x0 = px - exL;
  const y0 = py - exU;
  const w = TILE + exL + exR;
  const h = TILE + exU + exD;
  const openL = !solidForRender(maze, x - 1, y);
  const openR = !solidForRender(maze, x + 1, y);
  const openU = !solidForRender(maze, x, y - 1);
  const openD = !solidForRender(maze, x, y + 1);

  ctx.fillStyle = '#0d2415';
  roundRect(ctx, x0, y0, w, h, radii(r, openU && openL, openU && openR, openD && openR, openD && openL));
  ctx.fill();

  const g = ctx.createLinearGradient(x0, y0, x0, y0 + h);
  g.addColorStop(0, '#1e5a2e');
  g.addColorStop(0.55, '#174424');
  g.addColorStop(1, '#0f3019');
  ctx.fillStyle = g;
  roundRect(ctx, x0 + 1.5, y0 + 1.5, w - 3, h - 3, radii(r - 1, openU && openL, openU && openR, openD && openR, openD && openL));
  ctx.fill();

  ctx.strokeStyle = 'rgba(90, 200, 110, 0.35)';
  ctx.lineWidth = 1.4;
  roundRect(ctx, x0 + 2.5, y0 + 2.5, w - 5, h - 5, radii(r - 1.5, openU && openL, openU && openR, openD && openR, openD && openL));
  ctx.stroke();

  const rnd = mulberry32(Math.imul(x + 7, 668265263) ^ Math.imul(y + 13, 374761393));
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x0 + 2, y0 + 2, w - 4, h - 4, radii(r - 1, openU && openL, openU && openR, openD && openR, openD && openL));
  ctx.clip();
  ctx.strokeStyle = 'rgba(14, 40, 22, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const yy = y0 + h * (0.25 + i * 0.25) + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, yy);
    ctx.bezierCurveTo(x0 + w * 0.3, yy - 3, x0 + w * 0.7, yy + 3, x0 + w - 2, yy);
    ctx.stroke();
  }
  if (hash2(x * 3 + 1, y * 5 + 2) > 0.82) {
    const flowerColors = ['#e58fb1', '#f2ead0', '#f7c948'];
    const fc = flowerColors[Math.floor(hash2(x + 99, y + 41) * flowerColors.length)];
    for (let i = 0; i < 3; i++) {
      const fx = x0 + 5 + rnd() * (w - 10);
      const fy = y0 + 5 + rnd() * (h - 10);
      ctx.fillStyle = fc;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.6 + rnd() * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function radii(r: number, tl: boolean, tr: boolean, br: boolean, bl: boolean): number[] {
  return [tl ? r : 0, tr ? r : 0, br ? r : 0, bl ? r : 0];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
): void {
  const rr = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + rr[0], y);
  ctx.lineTo(x + w - rr[1], y);
  ctx.arcTo(x + w, y, x + w, y + rr[1], rr[1]);
  ctx.lineTo(x + w, y + h - rr[2]);
  ctx.arcTo(x + w, y + h, x + w - rr[2], y + h, rr[2]);
  ctx.lineTo(x + rr[3], y + h);
  ctx.arcTo(x, y + h, x, y + h - rr[3], rr[3]);
  ctx.lineTo(x, y + rr[0]);
  ctx.arcTo(x, y, x + rr[0], y, rr[0]);
  ctx.closePath();
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  const g = ctx.createLinearGradient(px, py, px, py + TILE);
  g.addColorStop(0, '#4a5158');
  g.addColorStop(0.5, '#3a4046');
  g.addColorStop(1, '#2c3136');
  ctx.fillStyle = g;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.strokeStyle = 'rgba(12, 14, 16, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  const rnd = mulberry32(Math.imul(x + 3, 97) ^ Math.imul(y + 11, 57));
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  for (let i = 0; i < 2; i++) {
    const sy = py + 8 + rnd() * 18;
    ctx.beginPath();
    ctx.moveTo(px + 3, sy);
    ctx.lineTo(px + TILE - 3, sy + rnd() * 2 - 1);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(46, 84, 48, 0.25)';
  if (rnd() > 0.6) {
    ctx.beginPath();
    ctx.arc(px + 4 + rnd() * 24, py + 4 + rnd() * 24, 2 + rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function buildMazeLayer(maze: MazeData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W * 2;
  canvas.height = VIEW_H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#1a120b';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const rnd = mulberry32(20261031);
  for (let i = 0; i < 900; i++) {
    const sx = rnd() * VIEW_W;
    const sy = rnd() * VIEW_H;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(90, 62, 38, 0.25)' : 'rgba(40, 28, 16, 0.3)';
    ctx.beginPath();
    ctx.arc(sx, sy, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = maze.tiles[y * COLS + x];
      if (t === T.Wall) {
        if (touchesHouse(maze, x, y)) {
          drawStone(ctx, x, y);
        } else if (isBorder(x, y)) {
          drawStone(ctx, x, y);
        } else {
          drawHedge(ctx, maze, x, y);
        }
      } else if (t === T.Secret) {
        drawHedge(ctx, maze, x, y);
      }
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = maze.tiles[y * COLS + x];
      if (t !== T.Path && t !== T.Void && t !== T.Door) continue;
      const px = x * TILE;
      const py = y * TILE;
      const shade = (dx: number, dy: number): void => {
        if (!solidForRender(maze, x + dx, y + dy)) return;
        const g =
          dx === 1
            ? ctx.createLinearGradient(px + TILE - 7, py, px + TILE, py)
            : dx === -1
              ? ctx.createLinearGradient(px, py, px + 7, py)
              : dy === 1
                ? ctx.createLinearGradient(px, py + TILE - 7, px, py + TILE)
                : ctx.createLinearGradient(px, py, px, py + 7);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(px, py, TILE, TILE);
      };
      shade(1, 0);
      shade(-1, 0);
      shade(0, 1);
      shade(0, -1);
      if (t === T.Door) {
        ctx.fillStyle = '#141a1e';
        ctx.fillRect(px + 4, py + 2, TILE - 8, TILE - 2);
        ctx.strokeStyle = '#565f66';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 5.5, py + 3.5, TILE - 11, TILE - 5);
        ctx.fillStyle = 'rgba(120, 200, 255, 0.14)';
        ctx.fillRect(px + 8, py + 8, TILE - 16, TILE - 14);
      }
    }
  }

  const hy0 = 11 * TILE;
  const hy1 = 13 * TILE;
  const hx0 = 8 * TILE;
  const hx1 = 15 * TILE;
  ctx.strokeStyle = 'rgba(140, 190, 220, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(hx0 + 2, hy0 + TILE - 2, hx1 - hx0 - 4, hy1 - hy0 - TILE + 2);

  for (const lamp of LAMPS) {
    const cx = lamp.x * TILE + TILE / 2;
    const cy = lamp.y * TILE + TILE / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#23282d';
    ctx.fillRect(cx - 1.6, cy - 8, 3.2, 18);
    const lg = ctx.createRadialGradient(cx, cy - 10, 1, cx, cy - 10, 7);
    lg.addColorStop(0, '#fff3c4');
    lg.addColorStop(0.6, '#ffce5e');
    lg.addColorStop(1, '#8a5a10');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a3f44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 5.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tunnelGradients: [number, number, number, number][] = [
    [0, TUNNEL_ROW * TILE, 3 * TILE, TILE],
    [VIEW_W - 3 * TILE, TUNNEL_ROW * TILE, 3 * TILE, TILE],
  ];
  for (const [gx, gy, gw, gh] of tunnelGradients) {
    const g = ctx.createLinearGradient(
      gx === 0 ? 0 : VIEW_W,
      0,
      gx === 0 ? gw : VIEW_W - gw,
      0,
    );
    g.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, gw, gh);
  }

  return canvas;
}

/**
 * Lectura urbana estilizada de Santa Fe (Argentina), centrada en Bv. Gálvez y
 * Rivadavia. Los ejes y nombres proceden de OpenStreetMap; se rasterizan sobre
 * la grilla jugable para conservar la simulación determinista del juego.
 * © OpenStreetMap contributors, ODbL.
 */
export function buildSantaFeLayer(maze: MazeData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W * 2;
  canvas.height = VIEW_H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#071018';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Manzanas: el mismo grafo transitable se muestra como una trama de ciudad.
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const tile = maze.tiles[y * COLS + x];
    const px = x * TILE, py = y * TILE;
    if (tile === T.Wall || tile === T.Secret || tile === T.House) {
      const shade = 13 + Math.floor(hash2(x + 50, y + 70) * 12);
      ctx.fillStyle = `rgb(${shade}, ${shade + 9}, ${shade + 17})`;
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.strokeStyle = 'rgba(105, 147, 166, 0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
      if (hash2(x + 8, y + 21) > .48) {
        ctx.fillStyle = 'rgba(255, 210, 120, 0.13)';
        ctx.fillRect(px + 7, py + 8, 4, 3);
        ctx.fillRect(px + 18, py + 18, 5, 3);
      }
    } else {
      ctx.fillStyle = '#27333c';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = 'rgba(203, 231, 235, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + .5, py + .5, TILE - 1, TILE - 1);
    }
  }

  // Los dos corredores principales hacen reconocible el cruce de referencia.
  ctx.fillStyle = 'rgba(62, 91, 101, 0.62)';
  ctx.fillRect(0, 11 * TILE, VIEW_W, 3 * TILE);
  ctx.fillRect(10 * TILE, 0, 3 * TILE, VIEW_H);
  ctx.strokeStyle = 'rgba(255, 214, 120, 0.58)';
  ctx.setLineDash([10, 9]);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 12.5 * TILE); ctx.lineTo(VIEW_W, 12.5 * TILE); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11.5 * TILE, 0); ctx.lineTo(11.5 * TILE, VIEW_H); ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.fillStyle = 'rgba(214, 244, 242, 0.72)';
  ctx.font = '700 12px Chakra Petch, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('BV. GÁLVEZ', 28, 12 * TILE - 7);
  ctx.save(); ctx.translate(11 * TILE - 7, VIEW_H - 34); ctx.rotate(-Math.PI / 2); ctx.fillText('RIVADAVIA', 0, 0); ctx.restore();
  ctx.font = '10px Chakra Petch, sans-serif';
  ctx.fillStyle = 'rgba(140, 183, 190, 0.55)';
  ctx.fillText('SANTA FE · ARGENTINA', 20, VIEW_H - 18);
  ctx.textAlign = 'right';
  ctx.fillText('© OpenStreetMap contributors', VIEW_W - 20, VIEW_H - 18);
  ctx.restore();
  return canvas;
}

export function buildVignette(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W * 2;
  canvas.height = VIEW_H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  const g = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.32,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.72,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  return canvas;
}
