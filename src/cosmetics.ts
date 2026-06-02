export type Rarity = 'standard' | 'gold' | 'rare';

export type CosmeticType = 'shipSkin' | 'menuBackground';

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  name: string;
  rarity: Rarity;
  modelPath?: string;
  previewImagePath?: string;
  backgroundClass?: string;
  compatibleShip?: 'heavy' | 'scout' | 'both';
}

export const RARITY_LABEL: Record<Rarity, string> = {
  standard: 'STANDARD',
  gold: 'GOLD',
  rare: 'RARE',
};

export const RARITY_COLOR: Record<Rarity, string> = {
  standard: '#a8d8ff',
  gold: '#ffd76a',
  rare: '#c084fc',
};

// IMPORTANT:
// 1. Put GLB models into public/models/standart, public/models/gold, public/models/rare.
// 2. Put preview screenshots into public/previews.
// 3. The browser path must start with /, for example /previews/standard_01.png.
//
// You can add as many skins as you want. The inventory and lootbox roulette
// are generated from this COSMETICS array.
export const COSMETICS: CosmeticItem[] = [
  {
    id: 'ship_default',
    type: 'shipSkin',
    compatibleShip: 'both',
    name: 'Default Ship',
    rarity: 'standard',
    modelPath: '/models/Spaceship.glb',
    previewImagePath: '/previews/default_ship.png',
  },
  {
    id: 'ship_standard_01',
    type: 'shipSkin',
    compatibleShip: 'scout',
    name: 'Standard Patrol',
    rarity: 'standard',
    modelPath: '/models/standart/ship_1.glb',
    previewImagePath: '/previews/standard_01.png',
  },
  {
    id: 'ship_standard_02',
    type: 'shipSkin',
    compatibleShip: 'scout',
    name: 'Standard Raider',
    rarity: 'standard',
    modelPath: '/models/standart/ship_2.glb',
    previewImagePath: '/previews/standard_02.png',
  },
  {
    id: 'ship_gold_01',
    type: 'shipSkin',
    compatibleShip: 'scout',
    name: 'Golden Comet',
    rarity: 'gold',
    modelPath: '/models/gold/ship_1.glb',
    previewImagePath: '/previews/gold_01.png',
  },
  {
    id: 'ship_gold_02',
    type: 'shipSkin',
    compatibleShip: 'scout',
    name: 'Solar Crown',
    rarity: 'gold',
    modelPath: '/models/gold/ship_2.glb',
    previewImagePath: '/previews/gold_02.png',
  },
  {
    id: 'ship_rare_01',
    type: 'shipSkin',
    compatibleShip: 'scout',
    name: 'Rare Nebula',
    rarity: 'rare',
    modelPath: '/models/rare/ship_1.glb',
    previewImagePath: '/previews/rare_01.png',
  },
  {
    id: 'ship_rare_02',
    type: 'shipSkin',
    compatibleShip: 'scout',
    name: 'Void Phantom',
    rarity: 'rare',
    modelPath: '/models/rare/ship_2.glb',
    previewImagePath: '/previews/rare_02.png',
  },
  {
    id: 'bg_default',
    type: 'menuBackground',
    name: 'Default Nebula',
    rarity: 'standard',
    backgroundClass: 'bg-default',
    previewImagePath: '/previews/bg_default.png',
  },
  {
    id: 'bg_gold',
    type: 'menuBackground',
    name: 'Golden Sector',
    rarity: 'gold',
    backgroundClass: 'bg-gold',
    previewImagePath: '/previews/bg_gold.png',
  },
  {
    id: 'bg_rare',
    type: 'menuBackground',
    name: 'Rare Void',
    rarity: 'rare',
    backgroundClass: 'bg-rare',
    previewImagePath: '/previews/bg_rare.png',
  },
];

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETICS.find((item) => item.id === id);
}

export function getShipSkinModelPath(id: string): string {
  return getCosmetic(id)?.modelPath ?? '/models/Spaceship.glb';
}

export function getMenuBackgroundClass(id: string): string {
  return getCosmetic(id)?.backgroundClass ?? 'bg-default';
}


export type ShipClassForSkin = 'heavy' | 'scout';

export function isSkinCompatibleWithShip(skinId: string, shipId: ShipClassForSkin): boolean {
  const item = getCosmetic(skinId);
  if (!item || item.type !== 'shipSkin') return false;
  const compatible = item.compatibleShip ?? (item.id === 'ship_default' ? 'both' : 'scout');
  return compatible === 'both' || compatible === shipId;
}

export function getSelectedSkinNameForShip(skinId: string, shipId: ShipClassForSkin): string {
  const item = getCosmetic(skinId);
  if (!item || item.type !== 'shipSkin') return 'Default Ship';
  if (!isSkinCompatibleWithShip(skinId, shipId)) return 'Default Ship';
  return item.name;
}

export function getShipSkinModelPathForShip(skinId: string, shipId: ShipClassForSkin): string {
  if (!isSkinCompatibleWithShip(skinId, shipId)) return '/models/Spaceship.glb';
  return getCosmetic(skinId)?.modelPath ?? '/models/Spaceship.glb';
}
