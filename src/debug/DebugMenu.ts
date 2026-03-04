// DebugMenu.ts
// ─────────────────────────────────────────────────────────────────────────────
// A left-side slide-in drawer.
// Does NOT use a full-screen overlay — cutscenes play unobstructed in center.
// FAB lives at bottom-left. Drawer slides over the left stats panel only.
// ─────────────────────────────────────────────────────────────────────────────

import { EventBus } from '../app/EventBus';
import { RarityRegistry } from '../core/registry/RarityRegistry';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { GameState } from '../core/state/GameState';
import { CinematicRegistry } from '../cutscenes/CinematicRegistry';
import { BaseCinematic } from '../cutscenes/BaseCinematic';

const ACCESS_CODE   = '1337';
const TRIGGER_KEY   = 'KeyD';       // Ctrl + Shift + D
const SESSION_KEY   = 'rng-aura:dbg';
const LOGO_TAPS     = 5;
const TAP_WINDOW_MS = 2000;

type DebugTab = 'cutscenes' | 'state' | 'odds';

export class DebugMenu {
  private drawer!:     HTMLElement;
  private loginScreen!:HTMLElement;
  private mainScreen!: HTMLElement;
  private pinDisplay!: HTMLElement;
  private logEl!:      HTMLElement;
  private fab!:        HTMLElement;

  private pin       = '';
  private isOpen    = false;
  private authed    = false;
  private logoTaps  = 0;
  private logoTimer = 0;

  private activeScene: BaseCinematic | null = null;

  constructor(
    private bus:      EventBus,
    private registry: RarityRegistry,
    private renderer: CanvasRenderer,
    private state:    GameState,
  ) {}

  init(): void {
    this.authed = sessionStorage.getItem(SESSION_KEY) === '1';
    this.injectStyles();
    this.buildFAB();
    this.buildDrawer();
    this.bindGlobalTriggers();
    this.bus.on('debug:preview-rarity',    ({ rarityId }) => this.previewCanvas(rarityId));
    this.bus.on('debug:preview-cinematic', ({ rarityId }) => this.previewCinematic(rarityId));
    this.bus.on('debug:reset-state',       () => this.log('⚠ State reset.'));
  }

  // ── Open / close ────────────────────────────────────────────────────────────

  toggle(): void { this.isOpen ? this.close() : this.open(); }

  open(): void {
    this.isOpen = true;
    this.drawer.classList.add('dbg-drawer--open');
    this.fab.classList.add('dbg-fab--open');
    if (this.authed) this.showMain(); else this.showLogin();
  }

  close(): void {
    this.isOpen = false;
    this.pin    = '';
    this.drawer.classList.remove('dbg-drawer--open');
    this.fab.classList.remove('dbg-fab--open');
    this.refreshPinDisplay();
  }

  // ── Keyboard + tap triggers ─────────────────────────────────────────────────

