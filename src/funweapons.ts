// ASSET PATHS:
// public/models/shoot/chicken.glb   -> /models/shoot/chicken.glb
// public/models/shoot/cucumber.glb  -> /models/shoot/cucumber.glb
// public/models/shoot/eggplant.glb  -> /models/shoot/eggplant.glb
// public/sounds/shoot/chicken.mp3   -> /sounds/shoot/chicken.mp3
// public/sounds/shoot/cucumber.mp3  -> /sounds/shoot/cucumber.mp3
// public/sounds/shoot/eggplant.mp3  -> /sounds/shoot/eggplant.mp3

export type FunWeaponMode = 'normal' | 'chicken' | 'cucumber' | 'eggplant' | 'duck' | 'banana' | 'donut';

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
    projectileModelPath: '/models/shoot/Hen.glb',
    soundPath: '/sounds/shoot/chicken.mp3',
  },
  cucumber: {
    id: 'cucumber',
    name: 'Cucumber Cannon',
    duration: 12,
    damageMultiplier: 1.5,
    projectileModelPath: '/models/shoot/Cucumber.glb',
    soundPath: '/sounds/shoot/cucumber.mp3',
  },
  eggplant: {
    id: 'eggplant',
    name: 'Eggplant Destroyer',
    duration: 10,
    damageMultiplier: 1.7,
    projectileModelPath: '/models/shoot/Eggplant.glb',
    soundPath: '/sounds/shoot/eggplant.mp3',
  },
  duck: {
    id: 'duck',
    name: 'Rubber Duck',
    duration: 13,
    damageMultiplier: 1.3,
    projectileModelPath: '/models/shoot/Duck.glb',
    soundPath: '/sounds/shoot/chicken.mp3',
  },
  banana: {
    id: 'banana',
    name: 'Banana Blaster',
    duration: 12,
    damageMultiplier: 1.4,
    projectileModelPath: '/models/shoot/Banana.glb',
    soundPath: '/sounds/shoot/cucumber.mp3',
  },
  donut: {
    id: 'donut',
    name: 'Donut Launcher',
    duration: 10,
    damageMultiplier: 1.6,
    projectileModelPath: '/models/shoot/Donut.glb',
    soundPath: '/sounds/shoot/eggplant.mp3',
  },
};

export function rollFunWeaponDrop(): FunWeaponMode | null {
  const r = Math.random();

  // Total chance: 30%. Each fun weapon has 5%.
  if (r < 0.05) return 'chicken';
  if (r < 0.10) return 'cucumber';
  if (r < 0.15) return 'eggplant';
  if (r < 0.20) return 'duck';
  if (r < 0.25) return 'banana';
  if (r < 0.30) return 'donut';

  return null;
}
