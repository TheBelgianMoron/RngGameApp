import { EventBus } from './EventBus';
import { GameState } from '../core/state/GameState';
import { RarityRegistry } from '../core/registry/RarityRegistry';
import { RollSystem } from '../core/systems/RollSystem';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { UIManager } from '../ui/UIManager';
import { DebugMenu } from '../debug/DebugMenu';
import { CraftingSystem } from '../game/CraftingSystem';
import { CinematicRegistry } from '../cutscenes/CinematicRegistry';
import { BaseCinematic } from '../cutscenes/BaseCinematic';

import { LEGENDARY } from '../content/rarities/LEGENDARY';
import { COMMON, UNCOMMON, RARE, EPIC, MYTHIC, DIVINE } from '../content/rarities/ALL_RARITIES';
import { VOID } from '../content/rarities/VOID';

const SAVE_KEY = 'rng-aura:save';

export class App {
  private bus      = new EventBus();
  private state    = new GameState();
  private registry = new RarityRegistry();
  private roll!:     RollSystem;
  private renderer!: CanvasRenderer;
  private ui!:       UIManager;
  private debug!:    DebugMenu;
  private crafting!: CraftingSystem;
  private activeScene: BaseCinematic | null = null;

  async init(): Promise<void> {
    this.registry.registerMany([COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC, DIVINE, VOID]);

    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) this.state.hydrate(saved);

    this.crafting = new CraftingSystem(this.state, this.bus);
    this.roll     = new RollSystem(this.registry, this.state);
    this.ui       = new UIManager(this.state, this.registry, this.crafting, this.bus);
    const canvas  = document.getElementById('aura-canvas') as HTMLCanvasElement;
    this.renderer = new CanvasRenderer(canvas);
    this.debug    = new DebugMenu(this.bus, this.registry, this.renderer, this.state);
    this.debug.init();

    this.bus.on('roll:start',    () => this.onRollStart());
    this.bus.on('roll:complete', () => this.saveState());
    this.bus.on('ui:ready',      () => this.onUIReady());
    this.bus.on('craft:complete', () => this.saveState());
    this.bus.on('debug:preview-cinematic', ({ rarityId }) => {
      const rarity = this.registry.get(rarityId);
      if (rarity && CinematicRegistry.has(rarityId)) {
        this.activeScene?.stop();
        this.activeScene = CinematicRegistry.build(rarity)!;
        this.activeScene.play().then(() => {
          this.activeScene = null;
          this.renderer.showAura(rarity.visual);
        });
      }
    });

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.ui.init();
    this.initStarfield();
  }

  private onUIReady(): void {
    const current = this.state.currentAura;
    if (current) {
      const rarity = this.registry.get(current.rarityId);
      if (rarity) {
        this.renderer.showAura(rarity.visual);
        this.ui.showResult({ rarity, aura: { id: current.id, name: current.name }, record: current, isNew: false });
      }
    }
    this.ui.refreshStats();
  }

  private onRollStart(): void {
    this.state.beginRoll();
    this.ui.setRolling(true);
    const result = this.roll.roll();

    // Stop any in-progress scene
    this.activeScene?.stop();
    this.activeScene = null;

    // Rarities with a full DOM cinematic scene (1/1000+)
    if (CinematicRegistry.has(result.rarity.id)) {
      const scene = CinematicRegistry.build(result.rarity)!;
      this.activeScene = scene;
      scene.play().then(() => {
        this.activeScene = null;
        this.renderer.showAura(result.rarity.visual);
        this.ui.showResult(result);
        this.ui.setRolling(false);
        this.saveState();
        this.bus.emit('roll:complete', { rarity: result.rarity.id, auraId: result.record.id });
      });
      return;
    }

    // Standard canvas reveal for common–legendary
    this.renderer.playReveal(result.rarity.visual, () => {
      setTimeout(() => {
        this.renderer.showAura(result.rarity.visual);
        this.ui.showResult(result);
        this.ui.setRolling(false);
        this.saveState();
        this.bus.emit('roll:complete', { rarity: result.rarity.id, auraId: result.record.id });
      }, 300);
    });
  }

  private handleResize(): void {
    const canvas    = document.getElementById('aura-canvas') as HTMLCanvasElement;
    const container = canvas.parentElement!;
    const size = Math.min(container.clientWidth, container.clientHeight, 80);
    canvas.width  = size;
    canvas.height = size;
    this.renderer?.resize(size, size);
  }

  private saveState(): void {
    try { localStorage.setItem(SAVE_KEY, this.state.serialize()); } catch {}
  }

  private initStarfield(): void {
    const bg = document.getElementById('starfield') as HTMLCanvasElement;
    if (!bg) return;
    const ctx = bg.getContext('2d')!;
    const stars: Array<{ x: number; y: number; r: number; a: number; speed: number }> = [];
    const resize = () => {
      bg.width  = window.innerWidth;
      bg.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 160; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        r: 0.3 + Math.random() * 1.2,
        a: Math.random(),
        speed: 0.0002 + Math.random() * 0.0004,
      });
    }
    const tick = () => {
      ctx.clearRect(0, 0, bg.width, bg.height);
      stars.forEach(s => {
        s.a += s.speed;
        const alpha = (Math.sin(s.a) * 0.5 + 0.5) * 0.6 + 0.1;
        ctx.beginPath();
        ctx.arc(s.x * bg.width, s.y * bg.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(tick);
    };
    tick();
  }
}
