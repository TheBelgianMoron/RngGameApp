import { RarityVisual } from '../core/registry/RarityRegistry';
import { CutsceneController } from './CutsceneController';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  lifespan: number;
  age: number;
}

interface Ring {
  radius: number;
  targetRadius: number;
  speed: number;
  alpha: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  dashed: boolean;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private cx: number;
  private cy: number;

  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private currentVisual: RarityVisual | null = null;
  private animFrame: number | null = null;
  private pulseT = 0;
  private isAnimating = false;
  private onAnimComplete?: () => void;
  private animProgress = 0;
  private cutscene = new CutsceneController();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.cx = this.width / 2;
    this.cy = this.height / 2;
    this.drawIdle();
  }

  resize(w: number, h: number): void {
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w; this.height = h;
    this.cx = w / 2; this.cy = h / 2;
  }

  /** Play the roll reveal animation for a given visual config. */
  playReveal(visual: RarityVisual, onComplete?: () => void): void {
    // If this rarity has a cinematic cutscene, use it
    if (visual.cutsceneId && CutsceneController.has(visual.cutsceneId)) {
      this.cutscene.start(visual.cutsceneId, visual, onComplete);
      this.currentVisual = visual;
      this.isAnimating   = true;
      this.animProgress  = 0;
      this.particles     = [];
      this.rings         = [];
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      this.loop();
      return;
    }
    // Standard reveal
    this.currentVisual = visual;
    this.onAnimComplete = onComplete;
    this.particles = [];
    this.rings = [];
    this.pulseT = 0;
    this.animProgress = 0;
    this.isAnimating = true;
    this.cutscene.stop();
    this.spawnRings(visual);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.loop();
  }

  /** Show a persistent idle aura without animation callback. */
  showAura(visual: RarityVisual): void {
    this.currentVisual = visual;
    this.isAnimating = false;
    this.animProgress = 1;
    this.particles = [];
    this.rings = [];
    this.spawnRings(visual);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.loop();
  }

  drawIdle(): void {
    this.currentVisual = null;
    this.particles = [];
    this.rings = [];
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.loop();
  }

  private spawnRings(visual: RarityVisual): void {
    for (let i = 0; i < visual.ringCount; i++) {
      const baseR = 60 + i * 28;
      this.rings.push({
        radius: 10,
        targetRadius: baseR,
        speed: 4 + i * 1.5,
        alpha: 0.6 - i * 0.1,
        color: i % 2 === 0 ? visual.primaryColor : visual.secondaryColor,
        rotation: (Math.PI * 2 * i) / visual.ringCount,
        rotationSpeed: (i % 2 === 0 ? 0.003 : -0.005) * (1 + i * 0.3),
        dashed: i > 0,
      });
    }
  }

  private spawnBurst(visual: RarityVisual): void {
    const count = visual.particleCount;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3.5;
      const color = visual.particleColors[Math.floor(Math.random() * visual.particleColors.length)];
      this.particles.push({
        x: this.cx, y: this.cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        alpha: 0.9 + Math.random() * 0.1,
        decay: 0.012 + Math.random() * 0.012,
        color,
        lifespan: 80 + Math.random() * 60,
        age: 0,
      });
    }
  }

  private loop(): void {
    this.animFrame = requestAnimationFrame(() => {
      this.render();
      this.loop();
    });
  }

  private render(): void {
    const { ctx, width, height, cx, cy } = this;

    // Delegate to cutscene if active
    if (this.cutscene.isActive) {
      ctx.clearRect(0, 0, width, height);
      this.cutscene.tick(ctx, width, height, cx, cy);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (!this.currentVisual) {
      this.renderIdle();
      return;
    }

    const v = this.currentVisual;
    this.pulseT += (2 * Math.PI) / (v.pulseSpeed / 16.67);

    // Animate intro reveal
    if (this.isAnimating && this.animProgress < 1) {
      this.animProgress = Math.min(1, this.animProgress + 0.018);
      if (this.animProgress > 0.25 && this.particles.length < v.particleCount) {
        this.spawnBurst(v);
      }
      if (this.animProgress >= 1 && this.onAnimComplete) {
        this.onAnimComplete();
      }
    } else if (!this.isAnimating) {
      // idle particle trickle
      if (this.particles.length < v.particleCount * 0.4 && Math.random() < 0.25) {
        const angle = Math.random() * Math.PI * 2;
        const r = 40 + Math.random() * 30;
        const color = v.particleColors[Math.floor(Math.random() * v.particleColors.length)];
        this.particles.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          vx: Math.cos(angle) * (0.3 + Math.random() * 0.6),
          vy: Math.sin(angle) * (0.3 + Math.random() * 0.6),
          radius: 1.5 + Math.random() * 2,
          alpha: 0.8,
          decay: 0.008,
          color,
          lifespan: 120,
          age: 0,
        });
      }
    }

    const eased = this.easeOutQuint(this.animProgress);

    // Background radial glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 * eased);
    grad.addColorStop(0, this.hexToRgba(v.glowColor, 0.18 * v.glowIntensity));
    grad.addColorStop(0.5, this.hexToRgba(v.primaryColor, 0.08 * v.glowIntensity));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Starburst rays
    if (v.starburstRays > 0) this.drawStarburst(v, eased);

    // Update & draw rings
    this.rings.forEach(ring => {
      if (ring.radius < ring.targetRadius) {
        ring.radius += ring.speed;
      }
      ring.rotation += ring.rotationSpeed;
      this.drawRing(ring, v, eased);
    });

    // Core orb
    this.drawOrb(v, eased);

    // Particles
    this.particles = this.particles.filter(p => p.alpha > 0.01);
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.age++;
      p.alpha -= p.decay;
      this.drawParticle(p);
    });
  }

  private renderIdle(): void {
    const { ctx, width, height, cx, cy } = this;
    this.pulseT += 0.015;
    const pulse = Math.sin(this.pulseT) * 0.5 + 0.5;
    const r = 28 + pulse * 4;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, `rgba(120,120,140,${0.3 + pulse * 0.15})`);
    grd.addColorStop(1, 'rgba(80,80,100,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, `rgba(180,180,200,${0.5 + pulse * 0.2})`);
    core.addColorStop(1, `rgba(100,100,120,${0.2 + pulse * 0.1})`);
    ctx.fillStyle = core;
    ctx.fill();
  }

  private drawOrb(v: RarityVisual, progress: number): void {
    const { ctx, cx, cy, pulseT } = this;
    const pulse = Math.sin(pulseT) * 0.5 + 0.5;
    const baseR = 38 * progress;
    const r = baseR + pulse * 8 * progress;

    // Outer glow
    ctx.shadowBlur = 40 * v.glowIntensity * progress;
    ctx.shadowColor = v.glowColor;

    const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, v.primaryColor);
    grad.addColorStop(0.8, v.secondaryColor);
    grad.addColorStop(1, this.hexToRgba(v.secondaryColor, 0));

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  private drawRing(ring: Ring, v: RarityVisual, progress: number): void {
    const { ctx, cx, cy } = this;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ring.rotation);

    ctx.beginPath();
    if (ring.dashed) {
      ctx.setLineDash([8, 6]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.arc(0, 0, ring.radius * progress, 0, Math.PI * 2);
    ctx.strokeStyle = this.hexToRgba(ring.color, ring.alpha * progress);
    ctx.lineWidth = ring.dashed ? 1 : 2;
    ctx.shadowBlur = 12 * v.glowIntensity;
    ctx.shadowColor = v.glowColor;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  private drawStarburst(v: RarityVisual, progress: number): void {
    const { ctx, cx, cy, pulseT } = this;
    const rays = v.starburstRays;
    const pulse = Math.sin(pulseT * 1.5) * 0.5 + 0.5;
    const len = (120 + pulse * 30) * progress;

    ctx.save();
    ctx.globalAlpha = 0.12 * v.glowIntensity * progress;
    for (let i = 0; i < rays; i++) {
      const angle = (Math.PI * 2 * i) / rays + this.pulseT * 0.1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      const lineGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      lineGrad.addColorStop(0, v.primaryColor);
      lineGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawParticle(p: Particle): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.hexToRgba(p.color, p.alpha);
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private easeOutQuint(t: number): number {
    return 1 - Math.pow(1 - t, 5);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const len = clean.length;
    if (len === 8) {
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    if (len === 6) {
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(170,170,170,${alpha})`;
  }
}
