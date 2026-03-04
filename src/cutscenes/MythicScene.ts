// cutscenes/MythicScene.ts
// ═══════════════════════════════════════════════════════════════
//  M Y T H I C  ·  1 / 970
//
//  Something vast has noticed you.
//  The static before a god speaks.
//  A crown of fire descends.
//
//  Palette:
//    deep void  #060010
//    crown gold #ff8800 / #ffcc00
//    ember red  #ff2200
//    violet     #9900ff
//    white core #ffffff
//
//  Phase 0  (   0ms): Void descends. Subtle rumble.
//  Phase 1  ( 600ms): 6 distant embers drift upward.
//  Phase 2  (1800ms): Glitch flicker — brief static cuts.
//  Phase 3  (2800ms): "Something has noticed you."
//  Phase 4  (4200ms): Crown of fire assembles from arcs.
//  Phase 5  (6500ms): Crown ignites — full glow, shake.
//  Phase 6  (7200ms): Radial burst — embers outward.
//  Phase 7  (8200ms): Rarity label: M Y T H I C
//  Phase 8  (9800ms): "You were always meant to burn."
//  Phase 9  (12000ms): Fade elements.
//  Phase 10 (14000ms): Void fades. Resolve.
// ═══════════════════════════════════════════════════════════════

import { BaseCinematic } from './BaseCinematic';
import { injectCSS, rnd, rndI, SpawnRegistry, Timeline } from '../rendering/CinematicEngine';
import { RarityDefinition } from '../core/registry/RarityRegistry';

// ── Palette ───────────────────────────────────────────────────
const MG1 = '#ff8800';
const MG2 = '#ffcc00';
const MR  = '#ff2200';
const MV  = '#9900ff';
const MW  = '#ffffff';
const MB  = '#cc6600';

