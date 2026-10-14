import { Loop } from './core/loop';
import { Input } from './core/input';
import { Game } from './game/engine';
import { AudioSys } from './game/audio';
import { Particles, FloatTexts } from './render/particles';
import { Renderer } from './render/renderer';
import { makeItemSprites } from './render/sprites';
import { loadSheet } from './render/sheet';
import { Hud } from './ui/hud';
import { Screens } from './ui/screens';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;

  let sheet: Partial<Record<string, HTMLCanvasElement>> | null = null;
  try {
    sheet = await loadSheet('assets/sprite-sheet.png');
  } catch {
    console.warn('Sprite sheet no disponible, uso sprites procedurales');
  }
  const items = makeItemSprites(sheet);

  const game = new Game();
  const audio = new AudioSys();
  const particles = new Particles();
  const floats = new FloatTexts();
  const renderer = new Renderer(canvas, game, items, particles, floats);
  const screens = new Screens(game);
  const hud = new Hud(game);
  const input = new Input(canvas);

  game.events.onState = (s, prev) => {
    screens.show(s, prev);
    if (s === 'menu' || s === 'gameover' || s === 'levelclear' || s === 'dying') {
      audio.stopAllLoops();
    }
    if (s === 'playing' && prev === 'ready') {
      audio.resume();
    }
    if (s === 'paused') audio.stopAllLoops();
  };
  game.events.onAppleEaten = (x, y, power) => {
    const cx = x * 32 + 16;
    const cy = y * 32 + 16;
    if (power) {
      audio.play('power');
      particles.emit(cx, cy, 26, '#ffd23f', { speed: 5, size: 3, life: 0.8 });
      renderer.kick(1.6);
    } else {
      audio.play('waka');
      particles.emit(cx, cy, 4, '#ff6b5e', { speed: 2, size: 1.6, life: 0.35, grav: 6, glow: false });
    }
  };
  game.events.onGhostEaten = (kind, pts, x, y) => {
    audio.play('eatGhost');
    particles.emit(x * 32 + 16, y * 32 + 16, 30, kind === 'blinky' ? '#ff5b4d' : kind === 'pinky' ? '#ff8ad2' : kind === 'inky' ? '#5ce1ff' : '#ffb45e', {
      speed: 6,
      size: 2.6,
      life: 0.7,
    });
    floats.add(x * 32 + 16, y * 32 + 8, String(pts), '#8ef7ff', 15);
    renderer.kick(2.4);
  };
  game.events.onDeath = (x, y) => {
    audio.play('death');
    particles.emit(x * 32 + 16, y * 32 + 16, 36, '#ffd23f', { speed: 6, size: 3, life: 1, grav: 8 });
    renderer.kick(6);
  };
  game.events.onFruitEaten = (idx, pts, x, y) => {
    audio.play('fruit');
    const color = idx === 0 ? '#ff5a6e' : '#ffd23f';
    particles.emit(x * 32 + 16, y * 32 + 16, 22, color, { speed: 4.5, size: 2.4, life: 0.8 });
    floats.add(x * 32 + 16, y * 32, String(pts), color, 14);
    renderer.kick(1.4);
  };
  game.events.onSecretFound = (id, x, y) => {
    audio.play('secret');
    particles.emit(x * 32 + 16, y * 32 + 16, 26, '#6ef7a5', { speed: 4, size: 2.4, life: 0.9, grav: 2 });
    floats.add(x * 32 + 16, y * 32, '+100', '#6ef7a5', 13);
    void id;
  };
  game.events.onLevelClear = () => {
    audio.play('levelClear');
    audio.stopAllLoops();
  };
  game.events.onExtraLife = () => {
    audio.play('extraLife');
    floats.add(game.pac.x * 32, game.pac.y * 32 - 20, 'VIDA EXTRA', '#ffe97a', 16);
  };

  input.onPause = () => {
    if (game.state === 'playing' || game.state === 'ready' || game.state === 'paused') {
      game.togglePause();
      audio.play('uiClick');
    }
  };
  input.onMute = () => {
    audio.setMuted(!audio.muted);
    updateMuteIcon();
  };
  input.onAction = () => {
    if (game.state === 'menu' || game.state === 'gameover') {
      game.startGame();
      audio.resume();
    } else if (game.state === 'paused') {
      game.togglePause();
    }
  };
  input.onJump = () => {
    if (game.state === 'playing' || game.state === 'ready') {
      if (game.pac.tryJump()) {
        particles.emit(game.pac.x * 32, game.pac.y * 32 + 10, 6, '#cdbb95', {
          speed: 2.5,
          size: 1.8,
          life: 0.4,
          grav: 8,
          glow: false,
        });
      }
    } else {
      input.onAction?.();
    }
  };
  input.onShoot = () => {
    game.firePac();
  };
  input.onUsePlayer = (player) => {
    if (game.state === 'playing' || game.state === 'ready') game.firePac(player);
    else if (player === 2) input.onAction?.();
  };
  document.getElementById('btn-jump')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.onJump?.();
  });
  document.getElementById('btn-fire')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.onShoot?.();
  });
  game.events.onWeaponPickup = (who, x, y) => {
    audio.play('arm');
    const color = who === 'pac' ? '#ffe97a' : '#ff5b4d';
    particles.emit(x * 32 + 16, y * 32 + 16, 18, color, { speed: 4, size: 2.2, life: 0.6 });
    floats.add(x * 32 + 16, y * 32 - 6, who === 'pac' ? '¡PISTOLA!' : 'FANTASMA ARMADO', color, 13);
    if (who === 'ghost') renderer.kick(2);
  };
  game.events.onShoot = (x, y, from) => {
    audio.play('shoot');
    renderer.kick(from === 'pac' ? 2 : 1.6);
    particles.emit(x * 32 + 16, y * 32 + 16, 10, from === 'pac' ? '#ffe97a' : '#ff8a7a', {
      speed: 5,
      size: 2,
      life: 0.3,
      grav: 0,
    });
  };
  game.events.onBulletGone = (x, y) => {
    particles.emit(x * 32 + 16, y * 32 + 16, 8, '#ffd9a0', {
      speed: 3,
      size: 1.6,
      life: 0.35,
      glow: false,
    });
  };

  const btnPlayNav = document.querySelector<HTMLButtonElement>('#nav .nav-btn[data-nav="jugar"]');
  btnPlayNav?.addEventListener('click', () => {
    if (game.state === 'menu') {
      audio.resume();
      game.startGame();
    } else {
      game.togglePause();
    }
  });
  const btnMute = document.getElementById('btn-mute')!;
  btnMute.addEventListener('click', () => {
    audio.resume();
    audio.setMuted(!audio.muted);
    updateMuteIcon();
  });
  const btnPause = document.getElementById('btn-pause')!;
  btnPause.addEventListener('click', () => input.onPause?.());
  document.getElementById('btn-gear')?.addEventListener('click', () => {
    audio.resume();
    audio.setMuted(!audio.muted);
    updateMuteIcon();
  });
  function updateMuteIcon(): void {
    const path = document.getElementById('mute-path');
    if (path) {
      path.setAttribute(
        'd',
        audio.muted
          ? 'M3 9v6h4l5 5V4L7 9H3zm14.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4L14.8 12l-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z'
          : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z',
      );
    }
  }
  updateMuteIcon();

  screens.bindAction(() => audio.resume());

  game.setStatePublic('menu');

  let lastJumpPhase: string = 'idle';

  const loop = new Loop(
    (dt) => {
      if (input.want) {
        game.pac.want = input.want;
        input.want = null;
      }
      if (input.want2) {
        game.pac2.want = input.want2;
        input.want2 = null;
      }
      game.update(dt);
      const jp = game.pac.jumpPhase();
      if (jp !== lastJumpPhase) {
        if (jp === 'air') {
          audio.play('hop');
        }
        if (jp === 'land') {
          audio.play('land');
          renderer.kick(1.2);
          particles.emit(game.pac.x * 32, game.pac.y * 32 + 10, 12, '#cdbb95', {
            speed: 3.5,
            size: 2,
            life: 0.45,
            grav: 9,
            glow: false,
          });
        }
        lastJumpPhase = jp;
      }
      if (game.state === 'playing') {
        if (game.fright > 0) {
          audio.setFright(true);
          audio.setEyes(game.ghosts.some((g) => g.state === 'eyes'));
        } else {
          audio.setFright(false);
          audio.setEyes(game.ghosts.some((g) => g.state === 'eyes'));
          const total = game.maze.totalApples + game.maze.totalPower;
          audio.startSiren((game.applesEaten + game.powerEaten) / total);
        }
      }
    },
    () => {
      renderer.draw();
      hud.update();
    },
  );
  loop.start();
}

void boot();
