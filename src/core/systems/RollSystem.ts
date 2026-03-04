import { RarityRegistry, RarityDefinition, AuraEntry } from '../registry/RarityRegistry';
import { GameState, AuraRecord } from '../state/GameState';

export interface RollResult {
  rarity: RarityDefinition;
  aura: AuraEntry;
  record: AuraRecord;
  isNew: boolean;
}

let _idCounter = 0;
function genId(): string {
  return `aura_${Date.now()}_${++_idCounter}`;
}

export class RollSystem {
  constructor(
    private registry: RarityRegistry,
    private state: GameState,
  ) {}

  roll(): RollResult {
    const rarity = this.selectRarity();
    const aura = this.selectAura(rarity);
    const record: AuraRecord = {
      id: genId(),
      rarityId: rarity.id,
      name: aura.name,
      rolledAt: Date.now(),
    };
    const isNew = !this.state.inventory.some(a => a.name === aura.name);
    this.state.completeRoll(record, rarity.isRare);
    return { rarity, aura, record, isNew };
  }

  private selectRarity(): RarityDefinition {
    const table = this.registry.getWeightTable(this.state.effectiveLuck);
    const roll = Math.random();
    for (const entry of table) {
      if (roll <= entry.cumulative) return entry.rarity;
    }
    return table[table.length - 1].rarity;
  }

  private selectAura(rarity: RarityDefinition): AuraEntry {
    if (!rarity.auras.length) {
      return { id: 'unknown', name: 'Unknown Aura' };
    }
    return rarity.auras[Math.floor(Math.random() * rarity.auras.length)];
  }

  /**
   * Simulates n rolls and returns a frequency map — useful for testing odds.
   */
  simulate(n: number): Map<string, number> {
    const freq = new Map<string, number>();
    const table = this.registry.getWeightTable(1.0);
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      for (const entry of table) {
        if (roll <= entry.cumulative) {
          freq.set(entry.rarity.id, (freq.get(entry.rarity.id) ?? 0) + 1);
          break;
        }
      }
    }
    return freq;
  }
}
