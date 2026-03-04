type EventCallback<T = any> = (payload: T) => void;

export interface AppEvents {
  'roll:start': void;
  'roll:complete': { rarity: string; auraId: string };
  'roll:animate': { rarity: string };
  'state:updated': void;
  'ui:ready': void;
  'craft:complete': { recipeId: string };
  'autoroll:toggle': { active: boolean };
  // Debug events
  'debug:preview-rarity': { rarityId: string };
  'debug:preview-cinematic': { rarityId: string };
  'debug:reset-state': void;
}

export class EventBus {
  private listeners = new Map<string, EventCallback[]>();

  on<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as EventCallback);
  }

  off<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      const idx = cbs.indexOf(callback as EventCallback);
      if (idx > -1) cbs.splice(idx, 1);
    }
  }

  emit<K extends keyof AppEvents>(event: K, payload?: AppEvents[K]): void {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(payload));
  }

  once<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
    const wrapper = (payload: AppEvents[K]) => {
      callback(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}
