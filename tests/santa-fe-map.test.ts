import { describe, expect, it } from 'vitest';
import { COLS, ROWS } from '../src/game/constants';
import { PAC_START, SANTA_FE_MAP, parseMaze, passablePac, tileAt, T } from '../src/game/map';

describe('mapa urbano de Santa Fe', () => {
  const maze = parseMaze('santa-fe');

  it('usa una trama vial distinta al laberinto y mantiene sus manzanas bloqueadas', () => {
    expect(SANTA_FE_MAP).toHaveLength(ROWS);
    for (const row of SANTA_FE_MAP) expect(row).toHaveLength(COLS);
    expect(passablePac(tileAt(maze, Math.floor(PAC_START.x), Math.floor(PAC_START.y)))).toBe(true);
    expect(tileAt(maze, 3, 3)).toBe(T.Wall);
    // Bv. Pellegrini aparece al norte del cruce, no como una fila artificial.
    expect(passablePac(tileAt(maze, 14, 3))).toBe(true);
  });

  it('conecta todas las calles coleccionables desde el cruce inicial', () => {
    const start = Math.floor(PAC_START.y) * COLS + Math.floor(PAC_START.x);
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      const x = current % COLS, y = Math.floor(current / COLS);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const next = ny * COLS + nx;
        if (!seen.has(next) && passablePac(tileAt(maze, nx, ny))) { seen.add(next); queue.push(next); }
      }
    }
    for (let i = 0; i < maze.baseApples.length; i++) if (maze.baseApples[i]) expect(seen.has(i)).toBe(true);
  });
});
