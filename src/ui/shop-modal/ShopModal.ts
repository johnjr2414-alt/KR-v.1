import type { ShopDefinition } from '../../economy/ShopTypes';
import { ShopService, shopService } from '../../economy/ShopService';
import { playerSessionManager } from '../../player';
import { getItemDefinition } from '../../inventory/ItemRegistry';
import './shop-modal.css';

export interface ShopModalOptions {
  shop: ShopDefinition;
  shopService?: ShopService;
  onClose?: () => void;
  onTransactionComplete?: () => void;
}

type ShopTab = 'buy' | 'sell';

export class ShopModal {
  private container: HTMLDivElement | null = null;
  private readonly shop: ShopDefinition;
  private readonly service: ShopService;
  private readonly onClose?: () => void;
  private readonly onTransactionComplete?: () => void;

  private activeTab: ShopTab = 'buy';
  private feedbackMessage = '';
  private feedbackIsError = false;
  private isProcessing = false;

  constructor(options: ShopModalOptions) {
    this.shop = options.shop;
    this.service = options.shopService || shopService;
    this.onClose = options.onClose;
    this.onTransactionComplete = options.onTransactionComplete;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'shop-modal';
    container.id = 'shop-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    const gold = playerSessionManager.currency.getGold();

    this.container.innerHTML = `
      <div class="shop-card">
        <div class="shop-card__header">
          <div class="shop-card__title-area">
            <span class="shop-card__title">🏪 ${this.escape(this.shop.name)}</span>
            <span class="shop-card__merchant">${this.escape(this.shop.merchantNpcId ?? 'Merchant')}</span>
          </div>
          <div class="shop-card__header-gold">
            🪙 ${gold} G
          </div>
        </div>

        <div class="shop-card__tabs">
          <button class="shop-card__tab ${this.activeTab === 'buy' ? 'shop-card__tab--active' : ''}" id="shop-tab-buy" type="button">
            Buy Goods
          </button>
          <button class="shop-card__tab ${this.activeTab === 'sell' ? 'shop-card__tab--active' : ''}" id="shop-tab-sell" type="button">
            Sell Spoils
          </button>
        </div>

        <div class="shop-card__content" id="shop-content">
          ${this.activeTab === 'buy' ? this.renderBuyCatalog(gold) : this.renderSellInventory()}
        </div>

        <div class="shop-card__footer">
          <div class="shop-card__feedback ${this.feedbackIsError ? 'shop-card__feedback--error' : 'shop-card__feedback--success'}">
            ${this.escape(this.feedbackMessage)}
          </div>
          <button class="shop-card__close-btn" id="shop-close-btn" type="button">
            Done
          </button>
        </div>
      </div>
    `;

    // Tab bindings
    this.container.querySelector('#shop-tab-buy')?.addEventListener('click', () => {
      this.activeTab = 'buy';
      this.feedbackMessage = '';
      this.render();
    });

    this.container.querySelector('#shop-tab-sell')?.addEventListener('click', () => {
      this.activeTab = 'sell';
      this.feedbackMessage = '';
      this.render();
    });

    // Close binding
    this.container.querySelector('#shop-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });

    // Item Action bindings
    if (this.activeTab === 'buy') {
      this.attachBuyListeners();
    } else {
      this.attachSellListeners();
    }
  }

  private renderBuyCatalog(currentGold: number): string {
    if (this.shop.catalog.length === 0) {
      return `<div class="shop-card__empty">No items currently available.</div>`;
    }

    return this.shop.catalog
      .map((entry) => {
        const itemDef = getItemDefinition(entry.itemId);
        const name = itemDef?.name ?? entry.itemId;
        const desc = itemDef?.description ?? '';
        const canAfford = currentGold >= entry.buyPrice;

        return `
          <div class="shop-item-row">
            <div class="shop-item-row__info">
              <span class="shop-item-row__name">${this.escape(name)}</span>
              <span class="shop-item-row__desc">${this.escape(desc)}</span>
            </div>
            <div class="shop-item-row__price">
              ${entry.buyPrice} G
            </div>
            <div class="shop-item-row__action">
              <button class="shop-action-btn" data-buy-item="${entry.itemId}" ${!canAfford ? 'disabled' : ''}>
                Buy (1)
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private renderSellInventory(): string {
    const invState = playerSessionManager.inventory.getState();
    const equippedItemIds = new Set(Object.values(invState.equipped));

    // Aggregate inventory slots by itemId
    const counts = new Map<string, number>();
    for (const slot of invState.slots) {
      if (slot) {
        counts.set(slot.itemId, (counts.get(slot.itemId) ?? 0) + slot.quantity);
      }
    }

    if (counts.size === 0) {
      return `<div class="shop-card__empty">Your bag is empty.</div>`;
    }

    let rowsHtml = '';
    for (const [itemId, quantity] of counts.entries()) {
      const isEquipped = equippedItemIds.has(itemId);
      if (isEquipped) {
        // Do not allow equipped items to be sold while worn
        continue;
      }

      const itemDef = getItemDefinition(itemId);
      const name = itemDef?.name ?? itemId;
      const desc = itemDef?.description ?? '';
      const unitValue = itemDef?.value ?? 0;
      const sellPrice = Math.max(1, Math.floor(unitValue * this.shop.sellPriceMultiplier));

      rowsHtml += `
        <div class="shop-item-row">
          <div class="shop-item-row__info">
            <span class="shop-item-row__name">${this.escape(name)} × ${quantity}</span>
            <span class="shop-item-row__desc">${this.escape(desc)}</span>
          </div>
          <div class="shop-item-row__price">
            ${sellPrice} G ea.
          </div>
          <div class="shop-item-row__action">
            <button class="shop-action-btn shop-action-btn--sell" data-sell-item="${itemId}">
              Sell (1)
            </button>
          </div>
        </div>
      `;
    }

    return rowsHtml;
  }

  private attachBuyListeners(): void {
    if (!this.container) return;
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('[data-buy-item]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-buy-item');
        if (itemId) {
          this.handleBuy(itemId);
        }
      });
    });
  }

  private attachSellListeners(): void {
    if (!this.container) return;
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('[data-sell-item]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-sell-item');
        if (itemId) {
          this.handleSell(itemId);
        }
      });
    });
  }

  private handleBuy(itemId: string): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const res = this.service.buyItem(this.shop, itemId, 1);
    if (res.success) {
      this.feedbackMessage = `Purchased 1x ${getItemDefinition(itemId)?.name ?? itemId} for ${res.totalCost} G!`;
      this.feedbackIsError = false;
      void playerSessionManager.saveSession();
      this.onTransactionComplete?.();
    } else {
      this.feedbackMessage = res.error ?? 'Purchase failed';
      this.feedbackIsError = true;
    }

    this.isProcessing = false;
    this.render();
  }

  private handleSell(itemId: string): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const res = this.service.sellItem(this.shop, itemId, 1);
    if (res.success) {
      this.feedbackMessage = `Sold 1x ${getItemDefinition(itemId)?.name ?? itemId} for ${res.totalCost} G!`;
      this.feedbackIsError = false;
      void playerSessionManager.saveSession();
      this.onTransactionComplete?.();
    } else {
      this.feedbackMessage = res.error ?? 'Sale failed';
      this.feedbackIsError = true;
    }

    this.isProcessing = false;
    this.render();
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
