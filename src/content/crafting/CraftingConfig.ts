export interface CraftingIngredient {
  rarityId: string;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  multiplier: number;   // luck multiplier while active
  rollDuration: number; // how many rolls it lasts
  ingredients: CraftingIngredient[];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'cosmic_brew',
    name: 'Cosmic Brew',
    description: 'Earth and storm fused. The cosmos conspires for you.',
    icon: '🌀',
    multiplier: 1.5,
    rollDuration: 70,
    ingredients: [
      { rarityId: 'COMMON',   count: 4 },
      { rarityId: 'UNCOMMON', count: 2 },
    ],
  },
  {
    id: 'star_forge',
    name: 'Star Forge',
    description: 'Reality transmuted through fire and focus.',
    icon: '⭐',
    multiplier: 2.0,
    rollDuration: 50,
    ingredients: [
      { rarityId: 'UNCOMMON', count: 2 },
      { rarityId: 'RARE',     count: 1 },
    ],
  },
  {
    id: 'celestial_pact',
    name: 'Celestial Pact',
    description: 'A promise sealed between the mortal and the divine.',
    icon: '🔮',
    multiplier: 2.8,
    rollDuration: 45,
    ingredients: [
      { rarityId: 'RARE', count: 1 },
      { rarityId: 'EPIC', count: 1 },
    ],
  },
  {
    id: 'nexus_crown',
    name: 'Nexus Crown',
    description: 'All paths converge. Roll as if you are already chosen.',
    icon: '👑',
    multiplier: 3.5,
    rollDuration: 30,
    ingredients: [
      { rarityId: 'EPIC',      count: 1 },
      { rarityId: 'LEGENDARY', count: 1 },
    ],
  },
  {
    id: 'binary_heart',
    name: 'Binary Heart',
    description: 'Logic and chaos fused. The system favours you.',
    icon: '💠',
    multiplier: 5.0,
    rollDuration: 20,
    ingredients: [
      { rarityId: 'LEGENDARY', count: 1 },
      { rarityId: 'MYTHIC',    count: 1 },
    ],
  },
  {
    id: 'void_convergence',
    name: 'Void Convergence',
    description: 'The abyss bends to your will. Fate itself trembles.',
    icon: '⬡',
    multiplier: 10.0,
    rollDuration: 10,
    ingredients: [
      { rarityId: 'DIVINE', count: 1 },
      { rarityId: 'MYTHIC', count: 1 },
    ],
  },
];
