export class Loop {
  private raf = 0;
  private last = performance.now();
  private acc = 0;
  private readonly step = 1 / 120;

  constructor(
    private updateFn: (dt: number) => void,
    private drawFn: () => void,
  ) {}

  start(): void {
    const tick = (now: number): void => {
      this.raf = requestAnimationFrame(tick);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25;
      this.acc += dt;
      let guard = 30;
      while (this.acc >= this.step && guard-- > 0) {
        this.updateFn(this.step);
        this.acc -= this.step;
      }
      this.drawFn();
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}
