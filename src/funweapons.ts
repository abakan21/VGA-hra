// ASSET PATHS:
// public/models/shoot/chicken.glb   -> /models/shoot/chicken.glb
// public/models/shoot/cucumber.glb  -> /models/shoot/cucumber.glb
// public/models/shoot/eggplant.glb  -> /models/shoot/eggplant.glb
// public/sounds/shoot/chicken.mp3   -> /sounds/shoot/chicken.mp3
// public/sounds/shoot/cucumber.mp3  -> /sounds/shoot/cucumber.mp3
// public/sounds/shoot/eggplant.mp3  -> /sounds/shoot/eggplant.mp3

export type FunWeaponMode = 'normal' | 'chicken' | 'cucumber' | 'eggplant';

export interface FunWeaponDefinition {
  id: FunWeaponMode;
  name: string;
  duration: number;
  damageMultiplier: number;
  projectileModelPath?: string;
  soundPath?: string;
}

export const FUN_WEAPONS: Record<FunWeaponMode, FunWeaponDefinition> = {
  normal: {
    id: 'normal',
    name: 'Normal',
    duration: 0,
    damageMultiplier: 1,
  },
  chicken: {
    id: 'chicken',
    name: 'Chicken Blaster',
    duration: 15,
    damageMultiplier: 1.2,
    projectileModelPath: '/models/shoot/chicken.glb',
    soundPath: '/sounds/shoot/chicken.mp3',
  },
  cucumber: {
    id: 'cucumber',
    name: 'Cucumber Cannon',
    duration: 12,
    damageMultiplier: 1.5,
    projectileModelPath: '/models/shoot/cucumber.glb',
    soundPath: '/sounds/shoot/cucumber.mp3',
  },
  eggplant: {
    id: 'eggplant',
    name: 'Eggplant Destroyer',
    duration: 10,
    damageMultiplier: 1.7,
    projectileModelPath: '/models/shoot/eggplant.glb',
    soundPath: '/sounds/shoot/eggplant.mp3',
  },
};

export function rollFunWeaponDrop(): FunWeaponMode | null {
  const r = Math.random();

  // Total chance: 21%.
  // Each fun weapon has 7%.
  if (r < 0.07) return 'chicken';
  if (r < 0.14) return 'cucumber';
  if (r < 0.21) return 'eggplant';

  return null;
}