const CSS_ID = 'mythic-scene-styles';
const CSS = `
/* ── Void overlay ── */
.my-void {
  position:fixed;inset:0;z-index:9990;pointer-events:none;
  background:radial-gradient(ellipse at 50% 40%, #100008 0%, #060010 55%, #020004 100%);
  opacity:0;transition:opacity 1.2s ease;
}
.my-void--in  { opacity:1; }
.my-void--out { opacity:0 !important; transition:opacity 2s ease !important; }

/* ── Glitch flicker ── */
@keyframes myGlitch {
  0%,100%{ clip-path:none;transform:none;filter:none }
  5%  { clip-path:polygon(0 15%,100% 15%,100% 28%,0 28%);transform:translate(-3px,0);filter:brightness(3) }
  10% { clip-path:polygon(0 44%,100% 44%,100% 52%,0 52%);transform:translate(3px,0);filter:hue-rotate(90deg)brightness(2) }
  15% { clip-path:polygon(0 70%,100% 70%,100% 80%,0 80%);transform:translate(-2px,0) }
  20% { clip-path:none;transform:none;filter:none }
  55% { clip-path:polygon(0 8%,100% 8%,100% 14%,0 14%);transform:translate(2px,0);filter:brightness(2) }
  60% { clip-path:none;transform:none }
}
.my-glitch {
  position:fixed;inset:0;z-index:9997;pointer-events:none;
  animation:myGlitch 0.8s steps(1) forwards;
  background:rgba(255,100,0,.04);
}

/* ── Embers ── */
.my-ember {
  position:fixed;border-radius:50%;pointer-events:none;z-index:9992;
  width:var(--sz,4px);height:var(--sz,4px);
  background:radial-gradient(circle,${MW} 0%,var(--ec,${MG1}) 50%,transparent 100%);
  box-shadow:0 0 var(--eg,6px) var(--ec,${MG1});
  opacity:0;
  animation:myEmberRise var(--ed,8s) ease-in-out forwards;
  animation-delay:var(--edly,0ms);
}
@keyframes myEmberRise {
  0%  { opacity:0; transform:translateY(0) scale(0.4); }
  8%  { opacity:1; }
  85% { opacity:var(--eop,.9); transform:translateY(var(--ey,-180px)) translateX(var(--ex,0px)) scale(1); }
  100%{ opacity:0; transform:translateY(var(--ey2,-240px)) scale(0.2); }
}

/* ── Crown arcs ── */
.my-crown {
  position:fixed;left:50%;top:50%;
  transform:translate(-50%,-52%);
  pointer-events:none;z-index:9998;
  width:min(28vmin,200px);height:min(14vmin,100px);
  opacity:0;
  animation:myCrownIn 1.6s cubic-bezier(.12,.8,.2,1) forwards;
  animation-delay:var(--crdly,0ms);
}
@keyframes myCrownIn {
  0%  { opacity:0;transform:translate(-50%,-52%) scale(.2) translateY(40px);filter:blur(20px) }
  40% { opacity:.8;filter:blur(4px) }
  100%{ opacity:1;transform:translate(-50%,-52%) scale(1);filter:blur(0) }
}
.my-crown svg { width:100%;height:100%; }

/* Crown ignition glow */
.my-crown--lit svg {
  filter:
    drop-shadow(0 0 8px ${MG2})
    drop-shadow(0 0 20px ${MG1})
    drop-shadow(0 0 50px ${MR})
    drop-shadow(0 0 120px rgba(255,80,0,.6));
  transition:filter 0.6s ease;
}

/* ── Burst ring ── */
.my-burst-ring {
  position:fixed;left:50%;top:50%;
  border-radius:50%;pointer-events:none;z-index:9999;
  border:2px solid var(--brc,${MG1});
  box-shadow:0 0 12px var(--brc,${MG1}),0 0 30px var(--brc,${MG1});
  transform:translate(-50%,-50%) scale(0);
  animation:myRing var(--brd,1.2s) ease-out forwards;
  animation-delay:var(--brdly,0ms);
  opacity:0;
}
@keyframes myRing {
  0%  { opacity:.95;transform:translate(-50%,-50%) scale(0) }
  60% { opacity:.6 }
  100%{ opacity:0;transform:translate(-50%,-50%) scale(4) }
}

/* ── Radial ember burst ── */
.my-burst-ember {
  position:fixed;pointer-events:none;z-index:9995;
  border-radius:50%;
  width:var(--besz,4px);height:var(--besz,4px);
  background:radial-gradient(circle,${MW} 0%,var(--bec,${MG1}) 60%,transparent 100%);
  box-shadow:0 0 var(--beg,8px) var(--bec,${MG1});
  animation:myBurstEmber var(--bed,1.2s) ease-out forwards;
  animation-delay:var(--bedly,0ms);
  opacity:0;
}
@keyframes myBurstEmber {
  0%  { opacity:1;transform:translate(0,0) }
  100%{ opacity:0;transform:translate(var(--bex,0px),var(--bey,0px)) scale(.1) }
}

/* ── Background glow canvas ── */
.my-glow {
  position:fixed;inset:0;pointer-events:none;z-index:9991;
  background:radial-gradient(ellipse at 50% 48%,
    rgba(255,100,0,var(--ga,0)) 0%,
    rgba(153,0,255,var(--gb,0)) 35%,
    transparent 65%);
  transition:--ga .8s,--gb .8s;
}

/* ── Ambient text ── */
.my-text {
  position:fixed;left:50%;top:68%;transform:translateX(-50%);
  text-align:center;white-space:nowrap;
  pointer-events:none;z-index:10006;
  font-family:'Georgia','Times New Roman',serif;font-style:italic;
  font-size:clamp(.85rem,1.8vw,1.15rem);
  letter-spacing:.14em;
  opacity:0;
  animation:myTextIn .5s ease forwards, myTextOut .6s ease forwards var(--tout,6s);
}
@keyframes myTextIn  { to{opacity:1} }
@keyframes myTextOut { to{opacity:0} }
.my-text span {
  display:inline-block;opacity:0;
  animation:myWordIn 220ms ease forwards var(--wdly,0ms);
}
@keyframes myWordIn {
  from{opacity:0;transform:translateY(5px);filter:blur(4px)}
  to  {opacity:1;transform:none;filter:none}
}

/* ── MYTHIC label ── */
.my-label {
  position:fixed;left:50%;top:50%;
  transform:translate(-50%,-50%);
  pointer-events:none;z-index:10012;
  display:flex;flex-direction:column;align-items:center;gap:14px;
  opacity:0;
  animation:myLabelReveal 9s ease forwards;
}
@keyframes myLabelReveal {
  0%  { opacity:0;transform:translate(-50%,-50%) scale(.3);filter:blur(28px) }
  8%  { opacity:1;transform:translate(-50%,-50%) scale(1.06);filter:blur(0) }
  14% { transform:translate(-50%,-50%) scale(1) }
  75% { opacity:1 }
  100%{ opacity:0 }
}
.my-label-main {
  font-family:'Georgia','Times New Roman',serif;
  font-size:clamp(22px,3.8vw,42px);font-weight:400;
  letter-spacing:16px;text-transform:uppercase;
  color:${MG2};
  text-shadow:0 0 10px ${MG2},0 0 28px ${MG1},0 0 80px rgba(255,80,0,.7),0 0 200px rgba(200,0,255,.35);
  padding:18px 48px;
  background:rgba(4,0,8,.97);
  border:1px solid rgba(255,150,0,.3);
  box-shadow:
    0 0 0 1px rgba(153,0,255,.15),
    0 0 50px rgba(255,100,0,.22),
    0 0 130px rgba(200,0,255,.12),
    inset 0 0 45px rgba(255,100,0,.04);
  animation:myLabelGlow 3.5s ease-in-out infinite alternate;
}
@keyframes myLabelGlow {
  from{ text-shadow:0 0 10px ${MG2},0 0 28px ${MG1},0 0 80px rgba(255,80,0,.7),0 0 200px rgba(200,0,255,.35);border-color:rgba(255,150,0,.3) }
  to  { text-shadow:0 0 18px ${MW},0 0 48px ${MG2},0 0 140px rgba(255,80,0,.9),0 0 350px rgba(180,0,255,.5);border-color:rgba(255,200,0,.55) }
}
.my-label-sub {
  font-family:'Georgia','Times New Roman',serif;font-style:italic;
  font-size:9.5px;letter-spacing:5px;
  color:rgba(255,160,60,.45);
  text-shadow:0 0 8px rgba(255,100,0,.3);
}

/* ── Typewriter ── */
.my-typewriter {
  position:fixed;left:50%;top:calc(50% + 78px);
  transform:translateX(-50%);
  pointer-events:none;z-index:10013;
  font-family:'Georgia','Times New Roman',serif;font-style:italic;
  font-size:14px;letter-spacing:5px;
  color:rgba(255,200,100,.9);
  text-shadow:0 0 10px rgba(255,140,0,.55),0 0 28px rgba(255,80,0,.35);
  white-space:nowrap;
  opacity:0;
  animation:myTypeReveal 8.5s ease forwards;
}
@keyframes myTypeReveal { 0%{opacity:0} 8%{opacity:1} 82%{opacity:1} 100%{opacity:0} }
.my-cursor {
  display:inline-block;width:1.5px;height:.9em;
  background:${MG2};margin-left:2px;vertical-align:middle;
  box-shadow:0 0 4px ${MG2};
  animation:myCursorBlink .85s ease-in-out infinite;
}
@keyframes myCursorBlink { 0%,100%{opacity:1}50%{opacity:0} }

/* ── Starburst rays (canvas layer behind label) ── */
.my-rays {
  position:fixed;inset:0;pointer-events:none;z-index:10010;
  opacity:0;
  animation:myRaysIn 1s ease forwards;
}
@keyframes myRaysIn { to{opacity:1} }
`;

