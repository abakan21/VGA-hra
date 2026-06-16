import { ShipDefinition } from './ships';
import { Economy } from './economy';

export type UpgradeId = 'hull' | 'damage' | 'engine' | 'firerate';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;   // cost of the first level
  costGrowth: number; // cost multiplier per owned level
  perLevel: number;   // flat HP (hull) or fractional bonus (others) per level
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'hull', name: 'Hull Plating', description: '+20 max HP per level', maxLevel: 8, baseCost: 150, costGrowth: 1.5, perLevel: 20 },
  { id: 'damage', name: 'Weapon Power', description: '+6% damage per level', maxLevel: 8, baseCost: 200, costGrowth: 1.55, perLevel: 0.06 },
  { id: 'engine', name: 'Engines', description: '+5% speed per level', maxLevel: 6, baseCost: 180, costGrowth: 1.5, perLevel: 0.05 },
  { id: 'firerate', name: 'Fire Rate', description: '+6% fire rate per level', maxLevel: 6, baseCost: 220, costGrowth: 1.6, perLevel: 0.06 },
];

const STORAGE_KEY = 'stellar-drift-upgrades-v1';

interface UpgradesState {
  levels: Record<string, number>;
}

export class Upgrades {
  levels: Record<UpgradeId, number> = { hull: 0, damage: 0, engine: 0, firerate: 0 };

  constructor() {
    this.load();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<UpgradesState>;
      for (const def of UPGRADES) {
        const v = Number(parsed.levels?.[def.id] ?? 0);
        this.levels[def.id] = Math.max(0, Math.min(def.maxLevel, Math.floor(v)));
      }
    } catch {
      this.levels = { hull: 0, damage: 0, engine: 0, firerate: 0 };
    }
  }

  save(): void {
    const state: UpgradesState = { levels: { ...this.levels } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  level(id: UpgradeId): number {
    return this.levels[id] ?? 0;
  }

  // Human-readable total bonus this upgrade gives at a given level.
  totalBonusLabel(id: UpgradeId, level: number): string {
    const def = UPGRADES.find((u) => u.id === id)!;
    if (id === 'hull') return `+${level * def.perLevel} HP`;
    return `+${Math.round(level * def.perLevel * 100)}%`;
  }

  isMaxed(id: UpgradeId): boolean {
    const def = UPGRADES.find((u) => u.id === id)!;
    return this.level(id) >= def.maxLevel;
  }

  // cost of the next level, or null if already maxed
  costFor(id: UpgradeId): number | null {
    const def = UPGRADES.find((u) => u.id === id)!;
    const lvl = this.level(id);
    if (lvl >= def.maxLevel) return null;
    return Math.round(def.baseCost * Math.pow(def.costGrowth, lvl));
  }

  buy(id: UpgradeId, economy: Economy): boolean {
    const cost = this.costFor(id);
    if (cost === null) return false;
    economy.load();
    if (!economy.spend(cost)) return false;
    this.levels[id] = this.level(id) + 1;
    this.save();
    return true;
  }

  // Returns a copy of the ship definition with all owned upgrades applied.
  applyToShip(ship: ShipDefinition): ShipDefinition {
    const hullDef = UPGRADES.find((u) => u.id === 'hull')!;
    const dmgDef = UPGRADES.find((u) => u.id === 'damage')!;
    const engDef = UPGRADES.find((u) => u.id === 'engine')!;
    const frDef = UPGRADES.find((u) => u.id === 'firerate')!;

    return {
      ...ship,
      maxHp: ship.maxHp + this.level('hull') * hullDef.perLevel,
      damageMultiplier: ship.damageMultiplier * (1 + this.level('damage') * dmgDef.perLevel),
      speedMultiplier: ship.speedMultiplier * (1 + this.level('engine') * engDef.perLevel),
      fireRateMultiplier: ship.fireRateMultiplier * (1 + this.level('firerate') * frDef.perLevel),
    };
  }
}
