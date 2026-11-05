export interface ShopItem {
  itemId: string;
  buyPrice: number;
  stock?: number; // undefined = infinite stock
}

export interface ShopDefinition {
  id: string;
  name: string;
  merchantNpcId?: string;
  sellPriceMultiplier: number; // default: 0.5 (players sell items for 50% base value)
  catalog: ShopItem[];
}

export interface ShopTransactionResult {
  success: boolean;
  itemId: string;
  quantity: number;
  totalCost: number;
  error?: string;
}