// ── Crown SVG generator ───────────────────────────────────────
function crownSVG(): string {
  // A stylized crown: 5 points, two medium two tall one center
  return `<svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="10,90 10,45 50,20 100,55 150,20 190,45 190,90"
      stroke="${MG1}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"
      fill="rgba(255,100,0,0.06)"/>
    <line x1="10" y1="90" x2="190" y2="90" stroke="${MB}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- center gem -->
    <polygon points="100,10 110,30 100,45 90,30"
      fill="${MG2}" stroke="${MW}" stroke-width="1"
      style="filter:drop-shadow(0 0 8px ${MW})"/>
    <!-- left gem -->
    <circle cx="50" cy="20" r="4" fill="${MG1}" stroke="${MW}" stroke-width="1"/>
    <!-- right gem -->
    <circle cx="150" cy="20" r="4" fill="${MG1}" stroke="${MW}" stroke-width="1"/>
    <!-- base gems -->
    <circle cx="10" cy="90" r="3" fill="${MR}"/>
    <circle cx="190" cy="90" r="3" fill="${MR}"/>
  </svg>`;
}

// ── Scene ─────────────────────────────────────────────────────
export class MythicScene extends BaseCinematic {
  private glowEl: HTMLElement | null = null;
  private crowns: HTMLElement[]      = [];

