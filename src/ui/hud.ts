import { GHOST_COLORS, GHOST_ROLES, type GhostKind } from '../game/constants';
import type { Game } from '../game/engine';
import { drawGhost } from '../render/sprites';

const MAP_INFO = {
  name: 'JARDÍN ENCANTADO',
  zone: 'ZONA 1 — EL LABERINTO VERDE',
  blurb: 'Un jardín tranquilo de día.\nUna persecución retorcida de noche.',
};

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export class Hud {
  private scoreEl: HTMLElement;
  private recordEl: HTMLElement;
  private levelEl: HTMLElement;
  private levelBarEl: HTMLElement;
  private livesEl: HTMLElement;
  private applesEl: HTMLElement;
  private powerEl: HTMLElement;
  private secretsEl: HTMLElement;
  private collectEl: HTMLElement;
  private powerBarEl: HTMLElement;
  private powerTimeEl: HTMLElement;
  private berryEl: HTMLElement;
  private multEl: HTMLElement;
  private weaponEl: HTMLElement;
  private conditionEl: HTMLElement;
  private noteEl: HTMLElement;
  private fruitNoteEl: HTMLElement;
  private last = '';

  constructor(private game: Game) {
    const left = document.getElementById('hud-left')!;
    left.append(
      el(`
      <div class="panel panel-score">
        <div class="panel-head"><span class="label">PUNTOS</span><span class="label best">RÉCORD <b id="hud-record">000000</b></span></div>
        <div class="score-value" id="hud-score">000000</div>
        <div class="level-row">
          <span class="label">NIVEL <b id="hud-level">01</b></span>
          <span class="label" id="hud-progress-pct">0%</span>
        </div>
        <div class="bar"><div class="bar-fill" id="hud-level-bar"></div></div>
        <div class="lives-row"><span class="label">VIDAS</span><span class="lives" id="hud-lives"></span></div>
      </div>`),
      el(`
      <div class="panel">
        <div class="panel-head"><span class="label">PROGRESO DEL LABERINTO</span></div>
        <div class="stat-row"><span class="stat-ico ico-apple"></span><span class="stat-name">MANZANAS</span><span class="stat-val" id="hud-apples">0 / 0</span></div>
        <div class="stat-row"><span class="stat-ico ico-power"></span><span class="stat-name">MANZANAS DORADAS</span><span class="stat-val" id="hud-power">0 / 4</span></div>
        <div class="stat-row"><span class="stat-ico ico-secret"></span><span class="stat-name">CAMINOS SECRETOS</span><span class="stat-val" id="hud-secrets">0 / 3</span></div>
        <div class="stat-row"><span class="stat-ico ico-key"></span><span class="stat-name">COLECCIONABLES</span><span class="stat-val" id="hud-collect">0 / 2</span></div>
      </div>`),
      el(`
      <div class="panel panel-map">
        <div class="map-art"></div>
        <div class="panel-head"><span class="map-name">${MAP_INFO.name}</span></div>
        <div class="map-zone">${MAP_INFO.zone}</div>
        <div class="map-blurb">${MAP_INFO.blurb.replace('\n', '<br/>')}</div>
      </div>`),
    );

    const right = document.getElementById('hud-right')!;
    right.append(
      el(`<div class="panel">
        <div class="panel-head"><span class="label">FANTASMAS</span></div>
        <div id="ghost-list"></div>
      </div>`),
      el(`
      <div class="panel">
        <div class="panel-head"><span class="label">SISTEMA</span></div>
        <div class="stat-row sys"><span class="stat-ico ico-bolt"></span><span class="stat-name">PODER</span><span class="stat-val wide"><span class="bar mini"><span class="bar-fill cyan" id="hud-power-bar"></span></span><b id="hud-power-time">--</b></span></div>
        <div class="stat-row"><span class="stat-ico ico-berry"></span><span class="stat-name">EFECTO BAYA</span><span class="stat-val" id="hud-berry">--</span></div>
        <div class="stat-row"><span class="stat-ico ico-mult"></span><span class="stat-name">MULTIPLICADOR</span><span class="stat-val" id="hud-mult">x1</span></div>
        <div class="stat-row"><span class="stat-ico ico-gun"></span><span class="stat-name">ARMA</span><span class="stat-val" id="hud-weapon">--</span></div>
        <div class="stat-row"><span class="stat-ico ico-star"></span><span class="stat-name">ESTADO</span><span class="stat-val" id="hud-condition">ESTABLE</span></div>
      </div>`),
      el(`
      <div class="panel panel-notes">
        <div class="panel-head"><span class="label">NOTAS DE CAMPO</span></div>
        <div class="note-card">
          <div class="note-art" id="note-art"></div>
          <div class="note-body">
            <div class="note-title" id="note-title">MANZANA DORADA</div>
            <div class="note-text" id="note-text">Otorga invencibilidad temporal. Los fantasmas se vuelven vulnerables y pueden ser comidos.</div>
          </div>
        </div>
      </div>`),
    );

    this.scoreEl = document.getElementById('hud-score')!;
    this.recordEl = document.getElementById('hud-record')!;
    this.levelEl = document.getElementById('hud-level')!;
    this.levelBarEl = document.getElementById('hud-level-bar')!;
    this.livesEl = document.getElementById('hud-lives')!;
    this.applesEl = document.getElementById('hud-apples')!;
    this.powerEl = document.getElementById('hud-power')!;
    this.secretsEl = document.getElementById('hud-secrets')!;
    this.collectEl = document.getElementById('hud-collect')!;
    this.powerBarEl = document.getElementById('hud-power-bar')!;
    this.powerTimeEl = document.getElementById('hud-power-time')!;
    this.berryEl = document.getElementById('hud-berry')!;
    this.multEl = document.getElementById('hud-mult')!;
    this.weaponEl = document.getElementById('hud-weapon')!;
    this.conditionEl = document.getElementById('hud-condition')!;
    this.noteEl = document.getElementById('note-text')!;
    this.fruitNoteEl = document.getElementById('note-title')!;

    const list = document.getElementById('ghost-list')!;
    const kinds: GhostKind[] = ['blinky', 'pinky', 'inky', 'clyde'];
    for (const kind of kinds) {
      const role = GHOST_ROLES[kind];
      const row = el(`
        <div class="ghost-row">
          <canvas class="ghost-avatar" width="64" height="64" data-kind="${kind}"></canvas>
          <div class="ghost-meta">
            <div class="ghost-name" style="color:${GHOST_COLORS[kind].main}">${role.name}</div>
            <div class="ghost-role">${role.role}</div>
          </div>
          <div class="ghost-tag" style="color:${GHOST_COLORS[kind].main}">${role.tag}</div>
        </div>`);
      list.append(row);
      const cv = row.querySelector('canvas')!;
      const c2 = cv.getContext('2d')!;
      c2.scale(2, 2);
      drawGhost(c2, 16, 17, 11, kind, 'down', 0.5, 'normal');
    }

    const noteArt = document.getElementById('note-art')!;
    const nc = document.createElement('canvas');
    nc.width = 72;
    nc.height = 72;
    noteArt.append(nc);
    this.game.events.onScore?.(this.game.score, this.game.record);
  }

  update(): void {
    const g = this.game;
    const sig = [
      g.score,
      g.record,
      g.level,
      g.lives,
      g.applesEaten,
      g.powerEaten,
      g.secretsFound.size,
      g.collectibles,
      Math.ceil(g.fright * 4),
      g.combo,
      g.fruitActive ? g.fruitIdx : -1,
      g.state,
      g.pacArmed ? 1 : 0,
      g.armedGhost ? 1 : 0,
      Math.ceil(g.ghostAimT * 4),
    ].join('|');
    if (sig === this.last) return;
    this.last = sig;

    this.scoreEl.textContent = String(g.score).padStart(6, '0');
    this.recordEl.textContent = String(g.record).padStart(6, '0');
    this.levelEl.textContent = String(g.level).padStart(2, '0');
    const total = g.maze.totalApples + g.maze.totalPower;
    const pct = total ? Math.round(((g.applesEaten + g.powerEaten) / total) * 100) : 0;
    this.levelBarEl.style.width = `${pct}%`;
    const pctEl = document.getElementById('hud-progress-pct')!;
    pctEl.textContent = `${pct}%`;
    this.livesEl.innerHTML = '';
    for (let i = 0; i < Math.max(g.lives, 0); i++) {
      const life = document.createElement('span');
      life.className = 'life-pac';
      this.livesEl.append(life);
    }
    this.applesEl.textContent = `${g.applesEaten} / ${g.maze.totalApples}`;
    this.powerEl.textContent = `${g.powerEaten} / ${g.maze.totalPower}`;
    this.secretsEl.textContent = `${g.secretsFound.size} / ${g.maze.secretCount}`;
    this.collectEl.textContent = `${g.collectibles} / 2`;

    if (g.fright > 0) {
      this.powerBarEl.style.width = `${(g.fright / g.frightDur) * 100}%`;
      this.powerTimeEl.textContent = `${g.fright.toFixed(1)}s`;
      this.berryEl.textContent = 'INVENCIBLE';
      this.berryEl.classList.add('hot');
    } else {
      this.powerBarEl.style.width = '0%';
      this.powerTimeEl.textContent = '--';
      this.berryEl.textContent = '--';
      this.berryEl.classList.remove('hot');
    }
    this.multEl.textContent = `x${Math.pow(2, Math.min(g.combo, 3))}`;
    this.weaponEl.textContent = g.pacArmed ? 'X LISTA' : g.armedGhost ? 'FANTASMA' : '--';
    this.weaponEl.classList.toggle('hot', g.pacArmed || !!g.armedGhost);
    this.conditionEl.textContent = g.fright > 0 ? 'ALERTA' : 'ESTABLE';
    this.conditionEl.classList.toggle('hot', g.fright > 0);

    if (g.pacArmed) {
      this.fruitNoteEl.textContent = 'PISTOLA CARGADA';
      this.noteEl.textContent = 'Presioná X para disparar. Una sola bala: elegí bien el momento.';
    } else if (g.armedGhost) {
      this.fruitNoteEl.textContent = '¡FANTASMA ARMADO!';
      this.noteEl.textContent =
        'Un fantasma tiene la pistola. No te cruces en su línea de visión o saltá a tiempo.';
    } else if (g.fright > 0) {
      this.fruitNoteEl.textContent = '¡FURIA DORADA!';
      this.noteEl.textContent = `Cada fantasma comido vale el doble del anterior. Multiplicador actual: x${Math.pow(2, Math.min(g.combo, 3))}.`;
    } else if (g.fruitActive) {
      this.fruitNoteEl.textContent = g.fruitIdx === 0 ? 'CEREZAS' : 'LLAVE DORADA';
      this.noteEl.textContent =
        g.fruitIdx === 0
          ? 'Apareció fruta junto a la fuente. Vence antes de que desaparezca.'
          : 'La llave dorada vale 1000 puntos. Corre, no espera.';
    } else if (g.elroy > 0) {
      this.fruitNoteEl.textContent = 'BLINKY ENFURECIDO';
      this.noteEl.textContent = 'Quedan pocas manzanas: Blinky acelera y nunca deja de perseguirte.';
    } else {
      this.fruitNoteEl.textContent = 'MANZANA DORADA';
      this.noteEl.textContent =
        'Otorga invencibilidad temporal. Los fantasmas se vuelven vulnerables y pueden ser comidos.';
    }
  }
}
