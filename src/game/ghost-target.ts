import { DIRS, DIR_VEC, SCATTER_TARGETS, type Dir, type GhostKind } from './constants';

export interface TargetCtx {
  pacTile: { x: number; y: number };
  pacFacing: Dir;
  blinkyTile: { x: number; y: number };
  selfTile: { x: number; y: number };
  mode: 'scatter' | 'chase';
  elroy: number;
}

export function ghostTarget(kind: GhostKind, ctx: TargetCtx): { x: number; y: number } {
  const scatter = SCATTER_TARGETS[kind];
  if (kind === 'blinky' && ctx.elroy > 0) return ctx.pacTile;
  if (ctx.mode === 'scatter') return scatter;
  const pd = DIR_VEC[ctx.pacFacing];
  switch (kind) {
    case 'blinky':
      return ctx.pacTile;
    case 'pinky':
      return {
        x: ctx.pacTile.x + pd.x * 4 + (ctx.pacFacing === 'up' ? -4 : 0),
        y: ctx.pacTile.y + pd.y * 4,
      };
    case 'inky': {
      const px = ctx.pacTile.x + pd.x * 2 + (ctx.pacFacing === 'up' ? -2 : 0);
      const py = ctx.pacTile.y + pd.y * 2;
      return {
        x: ctx.blinkyTile.x + (px - ctx.blinkyTile.x) * 2,
        y: ctx.blinkyTile.y + (py - ctx.blinkyTile.y) * 2,
      };
    }
    case 'clyde': {
      const d = Math.hypot(ctx.pacTile.x - ctx.selfTile.x, ctx.pacTile.y - ctx.selfTile.y);
      return d > 8 ? ctx.pacTile : scatter;
    }
  }
}

export function chooseDir(
  opts: Dir[],
  from: { x: number; y: number },
  target: { x: number; y: number },
): Dir {
  let best = opts[0];
  let bd = Infinity;
  for (const d of DIRS) {
    if (!opts.includes(d)) continue;
    const nx = from.x + DIR_VEC[d].x;
    const ny = from.y + DIR_VEC[d].y;
    const dd = (nx - target.x) * (nx - target.x) + (ny - target.y) * (ny - target.y);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}
