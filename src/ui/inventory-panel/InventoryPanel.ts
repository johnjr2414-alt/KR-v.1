import { EquipmentSlot, type ItemDefinition } from '../../inventory/ItemTypes';
import { InventoryManager, inventoryManager } from '../../inventory/InventoryManager';
import { getItemDefinition } from '../../inventory/ItemRegistry';

export interface InventoryPanelOptions {
  manager?: InventoryManager;
  playerLevel?: number;
  onClose?: () => void;
  onStateChange?: () => void;
}

/**
 * Visual icons for equipment slots and items.
 */
const SLOT_ICONS: Record<EquipmentSlot, string> = {
  [EquipmentSlot.Weapon]: '⚔️',
  [EquipmentSlot.Armor]: '🛡️',
  [EquipmentSlot.Helmet]: '🪖',
  [EquipmentSlot.Accessory]: '💍',
};

const ITEM_ICONS: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  helmet: '🪖',
  accessory: '💍',
  consumable: '🧪',
  material: '💎',
  quest: '📜',
};

/**
 * InventoryPanel — HTML/CSS DOM overlay for viewing inventory, equipped gear,
 * equipping/unequipping items, and viewing stat comparisons.
 */
export class InventoryPanel {
  private container: HTMLDivElement | null = null;
  private readonly manager: InventoryManager;
  private readonly playerLevel: number;
  private readonly onClose?: () => void;
  private readonly onStateChange?: () => void;

  private selectedSlotIndex: number | null = null;
  private selectedEquipSlot: EquipmentSlot | null = null;

