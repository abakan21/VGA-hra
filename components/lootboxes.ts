import { COSMETICS, CosmeticItem, Rarity } from './cosmetics';

export type LootBoxId = 'standard' | 'gold' | 'legendary';

export interface LootBoxDefinition {
  id: LootBoxId;
  name: string;
  price: number;
  chances: Record<Rarity, number>;
}

export interface LootResult {
  item: CosmeticItem;
  duplicateRefund: number;
}

export const LOOT_BOXES: Record<LootBoxId, LootBoxDefinition> = {
  standard: {
    id: 'standard',
    name: 'Standard Box',
    price: 100,
    chances: {
      standard: 0.78,
      gold: 0.19,
      rare: 0.03,
    },
  },
  gold: {
    id: 'gold',
    name: 'Gold Box',
    price: 250,
    chances: {
      standard: 0.35,
      gold: 0.50,
      rare: 0.15,
    },
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary Box',
    price: 600,
    chances: {
      standard: 0.10,
      gold: 0.45,
      rare: 0.45,
    },
  },
};

export const DUPLICATE_REFUND: Record<Rarity, number> = {
  standard: 25,
  gold: 80,
  rare: 200,
};

// number of consecutive non-rare boxes after which a rare is guaranteed
export const PITY_THRESHOLD = 9;

export function rollLootBox(boxId: LootBoxId): LootResult {
  const box = LOOT_BOXES[boxId];
  const rarity = rollRarity(box.chances);
  const pool = COSMETICS.filter((item) => item.rarity === rarity);
  const safePool = pool.length > 0 ? pool : COSMETICS;
  const item = safePool[Math.floor(Math.random() * safePool.length)];

  return {
    item,
    duplicateRefund: DUPLICATE_REFUND[item.rarity],
  };
}

// Roll with a pity counter: if `pityCount` boxes in a row gave no rare, the
// next one is forced to be rare. Returns the result and the updated counter.
export function rollLootBoxWithPity(
  boxId: LootBoxId,
  pityCount: number,
): { result: LootResult; pityCount: number } {
  const box = LOOT_BOXES[boxId];
  let rarity = rollRarity(box.chances);
  if (rarity !== 'rare' && pityCount >= PITY_THRESHOLD) {
    rarity = 'rare';
  }
  const pool = COSMETICS.filter((item) => item.rarity === rarity);
  const safePool = pool.length > 0 ? pool : COSMETICS;
  const item = safePool[Math.floor(Math.random() * safePool.length)];
  const nextPity = item.rarity === 'rare' ? 0 : pityCount + 1;

  return {
    result: { item, duplicateRefund: DUPLICATE_REFUND[item.rarity] },
    pityCount: nextPity,
  };
}

function rollRarity(chances: Record<Rarity, number>): Rarity {
  const r = Math.random();
  let acc = 0;

  for (const rarity of ['standard', 'gold', 'rare'] as Rarity[]) {
    acc += chances[rarity];
    if (r <= acc) return rarity;
  }

  return 'standard';
}
