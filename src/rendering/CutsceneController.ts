import { RarityVisual } from '../core/registry/RarityRegistry';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CutsceneParticle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
}

interface CrackLine {
  points: Array<{ x: number; y: number }>;
  progress: number; // 0→1 how far drawn
  alpha: number;
  color: string;
  width: number;
}

// ─── Registry of cutscene render functions ────────────────────────────────────
type CutsceneRenderFn = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  w: number, h: number,
  cx: number, cy: number,
  visual: RarityVisual,
  state: CutsceneState,
) => boolean; // returns true when done

interface CutsceneState {
  particles:  CutsceneParticle[];
  cracks:     CrackLine[];
  shockwaves: Array<{ r: number; maxR: number; alpha: number; color: string }>;
  custom:     Record<string, number | boolean | string>;
}

// ─── Helper utils ─────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0,2), 16);
  const g = parseInt(c.slice(2,4), 16);
  const b = parseInt(c.slice(4,6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function easeIn(t: number): number  { return t * t; }
function easeOut(t: number): number { return 1 - (1 - t) * (1 - t); }
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function clamp01(t: number): number { return Math.max(0, Math.min(1, t)); }
function phaseT(frame: number, start: number, end: number): number {
  return clamp01((frame - start) / (end - start));
}

// ─── VOID Cutscene: "The Abyss Speaks" (300 frames ≈ 5 s @ 60 fps) ───────────
// Phase 0  [  0– 55]: Darkness gathers. A dim cold light throbs at center.
// Phase 1  [ 55–110]: Fracture lines crack outward from the center.
// Phase 2  [110–140]: Implosion — particles are vacuumed inward.
// Phase 3  [140–165]: Void pulse — full-canvas black/white flash.
// Phase 4  [165–230]: Emergence — explosive burst, shockwave rings.
// Phase 5  [230–300]: Aura settles. Done.
const VOID_TOTAL_FRAMES = 300;

const voidCutscene: CutsceneRenderFn = (ctx, frame, w, h, cx, cy, v, s) => {
  ctx.clearRect(0, 0, w, h);

  const PHASE_ENDS = [55, 110, 140, 165, 230, 300];
  const phase =
    frame < PHASE_ENDS[0] ? 0 :
    frame < PHASE_ENDS[1] ? 1 :
    frame < PHASE_ENDS[2] ? 2 :
    frame < PHASE_ENDS[3] ? 3 :
    frame < PHASE_ENDS[4] ? 4 : 5;

  // ── Phase 0: Darkness gathers ──────────────────────────────────────────────
  if (phase === 0) {
    const t = phaseT(frame, 0, PHASE_ENDS[0]);
    // Deep black BG
    ctx.fillStyle = `rgba(0,0,0,${lerp(0.5, 0.97, easeIn(t))})`;
    ctx.fillRect(0, 0, w, h);
    // Faint pulsing orb
    const pulse = Math.sin(frame * 0.25) * 0.5 + 0.5;
    const r = lerp(4, 10, t) + pulse * 3;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 5);
    grd.addColorStop(0, hexToRgba('#00EEFF', lerp(0.15, 0.5, t) + pulse * 0.1));
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, r * 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba('#AAFFFF', lerp(0.3, 0.9, t)); ctx.fill();
  }

  // ── Phase 1: Cracks form ───────────────────────────────────────────────────
  if (phase === 1) {
    const t = phaseT(frame, PHASE_ENDS[0], PHASE_ENDS[1]);
    ctx.fillStyle = 'rgba(0,0,0,0.96)'; ctx.fillRect(0, 0, w, h);

    // Init cracks on first frame of phase
    if (s.cracks.length === 0) {
      const numCracks = 7;
      for (let i = 0; i < numCracks; i++) {
        const angle = (Math.PI * 2 * i) / numCracks + (Math.random() - 0.5) * 0.4;
        const len   = 60 + Math.random() * 70;
        const points: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
        let ax = cx, ay = cy;
        let curAngle = angle;
        const segs = 5 + Math.floor(Math.random() * 4);
        for (let s2 = 0; s2 < segs; s2++) {
          curAngle += (Math.random() - 0.5) * 0.6;
          const segLen = len / segs;
          ax += Math.cos(curAngle) * segLen;
          ay += Math.sin(curAngle) * segLen;
          points.push({ x: ax, y: ay });
        }
        s.cracks.push({ points, progress: 0, alpha: 1, color: i % 2 === 0 ? '#00EEFF' : '#FFFFFF', width: 1 + Math.random() });
      }
    }

    s.cracks.forEach(crack => {
      crack.progress = Math.min(1, crack.progress + 0.04 + t * 0.04);
      const totalPts = crack.points.length - 1;
      const drawTo   = crack.progress * totalPts;
      ctx.beginPath();
      ctx.moveTo(crack.points[0].x, crack.points[0].y);
      for (let i = 1; i <= Math.floor(drawTo); i++) ctx.lineTo(crack.points[i].x, crack.points[i].y);
      // Partial last segment
      const frac = drawTo % 1;
      if (frac > 0 && Math.ceil(drawTo) < crack.points.length) {
        const p0 = crack.points[Math.floor(drawTo)];
        const p1 = crack.points[Math.ceil(drawTo)];
        ctx.lineTo(lerp(p0.x, p1.x, frac), lerp(p0.y, p1.y, frac));
      }
      ctx.strokeStyle = hexToRgba(crack.color, crack.alpha * (0.5 + t * 0.5));
      ctx.lineWidth   = crack.width;
      ctx.shadowBlur  = 10; ctx.shadowColor = crack.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Center orb still visible
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    grd.addColorStop(0, hexToRgba('#FFFFFF', 0.9));
    grd.addColorStop(0.5, hexToRgba('#00EEFF', 0.6));
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
  }

  // ── Phase 2: Implosion ─────────────────────────────────────────────────────
  if (phase === 2) {
    const t = phaseT(frame, PHASE_ENDS[1], PHASE_ENDS[2]);
    ctx.fillStyle = 'rgba(0,0,0,0.94)'; ctx.fillRect(0, 0, w, h);

    // Spawn inward particles on first frames
    if (frame === PHASE_ENDS[1] + 1) {
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 60 + Math.random() * 90;
        const color = v.particleColors[Math.floor(Math.random() * v.particleColors.length)];
        s.particles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: -Math.cos(angle) * (2 + Math.random() * 3),
          vy: -Math.sin(angle) * (2 + Math.random() * 3),
          radius: 1.5 + Math.random() * 2.5,
          alpha: 0.9, decay: 0.018, color,
          trail: [],
        });
      }
    }

    // Update particles with acceleration toward center
    s.particles.forEach(p => {
      const dx = cx - p.x, dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      p.vx += (dx / dist) * 0.8;
      p.vy += (dy / dist) * 0.8;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.shift();
      p.x += p.vx; p.y += p.vy;
      p.alpha -= p.decay;
    });
    s.particles = s.particles.filter(p => p.alpha > 0.01);

    s.particles.forEach(p => {
      // Trail
      p.trail.forEach((pt, i) => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, p.radius * 0.5 * (i / p.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(p.color, p.alpha * (i / p.trail.length) * 0.4); ctx.fill();
      });
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.color, p.alpha);
      ctx.shadowBlur = 8; ctx.shadowColor = p.color; ctx.fill(); ctx.shadowBlur = 0;
    });

    // Draw cracks fading
    s.cracks.forEach(crack => {
      crack.alpha = lerp(1, 0, easeIn(t));
      ctx.beginPath(); ctx.moveTo(crack.points[0].x, crack.points[0].y);
      crack.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.strokeStyle = hexToRgba(crack.color, crack.alpha * 0.6);
      ctx.lineWidth = crack.width * 0.8; ctx.stroke();
    });

    // Pulsing vortex center
    const vortexR = lerp(22, 35, t) + Math.sin(frame * 0.4) * 4;
    const vGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, vortexR);
    vGrd.addColorStop(0, hexToRgba('#FFFFFF', 0.95));
    vGrd.addColorStop(0.3, hexToRgba('#00EEFF', 0.8));
    vGrd.addColorStop(0.7, hexToRgba(v.primaryColor, 0.4));
    vGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = vGrd;
    ctx.shadowBlur = 30; ctx.shadowColor = '#00EEFF';
    ctx.beginPath(); ctx.arc(cx, cy, vortexR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Phase 3: Void Flash ────────────────────────────────────────────────────
  if (phase === 3) {
    const t = phaseT(frame, PHASE_ENDS[2], PHASE_ENDS[3]);
    // Flash: 0→1→0 (peak at midpoint), then settle to black
    const flashT   = t < 0.45 ? easeOut(t / 0.45) : easeOut(1 - (t - 0.45) / 0.55);
    const bgAlpha  = lerp(0, 0.98, easeIn(t));

    ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hexToRgba('#EEFFFF', flashT * 0.95);
    ctx.fillRect(0, 0, w, h);

    // Pulse ring at peak flash
    if (t > 0.3 && t < 0.7 && s.shockwaves.length === 0) {
      s.shockwaves.push({ r: 5, maxR: Math.max(w, h), alpha: 0.8, color: '#FFFFFF' });
    }
  }

  // ── Phase 4: Emergence ────────────────────────────────────────────────────
  if (phase === 4) {
    const t = phaseT(frame, PHASE_ENDS[3], PHASE_ENDS[4]);
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, w, h);

    // Spawn burst particles once
    if (frame === PHASE_ENDS[3] + 1) {
      s.particles = [];
      s.shockwaves = [];
      for (let i = 0; i < v.particleCount * 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        const color = v.particleColors[Math.floor(Math.random() * v.particleColors.length)];
        s.particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.5 + Math.random() * 3,
          alpha: 1, decay: 0.008 + Math.random() * 0.008, color,
          trail: [],
        });
      }
      // Shockwave rings
      for (let i = 0; i < 4; i++) {
        s.shockwaves.push({
          r: 5 + i * 8,
          maxR: 160 + i * 20,
          alpha: 0.9 - i * 0.15,
          color: i % 2 === 0 ? v.primaryColor : v.glowColor,
        });
      }
    }

    // Background glow
    const bgGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * easeOut(t));
    bgGrd.addColorStop(0, hexToRgba(v.glowColor, 0.25 * easeOut(t)));
    bgGrd.addColorStop(0.5, hexToRgba(v.primaryColor, 0.10 * easeOut(t)));
    bgGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, w, h);

    // Starburst
    const rays = v.starburstRays;
    ctx.save(); ctx.globalAlpha = 0.18 * easeOut(t);
    for (let i = 0; i < rays; i++) {
      const angle = (Math.PI * 2 * i) / rays;
      const len   = 140 * easeOut(t);
      const lGrd  = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle)*len, cy + Math.sin(angle)*len);
      lGrd.addColorStop(0, v.primaryColor); lGrd.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle)*len, cy + Math.sin(angle)*len);
      ctx.strokeStyle = lGrd; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();

    // Shockwaves
    s.shockwaves.forEach(sw => {
      sw.r += (sw.maxR - sw.r) * 0.08;
      sw.alpha *= 0.965;
      ctx.beginPath(); ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(sw.color, sw.alpha);
      ctx.lineWidth = 2;
      ctx.shadowBlur = 16; ctx.shadowColor = sw.color;
      ctx.stroke(); ctx.shadowBlur = 0;
    });

    // Particles
    s.particles.forEach(p => {
      p.vx *= 0.965; p.vy *= 0.965;
      p.x += p.vx; p.y += p.vy;
      p.alpha -= p.decay;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.color, p.alpha);
      ctx.shadowBlur = 6; ctx.shadowColor = p.color; ctx.fill(); ctx.shadowBlur = 0;
    });

    // Growing orb
    const orbR = lerp(0, 38, easeOutCubic(t));
    const orbGrd = ctx.createRadialGradient(cx - orbR*0.2, cy - orbR*0.2, 0, cx, cy, orbR);
    orbGrd.addColorStop(0, '#FFFFFF');
    orbGrd.addColorStop(0.3, v.primaryColor);
    orbGrd.addColorStop(0.8, v.secondaryColor);
    orbGrd.addColorStop(1, hexToRgba(v.secondaryColor, 0));
    ctx.shadowBlur = 50 * v.glowIntensity; ctx.shadowColor = v.glowColor;
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = orbGrd; ctx.fill(); ctx.shadowBlur = 0;
  }

  // ── Phase 5: Settle ────────────────────────────────────────────────────────
  if (phase === 5) {
    const t = phaseT(frame, PHASE_ENDS[4], PHASE_ENDS[5]);

    // Fading background
    const bgGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160);
    bgGrd.addColorStop(0, hexToRgba(v.glowColor, 0.22));
    bgGrd.addColorStop(0.5, hexToRgba(v.primaryColor, 0.08));
    bgGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, w, h);

    // Remaining particles fade out
    s.particles.forEach(p => {
      p.vx *= 0.97; p.vy *= 0.97;
      p.x += p.vx; p.y += p.vy;
      p.alpha = Math.max(0, p.alpha - 0.012);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.color, p.alpha);
      ctx.shadowBlur = 4; ctx.shadowColor = p.color; ctx.fill(); ctx.shadowBlur = 0;
    });

    // Shockwaves continue fading
    s.shockwaves.forEach(sw => {
      sw.r += (sw.maxR - sw.r) * 0.04;
      sw.alpha = Math.max(0, sw.alpha - 0.012);
      ctx.beginPath(); ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(sw.color, sw.alpha);
      ctx.lineWidth = 1.5; ctx.stroke();
    });

    // Pulsing rings
    for (let i = 0; i < v.ringCount; i++) {
      const baseR = (60 + i * 28) * easeOut(t);
      const rot   = (frame * 0.003) * (i % 2 === 0 ? 1 : -1) * (1 + i * 0.3);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.beginPath();
      if (i > 0) ctx.setLineDash([8, 6]);
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(i % 2 === 0 ? v.primaryColor : v.secondaryColor, (0.6 - i * 0.1) * easeOut(t));
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.shadowBlur = 12; ctx.shadowColor = v.glowColor;
      ctx.stroke(); ctx.shadowBlur = 0;
      ctx.setLineDash([]); ctx.restore();
    }

    // Final orb
    const pulse = Math.sin(frame * 0.15) * 0.5 + 0.5;
    const orbR  = 38 + pulse * 6;
    const orbGrd = ctx.createRadialGradient(cx - orbR*0.2, cy - orbR*0.2, 0, cx, cy, orbR);
    orbGrd.addColorStop(0, '#FFFFFF');
    orbGrd.addColorStop(0.3, v.primaryColor);
    orbGrd.addColorStop(0.8, v.secondaryColor);
    orbGrd.addColorStop(1, hexToRgba(v.secondaryColor, 0));
    ctx.shadowBlur = (30 + pulse * 20) * v.glowIntensity;
    ctx.shadowColor = v.glowColor;
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = orbGrd; ctx.fill(); ctx.shadowBlur = 0;
  }

  return frame >= VOID_TOTAL_FRAMES - 1;
};

