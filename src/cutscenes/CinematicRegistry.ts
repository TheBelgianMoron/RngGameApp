import { BaseCinematic } from './BaseCinematic';
import { MythicScene   } from './MythicScene';
import { RarityDefinition } from '../core/registry/RarityRegistry';

type SceneConstructor = new (rarity: RarityDefinition) => BaseCinematic;

// ── Registry: rarityId → scene class ────────────────────────────────────────
// Add DIVINE and VOID scenes here as they're built.
const SCENE_MAP = new Map<string, SceneConstructor>([
  ['MYTHIC', MythicScene],
  // ['DIVINE', DivineScene],    // TODO
  // ['VOID',   VoidScene],      // TODO — the full NightFall-scale scene
]);

export class CinematicRegistry {
  static has(rarityId: string): boolean {
    return SCENE_MAP.has(rarityId);
  }

  static build(rarity: RarityDefinition): BaseCinematic | null {
    const Ctor = SCENE_MAP.get(rarity.id);
    return Ctor ? new Ctor(rarity) : null;
  }
}
