import { GameState } from '../core/state/GameState';
import { RarityRegistry } from '../core/registry/RarityRegistry';
import { CraftingSystem } from '../game/CraftingSystem';
import { RollResult } from '../core/systems/RollSystem';
import { EventBus } from '../app/EventBus';

export class UIManager {
  // Center card
  private cardRarityLabel!: HTMLElement;
  private cardAuraName!:    HTMLElement;
  private cardSubtitle!:    HTMLElement;
  private cardBadge!:       HTMLElement;
  private cardIcon!:        HTMLElement;

  // Buttons
  private rollBtn!:     HTMLButtonElement;
  private autoRollBtn!: HTMLButtonElement;

  // Left stats
  private totalRollsEl!: HTMLElement;
  private auraCountsEl!: HTMLElement;
  private pityCountsEl!: HTMLElement;
  private luckBarFill!:  HTMLElement;
  private luckBarLabel!: HTMLElement;
  private activeCraftEl!:HTMLElement;

  // Right panel
  private craftListEl!:      HTMLElement;
  private collectionListEl!: HTMLElement;

  private autoRollActive = false;
  private autoRollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private state:    GameState,
    private registry: RarityRegistry,
    private crafting: CraftingSystem,
    private bus:      EventBus,
  ) {}

  init(): void {
    // Card
    this.cardRarityLabel = document.getElementById('card-rarity-label')!;
    this.cardAuraName    = document.getElementById('card-aura-name')!;
    this.cardSubtitle    = document.getElementById('card-subtitle')!;
    this.cardBadge       = document.getElementById('card-badge')!;
    this.cardIcon        = document.getElementById('card-icon')!;

    // Buttons
    this.rollBtn     = document.getElementById('roll-btn')      as HTMLButtonElement;
    this.autoRollBtn = document.getElementById('auto-roll-btn') as HTMLButtonElement;

    // Left stats
    this.totalRollsEl = document.getElementById('total-rolls')!;
    this.auraCountsEl = document.getElementById('aura-counts')!;
    this.pityCountsEl = document.getElementById('pity-counts')!;
    this.luckBarFill  = document.getElementById('luck-bar-fill')!;
    this.luckBarLabel = document.getElementById('luck-bar-label')!;
    this.activeCraftEl= document.getElementById('active-crafts')!;

    // Right panel
    this.craftListEl      = document.getElementById('craft-list')!;
    this.collectionListEl = document.getElementById('collection-list')!;

    // Roll button
    this.rollBtn.addEventListener('click', () => {
      if (!this.state.isRolling) this.bus.emit('roll:start');
    });

    // Auto roll toggle
    this.autoRollBtn.addEventListener('click', () => {
      this.autoRollActive = !this.autoRollActive;
      this.autoRollBtn.classList.toggle('active', this.autoRollActive);
      this.autoRollBtn.textContent = this.autoRollActive ? 'STOP AUTO' : 'AUTO ROLL';
      this.bus.emit('autoroll:toggle', { active: this.autoRollActive });
      if (!this.autoRollActive && this.autoRollTimer) {
        clearTimeout(this.autoRollTimer);
        this.autoRollTimer = null;
      }
    });

    // Space to roll
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.state.isRolling) {
        e.preventDefault();
        this.bus.emit('roll:start');
      }
    });

    // Tab switching
    document.querySelectorAll('.right-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab!;
        document.querySelectorAll('.right-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.right-pane').forEach(p =>
          (p as HTMLElement).style.display = (p as HTMLElement).dataset.pane === tab ? 'flex' : 'none');
        if (tab === 'craft') this.refreshCraftPanel();
        if (tab === 'collection') this.refreshCollectionPanel();
      });
    });

    // Craft event
    this.bus.on('craft:complete', () => {
      this.refreshCraftPanel();
      this.refreshStats();
      this.refreshActiveCrafts();
    });

    this.refreshStats();
    this.refreshCraftPanel();
    this.refreshActiveCrafts();
    this.bus.emit('ui:ready');
  }

  setRolling(rolling: boolean): void {
    this.rollBtn.disabled = rolling;
    this.rollBtn.classList.toggle('rolling', rolling);
    if (rolling) {
      this.cardAuraName.textContent    = '...';
      this.cardRarityLabel.textContent = '';
      this.cardSubtitle.textContent    = 'Summoning...';
      this.cardBadge.textContent       = '';
      this.cardBadge.style.display     = 'none';
      this.cardIcon.textContent        = '◌';
    }
  }

  showResult(result: RollResult): void {
    const { rarity, aura, isNew } = result;
    this.cardRarityLabel.textContent = rarity.name.toUpperCase();
    this.cardRarityLabel.style.color = rarity.visual.primaryColor;
    this.cardAuraName.textContent    = aura.name;
    this.cardSubtitle.textContent    = isNew ? '✦ New Discovery!' : 'Your fate awaits...';
    this.cardSubtitle.style.color    = isNew ? '#ffd700' : '';
    this.cardBadge.textContent       = rarity.name.toUpperCase();
    this.cardBadge.style.display     = 'inline-block';
    this.cardBadge.style.background  = rarity.visual.primaryColor + '22';
    this.cardBadge.style.color       = rarity.visual.primaryColor;
    this.cardBadge.style.borderColor = rarity.visual.primaryColor + '66';
    this.cardIcon.textContent        = rarity.icon;
    this.cardIcon.style.color        = rarity.visual.primaryColor;
    this.cardIcon.style.textShadow   = `0 0 16px ${rarity.visual.glowColor}`;
    this.refreshStats();
    this.refreshAuraCounts();
    this.refreshCraftPanel();
    this.refreshActiveCrafts();
    // Auto-roll: queue next roll
    if (this.autoRollActive) {
      this.autoRollTimer = setTimeout(() => {
        if (this.autoRollActive && !this.state.isRolling) {
          this.bus.emit('roll:start');
        }
      }, 800);
    }
  }

  refreshStats(): void {
    this.totalRollsEl.textContent = this.state.totalRolls.toLocaleString();
    const luck = this.state.effectiveLuck;
    const pct  = Math.min(100, ((luck - 1) / 4) * 100);
    this.luckBarFill.style.width  = pct + '%';
    this.luckBarLabel.textContent = `×${luck.toFixed(2)}`;
    this.refreshAuraCounts();
    this.refreshPityCounters();
  }

  refreshAuraCounts(): void {
    const nameCount   = this.state.countByName();
    const rarityCount = this.state.countByRarity();
    const allRarities = this.registry.getAll().slice().reverse(); // rarest first

    let html = '';
    for (const rarity of allRarities) {
      const count = rarityCount[rarity.id] ?? 0;
      if (count === 0) continue;

      if (rarity.showIndividualNames) {
        // Show individual aura names
        for (const aura of rarity.auras) {
          const n = nameCount[aura.name] ?? 0;
          if (n === 0) continue;
          html += `<div class="stat-row" style="--rc:${rarity.visual.primaryColor}">
            <span class="stat-icon" style="color:${rarity.visual.primaryColor}">${rarity.icon}</span>
            <span class="stat-name" style="color:${rarity.visual.primaryColor}">${aura.name}</span>
            <span class="stat-count">${n}</span>
          </div>`;
        }
      } else {
        // Show aggregate rarity count
        html += `<div class="stat-row">
          <span class="stat-icon" style="color:${rarity.visual.primaryColor}">${rarity.icon}</span>
          <span class="stat-name" style="color:${rarity.visual.primaryColor}">${rarity.name}</span>
          <span class="stat-count">${count}</span>
        </div>`;
      }
    }
    this.auraCountsEl.innerHTML = html || '<div class="stat-empty">No auras yet</div>';
  }

  refreshPityCounters(): void {
    const pity = this.state.pityCounters;
    const tracked = [
      { id: 'LEGENDARY', label: 'Legendary' },
      { id: 'MYTHIC',    label: 'Mythic'    },
      { id: 'DIVINE',    label: 'Divine'    },
      { id: 'VOID',      label: 'Void'      },
    ];
    this.pityCountsEl.innerHTML = tracked.map(({ id, label }) => {
      const count = pity[id] ?? 0;
      const rarity = this.registry.get(id);
      const color  = rarity?.visual.primaryColor ?? '#888';
      return `<div class="stat-row pity-row">
        <span class="pity-label" style="color:${color}60">Pity · ${label}</span>
        <span class="stat-count pity-count" style="color:${color}">${count}</span>
      </div>`;
    }).join('');
  }

  refreshActiveCrafts(): void {
    const boosts = this.state.craftedBoosts;
    if (!boosts.length) {
      this.activeCraftEl.innerHTML = '';
      return;
    }
    this.activeCraftEl.innerHTML = boosts.map(b => {
      const pct = (b.rollsLeft / b.totalRolls) * 100;
      return `<div class="active-boost">
        <div class="boost-row">
          <span class="boost-name">${b.name}</span>
          <span class="boost-mult">×${b.multiplier}</span>
          <span class="boost-rolls">${b.rollsLeft} rolls left</span>
        </div>
        <div class="boost-bar"><div class="boost-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  refreshCraftPanel(): void {
    const recipes  = this.crafting.getRecipes();
    const counts   = this.state.countByRarity();

    this.craftListEl.innerHTML = recipes.map(recipe => {
      const canCraft = this.crafting.canCraft(recipe);

      const ingredients = recipe.ingredients.map(ing => {
        const rarity  = this.registry.get(ing.rarityId);
        const have    = counts[ing.rarityId] ?? 0;
        const color   = rarity?.visual.primaryColor ?? '#888';
        const enough  = have >= ing.count;
        return `<span class="ing-badge ${enough ? 'ing-ok' : 'ing-bad'}" style="--ic:${color}">
          <span class="ing-have">${have}</span><span class="ing-sep">/</span><span class="ing-need">${ing.count}</span>
          <span class="ing-name">${rarity?.name ?? ing.rarityId}</span>
        </span>`;
      }).join('<span class="ing-plus">+</span>');

      return `<div class="recipe-card ${canCraft ? 'craftable' : ''}">
        <div class="recipe-header">
          <span class="recipe-icon">${recipe.icon}</span>
          <div class="recipe-title-group">
            <span class="recipe-name">${recipe.name}</span>
            <span class="recipe-desc">${recipe.description}</span>
          </div>
          <div class="recipe-meta">
            <span class="recipe-mult">×${recipe.multiplier}</span>
            <span class="recipe-dur">${recipe.rollDuration} rolls</span>
          </div>
        </div>
        <div class="recipe-footer">
          <div class="recipe-ings">${ingredients}</div>
          <button class="craft-btn ${canCraft ? '' : 'craft-disabled'}"
            data-recipe="${recipe.id}" ${canCraft ? '' : 'disabled'}>
            ${canCraft ? 'CRAFT' : 'NEED MORE'}
          </button>
        </div>
      </div>`;
    }).join('');

    // Bind craft buttons
    this.craftListEl.querySelectorAll('.craft-btn:not(.craft-disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.recipe!;
        this.crafting.craft(id);
      });
    });
  }

  refreshCollectionPanel(): void {
    const nameCount = this.state.countByName();
    const allRarities = this.registry.getAll().slice().reverse();
    let html = '';
    for (const rarity of allRarities) {
      const cnt = (this.state.countByRarity())[rarity.id] ?? 0;
      if (cnt === 0) continue;
      html += `<div class="coll-section">
        <div class="coll-rarity-header" style="color:${rarity.visual.primaryColor}">
          ${rarity.icon} ${rarity.name} <span class="coll-count">${cnt}</span>
        </div>
        <div class="coll-auras">
          ${rarity.auras.filter(a => (nameCount[a.name] ?? 0) > 0).map(a =>
            `<div class="coll-item" style="--rc:${rarity.visual.primaryColor}">
              <span>${a.name}</span>
              <span class="coll-item-count">×${nameCount[a.name] ?? 0}</span>
            </div>`
          ).join('')}
          ${!rarity.showIndividualNames ? `<div class="coll-item" style="--rc:${rarity.visual.primaryColor}">
            <span style="color:#888;font-style:italic">Various</span>
            <span class="coll-item-count">×${cnt}</span>
          </div>` : ''}
        </div>
      </div>`;
    }
    this.collectionListEl.innerHTML = html || '<div class="stat-empty">Roll to discover auras.</div>';
  }
}
