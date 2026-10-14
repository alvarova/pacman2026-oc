import { describe, expect, it } from 'vitest';
import { Pac } from '../src/game/pac';
import { parseMaze } from '../src/game/map';

const maze = parseMaze();

describe('salto de Pac', () => {
  it('no salta si está detenido', () => {
    const p = new Pac();
    p.reset();
    p.dir = null;
    expect(p.tryJump()).toBe(false);
    expect(p.jumpPhase()).toBe('idle');
  });

  it('no permite doble salto', () => {
    const p = new Pac();
    p.reset();
    expect(p.tryJump()).toBe(true);
    expect(p.tryJump()).toBe(false);
  });

  it('recorre anticipación → aire → aterrizaje → idle', () => {
    const p = new Pac();
    p.reset();
    expect(p.tryJump()).toBe(true);
    expect(p.jumpPhase()).toBe('anticipate');
    expect(p.airborne()).toBe(false);
    p.update(0.2, maze, 1, false);
    expect(p.jumpPhase()).toBe('air');
    expect(p.airborne()).toBe(true);
    p.update(0.2, maze, 1, false);
    expect(p.airborne()).toBe(true);
    p.update(0.5, maze, 1, false);
    expect(p.jumpPhase()).toBe('idle');
    expect(p.airborne()).toBe(false);
  });

  it('la altura del salto sube y baja en parábola', () => {
    const p = new Pac();
    p.reset();
    p.tryJump();
    p.update(0.13 + 0.26, maze, 1, false);
    const apex = p.jumpVisual();
    const p2 = new Pac();
    p2.reset();
    p2.tryJump();
    p2.update(0.13 + 0.05, maze, 1, false);
    const low = p2.jumpVisual();
    expect(apex.dy).toBeLessThan(low.dy);
    expect(apex.sx).toBeGreaterThan(1.5);
  });

  it('aplica deformación al girar', () => {
    const p = new Pac();
    p.reset();
    p.want = 'right';
    p.update(0.016, maze, 1, false);
    expect(p.deform).toBeGreaterThan(0);
  });
});

describe('recuperación tras chocar una pared', () => {
  it('al chocar se detiene y responde a una dirección válida', () => {
    const p = new Pac();
    p.reset();
    p.x = 1.5;
    p.y = 1.5;
    p.dir = 'up';
    p.update(0.1, maze, 1, false);
    expect(p.dir).toBeNull();
    p.want = 'down';
    p.update(0.016, maze, 1, false);
    expect(p.dir).toBe('down');
    expect(p.y).toBeGreaterThan(1.5);
  });

  it('sigue detenido si la dirección pedida sigue bloqueada', () => {
    const p = new Pac();
    p.reset();
    p.x = 1.5;
    p.y = 1.5;
    p.dir = 'up';
    p.update(0.1, maze, 1, false);
    p.want = 'up';
    p.update(0.05, maze, 1, false);
    expect(p.dir).toBeNull();
    expect(p.y).toBe(1.5);
  });

  it('prioriza la última tecla presionada al estar detenido', () => {
    const p = new Pac();
    p.reset();
    p.x = 1.5;
    p.y = 1.5;
    p.dir = 'up';
    p.update(0.1, maze, 1, false);
    p.want = 'up';
    p.want = 'right';
    p.update(0.016, maze, 1, false);
    expect(p.dir).toBe('right');
  });
});
