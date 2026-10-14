import type { Dir } from '../game/constants';

export class Input {
  want: Dir | null = null;
  want2: Dir | null = null;
  onPause?: () => void;
  onAction?: () => void;
  onMute?: () => void;
  onJump?: () => void;
  onShoot?: () => void;
  onUsePlayer?: (player: 1 | 2) => void;
  private keys: Record<string, Dir> = {
    KeyW: 'up',
    KeyS: 'down',
    KeyA: 'left',
    KeyD: 'right',
  };

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.preventButtonFocus();
    this.bindSwipe();
    this.bindDpad();
  }

  private preventButtonFocus(): void {
    document.addEventListener('pointerdown', (e) => {
      const b = (e.target as HTMLElement | null)?.closest?.('button');
      if (b && !b.closest('#dpad')) e.preventDefault();
    });
    document.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null;
      if (b) b.blur();
    });
  }

  private onKey(e: KeyboardEvent): void {
    const dir = this.keys[e.code];
    if (dir) {
      e.preventDefault();
      this.want = dir;
      return;
    }
    const p2: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (p2[e.code]) {
      e.preventDefault();
      this.want2 = p2[e.code];
      return;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') this.onPause?.();
    else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
      if (e.code === 'Space') this.onJump?.();
      else this.onUsePlayer?.(2) ?? this.onAction?.();
    } else if (e.code === 'KeyM') this.onMute?.();
    else if (e.code === 'KeyX' || e.code === 'KeyF') this.onUsePlayer?.(1) ?? this.onShoot?.();
  }

  setTouch(dir: Dir): void {
    this.want = dir;
  }

  private bindSwipe(): void {
    let sx = 0;
    let sy = 0;
    let active = false;
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        const t = e.changedTouches[0];
        sx = t.clientX;
        sy = t.clientY;
        active = true;
      },
      { passive: true },
    );
    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!active) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if (Math.hypot(dx, dy) < 24) return;
        active = false;
        if (Math.abs(dx) > Math.abs(dy)) this.want = dx > 0 ? 'right' : 'left';
        else this.want = dy > 0 ? 'down' : 'up';
      },
      { passive: true },
    );
    this.canvas.addEventListener('touchend', () => (active = false), { passive: true });
  }

  private bindDpad(): void {
    document.querySelectorAll<HTMLButtonElement>('#dpad .dp').forEach((btn) => {
      const dir = btn.dataset.dir as Dir;
      const press = (e: Event): void => {
        e.preventDefault();
        btn.blur();
        this.want = dir;
      };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('mousedown', press);
    });
  }
}
