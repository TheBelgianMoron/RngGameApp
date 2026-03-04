import { RarityDefinition } from '../../core/registry/RarityRegistry';

export const LEGENDARY: RarityDefinition = {
  id: 'LEGENDARY',
  name: 'Legendary',
  tier: 5,
  weight: 2,
  isRare: true,
  icon: '★',
  showIndividualNames: true,
  visual: {
    primaryColor:   '#FFD700',
    secondaryColor: '#FF8C00',
    glowColor:      '#FFB300',
    particleColors: ['#FFD700', '#FFA500', '#FF6347', '#FFFACD', '#FF8C00'],
    trailColor:     '#FFD70088',
    pulseSpeed:     1200,
    particleCount:  60,
    glowIntensity:  0.95,
    ringCount:      3,
    starburstRays:  12,
  },
  auras: [
    { id: 'solar_flare',     name: 'Solar Flare'     },
    { id: 'gilded_throne',   name: 'Gilded Throne'   },
    { id: 'dragon_aspect',   name: 'Dragon Aspect'   },
    { id: 'eternal_ember',   name: 'Eternal Ember'   },
    { id: 'sunborn',         name: 'Sunborn'         },
    { id: 'golden_phoenix',  name: 'Golden Phoenix'  },
  ],
};
