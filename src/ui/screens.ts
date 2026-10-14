import type { Game, GameState } from '../game/engine';

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export class Screens {
  private overlay = document.getElementById('overlay')!;
  private onAction?: () => void;

  constructor(private game: Game) {}

  bindAction(fn: () => void): void {
    this.onAction = fn;
  }

  show = (s: GameState, prev: GameState): void => {
    if (s === 'menu') this.menu();
    else if (s === 'paused') this.pause();
    else if (s === 'gameover') this.gameOver();
    else this.hide();
    void prev;
  };

  hide(): void {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
  }

  menu(): void {
    this.overlay.innerHTML = '';
    const div = el(`
      <div class="screen menu-screen">
        <div class="menu-ghosts">
          <canvas width="72" height="72" data-k="blinky"></canvas>
          <canvas width="72" height="72" data-k="pinky"></canvas>
          <canvas width="72" height="72" data-k="inky"></canvas>
          <canvas width="72" height="72" data-k="clyde"></canvas>
        </div>
        <h1 class="menu-logo">PAC-MAN <span>2026</span></h1>
        <div class="menu-sub">THE LIVING MAZE</div>
        <p class="menu-desc">El laberinto vive. Cuatro fantasmas te cazan con personalidad propia.<br/>Come las 265 manzanas, enciende las doradas y encuentra los 3 caminos secretos.</p>
        <button class="btn-primary" id="btn-play">JUGAR</button>
        <div class="menu-hint">FLECHAS / WASD moverte · ESPACIO salta · X dispara · P pausa · M silencio</div>
        <div class="menu-record">RÉCORD <b>${String(this.game.record).padStart(6, '0')}</b></div>
      </div>`);
    this.overlay.append(div);
    this.overlay.classList.remove('hidden');
    div.querySelectorAll<HTMLCanvasElement>('canvas[data-k]').forEach((cv) => {
      import('../render/sprites').then(({ drawGhost }) => {
        const c2 = cv.getContext('2d')!;
        c2.scale(2, 2);
        const k = cv.dataset.k as 'blinky';
        drawGhost(c2, 18, 19, 12, k, 'down', 0.5, 'normal');
      });
    });
    div.querySelector('#btn-play')!.addEventListener('click', () => {
      this.game.startGame();
      this.onAction?.();
    });
  }

  pause(): void {
    this.overlay.innerHTML = '';
    const div = el(`
      <div class="screen">
        <h2 class="screen-title">PAUSA</h2>
        <div class="screen-stack">
          <button class="btn-primary" id="btn-resume">REANUDAR</button>
          <button class="btn-ghost" id="btn-restart">REINICIAR NIVEL</button>
          <button class="btn-ghost" id="btn-quit">SALIR AL MENÚ</button>
        </div>
      </div>`);
    this.overlay.append(div);
    this.overlay.classList.remove('hidden');
    div.querySelector('#btn-resume')!.addEventListener('click', () => {
      this.game.togglePause();
      this.onAction?.();
    });
    div.querySelector('#btn-restart')!.addEventListener('click', () => {
      this.game.resetPositions();
      this.game.setStatePublic('ready');
      this.onAction?.();
    });
    div.querySelector('#btn-quit')!.addEventListener('click', () => {
      this.game.setStatePublic('menu');
      this.onAction?.();
    });
  }

  gameOver(): void {
    this.overlay.innerHTML = '';
    const div = el(`
      <div class="screen">
        <h2 class="screen-title danger">FIN DEL JUEGO</h2>
        <div class="screen-score">
          <div class="screen-score-row"><span>PUNTOS</span><b>${String(this.game.score).padStart(6, '0')}</b></div>
          <div class="screen-score-row"><span>RÉCORD</span><b>${String(this.game.record).padStart(6, '0')}</b></div>
          <div class="screen-score-row"><span>NIVEL</span><b>${String(this.game.level).padStart(2, '0')}</b></div>
        </div>
        <div class="screen-stack">
          <button class="btn-primary" id="btn-retry">REINTENTAR</button>
          <button class="btn-ghost" id="btn-quit2">SALIR AL MENÚ</button>
        </div>
      </div>`);
    this.overlay.append(div);
    this.overlay.classList.remove('hidden');
    div.querySelector('#btn-retry')!.addEventListener('click', () => {
      this.game.startGame();
      this.onAction?.();
    });
    div.querySelector('#btn-quit2')!.addEventListener('click', () => {
      this.game.setStatePublic('menu');
      this.onAction?.();
    });
  }
}
