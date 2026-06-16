export type ShipId = 'heavy' | 'scout';

export interface ShipDefinition {
  id: ShipId;
  name: string;
  description: string;
  modelPath: string;
  previewImagePath?: string;

  maxHp: number;
  damageMultiplier: number;
  speedMultiplier: number;
  turnMultiplier: number;
  fireRateMultiplier: number;
  gunCount: number;
}

export const SHIPS: Record<ShipId, ShipDefinition> = {
  heavy: {
    id: 'heavy',
    name: 'Heavy Fighter',
    description: 'High health and stronger shots, but slower movement and turning.',
    modelPath: '/models/Fatship.glb',
    previewImagePath: '/previews/heavy_ship.png',

    maxHp: 150,
    damageMultiplier: 1.15,
    speedMultiplier: 0.8,
    turnMultiplier: 0.8,
    fireRateMultiplier: 0.85,
    gunCount: 1,
  },

  scout: {
    id: 'scout',
    name: 'Twin Scout',
    description: 'Fast and agile ship with two guns, but lower health.',
    modelPath: '/models/Spaceship.glb',
    previewImagePath: '/previews/scout_ship.png',

    maxHp: 90,
    damageMultiplier: 0.9,
    speedMultiplier: 1.2,
    turnMultiplier: 1.25,
    fireRateMultiplier: 1.25,
    gunCount: 2,
  },
};

export const DEFAULT_SHIP_ID: ShipId = 'heavy';

export function getShip(id: ShipId): ShipDefinition {
  return SHIPS[id] ?? SHIPS[DEFAULT_SHIP_ID];
}
