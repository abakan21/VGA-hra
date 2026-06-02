export interface EconomyState {
  coins: number;
}

const STORAGE_KEY = 'stellar-drift-economy-v1';

export const COIN_REWARDS = {
  drone: 8,
  chaser: 12,
  boss: 150,
  asteroid: 2,
  waveClearBase: 20,
};

export class Economy {
  coins = 0;
  runCoins = 0;

  constructor() {
    this.load();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<EconomyState>;
      this.coins = Math.max(0, Math.floor(Number(parsed.coins ?? 0)));
    } catch {
      this.coins = 0;
    }
  }

  save(): void {
    const state: EconomyState = { coins: this.coins };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  resetRun(): void {
    this.runCoins = 0;
  }

  add(amount: number): void {
    const value = Math.max(0, Math.floor(amount));
    this.coins += value;
    this.runCoins += value;
    this.save();
  }

  spend(amount: number): boolean {
    const value = Math.max(0, Math.floor(amount));
    if (this.coins < value) return false;
    this.coins -= value;
    this.save();
    return true;
  }
}
