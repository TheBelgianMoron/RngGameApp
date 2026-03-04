import { CinematicEngine, SpawnRegistry, Timeline } from '../rendering/CinematicEngine';
import { RarityDefinition } from '../core/registry/RarityRegistry';

export abstract class BaseCinematic {
  protected engine  = new CinematicEngine();
  protected sr      = new SpawnRegistry();
  protected tl      = new Timeline();
  protected stopped = false;

  constructor(protected rarity: RarityDefinition) {}

  /** Override in subclass. Call resolve() when scene ends. */
  abstract play(): Promise<void>;

  stop(): void {
    this.stopped = true;
    this.tl.stop();
    this.sr.killAll();
    this.engine.closeAudio();
    this.cleanup();
  }

  /** Optional extra cleanup in subclasses */
  protected cleanup(): void { /* override */ }
}