// ─── CutsceneController ───────────────────────────────────────────────────────
const REGISTRY = new Map<string, { render: CutsceneRenderFn; totalFrames: number }>([
  ['void', { render: voidCutscene, totalFrames: VOID_TOTAL_FRAMES }],
]);

export class CutsceneController {
  private frame     = 0;
  private active    = false;
  private cutsceneId: string | null = null;
  private visual!:   RarityVisual;
  private state!:    CutsceneState;
  private onDone?:   () => void;

  get isActive(): boolean { return this.active; }
  get totalFrames(): number {
    return this.cutsceneId ? (REGISTRY.get(this.cutsceneId)?.totalFrames ?? 0) : 0;
  }
  get progress(): number {
    return this.cutsceneId ? this.frame / this.totalFrames : 0;
  }

  start(cutsceneId: string, visual: RarityVisual, onDone?: () => void): boolean {
    const entry = REGISTRY.get(cutsceneId);
    if (!entry) return false;
    this.cutsceneId = cutsceneId;
    this.visual     = visual;
    this.frame      = 0;
    this.active     = true;
    this.onDone     = onDone;
    this.state      = { particles: [], cracks: [], shockwaves: [], custom: {} };
    return true;
  }

  stop(): void {
    this.active     = false;
    this.cutsceneId = null;
    this.frame      = 0;
  }

  tick(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number): void {
    if (!this.active || !this.cutsceneId) return;
    const entry = REGISTRY.get(this.cutsceneId);
    if (!entry) { this.stop(); return; }

    const done = entry.render(ctx, this.frame, w, h, cx, cy, this.visual, this.state);
    this.frame++;

    if (done) {
      this.active = false;
      this.onDone?.();
    }
  }

  static has(id: string): boolean { return REGISTRY.has(id); }
}
