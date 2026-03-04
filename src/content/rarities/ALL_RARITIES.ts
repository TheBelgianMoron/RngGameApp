import { RarityDefinition } from '../../core/registry/RarityRegistry';

export const COMMON: RarityDefinition = {
  id: 'COMMON', name: 'Common', tier: 1, weight: 500, isRare: false,
  icon: '◆', showIndividualNames: false,
  visual: {
    primaryColor: '#AAAAAA', secondaryColor: '#888888', glowColor: '#CCCCCC',
    particleColors: ['#CCCCCC', '#AAAAAA', '#FFFFFF'],
    trailColor: '#AAAAAA44', pulseSpeed: 2500, particleCount: 12,
    glowIntensity: 0.25, ringCount: 1, starburstRays: 0,
  },
  auras: [
    { id: 'dust',        name: 'Dust'        },
    { id: 'pebble',      name: 'Pebble'      },
    { id: 'fog',         name: 'Fog'         },
    { id: 'ash',         name: 'Ash'         },
    { id: 'static',      name: 'Static'      },
    { id: 'dim_crystal', name: 'Dim Crystal' },
    { id: 'pale_mist',   name: 'Pale Mist'   },
    { id: 'grey_smoke',  name: 'Grey Smoke'  },
  ],
};

export const UNCOMMON: RarityDefinition = {
  id: 'UNCOMMON', name: 'Uncommon', tier: 2, weight: 200, isRare: false,
  icon: '◈', showIndividualNames: false,
  visual: {
    primaryColor: '#4CAF50', secondaryColor: '#2E7D32', glowColor: '#66BB6A',
    particleColors: ['#81C784', '#4CAF50', '#A5D6A7', '#1B5E20'],
    trailColor: '#4CAF5066', pulseSpeed: 2000, particleCount: 22,
    glowIntensity: 0.45, ringCount: 1, starburstRays: 0,
  },
  auras: [
    { id: 'verdant', name: 'Verdant' },
    { id: 'mossy',   name: 'Mossy'   },
    { id: 'sprout',  name: 'Sprout'  },
    { id: 'bramble', name: 'Bramble' },
    { id: 'earthen', name: 'Earthen' },
  ],
};

export const RARE: RarityDefinition = {
  id: 'RARE', name: 'Rare', tier: 3, weight: 60, isRare: true,
  icon: '◆', showIndividualNames: false,
  visual: {
    primaryColor: '#2196F3', secondaryColor: '#0D47A1', glowColor: '#42A5F5',
    particleColors: ['#64B5F6', '#2196F3', '#90CAF9', '#1565C0'],
    trailColor: '#2196F366', pulseSpeed: 1800, particleCount: 35,
    glowIntensity: 0.65, ringCount: 2, starburstRays: 6,
  },
  auras: [
    { id: 'oceanic',     name: 'Oceanic'     },
    { id: 'frostbite',   name: 'Frostbite'   },
    { id: 'stormcaller', name: 'Stormcaller' },
    { id: 'azure_tide',  name: 'Azure Tide'  },
    { id: 'aquamarine',  name: 'Aquamarine'  },
  ],
};

export const EPIC: RarityDefinition = {
  id: 'EPIC', name: 'Epic', tier: 4, weight: 15, isRare: true,
  icon: '✦', showIndividualNames: true,
  visual: {
    primaryColor: '#9C27B0', secondaryColor: '#4A148C', glowColor: '#CE93D8',
    particleColors: ['#CE93D8', '#9C27B0', '#E040FB', '#6A1B9A', '#F3E5F5'],
    trailColor: '#9C27B077', pulseSpeed: 1500, particleCount: 48,
    glowIntensity: 0.82, ringCount: 2, starburstRays: 8,
  },
  auras: [
    { id: 'void_touched', name: 'Void Touched' },
    { id: 'arcane_surge', name: 'Arcane Surge' },
    { id: 'shadow_weave', name: 'Shadow Weave' },
    { id: 'phantom_echo', name: 'Phantom Echo' },
    { id: 'abyssal',      name: 'Abyssal'      },
  ],
};

export const MYTHIC: RarityDefinition = {
  id: 'MYTHIC', name: 'Mythic', tier: 6, weight: 0.8, isRare: true,
  icon: '⚡', showIndividualNames: true,
  visual: {
    primaryColor: '#FF1744', secondaryColor: '#B71C1C', glowColor: '#FF5252',
    particleColors: ['#FF1744', '#FF6D00', '#FF5252', '#FFCCBC', '#D50000'],
    trailColor: '#FF174488', pulseSpeed: 900, particleCount: 80,
    glowIntensity: 1.0, ringCount: 4, starburstRays: 16,
  },
  auras: [
    { id: 'ragnarok',     name: 'Ragnarök'     },
    { id: 'hellfire',     name: 'Hellfire'     },
    { id: 'blood_moon',   name: 'Blood Moon'   },
    { id: 'inferno_king', name: 'Inferno King' },
  ],
};

export const DIVINE: RarityDefinition = {
  id: 'DIVINE', name: 'Divine', tier: 7, weight: 0.2, isRare: true,
  icon: '✧', showIndividualNames: true,
  visual: {
    primaryColor: '#E0F7FA', secondaryColor: '#B2EBF2', glowColor: '#FFFFFF',
    particleColors: ['#FFFFFF', '#E0F7FA', '#80DEEA', '#B2EBF2', '#FFD700'],
    trailColor: '#FFFFFF99', pulseSpeed: 700, particleCount: 100,
    glowIntensity: 1.0, ringCount: 5, starburstRays: 24,
  },
  auras: [
    { id: 'seraphim',      name: 'Seraphim'      },
    { id: 'holy_radiance', name: 'Holy Radiance' },
    { id: 'celestia',      name: 'Celestia'      },
  ],
};
