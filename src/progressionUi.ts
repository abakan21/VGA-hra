import { Economy } from './economy';
import { Inventory } from './inventory';
import {
  COSMETICS,
  CosmeticItem,
  RARITY_LABEL,
  RARITY_COLOR,
  getMenuBackgroundClass,
} from './cosmetics';
import { LOOT_BOXES, LootBoxId, rollLootBox } from './lootboxes';
import { setupBoxPreviews3d } from './boxPreview3d';

type PanelName = 'shop' | 'inventory' | 'highscores';

const CARD_WIDTH = 156;
const CARD_GAP = 12;
const TARGET_INDEX = 42;

export function setupProgressionUi(): void {
  const economy = new Economy();
  const inventory = new Inventory();

  ensureMenuButtons();
  injectStyles();
  applySelectedBackground(inventory);

  // Isometric loot-crate illustration, tinted per box tier.
  const lootBoxArt = (light: string, base: string, dark: string, accent: string, glow: string) => `
    <svg class="progression-box-art" viewBox="0 0 80 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="40" cy="71" rx="29" ry="6" fill="${glow}" opacity="0.35"/>
      <polygon points="40,36 70,22 70,52 40,66" fill="${dark}"/>
      <polygon points="10,22 40,36 40,66 10,52" fill="${base}"/>
      <polygon points="40,8 70,22 40,36 10,22" fill="${light}"/>
      <polygon points="10,38 40,52 40,57 10,43" fill="${accent}" opacity="0.55"/>
      <polygon points="40,52 70,38 70,43 40,57" fill="${accent}" opacity="0.4"/>
      <polygon points="40,44 46,50 40,58 34,50" fill="${accent}"/>
      <circle cx="40" cy="50" r="1.8" fill="${dark}"/>
      <polygon points="40,14 46,22 40,30 34,22" fill="${accent}"/>
      <polygon points="40,14 46,22 40,22" fill="#ffffff" opacity="0.5"/>
    </svg>`;

  const root = document.createElement('div');
  root.id = 'progression-ui-root';
  root.innerHTML = `
    <div id="progression-backdrop">
      <section id="progression-shop" class="progression-panel progression-wide">
        <div class="progression-header">
          <h1>SHOP</h1>
          <button id="progression-close-shop" class="progression-small-btn">BACK</button>
        </div>

        <div id="progression-coins" class="progression-coins">Coins: 0</div><div id="progression-selected-skin" class="progression-muted"></div>

        <div class="progression-box-grid">
          <button class="progression-box progression-standard" data-box="standard">
            <span class="progression-box-art" data-box-model="/models/boxes/chest_plain.glb" data-box-tint="#6db3ff" data-box-scale="1" data-box-roty="-0.6">${lootBoxArt('#6db3ff', '#3a78b5', '#244e78', '#d6efff', '#6db3ff')}</span>
            <span class="progression-box-title">STANDARD BOX</span>
            <span class="progression-box-price">100 coins</span>
            <span class="progression-box-desc">Small chance for rare skins</span>
          </button>

          <button class="progression-box progression-gold" data-box="gold">
            <span class="progression-box-art" data-box-model="/models/boxes/chest_plain.glb" data-box-tint="#ffd76a" data-box-scale="1" data-box-roty="-0.6">${lootBoxArt('#ffd76a', '#c79a2e', '#8a6a14', '#fff4cf', '#ffd76a')}</span>
            <span class="progression-box-title">GOLD BOX</span>
            <span class="progression-box-price">250 coins</span>
            <span class="progression-box-desc">Better gold and rare chances</span>
          </button>

          <button class="progression-box progression-rare" data-box="legendary">
            <span class="progression-box-art" data-box-model="/models/boxes/chest_plain.glb" data-box-tint="#c084fc" data-box-scale="1" data-box-roty="-0.6">${lootBoxArt('#c084fc', '#8a4fc4', '#5e2e8f', '#efd9ff', '#c084fc')}</span>
            <span class="progression-box-title">LEGENDARY BOX</span>
            <span class="progression-box-price">600 coins</span>
            <span class="progression-box-desc">Highest rare chance</span>
          </button>
        </div>

        <div id="case-roulette" class="case-roulette">
          <div class="case-pointer"></div>
          <div id="case-track" class="case-track"></div>
        </div>

        <div id="progression-loot-result" class="progression-result"></div>

        <div class="progression-footer">
          <button id="progression-open-inventory">INVENTORY</button>
          <button id="progression-open-highscores">HIGHSCORES</button>
        </div>
      </section>

      <section id="progression-inventory" class="progression-panel">
        <div class="progression-header">
          <h1>INVENTORY</h1>
          <button id="progression-back-to-shop-1" class="progression-small-btn">BACK</button>
        </div>
        <p class="progression-muted">Select unlocked ship skins and menu backgrounds here.</p>
        <div id="progression-inventory-list" class="progression-list"></div>
      </section>

      <section id="progression-highscores" class="progression-panel">
        <div class="progression-header">
          <h1>HIGHSCORES</h1>
          <button id="progression-back-to-shop-2" class="progression-small-btn">BACK</button>
        </div>
        <div id="progression-highscores-list" class="progression-list"></div>
      </section>
    </div>
  `;

  document.body.appendChild(root);
  setupBoxPreviews3d();

  const backdrop = document.getElementById('progression-backdrop') as HTMLDivElement;
  const coinsEl = document.getElementById('progression-coins') as HTMLDivElement; const selectedSkinEl = document.getElementById('progression-selected-skin') as HTMLDivElement;
  const resultEl = document.getElementById('progression-loot-result') as HTMLDivElement;
  const inventoryList = document.getElementById('progression-inventory-list') as HTMLDivElement;
  const highscoresList = document.getElementById('progression-highscores-list') as HTMLDivElement;
  const track = document.getElementById('case-track') as HTMLDivElement;
  const roulette = document.getElementById('case-roulette') as HTMLDivElement;

  let spinning = false;
  let returnFromInventoryTo: PanelName | 'closed' = 'closed';
  let returnFromHighscoresTo: PanelName | 'closed' = 'closed';

  const setVisible = (visible: boolean) => {
    backdrop.style.display = visible ? 'flex' : 'none';
  };

  const showPanel = (panel: PanelName) => {
    setVisible(true);

    for (const id of ['progression-shop', 'progression-inventory', 'progression-highscores']) {
      const el = document.getElementById(id) as HTMLDivElement;
      el.style.display = 'none';
    }

    const target = document.getElementById(`progression-${panel}`) as HTMLDivElement;
    target.style.display = 'block';

    if (panel === 'shop') renderShop();
    if (panel === 'inventory') renderInventory();
    if (panel === 'highscores') renderHighscores();
  };

  const renderShop = () => {
    economy.load();
    coinsEl.textContent = `Coins: ${economy.coins}`; inventory.load(); selectedSkinEl.textContent = `Selected skin: ${inventory.selectedShipSkin}`;
  };

  const renderInventory = () => {
    inventory.load();
    applySelectedBackground(inventory);

    const owned = inventory.getOwnedItems();

    if (owned.length === 0) {
      inventoryList.innerHTML = '<p class="progression-muted">No items yet.</p>';
      return;
    }

    inventoryList.innerHTML = owned
      .map((item) => {
        const selected =
          item.id === inventory.selectedShipSkin || item.id === inventory.selectedMenuBackground;
        const type = item.type === 'shipSkin' ? 'Ship skin' : 'Menu background';
        const color = RARITY_COLOR[item.rarity];
        const preview = renderPreview(item, 'inventory');

        return `
          <div class="progression-row">
            ${preview}
            <div class="progression-row-main">
              <strong style="color:${color}">${selected ? '✓ ' : ''}${item.name}</strong>
              <div class="progression-muted">${type} · ${RARITY_LABEL[item.rarity]}</div>
            </div>
            <button data-select-cosmetic="${item.id}">SELECT</button>
          </div>
        `;
      })
      .join('');

    inventoryList.querySelectorAll<HTMLButtonElement>('[data-select-cosmetic]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.selectCosmetic;
        const item = COSMETICS.find((candidate) => candidate.id === id);
        if (!item) return;

        if (item.type === 'shipSkin') {
          inventory.selectShipSkin(item.id);
          resultEl.textContent = `Selected ship skin: ${item.name}`;
        } else {
          inventory.selectMenuBackground(item.id);
          applySelectedBackground(inventory);
          resultEl.textContent = `Selected menu background: ${item.name}`;
        }

        renderInventory();
      });
    });
  };

  const renderHighscores = () => {
    const candidates = [
      'stellar-drift-highscores',
      'stellar-drift-scores',
      'highscores',
      'scores',
    ];

    let scores: any[] = [];

    for (const key of candidates) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          scores = parsed;
          break;
        }
      } catch {
        // Ignore broken legacy score values.
      }
    }

    if (scores.length === 0) { scores = findScoreArraysInLocalStorage(); }

    if (scores.length === 0) {
      highscoresList.innerHTML = '<p class="progression-muted">No scores yet.</p>';
      return;
    }

    highscoresList.innerHTML = scores
      .map((entry) => {
        if (typeof entry === 'number') return { score: entry };
        return entry;
      })
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      .slice(0, 10)
      .map((entry, index) => {
        const score = Number(entry.score ?? 0);
        const wave = entry.wave !== undefined ? ` · Wave ${entry.wave}` : '';
        return `
          <div class="progression-row">
            <span>#${index + 1} Player 1${wave}</span>
            <strong>${score}</strong>
          </div>
        `;
      })
      .join('');
  };

  const openBox = (boxId: LootBoxId) => {
    if (spinning) return;

    const box = LOOT_BOXES[boxId];

    economy.load();

    if (!economy.spend(box.price)) {
      resultEl.textContent = `Not enough coins. Need ${box.price}.`;
      renderShop();
      return;
    }

    spinning = true;
    setBoxButtonsEnabled(false);
    resultEl.textContent = 'Opening...';

    const result = rollLootBox(boxId);
    const items = buildRouletteItems(result.item);
    renderRoulette(items);

    const targetOffset =
      TARGET_INDEX * (CARD_WIDTH + CARD_GAP) -
      roulette.clientWidth / 2 +
      CARD_WIDTH / 2 +
      randomBetween(-18, 18);

    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.transition = 'transform 4.4s cubic-bezier(0.08, 0.76, 0.12, 1)';
        track.style.transform = `translateX(${-targetOffset}px)`;
      });
    });

    window.setTimeout(() => {
      const isNew = inventory.add(result.item.id);

      if (!isNew) {
        economy.add(result.duplicateRefund);
      }

      const color = RARITY_COLOR[result.item.rarity];

      resultEl.innerHTML = isNew
        ? `<span style="color:${color}">Unlocked: ${result.item.name} [${RARITY_LABEL[result.item.rarity]}]</span>`
        : `<span style="color:${color}">Duplicate: ${result.item.name}. Refund: ${result.duplicateRefund} coins.</span>`;

      spinning = false;
      setBoxButtonsEnabled(true);
      renderShop();
    }, 4550);
  };

  const setBoxButtonsEnabled = (enabled: boolean) => {
    document.querySelectorAll<HTMLButtonElement>('[data-box]').forEach((button) => {
      button.disabled = !enabled;
    });
  };

  const renderRoulette = (items: CosmeticItem[]) => {
    track.innerHTML = items.map((item, index) => renderCaseCard(item, index === TARGET_INDEX)).join('');
  };

  const buildRouletteItems = (winningItem: CosmeticItem): CosmeticItem[] => {
    const visualPool = COSMETICS.filter((item) => item.type === winningItem.type);
    const safePool = visualPool.length > 0 ? visualPool : COSMETICS;
    const items: CosmeticItem[] = [];

    for (let i = 0; i < 60; i += 1) {
      items.push(safePool[Math.floor(Math.random() * safePool.length)]);
    }

    items[TARGET_INDEX] = winningItem;

    return items;
  };

  const renderCaseCard = (item: CosmeticItem, isWinner: boolean) => {
    const color = RARITY_COLOR[item.rarity];

    return `
      <div class="case-card ${isWinner ? 'case-card-winner' : ''}" style="--rarity-color:${color}">
        ${renderPreview(item, 'case')}
        <div class="case-name">${item.name}</div>
        <div class="case-rarity">${RARITY_LABEL[item.rarity]}</div>
      </div>
    `;
  };

  document.getElementById('btn-shop')?.addEventListener('click', () => {
    showPanel('shop');
  });

  document.getElementById('btn-inventory-main')?.addEventListener('click', () => {
    returnFromInventoryTo = 'closed';
    showPanel('inventory');
  });

  document.getElementById('btn-highscores-main')?.addEventListener('click', () => {
    returnFromHighscoresTo = 'closed';
    showPanel('highscores');
  });

  document.getElementById('progression-close-shop')?.addEventListener('click', () => {
    setVisible(false);
  });

  document.getElementById('progression-open-inventory')?.addEventListener('click', () => {
    returnFromInventoryTo = 'shop';
    showPanel('inventory');
  });

  document.getElementById('progression-open-highscores')?.addEventListener('click', () => {
    returnFromHighscoresTo = 'shop';
    showPanel('highscores');
  });

  document.getElementById('progression-back-to-shop-1')?.addEventListener('click', () => {
    if (returnFromInventoryTo === 'shop') showPanel('shop');
    else setVisible(false);
  });

  document.getElementById('progression-back-to-shop-2')?.addEventListener('click', () => {
    if (returnFromHighscoresTo === 'shop') showPanel('shop');
    else setVisible(false);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-box]').forEach((button) => {
    button.addEventListener('click', () => {
      openBox(button.dataset.box as LootBoxId);
    });
  });

  setVisible(false);
}

