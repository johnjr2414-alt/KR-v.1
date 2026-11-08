import type { ShopDefinition } from './ShopTypes';

export const SHOP_REGISTRY: Record<string, ShopDefinition> = {
  'village-general-store': {
    id: 'village-general-store',
    name: "Beginner's General Store",
    merchantNpcId: 'merchant-barnaby',
    sellPriceMultiplier: 0.5,
    catalog: [
      { itemId: 'wooden-sword', buyPrice: 20 },
      { itemId: 'cloth-tunic', buyPrice: 15 },
      { itemId: 'leather-cap', buyPrice: 15 },
      { itemId: 'minor-health-potion', buyPrice: 10 },
      { itemId: 'minor-mana-potion', buyPrice: 12 },
    ],
  },
  'scholars-apothecary': {
    id: 'scholars-apothecary',
    name: "Scholar's Curios & Gear",
    merchantNpcId: 'scholar-lyra',
    sellPriceMultiplier: 0.6,
    catalog: [
      { itemId: 'scholars-hood', buyPrice: 100 },
      { itemId: 'copper-ring', buyPrice: 35 },
      { itemId: 'amulet-of-logic', buyPrice: 150 },
      { itemId: 'minor-mana-potion', buyPrice: 12 },
    ],
  },
};

export function getShopDefinition(id: string): ShopDefinition | undefined {
  return SHOP_REGISTRY[id];
}

export function getShopForMerchant(merchantNpcId: string): ShopDefinition | undefined {
  return Object.values(SHOP_REGISTRY).find((shop) => shop.merchantNpcId === merchantNpcId);
}
