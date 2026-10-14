export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  grav: number;
  glow: boolean;
}

export class Particles {
  list: Particle[] = [];
  max = 420;

  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    opts: Partial<Pick<Particle, 'size' | 'grav' | 'glow'>> & { speed?: number; life?: number } = {},
  ): void {
    const speed = opts.speed ?? 3;
    const life = opts.life ?? 0.6;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.65);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.grav ? 1.5 : 0),
        life,
        maxLife: life,
        size: opts.size ?? 2.2,
        color,
        grav: opts.grav ?? 4,
        glow: opts.glow ?? true,
      });
    }
  }

  update(dt: number): void {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) {
        l.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const a = p.life / p.maxLife;
      ctx.globalAlpha = a;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.list.length = 0;
  }
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size: number;
}

export class FloatTexts {
  list: FloatText[] = [];

  add(x: number, y: number, text: string, color = '#ffe97a', size = 13): void {
    this.list.push({ x, y, text, life: 1.1, color, size });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.life -= dt;
      f.y -= dt * 18;
      if (f.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    for (const f of this.list) {
      ctx.globalAlpha = Math.min(f.life * 1.6, 1);
      ctx.font = `700 ${f.size}px Orbitron, sans-serif`;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.list.length = 0;
  }
}
