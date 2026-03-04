export interface AuraRecord {
  id: string;
  rarityId: string;
  name: string;
  rolledAt: number;
}

export interface CraftedBoost {
  name: string;
  multiplier: number;
  rollsLeft: number;
  totalRolls: number;
}

export interface GameStateData {
  totalRolls: number;
  luck: number;
  currentAura: AuraRecord | null;
  inventory: AuraRecord[];
  rollHistory: AuraRecord[];
  isRolling: boolean;
  pityCounters: Record<string, number>;
  craftedBoosts: CraftedBoost[];
}

const HISTORY_LIMIT = 100;
const LUCK_DECAY    = 0.98;
const LUCK_ON_MISS  = 1.02;
const PITY_RARITIES = ['LEGENDARY', 'MYTHIC', 'DIVINE', 'VOID'];

export class GameState {
  private data: GameStateData = {
    totalRolls: 0,
    luck: 1.0,
    currentAura: null,
    inventory: [],
    rollHistory: [],
    isRolling: false,
    pityCounters: Object.fromEntries(PITY_RARITIES.map(r => [r, 0])),
    craftedBoosts: [],
  };

  get totalRolls(): number        { return this.data.totalRolls; }
  get luck(): number              { return this.data.luck; }
  get currentAura(): AuraRecord | null { return this.data.currentAura; }
  get inventory(): AuraRecord[]   { return [...this.data.inventory]; }
  get rollHistory(): AuraRecord[] { return [...this.data.rollHistory]; }
  get isRolling(): boolean        { return this.data.isRolling; }
  get pityCounters(): Record<string, number> { return { ...this.data.pityCounters }; }
  get craftedBoosts(): CraftedBoost[] { return [...this.data.craftedBoosts]; }

  get effectiveLuck(): number {
    let boost = this.data.craftedBoosts.reduce((acc, b) => acc * b.multiplier, 1.0);
    return this.data.luck * boost;
  }

  /** Count inventory items by rarityId */
  countByRarity(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of this.data.inventory) {
      counts[item.rarityId] = (counts[item.rarityId] ?? 0) + 1;
    }
    return counts;
  }

  /** Count inventory items by aura name (for named auras) */
  countByName(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of this.data.inventory) {
      counts[item.name] = (counts[item.name] ?? 0) + 1;
    }
    return counts;
  }

  beginRoll(): void {
    this.data.isRolling = true;
    this.data.totalRolls++;
    // Tick crafted boosts down
    this.data.craftedBoosts = this.data.craftedBoosts
      .map(b => ({ ...b, rollsLeft: b.rollsLeft - 1 }))
      .filter(b => b.rollsLeft > 0);
    // Increment all pity counters
    for (const k of PITY_RARITIES) {
      this.data.pityCounters[k] = (this.data.pityCounters[k] ?? 0) + 1;
    }
  }

  completeRoll(aura: AuraRecord, isRare: boolean): void {
    this.data.isRolling = false;
    this.data.currentAura = aura;
    this.data.inventory.unshift(aura);
    this.data.rollHistory.unshift(aura);
    if (this.data.rollHistory.length > HISTORY_LIMIT) {
      this.data.rollHistory.pop();
    }
    if (isRare) {
      this.data.luck = Math.max(1.0, this.data.luck * LUCK_DECAY);
    } else {
      this.data.luck = Math.min(5.0, this.data.luck * LUCK_ON_MISS);
    }
    // Reset pity for rolled rarity and anything rarer
    if (PITY_RARITIES.includes(aura.rarityId)) {
      const idx = PITY_RARITIES.indexOf(aura.rarityId);
      for (let i = idx; i < PITY_RARITIES.length; i++) {
        this.data.pityCounters[PITY_RARITIES[i]] = 0;
      }
    }
  }

  applyBoost(boost: CraftedBoost): void {
    this.data.craftedBoosts.push(boost);
  }

  /** Consume N items of a given rarityId from inventory. Returns true if successful. */
  consumeByRarity(rarityId: string, count: number): boolean {
    const indices: number[] = [];
    for (let i = 0; i < this.data.inventory.length && indices.length < count; i++) {
      if (this.data.inventory[i].rarityId === rarityId) indices.push(i);
    }
    if (indices.length < count) return false;
    for (let i = indices.length - 1; i >= 0; i--) {
      this.data.inventory.splice(indices[i], 1);
    }
    return true;
  }

  serialize(): string {
    return JSON.stringify(this.data);
  }

  hydrate(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as GameStateData;
      this.data = {
        ...this.data,
        ...parsed,
        isRolling: false,
        pityCounters: { ...this.data.pityCounters, ...(parsed.pityCounters ?? {}) },
        craftedBoosts: parsed.craftedBoosts ?? [],
      };
    } catch {
      console.warn('[GameState] Failed to hydrate.');
    }
  }
}
