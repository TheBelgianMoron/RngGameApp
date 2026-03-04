import { CraftingRecipe, CRAFTING_RECIPES } from '../content/crafting/CraftingConfig';
import { GameState } from '../core/state/GameState';
import { EventBus } from '../app/EventBus';

export type CraftResult = 'ok' | 'missing_ingredients';

export class CraftingSystem {
  constructor(
    private state: GameState,
    private bus:   EventBus,
  ) {}

  getRecipes(): CraftingRecipe[] {
    return CRAFTING_RECIPES;
  }

  canCraft(recipe: CraftingRecipe): boolean {
    const counts = this.state.countByRarity();
    return recipe.ingredients.every(ing => (counts[ing.rarityId] ?? 0) >= ing.count);
  }

  craft(recipeId: string): CraftResult {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return 'missing_ingredients';
    if (!this.canCraft(recipe)) return 'missing_ingredients';

    for (const ing of recipe.ingredients) {
      this.state.consumeByRarity(ing.rarityId, ing.count);
    }
    this.state.applyBoost({
      name:       recipe.name,
      multiplier: recipe.multiplier,
      rollsLeft:  recipe.rollDuration,
      totalRolls: recipe.rollDuration,
    });
    this.bus.emit('craft:complete', { recipeId });
    return 'ok';
  }
}
