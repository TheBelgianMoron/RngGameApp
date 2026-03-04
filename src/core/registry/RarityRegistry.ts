export interface RarityVisual {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  particleColors: string[];
  trailColor: string;
  pulseSpeed: number;    // ms per pulse cycle
  particleCount: number;
  glowIntensity: number; // 0–1
  ringCount: number;
  starburstRays: number;
  /** Optional id of a cinematic cutscene to play instead of the default reveal */
  cutsceneId?: string;
}

export interface RarityDefinition {
  id: string;
  name: string;
  tier: number;
  weight: number;
  isRare: boolean;
  icon: string;           // unicode/emoji icon for result card
  showIndividualNames: boolean; // true = list individual aura names in stats
  visual: RarityVisual;
  auras: AuraEntry[];
}

export interface AuraEntry {
  id: string;
  name: string;
}

export class RarityRegistry {
  private rarities = new Map<string, RarityDefinition>();
  private sorted: RarityDefinition[] = [];
  private totalWeight = 0;

  register(def: RarityDefinition): void {
    this.rarities.set(def.id, def);
    this.rebuild();
  }

  registerMany(defs: RarityDefinition[]): void {
    defs.forEach(d => this.rarities.set(d.id, d));
    this.rebuild();
  }

  private rebuild(): void {
    this.sorted = [...this.rarities.values()].sort((a, b) => b.weight - a.weight);
    this.totalWeight = this.sorted.reduce((s, r) => s + r.weight, 0);
  }

  getAll(): RarityDefinition[] { return this.sorted; }
  get(id: string): RarityDefinition | undefined { return this.rarities.get(id); }
  getTotalWeight(): number { return this.totalWeight; }

  /**
   * Returns a sorted list of [rarity, cumulativeWeight] pairs
   * used by RollSystem for weighted selection.
   */
  getWeightTable(luckMultiplier = 1.0): Array<{ rarity: RarityDefinition; cumulative: number }> {
    // Apply luck as a slight boost to rarer items
    const adjusted = this.sorted.map(r => ({
      rarity: r,
      weight: r.isRare ? r.weight * luckMultiplier : r.weight,
    }));
    const total = adjusted.reduce((s, a) => s + a.weight, 0);
    let cumulative = 0;
    return adjusted.map(a => {
      cumulative += a.weight / total;
      return { rarity: a.rarity, cumulative };
    });
  }
}
