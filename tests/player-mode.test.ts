import { describe, expect, it } from 'vitest';
import { COOP } from '../src/game/constants';
import { Game } from '../src/game/engine';

describe('selección de modo de jugadores', () => {
  it('en solo sólo actualiza a Pac-Man y una captura descuenta una vida', () => {
    const game = new Game();
    game.startGame('solo');
    game.setStatePublic('playing');
    expect(game.pacs).toEqual([game.pac]);
    expect(game.firePac(2)).toBe(false);
    (game as any).capture(game.pac);
    game.update(1 / 120);
    expect(game.state).toBe('dying');
    game.update(1.01);
    expect(game.lives).toBe(COOP.lives - 1);
  });

  it('en cooperativo conserva los dos personajes activos', () => {
    const game = new Game();
    game.startGame('coop');
    expect(game.pacs).toEqual([game.pac, game.pac2]);
  });
});
