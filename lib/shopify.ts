export interface ShopifyVariant {
  id: string;
  title: string;
  inventoryQuantity: number;
  availableForSale: boolean;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  price: string;
  currency: string;
  imageUrl: string;
  variantId: string;
  variants: ShopifyVariant[];
}