  constructor(options: InventoryPanelOptions = {}) {
    this.manager = options.manager || inventoryManager;
    this.playerLevel = options.playerLevel ?? 1;
    this.onClose = options.onClose;
    this.onStateChange = options.onStateChange;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'inventory-modal';
    container.id = 'inventory-modal';

    container.innerHTML = `
      <div class="inventory-card">
        <div class="inventory-header">
          <div class="inventory-header__title">🎒 Inventory & Equipment</div>
          <button class="inventory-header__close" id="inventory-close-btn">&times;</button>
        </div>
        <div class="inventory-body">
          <div class="equipment-section">
            <div class="section-title">Equipment</div>
            <div class="equipment-slots" id="equipment-slots-container"></div>
          </div>
          <div class="inventory-grid-section">
            <div class="section-title">Bag</div>
            <div class="inventory-grid" id="inventory-grid-container"></div>
          </div>
        </div>
        <div class="inventory-footer" id="inventory-footer">
          <div class="item-details" id="item-details">
            <div class="item-details__title">Select an item to view details</div>
          </div>
          <div class="item-actions" id="item-actions"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;

    container.querySelector('#inventory-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });

    this.render();
  }

  render(): void {
    if (!this.container) return;

    this.renderEquipment();
    this.renderGrid();
    this.renderDetails();
  }

  private renderEquipment(): void {
    const container = this.container?.querySelector('#equipment-slots-container');
    if (!container) return;

    container.innerHTML = '';
    const state = this.manager.getState();

    const slots: EquipmentSlot[] = [
      EquipmentSlot.Weapon,
      EquipmentSlot.Armor,
      EquipmentSlot.Helmet,
      EquipmentSlot.Accessory,
    ];

    for (const slot of slots) {
      const itemId = state.equipped[slot];
      const itemDef = itemId ? getItemDefinition(itemId) : undefined;

      const slotEl = document.createElement('div');
      slotEl.className = `equip-slot ${this.selectedEquipSlot === slot ? 'active' : ''}`;
      slotEl.innerHTML = `
        <div class="equip-slot__icon">${itemDef ? this.getItemIcon(itemDef) : SLOT_ICONS[slot]}</div>
        <div class="equip-slot__info">
          <div class="equip-slot__label">${slot}</div>
          <div class="equip-slot__name ${itemDef ? `rarity-${itemDef.rarity}` : ''}">
            ${itemDef ? this.escape(itemDef.name) : '<i style="color:#718096">Empty</i>'}
          </div>
        </div>
      `;

      slotEl.addEventListener('click', () => {
        this.selectedSlotIndex = null;
        this.selectedEquipSlot = slot;
        this.render();
      });

      container.appendChild(slotEl);
    }
  }

  private renderGrid(): void {
    const container = this.container?.querySelector('#inventory-grid-container');
    if (!container) return;

    container.innerHTML = '';
    const state = this.manager.getState();

    for (let i = 0; i < state.capacity; i++) {
      const slot = state.slots[i];
      const itemDef = slot ? getItemDefinition(slot.itemId) : undefined;

      const slotEl = document.createElement('div');
      slotEl.className = `inventory-slot ${slot ? '' : 'empty'} ${this.selectedSlotIndex === i ? 'selected' : ''}`;

      if (slot && itemDef) {
        slotEl.innerHTML = `
          <div class="inventory-slot__icon">${this.getItemIcon(itemDef)}</div>
          ${slot.quantity > 1 ? `<div class="inventory-slot__qty">${slot.quantity}</div>` : ''}
        `;

        slotEl.addEventListener('click', () => {
          this.selectedEquipSlot = null;
          this.selectedSlotIndex = i;
          this.render();
        });
      }

      container.appendChild(slotEl);
    }
  }

  private renderDetails(): void {
    const detailsEl = this.container?.querySelector('#item-details');
    const actionsEl = this.container?.querySelector('#item-actions');
    if (!detailsEl || !actionsEl) return;

    detailsEl.innerHTML = '';
    actionsEl.innerHTML = '';

    const state = this.manager.getState();

    // Case 1: Equipped slot selected
    if (this.selectedEquipSlot) {
      const itemId = state.equipped[this.selectedEquipSlot];
      const itemDef = itemId ? getItemDefinition(itemId) : undefined;

      if (itemDef) {
        this.displayItemInfo(detailsEl, itemDef);
        const unequipBtn = document.createElement('button');
        unequipBtn.className = 'item-btn item-btn--unequip';
        unequipBtn.textContent = 'Unequip';
        unequipBtn.addEventListener('click', () => {
          if (this.selectedEquipSlot) {
            const success = this.manager.unequipItem(this.selectedEquipSlot);
            if (success) {
              this.onStateChange?.();
              this.render();
            }
          }
        });
        actionsEl.appendChild(unequipBtn);
      } else {
        detailsEl.innerHTML = `<div class="item-details__desc">Empty ${this.selectedEquipSlot} slot.</div>`;
      }
      return;
    }

    // Case 2: Inventory slot selected
    if (this.selectedSlotIndex !== null) {
      const slot = state.slots[this.selectedSlotIndex];
      const itemDef = slot ? getItemDefinition(slot.itemId) : undefined;

      if (itemDef) {
        this.displayItemInfo(detailsEl, itemDef);

        if (itemDef.equipmentSlot) {
          const equipBtn = document.createElement('button');
          equipBtn.className = 'item-btn item-btn--equip';
          equipBtn.textContent = 'Equip';
          equipBtn.addEventListener('click', () => {
            if (this.selectedSlotIndex !== null) {
              const res = this.manager.equipItem(this.selectedSlotIndex, this.playerLevel);
              if (res.success) {
                this.onStateChange?.();
                this.render();
              }
            }
          });
          actionsEl.appendChild(equipBtn);
        }
      } else {
        detailsEl.innerHTML = `<div class="item-details__title">Select an item to view details</div>`;
      }
      return;
    }

    // Case 3: Nothing selected
    detailsEl.innerHTML = `<div class="item-details__title">Select an item to view details</div>`;
  }

  private displayItemInfo(container: Element, itemDef: ItemDefinition): void {
    const statsStr = itemDef.statModifiers
      ? Object.entries(itemDef.statModifiers)
          .filter(([, val]) => val && val > 0)
          .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
          .join(', ')
      : '';

    container.innerHTML = `
      <div class="item-details__title rarity-${itemDef.rarity}">${this.escape(itemDef.name)} (${itemDef.rarity})</div>
      <div class="item-details__desc">${this.escape(itemDef.description)}</div>
      ${statsStr ? `<div class="item-details__stats">${statsStr}</div>` : ''}
      ${itemDef.requiredLevel ? `<div class="item-details__desc">Requires Level ${itemDef.requiredLevel}</div>` : ''}
    `;
  }

  private getItemIcon(def: ItemDefinition): string {
    return ITEM_ICONS[def.type] || '📦';
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
