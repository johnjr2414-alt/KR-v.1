import type { ShopDefinition, ShopTransactionResult } from './ShopTypes';
import { CurrencyService, currencyService } from './CurrencyService';
import { InventoryManager, inventoryManager } from '../inventory/InventoryManager';
import { getItemDefinition } from '../inventory/ItemRegistry';

/**
 * Headless Shop Service.
 * Coordinates purchasing items with gold and selling inventory items for gold.
 */
export class ShopService {
  private currency: CurrencyService;
  private inventory: InventoryManager;

  constructor(
    currency: CurrencyService = currencyService,
    inventory: InventoryManager = inventoryManager,
  ) {
    this.currency = currency;
    this.inventory = inventory;
  }

  buyItem(shop: ShopDefinition, itemId: string, quantity = 1): ShopTransactionResult {
    const validQty = Math.floor(quantity);
    if (validQty <= 0) {
      return { success: false, itemId, quantity: 0, totalCost: 0, error: 'Invalid quantity' };
    }

    const shopEntry = shop.catalog.find((item) => item.itemId === itemId);
    if (!shopEntry) {
      return { success: false, itemId, quantity: validQty, totalCost: 0, error: 'Item not in stock' };
    }

    if (shopEntry.stock !== undefined && shopEntry.stock < validQty) {
      return { success: false, itemId, quantity: validQty, totalCost: 0, error: 'Insufficient store inventory' };
    }

    const totalCost = shopEntry.buyPrice * validQty;
    if (!this.currency.hasGold(totalCost)) {
      return {
        success: false,
        itemId,
        quantity: validQty,
        totalCost,
        error: `Insufficient gold. Needed: ${totalCost}, have: ${this.currency.getGold()}`,
      };
    }

    // Try adding item to player inventory before deducting gold
    const addResult = this.inventory.addItem(itemId, validQty);
    if (!addResult.success || addResult.remainingQuantity > 0) {
      // Revert any partially added amount if applicable
      if (addResult.addedQuantity > 0) {
        this.inventory.removeItem(itemId, addResult.addedQuantity);
      }
      return {
        success: false,
        itemId,
        quantity: validQty,
        totalCost,
        error: 'Inventory is full',
      };
    }

    // Deduct currency
    this.currency.spendGold(totalCost);
    if (shopEntry.stock !== undefined) {
      shopEntry.stock -= validQty;
    }

    return {
      success: true,
      itemId,
      quantity: validQty,
      totalCost,
    };
  }

  sellItem(shop: ShopDefinition, itemId: string, quantity = 1): ShopTransactionResult {
    const validQty = Math.floor(quantity);
    if (validQty <= 0) {
      return { success: false, itemId, quantity: 0, totalCost: 0, error: 'Invalid quantity' };
    }

    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
      return { success: false, itemId, quantity: validQty, totalCost: 0, error: 'Unknown item' };
    }

    const unitPrice = Math.max(1, Math.floor(itemDef.value * shop.sellPriceMultiplier));
    const totalPayout = unitPrice * validQty;

    // Check inventory removal
    const removed = this.inventory.removeItem(itemId, validQty);
    if (!removed) {
      return {
        success: false,
        itemId,
        quantity: validQty,
        totalCost: 0,
        error: 'You do not have enough of this item to sell',
      };
    }

    // Grant currency
    this.currency.addGold(totalPayout);

    return {
      success: true,
      itemId,
      quantity: validQty,
      totalCost: totalPayout,
    };
  }
}

export const shopService = new ShopService();
