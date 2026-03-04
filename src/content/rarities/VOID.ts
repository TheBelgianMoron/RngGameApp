import { RarityDefinition } from '../../core/registry/RarityRegistry';

/**
 * VOID — the rarest tier. 0.05% base chance.
 * Triggers the "void" cinematic cutscene instead of the standard reveal.
 */
export const VOID: RarityDefinition = {
  id: 'VOID',
  name: 'Void',
  tier: 8,
  weight: 0.05,
  isRare: true,
  icon: '⬡',
  showIndividualNames: true,
  visual: {
    primaryColor:   '#00E5FF',
    secondaryColor: '#001A33',
    glowColor:      '#00EEFF',
    particleColors: ['#00E5FF', '#FFFFFF', '#80D8FF', '#001E3C', '#40C4FF', '#E1F5FE'],
    trailColor:     '#00E5FF66',
    pulseSpeed:     600,
    particleCount:  120,
    glowIntensity:  1.0,
    ringCount:      5,
    starburstRays:  20,
    cutsceneId:     'void',  // triggers CutsceneController
  },
  auras: [
    { id: 'the_nothing',  name: 'The Nothing'   },
    { id: 'abyss_walker', name: 'Abyss Walker'  },
    { id: 'event_horizon',name: 'Event Horizon' },
    { id: 'null_born',    name: 'Null Born'     },
    { id: 'void_eternal', name: 'Void Eternal'  },
  ],
};
