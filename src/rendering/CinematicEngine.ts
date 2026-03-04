// ── CinematicEngine.ts ───────────────────────────────────────────────────────
// Shared infrastructure for all DOM-based cinematic cutscenes.
// Mirrors the engine API used in the browser version of RNGGame.

export interface EngineConfig {
  shakeIntensity?: number;
}

export class CinematicEngine {
  private _actx: AudioContext | null = null;
  private _shakeEl: HTMLElement | null = null;

  constructor(private config: EngineConfig = {}) {}

  // ── Audio ──────────────────────────────────────────────────────────────────
  audio(): AudioContext | null {
    if (!this._actx) {
      try {
        this._actx = new (
          (window as any).AudioContext || (window as any).webkitAudioContext
        )();
      } catch { return null; }
    }
    if (this._actx.state === 'suspended') this._actx.resume().catch(() => {});
    return this._actx;
  }

  beep(
    ctx: AudioContext,
    t: number,
    freq: number,
    dur: number,
    vol = 0.1,
    type: OscillatorType = 'sine',
  ): void {
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  noise(
    ctx: AudioContext,
    t: number,
    dur: number,
    vol: number,
    bpFreq: number,
    bpQ = 1.0,
  ): void {
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = bpFreq; bp.Q.value = bpQ;
      const g = ctx.createGain();
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.15);
      g.gain.setValueAtTime(vol, t + dur * 0.6);
      g.gain.linearRampToValueAtTime(0, t + dur);
      src.start(t); src.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  // ── Screen shake ───────────────────────────────────────────────────────────
  shake(intensity = 40): void {
    const el = this._shakeEl ?? document.body;
    el.style.animation = 'none';
    // Force reflow
    void el.offsetWidth;
    const amt = Math.max(2, intensity * 0.1);
    const kf = `@keyframes _eng_shake {
      0%,100%{transform:translate(0,0)}
      10%{transform:translate(${-amt}px,${amt*1.2}px)}
      25%{transform:translate(${amt*1.1}px,${-amt}px)}
      40%{transform:translate(${-amt*0.9}px,${amt*0.8}px)}
      55%{transform:translate(${amt*0.7}px,${-amt*0.6}px)}
      70%{transform:translate(${-amt*0.4}px,${amt*0.3}px)}
      85%{transform:translate(${amt*0.2}px,${-amt*0.15}px)}
    }`;
    // Inject or update
    let shakeStyle = document.getElementById('_eng_shake_kf') as HTMLStyleElement;
    if (!shakeStyle) {
      shakeStyle = document.createElement('style');
      shakeStyle.id = '_eng_shake_kf';
      document.head.appendChild(shakeStyle);
    }
    shakeStyle.textContent = kf;
    el.style.animation = `_eng_shake 0.9s ease-out forwards`;
    setTimeout(() => { el.style.animation = ''; }, 920);
  }

  closeAudio(): void {
    try { this._actx?.close(); } catch { /* ignore */ }
    this._actx = null;
  }
}

// ── Shared spawn registry per scene ──────────────────────────────────────────
export class SpawnRegistry {
  private els: HTMLElement[] = [];

  spawn(el: HTMLElement): HTMLElement {
    this.els.push(el);
    document.body.appendChild(el);
    return el;
  }

  mk(cls: string): HTMLElement {
    const el = document.createElement('div');
    el.className = cls;
    return el;
  }

  killAll(): void {
    this.els.forEach(e => { try { e.remove(); } catch { /* */ } });
    this.els = [];
  }
}

// ── Timeline scheduler ────────────────────────────────────────────────────────
export class Timeline {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stopped = false;

  after(ms: number, fn: () => void): void {
    const id = setTimeout(() => {
      if (!this.stopped) fn();
    }, ms);
    this.timers.push(id);
  }

  stop(): void {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  reset(): void {
    this.stop();
    this.stopped = false;
  }
}

// ── CSS injection helper ──────────────────────────────────────────────────────
export function injectCSS(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}

// ── Math helpers ──────────────────────────────────────────────────────────────
export const rnd  = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const rndI = (lo: number, hi: number) => Math.floor(rnd(lo, hi + 1));
