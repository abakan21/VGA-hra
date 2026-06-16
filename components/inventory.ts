import { COSMETICS, CosmeticItem, getCosmetic } from './cosmetics';

export interface InventoryState {
  ownedCosmetics: string[];
  selectedShipSkin: string;
  selectedMenuBackground: string;
}

const STORAGE_KEY = 'stellar-drift-inventory-v1';
const DEFAULT_SHIP_SKIN = 'ship_default';
const DEFAULT_MENU_BACKGROUND = 'bg_default';

export class Inventory {
  ownedCosmetics = new Set<string>([DEFAULT_SHIP_SKIN, DEFAULT_MENU_BACKGROUND]);
  selectedShipSkin = DEFAULT_SHIP_SKIN;
  selectedMenuBackground = DEFAULT_MENU_BACKGROUND;

  constructor() {
    this.load();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.save();
        return;
      }

      const parsed = JSON.parse(raw) as Partial<InventoryState>;
      this.ownedCosmetics = new Set<string>([
        DEFAULT_SHIP_SKIN,
        DEFAULT_MENU_BACKGROUND,
        ...(parsed.ownedCosmetics ?? []),
      ]);

      if (parsed.selectedShipSkin && this.ownedCosmetics.has(parsed.selectedShipSkin)) {
        this.selectedShipSkin = parsed.selectedShipSkin;
      }

      if (parsed.selectedMenuBackground && this.ownedCosmetics.has(parsed.selectedMenuBackground)) {
        this.selectedMenuBackground = parsed.selectedMenuBackground;
      }
    } catch {
      this.ownedCosmetics = new Set<string>([DEFAULT_SHIP_SKIN, DEFAULT_MENU_BACKGROUND]);
      this.selectedShipSkin = DEFAULT_SHIP_SKIN;
      this.selectedMenuBackground = DEFAULT_MENU_BACKGROUND;
      this.save();
    }
  }

  save(): void {
    const state: InventoryState = {
      ownedCosmetics: [...this.ownedCosmetics],
      selectedShipSkin: this.selectedShipSkin,
      selectedMenuBackground: this.selectedMenuBackground,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  owns(id: string): boolean {
    return this.ownedCosmetics.has(id);
  }

  add(id: string): boolean {
    const alreadyOwned = this.ownedCosmetics.has(id);
    this.ownedCosmetics.add(id);
    this.save();
    return !alreadyOwned;
  }

  selectShipSkin(id: string): boolean {
    const item = getCosmetic(id);
    if (!item || item.type !== 'shipSkin' || !this.owns(id)) return false;
    this.selectedShipSkin = id;
    this.save();
    return true;
  }

  selectMenuBackground(id: string): boolean {
    const item = getCosmetic(id);
    if (!item || item.type !== 'menuBackground' || !this.owns(id)) return false;
    this.selectedMenuBackground = id;
    this.save();
    return true;
  }

  getOwnedItems(): CosmeticItem[] {
    return COSMETICS.filter((item) => this.ownedCosmetics.has(item.id));
  }
}
