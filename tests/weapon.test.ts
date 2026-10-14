import { describe, expect, it } from 'vitest';
import { Ghost, type GhostHost } from '../src/game/ghost';
import { Game } from '../src/game/engine';
import { parseMaze, type MazeData } from '../src/game/map';

const maze: MazeData = parseMaze();

function host(over: Partial<GhostHost> = {}): GhostHost {
  return {
    maze,
    mode: 'chase',
    levelSpeed: 1,
    fright: 0,
    elroy: 0,
    pacTile: { x: 11, y: 14 },
    pacFacing: 'left',
    blinkyTile: { x: 11, y: 9 },
    levelTime: 100,
    applesEaten: 100,
    random: () => 0.5,
    ...over,
  };
}

describe('ojos regresan a la casa', () => {
  it('los ojos de cualquier fantasma llegan a la puerta y renacen (bug: seguían a Pac)', () => {
    for (const kind of ['blinky', 'pinky', 'inky', 'clyde'] as const) {
      const g = new Ghost(kind);
      g.resetForLife();
      g.x = 2.5;
      g.y = 7.5;
      g.dir = 'right';
      g.eaten();
      expect(g.state).toBe('eyes');
      const h = host();
      for (let i = 0; i < 1500; i++) {
        g.update(1 / 120, h);
        if (g.state === 'active' || g.state === 'exiting') break;
      }
      expect(g.state === 'active' || g.state === 'exiting').toBe(true);
    }
  });
});

describe('pistola', () => {
  it('disparar requiere estar armado y consume la única bala', () => {
    const game = new Game();
    game.setStatePublic('playing');
    expect(game.firePac()).toBe(false);
    game.pacArmed = true;
    expect(game.firePac()).toBe(true);
    expect(game.pacArmed).toBe(false);
    expect(game.bullets).toHaveLength(1);
    expect(game.bullets[0].from).toBe('pac');
  });

  it('la pastilla aparece cuando el temporizador llega a cero', () => {
    const game = new Game();
    game.setStatePublic('playing');
    game.pill = null;
    game.pacArmed = false;
    game.armedGhost = null;
    game.pillTimer = 0.001;
    game.update(0.02);
    expect(game.pill).not.toBeNull();
  });

  it('la bala de Pac se detiene en una pared', () => {
    const game = new Game();
    game.setStatePublic('playing');
    game.pacArmed = true;
    game.pac.x = 1.5;
    game.pac.y = 1.5;
    game.pac.facing = 'up';
    game.firePac();
    for (let i = 0; i < 60; i++) game.update(1 / 120);
    expect(game.bullets).toHaveLength(0);
  });

  it('el fantasma armado pierde el arma si Pac lo come', () => {
    const game = new Game();
    game.setStatePublic('playing');
    const blinky = game.ghosts[0];
    blinky.resetForLife();
    game.pac.x = 11.5;
    game.pac.y = 9.5;
    game.pac.dir = 'left';
    game.fright = 5;
    game.frightDur = 6;
    blinky.frightFlag = true;
    game.armedGhost = blinky;
    game.update(1 / 120);
    expect(blinky.state).toBe('eyes');
    expect(game.armedGhost).toBeNull();
  });
});