function ensureMenuButtons(): void {
  ensureButton('btn-shop', 'SHOP');
  ensureButton('btn-inventory-main', 'INVENTORY');
  ensureButton('btn-highscores-main', 'HIGHSCORES');
}

function ensureButton(id: string, label: string): void {
  if (document.getElementById(id)) return;

  const quitButton = document.getElementById('btn-quit');
  const startButton = document.getElementById('btn-start');
  const button = document.createElement('button');
  button.id = id;
  button.textContent = label;

  if (quitButton?.parentElement) {
    quitButton.parentElement.insertBefore(button, quitButton);
  } else if (startButton?.parentElement) {
    startButton.parentElement.appendChild(button);
  } else {
    document.body.appendChild(button);
  }
}

function renderPreview(item: CosmeticItem, variant: 'case' | 'inventory'): string {
  const emoji = item.type === 'shipSkin' ? '🚀' : '🌌';
  const className = variant === 'case' ? 'case-preview' : 'inventory-preview';

  if (!item.previewImagePath) {
    return `<div class="${className} preview-fallback">${emoji}</div>`;
  }

  return `
    <div class="${className}">
      <img src="${item.previewImagePath}" alt="${item.name}" draggable="false" onerror="this.parentElement.classList.add('preview-fallback'); this.remove();" />
      <span class="preview-emoji">${emoji}</span>
    </div>
  `;
}