  constructor(rarity: RarityDefinition) {
    super(rarity);
    injectCSS(CSS_ID, CSS);
  }

  play(): Promise<void> {
    return new Promise(resolve => {
      // ── Phase 0: Void ──────────────────────────────────────
      const voidEl = this.sr.spawn(this.sr.mk('my-void'));
      requestAnimationFrame(() => voidEl.classList.add('my-void--in'));
      this._sfxRumble(0);

      // ── Phase 1: Drifting embers ───────────────────────────
      this.tl.after(600, () => this._spawnEmbers(6));

      // ── Phase 2: Glitch flicker ────────────────────────────
      this.tl.after(1800, () => {
        const g = this.sr.spawn(this.sr.mk('my-glitch'));
        setTimeout(() => g.remove(), 900);
        this._sfxGlitch();
      });
      this.tl.after(2200, () => {
        const g = this.sr.spawn(this.sr.mk('my-glitch'));
        setTimeout(() => g.remove(), 700);
      });

      // ── Phase 3: Ambient text ──────────────────────────────
      this.tl.after(2800, () => {
        this._showText(
          'Something has noticed you.',
          '70%',
          `rgba(255,180,80,.78)`,
          `0 0 12px rgba(255,120,0,.5), 0 0 35px rgba(200,50,0,.25)`,
          4600,
        );
      });

      // ── Phase 4: Crown assembles ──────────────────────────
      this.tl.after(4200, () => this._spawnCrown());
      this._sfxCrownHum(4200);

      // ── Phase 5: Crown ignites ─────────────────────────────
      this.tl.after(6500, () => {
        this.crowns.forEach(c => c.classList.add('my-crown--lit'));
        this._spawnGlow();
        this.engine.shake(55);
        this._sfxIgnite();
      });

      // ── Phase 6: Radial burst ──────────────────────────────
      this.tl.after(7200, () => {
        this._spawnBurstRings();
        this._spawnBurstEmbers(40);
        this._sfxBurst();
      });

      // ── Phase 7: Label ─────────────────────────────────────
      this.tl.after(8200, () => this._spawnLabel());

      // ── Phase 8: Typewriter ────────────────────────────────
      this.tl.after(9800, () => this._spawnTypewriter());

      // ── Phase 9: Fade elements ─────────────────────────────
      this.tl.after(12000, () => {
        ['.my-crown', '.my-glow', '.my-ember', '.my-burst-ring', '.my-burst-ember'].forEach(sel => {
          document.querySelectorAll(sel).forEach((el: Element) => {
            (el as HTMLElement).style.transition = 'opacity 1.6s ease';
            (el as HTMLElement).style.opacity    = '0';
          });
        });
      });

      // ── Phase 10: Void out ─────────────────────────────────
      this.tl.after(13500, () => voidEl.classList.add('my-void--out'));
      this.tl.after(15500, () => {
        this.sr.killAll();
        this.engine.closeAudio();
        resolve();
      });
    });
  }

  // ── Spawn helpers ─────────────────────────────────────────────────────────

