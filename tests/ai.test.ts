import { describe, expect, it } from 'vitest';
import { DIR_VEC, type Dir } from '../src/game/constants';
import { chooseDir, ghostTarget, type TargetCtx } from '../src/game/ghost-target';
import { Ghost } from '../src/game/ghost';
import { parseMaze, passableGhost, tileAt } from '../src/game/map';

function ctx(over: Partial<TargetCtx> = {}): TargetCtx {
  return {
    pacTile: { x: 11, y: 14 },
    pacFacing: 'left',
    blinkyTile: { x: 11, y: 9 },
    selfTile: { x: 5, y: 7 },
    mode: 'chase',
    elroy: 0,
    ...over,
  };
}

describe('personalidades de fantasmas', () => {
  it('pinky apunta 4 casillas por delante de Pac', () => {
    const t = ghostTarget('pinky', ctx({ pacFacing: 'left', pacTile: { x: 10, y: 14 } }));
    expect(t).toEqual({ x: 6, y: 14 });
  });

  it('pinky hereda el desbordamiento clásico hacia arriba', () => {
    const t = ghostTarget('pinky', ctx({ pacFacing: 'up', pacTile: { x: 10, y: 14 } }));
    expect(t).toEqual({ x: 6, y: 10 });
  });

  it('inky duplica el vector desde blinky', () => {
    const t = ghostTarget('inky', ctx({ pacFacing: 'right', pacTile: { x: 10, y: 14 }, blinkyTile: { x: 4, y: 4 } }));
    const px = 12;
    const py = 14;
    expect(t).toEqual({ x: 4 + (px - 4) * 2, y: 4 + (py - 4) * 2 });
  });

  it('clyde persigue de lejos y se dispersa de cerca', () => {
    const chase = ghostTarget('clyde', ctx({ selfTile: { x: 3, y: 3 }, pacTile: { x: 19, y: 20 } }));
    expect(chase).toEqual({ x: 19, y: 20 });
    const scatter = ghostTarget('clyde', ctx({ selfTile: { x: 20, y: 20 }, pacTile: { x: 19, y: 20 } }));
    expect(scatter).toEqual({ x: 1, y: 23 });
  });

  it('blinky con Elroy persigue incluso en scatter', () => {
    const t = ghostTarget('blinky', ctx({ mode: 'scatter', elroy: 1, pacTile: { x: 9, y: 9 } }));
    expect(t).toEqual({ x: 9, y: 9 });
  });

  it('en scatter usa su esquina', () => {
    const t = ghostTarget('inky', ctx({ mode: 'scatter' }));
    expect(t).toEqual({ x: 21, y: 23 });
  });
});

describe('elección de dirección', () => {
  const maze = parseMaze();
  const can = (x: number, y: number): boolean => passableGhost(tileAt(maze, x, y), false);

  it('nunca se da la vuelta y prioriza up > left > down > right', () => {
    const from = { x: 11, y: 7 };
    const open = (d: Dir): boolean =>
      can(from.x + DIR_VEC[d].x, from.y + DIR_VEC[d].y);
    const dirs = (['up', 'left', 'down', 'right'] as Dir[]).filter(
      (d) => d !== 'left' && open(d),
    );
    const dir = chooseDir(dirs, from, { x: 11, y: 1 });
    expect(dir).toBe('up');
  });

  it('elige el vecino más cercano al objetivo', () => {
    const dir = chooseDir(['right', 'down'], { x: 5, y: 7 }, { x: 20, y: 7 });
    expect(dir).toBe('right');
  });
});

describe('estados de fantasmas', () => {
  it('el fantasma comido se convierte en ojos que regresan a la puerta', () => {
    const g = new Ghost('blinky');
    g.resetForLife();
    g.eaten();
    expect(g.state).toBe('eyes');
  });

  it('blinky arranca activo y el resto en la casa', () => {
    const g = new Ghost('pinky');
    g.resetForLife();
    expect(g.state).toBe('house');
    const b = new Ghost('blinky');
    b.resetForLife();
    expect(b.state).toBe('active');
  });

  it('solo los estados activos y saliendo son letales', () => {
    const g = new Ghost('inky');
    g.resetForLife();
    expect(g.isDeadly()).toBe(false);
    g.state = 'exiting';
    expect(g.isDeadly()).toBe(true);
    g.state = 'eyes';
    expect(g.isDeadly()).toBe(false);
  });
});
