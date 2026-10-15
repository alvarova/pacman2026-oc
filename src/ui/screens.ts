import type { Game, GameState, MapId, PlayerMode } from '../game/engine';

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
        <p class="menu-desc">${this.game.mapId === 'santa-fe' ? 'Santa Fe · Bv. Gálvez y Rivadavia. Calles nocturnas, borde urbano y fantasmas al acecho.' : 'El laberinto vive. Cuatro fantasmas te cazan con personalidad propia.'}</p>
        <div class="mode-actions">
          <button class="btn-primary" id="btn-solo">JUGAR SOLO</button>
          <button class="btn-ghost" id="btn-coop">COOPERATIVO</button>
        </div>
        <div class="menu-mode-copy">${this.game.playerMode === 'coop' ? 'Modo actual: cooperativo local · J1 flechas/WASD · J2 IJKL' : 'Modo actual: solo · elegí cooperativo para sumar a Pac‑Man 2'}</div>
        <button class="btn-ghost menu-map-button" id="btn-maps">${this.game.mapId === 'santa-fe' ? 'MAPA: SANTA FE' : 'ELEGIR MAPA'}</button>
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
    const start = (mode: PlayerMode): void => { this.game.startGame(mode); this.onAction?.(); };
    div.querySelector('#btn-solo')!.addEventListener('click', () => start('solo'));
    div.querySelector('#btn-coop')!.addEventListener('click', () => start('coop'));
    div.querySelector('#btn-maps')!.addEventListener('click', () => this.mapPicker());
  }

  mapPicker(): void {
    const selected = this.game.mapId;
    this.overlay.innerHTML = '';
    const div = el(`
      <div class="screen map-picker">
        <h2 class="screen-title">MAPAS</h2>
        <p class="menu-desc">Elegí el escenario antes de comenzar la partida.</p>
        <div class="map-options">
          <button class="map-option ${selected === 'garden' ? 'selected' : ''}" data-map="garden"><b>JARDÍN VIVIENTE</b><span>El laberinto clásico</span></button>
          <button class="map-option santa ${selected === 'santa-fe' ? 'selected' : ''}" data-map="santa-fe"><b>SANTA FE · BOULEVARD</b><span>Bv. Gálvez y Rivadavia · datos OSM</span></button>
        </div>
        <button class="btn-ghost" id="btn-back">VOLVER</button>
      </div>`);
    this.overlay.append(div);
    this.overlay.classList.remove('hidden');
    div.querySelectorAll<HTMLButtonElement>('[data-map]').forEach((button) => button.addEventListener('click', () => {
      this.game.setMap(button.dataset.map as MapId);
      this.menu();
    }));
    div.querySelector('#btn-back')!.addEventListener('click', () => this.menu());
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
      this.game.startGame(this.game.playerMode);
      this.onAction?.();
    });
    div.querySelector('#btn-quit2')!.addEventListener('click', () => {
      this.game.setStatePublic('menu');
      this.onAction?.();
    });
  }
}
