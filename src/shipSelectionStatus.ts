import { Inventory } from './inventory';
import { getSelectedSkinNameForShip } from './cosmetics';

export function setupShipSelectionStatus(): void {
  const inventory = new Inventory();

  const update = () => {
    inventory.load();

    const heavy = document.getElementById('selected-skin-heavy');
    const scout = document.getElementById('selected-skin-scout');

    if (heavy) {
      heavy.textContent = `Selected skin: ${getSelectedSkinNameForShip(inventory.selectedShipSkin, 'heavy')} (heavy skins not added yet)`;
    }

    if (scout) {
      scout.textContent = `Selected skin: ${getSelectedSkinNameForShip(inventory.selectedShipSkin, 'scout')}`;
    }
  };

  update();

  window.addEventListener('storage', update);
  document.addEventListener('click', () => {
    window.setTimeout(update, 0);
  });
}
