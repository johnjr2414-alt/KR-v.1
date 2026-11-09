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

  // ── Golden Capital (Phase 26.4) — reuses the existing shop system; provisional ──
  'capital-grand-bazaar': {
    id: 'capital-grand-bazaar',
    name: 'Grand Bazaar of the Capital',
    merchantNpcId: 'merchant-cordelia',
    sellPriceMultiplier: 0.55,
    catalog: [
      { itemId: 'iron-blade', buyPrice: 120 },
      { itemId: 'leather-vest', buyPrice: 110 },
      { itemId: 'scholars-hood', buyPrice: 180 },
      { itemId: 'amulet-of-logic', buyPrice: 200 },
      { itemId: 'minor-health-potion', buyPrice: 20 },
      { itemId: 'minor-mana-potion', buyPrice: 22 },
    ],
  },
};

export function getShopDefinition(id: string): ShopDefinition | undefined {
  return SHOP_REGISTRY[id];
}

export function getShopForMerchant(merchantNpcId: string): ShopDefinition | undefined {
  return Object.values(SHOP_REGISTRY).find((shop) => shop.merchantNpcId === merchantNpcId);
}
