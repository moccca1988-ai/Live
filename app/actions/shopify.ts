// KEIN 'use server' hier! Diese Datei wird von API-Route-Handlern importiert.
// 'use server' wuerde einen Build-Fehler verursachen (Server Actions != Route Handlers).
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
export type GetLiveProductsResult = {
  products: ShopifyProduct[];
  error?: string;
  debug?: string;
};
export async function getLiveProducts(): Promise<GetLiveProductsResult> {
  try {
    // Priority: SHOPIFY_MYSHOPIFY_DOMAIN > SHOPIFY_STORE_DOMAIN > NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    const rawDomain =
      process.env.SHOPIFY_MYSHOPIFY_DOMAIN ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
    const storefrontAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    if (!rawDomain) {
      const errorMsg = "SHOPIFY_STORE_DOMAIN ist nicht gesetzt!";
      console.error(errorMsg);
      return { products: [], error: errorMsg, debug: `Domain: undefined, Token-Laenge: ${storefrontAccessToken?.length ?? 0}` };
    }
    let domain = rawDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const tokenLen = storefrontAccessToken?.length ?? 0;
    console.log(`[Shopify] Domain: ${domain}, Token-Laenge: ${tokenLen}`);
    if (!domain.includes('.myshopify.com')) {
      const errorMsg = `Shopify Domain-Fehler: "${domain}" ist keine .myshopify.com Domain. Bitte setze SHOPIFY_MYSHOPIFY_DOMAIN=<shopname>.myshopify.com in den Vercel Environment Variables.`;
      console.error('[Shopify] KRITISCH:', errorMsg);
      return {
        products: [],
        error: errorMsg,
        debug: `Domain: ${domain}, Token-Laenge: ${tokenLen}`,
      };
    }
    if (!storefrontAccessToken) {
      const errorMsg = "SHOPIFY_ACCESS_TOKEN ist nicht gesetzt!";
      console.error(errorMsg);
      return { products: [], error: errorMsg, debug: `Domain: ${domain}, Token-Laenge: 0` };
    }
    const url = `https://${domain}/api/2024-01/graphql.json`;
    const query = `
      query {
        shop {
          name
        }
        products(first: 20) {
          edges {
            node {
              id
              title
              handle
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    quantityAvailable
                  }
                }
              }
            }
          }
        }
      }
    `;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        'User-Agent': 'Vercel-Server-Fetch',
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.text();
      const errorMsg = `Shopify API ${response.status} ${response.statusText}: ${body}`;
      console.error('Shopify Fetch fehlgeschlagen bei:', url);
      return { products: [], error: errorMsg, debug: `Domain: ${domain}, Token-Laenge: ${tokenLen}` };
    }
    const json = await response.json();
    const shopName = json?.data?.shop?.name;
    console.log(`[Shopify] Shop-Name: ${shopName ?? 'UNBEKANNT'}, GraphQL-Fehler: ${json.errors ? JSON.stringify(json.errors) : 'keine'}`);
    if (json.errors) {
      const errorMsg = `Shopify GraphQL Fehler: ${JSON.stringify(json.errors)}`;
      console.error('Shopify Fetch fehlgeschlagen bei:', url);
      return { products: [], error: errorMsg, debug: `Domain: ${domain}, Token-Laenge: ${tokenLen}, Shop: ${shopName ?? 'n/a'}` };
    }
    const productEdges = json.data?.products?.edges;
    const productNodes = json.data?.products?.nodes;
    const rawProducts = productEdges
      ? productEdges.map((e: any) => e.node)
      : productNodes ?? [];
    if (!rawProducts || rawProducts.length === 0) {
      const debugMsg = `Domain: ${domain}, Token-Laenge: ${tokenLen}, Shop: ${shopName ?? 'n/a'}`;
      const errorMsg = `Shopify liefert 0 Produkte. Debug-Info: ${debugMsg}. Checke Kanal-Berechtigung im Shopify Admin unter Einstellungen > Apps > Storefront API.`;
      console.error(errorMsg);
      return { products: [], error: errorMsg, debug: debugMsg };
    }
    const products: ShopifyProduct[] = rawProducts.map((node: any) => {
      const variantEdges = node.variants?.edges ?? [];
      const variants: ShopifyVariant[] = (
        variantEdges.length > 0
          ? variantEdges.map((v: any) => v.node)
          : node.variants?.nodes ?? []
      ).map((v: any) => ({
        id: (v.id ?? '').split('/').pop() ?? v.id,
        title: v.title,
        inventoryQuantity: v.quantityAvailable || 0,
        availableForSale: v.availableForSale,
      }));
      const imageEdges = node.images?.edges ?? [];
      const firstImageUrl = imageEdges.length > 0
        ? imageEdges[0]?.node?.url
        : node.images?.nodes?.[0]?.url ?? '';
      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        price: node.priceRange?.minVariantPrice?.amount ?? '0',
        currency: node.priceRange?.minVariantPrice?.currencyCode ?? 'EUR',
        imageUrl: (firstImageUrl || '').replace(/^http:\/\//, 'https://'),
        variantId: variants[0]?.id ?? '',
        variants,
      };
    });
    console.log(`[Shopify] ${products.length} Produkte geladen. Shop: ${shopName}`);
    return { products };
  } catch (error: any) {
    console.error('Shopify Fetch fehlgeschlagen bei:', error?.message, error?.stack);
    return { products: [], error: `Shopify Fetch Fehler: ${error.message}` };
  }
}