  private _spawnEmbers(count: number): void {
    const cols = [MG1, MG2, MR, MV, '#ff6600', '#ffaa00'];
    for (let i = 0; i < count; i++) {
      const el  = this.sr.spawn(this.sr.mk('my-ember'));
      const sz  = rnd(3, 7);
      const col = cols[i % cols.length];
      const x   = rnd(25, 75);
      const vy  = rnd(120, 220);
      const vx  = rnd(-30, 30);
      el.style.cssText = `
        left:${x}%; bottom:12%;
        --sz:${sz}px; --ec:${col}; --eg:${sz + 3}px;
        --eop:${rnd(.6, 1).toFixed(2)};
        --ed:${rnd(7, 11).toFixed(1)}s;
        --edly:${i * 280}ms;
        --ey:${-vy}px; --ey2:${-vy * 1.35}px;
        --ex:${vx}px;
      `;
    }
  }

  private _spawnCrown(): void {
    const crown = this.sr.spawn(this.sr.mk('my-crown'));
    crown.innerHTML = crownSVG();
    crown.style.setProperty('--crdly', '0ms');
    this.crowns.push(crown);
    // Second slightly offset crown for depth
    const crown2 = this.sr.spawn(this.sr.mk('my-crown'));
    crown2.innerHTML = crownSVG();
    crown2.style.cssText += `opacity:.35;--crdly:200ms;filter:blur(6px);transform:translate(-50%,-52%) scale(1.12)`;
    this.crowns.push(crown2);
  }

  private _spawnGlow(): void {
    const g = this.sr.spawn(this.sr.mk('my-glow'));
    this.glowEl = g;
    // Fade in glow
    let t = 0;
    const step = () => {
      if (this.stopped) return;
      t += 0.018;
      const ga = Math.min(0.28, t * 0.28);
      const gb = Math.min(0.18, t * 0.18);
      g.style.setProperty('--ga', ga.toFixed(3));
      g.style.setProperty('--gb', gb.toFixed(3));
      if (t < 1.2) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private _spawnBurstRings(): void {
    const cols = [MG2, MG1, MR, MV];
    cols.forEach((col, i) => {
      const r = this.sr.spawn(this.sr.mk('my-burst-ring'));
      const sz = 60 + i * 20;
      r.style.cssText = `
        width:${sz}px;height:${sz}px;
        --brc:${col};
        --brd:${(1.0 + i * 0.25).toFixed(2)}s;
        --brdly:${i * 120}ms;
      `;
    });
  }

  private _spawnBurstEmbers(count: number): void {
    const cols = [MG1, MG2, MR, MV, MW, '#ff6600'];
    for (let i = 0; i < count; i++) {
      const el  = this.sr.spawn(this.sr.mk('my-burst-ember'));
      const angle = (Math.PI * 2 * i) / count + rnd(0, 0.3);
      const dist  = rnd(80, 220);
      const col   = cols[i % cols.length];
      const sz    = rnd(2, 6);
      el.style.cssText = `
        left:calc(50% - ${sz / 2}px);
        top:calc(50% - ${sz / 2}px);
        --besz:${sz}px; --bec:${col}; --beg:${sz + 3}px;
        --bex:${(Math.cos(angle) * dist).toFixed(1)}px;
        --bey:${(Math.sin(angle) * dist).toFixed(1)}px;
        --bed:${rnd(.9, 1.6).toFixed(2)}s;
        --bedly:${rnd(0, 150).toFixed(0)}ms;
      `;
    }
  }

  private _showText(
    text: string, top: string, color: string, shadow: string, holdMs: number,
  ): void {
    const el = this.sr.spawn(this.sr.mk('my-text'));
    el.style.top        = top;
    el.style.color      = color;
    el.style.textShadow = shadow;
    text.split(' ').forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word + (i < text.split(' ').length - 1 ? '\u00A0' : '');
      span.style.setProperty('--wdly', `${i * 240}ms`);
      el.appendChild(span);
    });
    const msIn = (text.split(' ').length - 1) * 240 + 400;
    el.style.setProperty('--tout', `${msIn + holdMs}ms`);
  }

