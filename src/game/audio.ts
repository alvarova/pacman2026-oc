export type SfxName =
  | 'waka'
  | 'power'
  | 'eatGhost'
  | 'death'
  | 'fruit'
  | 'extraLife'
  | 'levelClear'
  | 'secret'
  | 'hop'
  | 'land'
  | 'shoot'
  | 'arm'
  | 'uiClick';

export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenOscs: OscillatorNode[] = [];
  private frightGain: GainNode | null = null;
  private frightOsc: OscillatorNode | null = null;
  private eyesGain: GainNode | null = null;
  private eyesOsc: OscillatorNode | null = null;
  private wakaFlip = false;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('pacman26.muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  ensure(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('pacman26.muted', m ? '1' : '0');
    } catch {
      console.warn('No se pudo guardar la preferencia de audio');
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  play(name: SfxName): void {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'waka': {
        this.wakaFlip = !this.wakaFlip;
        if (this.wakaFlip) this.tone(520, 0.07, 'square', 0.12, 190);
        else this.tone(190, 0.07, 'square', 0.12, 520);
        break;
      }
      case 'power': {
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.09, 'square', 0.1, undefined, i * 0.06));
        break;
      }
      case 'eatGhost': {
        this.tone(200, 0.28, 'sawtooth', 0.14, 950);
        this.tone(100, 0.12, 'square', 0.1, 40, 0.02);
        break;
      }
      case 'death': {
        this.tone(620, 0.9, 'sawtooth', 0.16, 60);
        this.tone(240, 0.5, 'triangle', 0.12, 50, 0.75);
        this.tone(120, 0.5, 'triangle', 0.12, 40, 0.95);
        break;
      }
      case 'fruit': {
        this.tone(880, 0.12, 'sine', 0.14);
        this.tone(1318, 0.22, 'sine', 0.12, undefined, 0.1);
        break;
      }
      case 'extraLife': {
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.12, undefined, i * 0.11));
        break;
      }
      case 'levelClear': {
        [523, 587, 659, 784, 880, 1046, 1318].forEach((f, i) =>
          this.tone(f, 0.12, 'square', 0.1, undefined, i * 0.07),
        );
        break;
      }
      case 'secret': {
        this.tone(660, 0.1, 'triangle', 0.12, 990);
        this.tone(990, 0.16, 'triangle', 0.1, 1320, 0.08);
        break;
      }
      case 'hop': {
        this.tone(240, 0.18, 'square', 0.12, 680);
        break;
      }
      case 'land': {
        this.tone(160, 0.09, 'square', 0.13, 70);
        break;
      }
      case 'shoot': {
        this.tone(950, 0.13, 'square', 0.16, 110);
        this.tone(220, 0.06, 'sawtooth', 0.1, 60);
        break;
      }
      case 'arm': {
        this.tone(520, 0.08, 'triangle', 0.12, 780);
        this.tone(780, 0.1, 'triangle', 0.1, 1040, 0.07);
        break;
      }
      case 'uiClick': {
        this.tone(700, 0.05, 'square', 0.08);
        break;
      }
    }
  }

  startSiren(progress: number): void {
    if (!this.ctx || !this.master) return;
    if (!this.sirenOscs.length) {
      const g = this.ctx.createGain();
      g.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      g.connect(lp).connect(this.master);
      for (const det of [0, 4]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.detune.value = det;
        o.connect(g);
        o.start();
        this.sirenOscs.push(o);
      }
      this.sirenGain = g;
    }
    const base = 120 + progress * 150;
    const t = this.ctx.currentTime;
    this.sirenOscs[0].frequency.setTargetAtTime(base, t, 0.2);
    this.sirenOscs[1].frequency.setTargetAtTime(base * 1.01, t, 0.2);
    this.sirenGain?.gain.setTargetAtTime(0.045, t, 0.15);
  }

  stopSiren(): void {
    if (this.sirenGain && this.ctx) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  setFright(active: boolean): void {
    if (!this.ctx || !this.master) return;
    if (active) {
      this.stopSiren();
      if (!this.frightOsc) {
        const g = this.ctx.createGain();
        g.gain.value = 0;
        const o = this.ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 320;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 6;
        const lg = this.ctx.createGain();
        lg.gain.value = 130;
        lfo.connect(lg).connect(o.frequency);
        o.connect(g).connect(this.master);
        o.start();
        lfo.start();
        this.frightOsc = o;
        this.frightGain = g;
      }
      this.frightGain?.gain.setTargetAtTime(0.04, this.ctx.currentTime, 0.1);
    } else {
      this.frightGain?.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
    }
  }

  setEyes(active: boolean): void {
    if (!this.ctx || !this.master) return;
    if (active) {
      if (!this.eyesOsc) {
        const g = this.ctx.createGain();
        g.gain.value = 0;
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 880;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 9;
        const lg = this.ctx.createGain();
        lg.gain.value = 0.03;
        lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(this.master);
        o.start();
        lfo.start();
        this.eyesOsc = o;
        this.eyesGain = g;
      }
      this.eyesGain?.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.1);
    } else {
      this.eyesGain?.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
    }
  }

  stopAllLoops(): void {
    this.stopSiren();
    this.setFright(false);
    this.setEyes(false);
  }
}