function applySelectedBackground(inventory: Inventory): void {
  const classNames = ['bg-default', 'bg-gold', 'bg-rare'];
  document.body.classList.remove(...classNames);
  document.body.classList.add(getMenuBackgroundClass(inventory.selectedMenuBackground));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function injectStyles(): void {
  if (document.getElementById('progression-ui-style')) return;

  const style = document.createElement('style');
  style.id = 'progression-ui-style';
  style.textContent = `
    #progression-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(circle at 50% 30%, rgba(60, 160, 255, 0.15), transparent 38%),
        rgba(0, 0, 0, 0.76);
      color: white;
      font-family: system-ui, Arial, sans-serif;
      pointer-events: auto;
    }

    .progression-panel {
      width: min(900px, 94vw);
      max-height: 88vh;
      overflow: auto;
      border: 1px solid rgba(110, 220, 255, 0.75);
      border-radius: 18px;
      padding: 24px;
      background: linear-gradient(160deg, rgba(5, 12, 30, 0.97), rgba(14, 3, 32, 0.97));
      box-shadow: 0 0 50px rgba(0, 220, 255, 0.22);
    }

    .progression-wide {
      width: min(1080px, 96vw);
    }

    .progression-header,
    .progression-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .progression-header h1 {
      margin: 0;
      letter-spacing: 0.12em;
      color: #8be9ff;
      text-shadow: 0 0 18px rgba(0, 220, 255, 0.65);
    }

    .progression-coins {
      margin: 18px 0;
      font-size: 24px;
      color: #ffd76a;
      text-shadow: 0 0 14px rgba(255, 200, 80, 0.55);
    }

    .progression-box-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin: 20px 0;
    }

    .progression-box,
    .progression-panel button {
      border: 1px solid rgba(120, 220, 255, 0.65);
      border-radius: 14px;
      background: rgba(0, 20, 45, 0.72);
      color: white;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .progression-panel button {
      padding: 10px 16px;
    }

    .progression-panel button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }

    .progression-box {
      position: relative;
      min-height: 130px;
      padding: 18px;
      padding-right: 92px;
      text-align: left;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
      overflow: hidden;
    }

    .progression-box-art {
      position: absolute;
      top: 50%;
      right: 12px;
      width: 72px;
      height: 72px;
      transform: translateY(-50%);
      filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
      transition: transform 0.25s ease;
      pointer-events: none;
    }

    .progression-box-art > svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      animation: progression-box-float 3.2s ease-in-out infinite;
    }

    .progression-box-canvas {
      position: absolute;
      inset: 0;
      width: 72px;
      height: 72px;
    }

    .progression-box:hover .progression-box-art {
      transform: translateY(-50%) scale(1.12);
    }

    @keyframes progression-box-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6%); }
    }

    .progression-box:hover,
    .progression-panel button:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(255, 230, 120, 0.95);
      box-shadow: 0 0 28px rgba(255, 220, 90, 0.25);
    }

    .progression-box-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .progression-box-price {
      color: #ffd76a;
      font-weight: 700;
    }

    .progression-box-desc,
    .progression-muted {
      color: rgba(230, 245, 255, 0.72);
      font-size: 14px;
    }

    .progression-standard { box-shadow: inset 0 0 22px rgba(160, 210, 255, 0.14); }
    .progression-gold { box-shadow: inset 0 0 26px rgba(255, 210, 90, 0.20); }
    .progression-rare { box-shadow: inset 0 0 30px rgba(190, 120, 255, 0.24); }

    .case-roulette {
      position: relative;
      height: 220px;
      overflow: hidden;
      margin: 26px 0 18px;
      border: 1px solid rgba(120, 220, 255, 0.38);
      border-radius: 18px;
      background:
        linear-gradient(90deg, rgba(0, 0, 0, 0.75), transparent 16%, transparent 84%, rgba(0, 0, 0, 0.75)),
        rgba(0, 0, 0, 0.28);
      box-shadow: inset 0 0 34px rgba(0, 220, 255, 0.14);
    }

    .case-pointer {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 3px;
      transform: translateX(-50%);
      background: #ffffff;
      box-shadow: 0 0 18px rgba(255, 255, 255, 0.95), 0 0 30px rgba(255, 210, 90, 0.85);
      z-index: 2;
    }

    .case-pointer::before,
    .case-pointer::after {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
    }

    .case-pointer::before {
      top: 0;
      border-top: 18px solid #ffd76a;
    }

    .case-pointer::after {
      bottom: 0;
      border-bottom: 18px solid #ffd76a;
    }

    .case-track {
      height: 100%;
      display: flex;
      gap: ${CARD_GAP}px;
      align-items: center;
      padding: 0 50%;
      will-change: transform;
    }

    .case-card {
      flex: 0 0 ${CARD_WIDTH}px;
      height: 174px;
      border: 1px solid var(--rarity-color);
      border-radius: 16px;
      background:
        radial-gradient(circle at center 34%, color-mix(in srgb, var(--rarity-color), transparent 72%), transparent 62%),
        rgba(4, 10, 24, 0.92);
      box-shadow: inset 0 0 26px color-mix(in srgb, var(--rarity-color), transparent 80%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .case-card-winner {
      box-shadow:
        inset 0 0 26px color-mix(in srgb, var(--rarity-color), transparent 72%),
        0 0 22px color-mix(in srgb, var(--rarity-color), transparent 50%);
    }

    .case-preview {
      width: 118px;
      height: 82px;
      display: grid;
      place-items: center;
      margin-bottom: 10px;
    }

    .case-preview img {
      max-width: 118px;
      max-height: 82px;
      object-fit: contain;
      filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.25));
    }

    .preview-emoji {
      display: none;
      font-size: 44px;
    }

    .preview-fallback .preview-emoji {
      display: block;
    }

    .preview-fallback {
      font-size: 44px;
    }

    .case-name {
      width: 132px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .case-rarity {
      margin-top: 5px;
      font-size: 11px;
      color: var(--rarity-color);
      font-weight: 900;
      letter-spacing: 0.08em;
    }

    .progression-result {
      min-height: 38px;
      margin: 16px 0;
      font-size: 20px;
      font-weight: 700;
    }

    .progression-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 18px;
    }

    .progression-row {
      display: grid;
      grid-template-columns: 88px 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border: 1px solid rgba(120, 220, 255, 0.32);
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.30);
    }

    .progression-row-main {
      min-width: 0;
    }

    .inventory-preview {
      width: 76px;
      height: 54px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .inventory-preview img {
      max-width: 76px;
      max-height: 54px;
      object-fit: contain;
    }

    .inventory-preview.preview-fallback {
      font-size: 28px;
    }

    body.bg-default::before,
    body.bg-gold::before,
    body.bg-rare::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
    }

    body.bg-default::before {
      background: radial-gradient(circle at center, rgba(80, 0, 130, 0.12), transparent 55%);
    }

    body.bg-gold::before {
      background: radial-gradient(circle at center, rgba(255, 190, 55, 0.14), transparent 55%);
    }

    body.bg-rare::before {
      background: radial-gradient(circle at center, rgba(145, 75, 255, 0.18), transparent 55%);
    }

    @media (max-width: 760px) {
      .progression-box-grid {
        grid-template-columns: 1fr;
      }

      .progression-row {
        grid-template-columns: 70px 1fr;
      }

      .progression-row button {
        grid-column: 1 / -1;
      }
    }
  `;

  document.head.appendChild(style);
}


function findScoreArraysInLocalStorage(): any[] {
  const found: any[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      const scoreLike = parsed.filter((entry) => {
        if (typeof entry === 'number') return true;
        return entry && typeof entry === 'object' && ('score' in entry || 'wave' in entry || 'date' in entry);
      });

      if (scoreLike.length > 0) {
        found.push(...scoreLike);
      }
    } catch {
      // Ignore unrelated localStorage values.
    }
  }

  return found;
}