  private _spawnLabel(): void {
    const label = this.sr.spawn(this.sr.mk('my-label'));
    const main  = document.createElement('div');
    main.className   = 'my-label-main';
    main.textContent = 'M Y T H I C';
    const sub        = document.createElement('div');
    sub.className    = 'my-label-sub';
    sub.textContent  = '1 / 970  ·  THE CROWN DESCENDS';
    label.append(main, sub);
  }

  private _spawnTypewriter(): void {
    const el  = this.sr.spawn(this.sr.mk('my-typewriter'));
    const TEXT = 'You were always meant to burn.';
    const cur  = document.createElement('span');
    cur.className = 'my-cursor';
    el.appendChild(cur);

    let idx = 0;
    const type = () => {
      if (this.stopped || !el.isConnected) return;
      if (idx < TEXT.length) {
        el.insertBefore(document.createTextNode(TEXT[idx]), cur);
        idx++;
        this._sfxTypeClick();
        const ch = TEXT[idx - 1];
        const delay = ch === '.' ? 1000 : ch === ' ' ? 250 : 100 + rnd(0, 70);
        setTimeout(type, delay);
      } else {
        setTimeout(() => {
          cur.style.transition = 'opacity 1s ease';
          cur.style.opacity    = '0';
        }, 2200);
      }
    };
    setTimeout(type, 600);
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  private _sfxRumble(delayMs: number): void {
    setTimeout(() => {
      const ctx = this.engine.audio();
      if (!ctx) return;
      const t = ctx.currentTime;
      // Sub-bass 30Hz throb
      [30, 42, 55].forEach((f, i) =>
        this.engine.beep(ctx, t + i * 0.05, f, 12, 0.06 - i * 0.015, 'sine'));
      this.engine.noise(ctx, t + 0.5, 10, 0.018, 120, 0.4);
    }, delayMs);
  }

  private _sfxGlitch(): void {
    const ctx = this.engine.audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Harsh digital noise
    this.engine.noise(ctx, t, 0.18, 0.06, 3200, 4.0);
    this.engine.beep(ctx, t + 0.02, 440, 0.12, 0.04, 'square');
    this.engine.beep(ctx, t + 0.08, 880, 0.08, 0.025, 'square');
  }

  private _sfxCrownHum(delayMs: number): void {
    setTimeout(() => {
      const ctx = this.engine.audio();
      if (!ctx) return;
      const t = ctx.currentTime;
      // Dm chord: D3 + F3 + A3 + C4 — tense, royal
      [[146.8, 0], [174.6, .08], [220.0, .16], [261.6, .26]].forEach(([f, off]) =>
        this.engine.beep(ctx, t + off, f, 5, 0.065, 'sine'));
      this.engine.beep(ctx, t, 73.4, 6, 0.08, 'sine'); // bass D2
      this.engine.noise(ctx, t + 0.4, 5, 0.022, 800, 1.2);
    }, delayMs);
  }

  private _sfxIgnite(): void {
    const ctx = this.engine.audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Rising pitch sweep + crackle
    [0, .05, .12, .21, .32].forEach((off, i) => {
      this.engine.beep(ctx, t + off, 300 * Math.pow(1.35, i), 0.35, 0.065 - i * 0.01, 'sawtooth');
    });
    this.engine.noise(ctx, t, 0.6, 0.05, 2200, 3.0);
    // Bright high chime on ignition
    [880, 1320, 1760].forEach((f, i) =>
      this.engine.beep(ctx, t + 0.1 + i * 0.04, f, 1.8, 0.035 - i * 0.008, 'sine'));
  }

  private _sfxBurst(): void {
    const ctx = this.engine.audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Descending whoosh
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1600, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 1.0);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      o.start(t); o.stop(t + 1.05);
    } catch { /* */ }
    this.engine.noise(ctx, t, 0.4, 0.04, 600, 1.5);
    // Amaj chord on burst
    [[220, 0], [277.2, .06], [329.6, .12], [440, .2]].forEach(([f, off]) =>
      this.engine.beep(ctx, t + off, f, 2.5, 0.055, 'sine'));
  }

  private _sfxTypeClick(): void {
    const ctx = this.engine.audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.engine.noise(ctx, t, 0.022, 0.028, 900, 1.2);
  }
}
