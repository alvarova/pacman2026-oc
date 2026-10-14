import { describe, expect, it } from 'vitest';
import { COOP } from '../src/game/constants';
import { Game } from '../src/game/engine';

function playing(): Game {
  const game = new Game();
  game.setStatePublic('playing');
  return game;
}

describe('modo cooperativo local', () => {
  it('una captura envía a la cárcel sin descontar vida y habilita una llave', () => {
    const game = playing();
    const ghost = game.ghosts[0];
    ghost.x = game.pac.x;
    ghost.y = game.pac.y;
    game.update(1 / 120);
    expect(game.pac.condition).toBe('jailed');
    expect(game.lives).toBe(COOP.lives);
    expect(game.rescueKey).not.toBeNull();
  });

  it('dos presos descuentan exactamente una vida y reinician la ronda', () => {
    const game = playing();
    (game as any).capture(game.pac);
    (game as any).capture(game.pac2);
    game.update(1 / 120);
    expect(game.state).toBe('dying');
    game.update(1.01);
    expect(game.lives).toBe(COOP.lives - 1);
    expect(game.pac.condition).toBe('active');
    expect(game.pac2.condition).toBe('active');
    game.update(2);
    expect(game.lives).toBe(COOP.lives - 1);
  });

  it('hielo y burbuja respetan sus duraciones y no se prolongan', () => {
    const game = playing();
    const hit = (game as any).applyHit.bind(game);
    hit(game.pac, 'ice');
    const until = game.pac.conditionUntil;
    hit(game.pac, 'ice');
    expect(game.pac.conditionUntil).toBe(until);
    game.update(COOP.iceDuration + 0.01);
    expect(game.pac.condition).toBe('active');
    game.pac.immuneUntil = 0;
    hit(game.pac, 'soap');
    expect(game.pac.condition).toBe('bubbled');
    game.update(COOP.bubbleDuration + 0.01);
    expect(game.pac.condition).toBe('active');
  });

  it('jabón puede afectar al compañero pero no al emisor', () => {
    const game = playing();
    game.pac.weapon = 'soap';
    game.pac.ammo = 1;
    game.pac.x = 5.5;
    game.pac.y = 7.5;
    game.pac.facing = 'right';
    game.pac2.x = 6.0;
    game.pac2.y = 7.5;
    game.pac2.dir = null;
    expect(game.firePac(1)).toBe(true);
    game.update(1 / 30);
    expect(game.pac.condition).toBe('active');
    expect(game.pac2.condition).toBe('bubbled');
  });

  it('comer cada fantasma una vez libera al preso y retira la llave', () => {
    const game = playing();
    (game as any).capture(game.pac2);
    for (const ghost of game.ghosts) (game as any).eatGhost(ghost);
    expect(game.pac2.condition).toBe('active');
    expect(game.rescueCycle).toBeNull();
    expect(game.rescueKey).toBeNull();
  });
});