  private bindGlobalTriggers(): void {
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.code === TRIGGER_KEY) { e.preventDefault(); this.toggle(); }
      if (e.code === 'Escape' && this.isOpen) this.close();
    });

    const logo = document.querySelector('.header-logo');
    if (logo) {
      logo.addEventListener('click', () => {
        this.logoTaps++;
        clearTimeout(this.logoTimer);
        this.logoTimer = window.setTimeout(() => { this.logoTaps = 0; }, TAP_WINDOW_MS);
        if (this.logoTaps >= LOGO_TAPS) { this.logoTaps = 0; this.toggle(); }
      });
    }
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  private showLogin(): void {
    this.loginScreen.style.display = 'flex';
    this.mainScreen.style.display  = 'none';
    this.pin = '';
    this.refreshPinDisplay();
  }

  private showMain(): void {
    this.loginScreen.style.display = 'none';
    this.mainScreen.style.display  = 'flex';
    this.refreshOdds();
    this.refreshStatePanel();
  }

  private pressPin(digit: string): void {
    if (this.pin.length >= ACCESS_CODE.length) return;
    this.pin += digit;
    this.refreshPinDisplay();
    if (this.pin.length === ACCESS_CODE.length) setTimeout(() => this.submitPin(), 120);
  }

  private submitPin(): void {
    if (this.pin === ACCESS_CODE) {
      this.authed = true;
      sessionStorage.setItem(SESSION_KEY, '1');
      this.showMain();
      this.log('✓ Authenticated.');
    } else {
      this.pinDisplay.classList.add('dbg-pin-error');
      setTimeout(() => {
        this.pin = '';
        this.refreshPinDisplay();
        this.pinDisplay.classList.remove('dbg-pin-error');
      }, 600);
    }
  }

  private logout(): void {
    this.authed = false;
    sessionStorage.removeItem(SESSION_KEY);
    this.showLogin();
    this.log('Logged out.');
  }

  private refreshPinDisplay(): void {
    this.pinDisplay.innerHTML = Array.from({ length: ACCESS_CODE.length }, (_, i) =>
      `<span class="dbg-dot ${i < this.pin.length ? 'dbg-dot--on' : ''}"></span>`
    ).join('');
  }

  // ── Cutscene previews ────────────────────────────────────────────────────────

  private previewCanvas(rarityId: string): void {
    const rarity = this.registry.get(rarityId);
    if (!rarity) { this.log(`Unknown: ${rarityId}`); return; }
    this.log(`▶ Canvas: ${rarity.name}`);
    this.drawer.querySelectorAll('[data-rarity]').forEach(b =>
      b.classList.toggle('dbg-rarity-btn--active', (b as HTMLElement).dataset.rarity === rarityId));
    this.renderer.playReveal(rarity.visual, () => {
      this.renderer.showAura(rarity.visual);
      this.log(`✓ ${rarity.name} done.`);
    });
  }

  private previewCinematic(rarityId: string): void {
    const rarity = this.registry.get(rarityId);
    if (!rarity) { this.log(`Unknown: ${rarityId}`); return; }
    if (!CinematicRegistry.has(rarityId)) {
      this.log(`No cinematic for ${rarity.name} yet.`);
      return;
    }
    this.activeScene?.stop();
    this.activeScene = CinematicRegistry.build(rarity)!;
    this.log(`🎬 Cinematic: ${rarity.name}`);
    this.activeScene.play().then(() => {
      this.activeScene = null;
      this.renderer.showAura(rarity.visual);
      this.log(`✓ Cinematic ${rarity.name} done.`);
    });
  }

  // ── Odds simulation ─────────────────────────────────────────────────────────

  private refreshOdds(): void {
    const el = this.drawer.querySelector('.dbg-odds-body');
    if (!el) return;
    const n    = 10_000;
    const table = this.registry.getWeightTable(1.0);
    const freq  = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      for (const entry of table) {
        if (roll <= entry.cumulative) {
          freq.set(entry.rarity.id, (freq.get(entry.rarity.id) ?? 0) + 1);
          break;
        }
      }
    }
    el.innerHTML = this.registry.getAll().map(r => {
      const hits = freq.get(r.id) ?? 0;
      const pct  = ((hits / n) * 100).toFixed(2);
      return `<div class="dbg-kv">
        <span style="color:${r.visual.primaryColor}">${r.name}</span>
        <span>${pct}% <em>(${hits}/${n})</em></span>
      </div>`;
    }).join('') + `<div class="dbg-odds-note">Simulated ${n.toLocaleString()} rolls · luck ×1.0</div>`;
  }

  private refreshStatePanel(): void {
    const el = this.drawer.querySelector('.dbg-state-body');
    if (!el) return;
    const aura = this.state.currentAura;
    el.innerHTML = `
      <div class="dbg-kv"><span>Total Rolls</span><span>${this.state.totalRolls.toLocaleString()}</span></div>
      <div class="dbg-kv"><span>Luck</span><span>×${this.state.luck.toFixed(4)}</span></div>
      <div class="dbg-kv"><span>Effective Luck</span><span>×${this.state.effectiveLuck.toFixed(4)}</span></div>
      <div class="dbg-kv"><span>Inventory</span><span>${this.state.inventory.length}</span></div>
      <div class="dbg-kv"><span>Current Aura</span><span>${aura?.name ?? '—'}</span></div>
    `;
  }

  private log(msg: string): void {
    if (!this.logEl) return;
    const ts   = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const line = document.createElement('div');
    line.className = 'dbg-log-line';
    line.innerHTML = `<span class="dbg-log-ts">${ts}</span> ${msg}`;
    this.logEl.appendChild(line);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  private switchTab(tab: DebugTab): void {
    this.drawer.querySelectorAll('.dbg-tab-btn').forEach(b =>
      b.classList.toggle('dbg-tab-btn--active', (b as HTMLElement).dataset.tab === tab));
    this.drawer.querySelectorAll('.dbg-pane').forEach(p =>
      (p as HTMLElement).style.display = (p as HTMLElement).dataset.pane === tab ? 'flex' : 'none');
    if (tab === 'state') this.refreshStatePanel();
    if (tab === 'odds')  this.refreshOdds();
  }

  // ── DOM build ────────────────────────────────────────────────────────────────

  private buildFAB(): void {
    this.fab = document.createElement('button');
    this.fab.id        = 'dbg-fab';
    this.fab.className = 'dbg-fab';
    this.fab.title     = 'Debug (Ctrl+Shift+D)';
    this.fab.innerHTML = `<span>⬡</span><span>DBG</span>`;
    this.fab.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.fab);
  }

  private buildDrawer(): void {
    this.drawer = document.createElement('div');
    this.drawer.className = 'dbg-drawer';

    // ── Header bar
    const hdr = document.createElement('div');
    hdr.className = 'dbg-header';
    hdr.innerHTML = `
      <span class="dbg-title">⬡ DEBUG</span>
      <div style="display:flex;gap:5px">
        <button class="dbg-hdr-btn dbg-logout-btn" title="Lock">⏻</button>
        <button class="dbg-hdr-btn dbg-close-btn"  title="Close">✕</button>
      </div>`;
    hdr.querySelector('.dbg-close-btn')!.addEventListener('click',  () => this.close());
    hdr.querySelector('.dbg-logout-btn')!.addEventListener('click', () => this.logout());

    // ── Login screen
    this.loginScreen = document.createElement('div');
    this.loginScreen.className = 'dbg-login';
    this.loginScreen.innerHTML = `
      <div class="dbg-login-icon">🔐</div>
      <div class="dbg-login-title">DEBUG ACCESS</div>
      <div class="dbg-login-sub">Enter PIN</div>
      <div class="dbg-pin-display"></div>
      <div class="dbg-numpad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(d =>
          `<button class="dbg-numpad-btn ${d === '' ? 'dbg-numpad-blank' : ''}" data-digit="${d}">${d}</button>`
        ).join('')}
      </div>`;
    this.pinDisplay = this.loginScreen.querySelector('.dbg-pin-display')!;
    this.loginScreen.querySelectorAll('.dbg-numpad-btn:not(.dbg-numpad-blank)').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = (btn as HTMLElement).dataset.digit!;
        if (d === '⌫') { this.pin = this.pin.slice(0, -1); this.refreshPinDisplay(); }
        else this.pressPin(d);
      });
    });
    this.refreshPinDisplay();

    // ── Tab bar
    const tabs = document.createElement('div');
    tabs.className = 'dbg-tabs';
    (['cutscenes', 'state', 'odds'] as DebugTab[]).forEach((id, i) => {
      const btn = document.createElement('button');
      btn.className  = `dbg-tab-btn ${i === 0 ? 'dbg-tab-btn--active' : ''}`;
      btn.dataset.tab = id;
      btn.textContent = id === 'cutscenes' ? '▶ Scenes' : id === 'state' ? '◈ State' : '⚄ Odds';
      btn.addEventListener('click', () => this.switchTab(id));
      tabs.appendChild(btn);
    });

    // ── Cutscenes pane
    const csPane = document.createElement('div');
    csPane.className  = 'dbg-pane';
    csPane.dataset.pane = 'cutscenes';
    csPane.style.display = 'flex';

    const rarities = this.registry.getAll();
    csPane.innerHTML = `
      <div class="dbg-section-lbl">Canvas Reveal</div>
      <div class="dbg-rarity-list">${rarities.map(r => `
        <div class="dbg-rarity-row">
          <button class="dbg-rarity-btn" data-rarity="${r.id}"
            style="--rc:${r.visual.primaryColor};--rg:${r.visual.glowColor}">
            <span class="dbg-rdot"></span>${r.name}
          </button>
          <button class="dbg-idle-btn" data-rarity-idle="${r.id}" title="Idle">◉</button>
        </div>`).join('')}
      </div>
      <div class="dbg-section-lbl" style="margin-top:12px">Cinematic (1/1000+)</div>
      <div class="dbg-rarity-list">${rarities.map(r => {
        const hasCinematic = CinematicRegistry.has(r.id);
        return `<button class="dbg-rarity-btn dbg-cine-btn ${!hasCinematic ? 'dbg-rarity-btn--dim' : ''}"
          data-cinematic="${r.id}"
          style="--rc:${r.visual.primaryColor};--rg:${r.visual.glowColor}">
          <span class="dbg-rdot"></span>${r.name}${hasCinematic ? '' : ' <em>(none)</em>'}
        </button>`;
      }).join('')}
      </div>
      <div class="dbg-log-lbl">Log</div>
      <div class="dbg-log"></div>`;

    csPane.querySelectorAll('.dbg-rarity-btn:not(.dbg-cine-btn)').forEach(btn => {
      btn.addEventListener('click', () =>
        this.bus.emit('debug:preview-rarity', { rarityId: (btn as HTMLElement).dataset.rarity! }));
    });
    csPane.querySelectorAll('.dbg-idle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = this.registry.get((btn as HTMLElement).dataset.rarityIdle!);
        if (r) { this.renderer.showAura(r.visual); this.log(`◉ Idle: ${r.name}`); }
      });
    });
    csPane.querySelectorAll('.dbg-cine-btn').forEach(btn => {
      btn.addEventListener('click', () =>
        this.bus.emit('debug:preview-cinematic', { rarityId: (btn as HTMLElement).dataset.cinematic! }));
    });
    this.logEl = csPane.querySelector('.dbg-log')!;

    // ── State pane
    const stPane = document.createElement('div');
    stPane.className   = 'dbg-pane';
    stPane.dataset.pane = 'state';
    stPane.style.display = 'none';
    stPane.innerHTML = `
      <div class="dbg-section-lbl">Snapshot</div>
      <div class="dbg-state-body"></div>
      <div class="dbg-section-lbl" style="margin-top:12px">Actions</div>
      <button class="dbg-action-btn" id="dbg-refresh-btn">↺ Refresh</button>
      <button class="dbg-action-btn dbg-action-btn--danger" id="dbg-reset-btn">⚠ Reset State</button>`;
    stPane.querySelector('#dbg-refresh-btn')!.addEventListener('click', () => { this.refreshStatePanel(); this.log('Refreshed.'); });
    stPane.querySelector('#dbg-reset-btn')!.addEventListener('click', () => {
      if (confirm('Reset ALL game state?')) {
        localStorage.clear();
        this.bus.emit('debug:reset-state');
        this.refreshStatePanel();
        this.log('⚠ State cleared. Reload to take effect.');
      }
    });

    // ── Odds pane
    const odPane = document.createElement('div');
    odPane.className   = 'dbg-pane';
    odPane.dataset.pane = 'odds';
    odPane.style.display = 'none';
    odPane.innerHTML = `
      <div class="dbg-section-lbl">Simulated Drop Rates</div>
      <div class="dbg-odds-body"></div>
      <button class="dbg-action-btn" id="dbg-resim-btn" style="margin-top:8px">↺ Re-simulate</button>`;
    odPane.querySelector('#dbg-resim-btn')!.addEventListener('click', () => this.refreshOdds());

    // ── Main screen (tabs + panes)
    this.mainScreen = document.createElement('div');
    this.mainScreen.className    = 'dbg-main';
    this.mainScreen.style.display = 'none';
    this.mainScreen.append(tabs, csPane, stPane, odPane);

    this.drawer.append(hdr, this.loginScreen, this.mainScreen);
    document.body.appendChild(this.drawer);
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('dbg-styles')) return;
    const s = document.createElement('style');
    s.id = 'dbg-styles';
    s.textContent = `
      /* ── FAB ─────────────────────────────────────── */
      .dbg-fab {
        position:fixed; bottom:20px; left:20px; z-index:10020;
        display:flex; align-items:center; gap:5px;
        background:#0a0a18; border:1px solid #242438;
        color:#7c6af7; font-family:'Rajdhani',monospace;
        font-size:.68rem; font-weight:700; letter-spacing:.18em;
        text-transform:uppercase; padding:6px 11px; border-radius:6px;
        cursor:pointer; user-select:none;
        box-shadow:0 2px 14px rgba(0,0,0,.6);
        transition:background .15s,border-color .15s,box-shadow .15s,color .15s;
      }
      .dbg-fab:hover         { background:#12122a; border-color:#7c6af7; box-shadow:0 0 14px rgba(124,106,247,.35); }
      .dbg-fab--open         { border-color:#7c6af7; box-shadow:0 0 18px rgba(124,106,247,.45); background:#12122a; }

      /* ── Drawer ──────────────────────────────────── */
      /* Slides in from the LEFT — sits OVER the left stats panel only.
         Never covers center stage or right panel.                        */
      .dbg-drawer {
        position:fixed; top:0; left:0; bottom:0;
        width:280px; z-index:10019;
        background:#07070f;
        border-right:1px solid #1a1a2e;
        display:flex; flex-direction:column;
        transform:translateX(-100%);
        transition:transform .22s cubic-bezier(.22,1,.36,1);
        box-shadow:4px 0 32px rgba(0,0,0,.8);
        font-family:'Rajdhani','Consolas',monospace;
      }
      .dbg-drawer--open { transform:translateX(0); }

      /* ── Header ──────────────────────────────────── */
      .dbg-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:12px 14px; flex-shrink:0;
        background:linear-gradient(90deg,#0d0d22 0%,#111128 100%);
        border-bottom:1px solid #1e1e38;
      }
      .dbg-title { font-size:.72rem; letter-spacing:.22em; font-weight:700; color:#7c6af7; }
      .dbg-hdr-btn {
        background:none; border:1px solid #2a2a44; color:#666;
        padding:3px 7px; border-radius:4px; cursor:pointer; font-size:.78rem;
        transition:color .12s, border-color .12s;
      }
      .dbg-hdr-btn:hover { color:#fff; border-color:#5a5a7a; }

      /* ── Login ──────────────────────────────────── */
      .dbg-login {
        flex:1; flex-direction:column; align-items:center; justify-content:center;
        padding:24px 18px; gap:10px; overflow-y:auto;
      }
      .dbg-login-icon  { font-size:1.8rem; }
      .dbg-login-title { font-size:.75rem; letter-spacing:.28em; text-transform:uppercase; color:#c8c8e0; font-weight:700; }
      .dbg-login-sub   { font-size:.7rem; color:#4a4a68; }
      .dbg-pin-display {
        display:flex; gap:10px; margin:6px 0;
        animation:none;
      }
      .dbg-pin-display.dbg-pin-error { animation:dbgShakePIN .3s ease; }
      @keyframes dbgShakePIN { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
      .dbg-dot {
        width:12px; height:12px; border-radius:50%;
        border:2px solid #252540; background:transparent;
        transition:background .1s, border-color .1s, box-shadow .1s;
      }
      .dbg-dot--on { background:#7c6af7; border-color:#7c6af7; box-shadow:0 0 8px #7c6af7; }

      .dbg-numpad {
        display:grid; grid-template-columns:repeat(3,1fr); gap:7px; width:180px;
      }
      .dbg-numpad-btn {
        background:#0c0c1e; border:1px solid #1e1e38; color:#c8c8e0;
        font-size:1rem; font-weight:600; padding:12px 0; border-radius:5px;
        cursor:pointer; font-family:inherit;
        transition:background .1s, border-color .1s;
      }
      .dbg-numpad-btn:hover:not(.dbg-numpad-blank) { background:#181830; border-color:#7c6af7; }
      .dbg-numpad-btn:active:not(.dbg-numpad-blank){ background:#2a2a50; }
      .dbg-numpad-blank { background:transparent!important; border-color:transparent!important; cursor:default; }

      /* ── Main ───────────────────────────────────── */
      .dbg-main { flex:1; flex-direction:column; overflow:hidden; }

      /* ── Tabs ───────────────────────────────────── */
      .dbg-tabs { display:flex; border-bottom:1px solid #1e1e38; flex-shrink:0; }
      .dbg-tab-btn {
        flex:1; background:none; border:none; color:#4a4a68;
        font-family:inherit; font-size:.66rem; font-weight:700;
        letter-spacing:.1em; text-transform:uppercase;
        padding:9px 4px; border-bottom:2px solid transparent; cursor:pointer;
        transition:color .12s, border-color .12s;
      }
      .dbg-tab-btn:hover       { color:#c8c8e0; }
      .dbg-tab-btn--active     { color:#7c6af7; border-bottom-color:#7c6af7; }

      /* ── Pane ───────────────────────────────────── */
      .dbg-pane {
        flex:1; flex-direction:column; padding:12px 14px;
        overflow-y:auto; gap:4px;
        scrollbar-width:thin; scrollbar-color:#1e1e38 transparent;
      }

      /* ── Section label ──────────────────────────── */
      .dbg-section-lbl {
        font-size:.6rem; letter-spacing:.2em; text-transform:uppercase;
        color:#4a4a68; margin-bottom:4px;
      }

      /* ── Rarity rows ────────────────────────────── */
      .dbg-rarity-list { display:flex; flex-direction:column; gap:4px; }
      .dbg-rarity-row  { display:flex; gap:5px; align-items:center; }
      .dbg-rarity-btn {
        flex:1; display:flex; align-items:center; gap:7px;
        background:#0c0c1e; border:1px solid #1e1e38;
        color:#c8c8e0; font-family:inherit; font-size:.82rem; font-weight:600;
        padding:7px 10px; border-radius:5px; cursor:pointer; text-align:left;
        transition:background .1s,border-color .12s,box-shadow .12s;
      }
      .dbg-rarity-btn em { color:#4a4a68; font-style:normal; font-weight:400; }
      .dbg-rarity-btn:hover:not(.dbg-rarity-btn--dim) {
        background:#12122a; border-color:var(--rc,#7c6af7);
        box-shadow:0 0 10px var(--rg,#7c6af7);
      }
      .dbg-rarity-btn--active {
        border-color:var(--rc,#7c6af7); box-shadow:0 0 14px var(--rg,#7c6af7); background:#181830;
      }
      .dbg-rarity-btn--dim { opacity:.45; cursor:not-allowed; }
      .dbg-rdot {
        width:7px; height:7px; border-radius:50%; flex-shrink:0;
        background:var(--rc,#888); box-shadow:0 0 5px var(--rg,#888);
      }
      .dbg-idle-btn {
        background:#0c0c1e; border:1px solid #1e1e38; color:#4a4a68;
        padding:7px 9px; border-radius:5px; cursor:pointer; font-size:.82rem;
        transition:color .1s,border-color .1s;
      }
      .dbg-idle-btn:hover { color:#fff; border-color:#5a5a7a; }

      /* ── Log ────────────────────────────────────── */
      .dbg-log-lbl { font-size:.6rem; letter-spacing:.2em; text-transform:uppercase; color:#4a4a68; margin-top:10px; }
      .dbg-log {
        background:#03030c; border:1px solid #10101e; border-radius:4px;
        padding:7px 9px; height:100px; overflow-y:auto; flex-shrink:0;
        scrollbar-width:thin; scrollbar-color:#1e1e38 transparent;
      }
      .dbg-log-line { font-size:.72rem; color:#7878aa; line-height:1.7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .dbg-log-ts   { color:#343450; margin-right:5px; }

      /* ── K/V rows ───────────────────────────────── */
      .dbg-kv {
        display:flex; justify-content:space-between; align-items:center;
        font-size:.8rem; padding:4px 0; border-bottom:1px solid #0e0e1c; color:#7878a0;
      }
      .dbg-kv span:last-child { color:#fff; font-weight:600; }
      .dbg-kv em { color:#4a4a68; font-style:normal; }
      .dbg-odds-note { font-size:.62rem; color:#343450; text-align:center; margin-top:8px; letter-spacing:.05em; }

      /* ── Action buttons ─────────────────────────── */
      .dbg-action-btn {
        width:100%; background:#0c0c1e; border:1px solid #1e1e38;
        color:#c8c8e0; font-family:inherit; font-size:.75rem; font-weight:700;
        letter-spacing:.12em; text-transform:uppercase;
        padding:8px; border-radius:5px; cursor:pointer; margin-bottom:6px;
        transition:background .1s,border-color .1s;
      }
      .dbg-action-btn:hover               { background:#181830; border-color:#5a5a7a; }
      .dbg-action-btn--danger             { color:#ff5252; border-color:#3a1010; }
      .dbg-action-btn--danger:hover       { background:#1a0808; border-color:#ff5252; }
    `;
    document.head.appendChild(s);
  }
}
