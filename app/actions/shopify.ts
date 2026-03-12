"use server";
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
};
export async function getLiveProducts(): Promise<GetLiveProductsResult> {
  try {
    // Priority: SHOPIFY_MYSHOPIFY_DOMAIN > SHOPIFY_STORE_DOMAIN > NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    const rawDomain =
      process.env.SHOPIFY_MYSHOPIFY_DOMAIN ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
    if (!rawDomain) {
      const errorMsg = "SHOPIFY_STORE_DOMAIN ist nicht gesetzt!";
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }
    // Strip protocol and trailing slash
    let domain = rawDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    // If custom domain (not .myshopify.com), warn but don't hard-fail
    // The Storefront API requires .myshopify.com - log clear error
    if (!domain.includes('.myshopify.com')) {
      console.error(
        '[Shopify] KRITISCH: Domain ist keine .myshopify.com Domain:',
        domain,
        '- Setze SHOPIFY_MYSHOPIFY_DOMAIN=<shopname>.myshopify.com in Vercel Environment Variables!'
      );
      return {
        products: [],
        error: `Shopify Domain-Fehler: "${domain}" ist keine .myshopify.com Domain. Bitte setze SHOPIFY_MYSHOPIFY_DOMAIN=<shopname>.myshopify.com in den Vercel Environment Variables.`,
      };
    }
    // Only SHOPIFY_ACCESS_TOKEN (as per requirement)
    const storefrontAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    if (!storefrontAccessToken) {
      const errorMsg = "SHOPIFY_ACCESS_TOKEN ist nicht gesetzt!";
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }
    const url = `https://${domain}/api/2024-01/graphql.json`;
    const query = `
      query {
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
        "User-Agent": "Vercel-Server-Fetch",
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.text();
      const errorMsg = `Shopify API ${response.status} ${response.statusText}: ${body}`;
      console.error('Shopify Fetch fehlgeschlagen bei:', url);
      return { products: [], error: errorMsg };
    }
    const json = await response.json();
    if (json.errors) {
      const errorMsg = `Shopify GraphQL Fehler: ${JSON.stringify(json.errors)}`;
      console.error('Shopify Fetch fehlgeschlagen bei:', url);
      return { products: [], error: errorMsg };
    }
    if (!json.data?.products?.edges) {
      const errorMsg = `Shopify leere Antwort: ${JSON.stringify(json)}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }
    const products: ShopifyProduct[] = json.data.products.edges.map((edge: any) => {
      const variants: ShopifyVariant[] = edge.node.variants.edges.map((v: any) => ({
        id: v.node.id.split("/").pop(),
        title: v.node.title,
        inventoryQuantity: v.node.quantityAvailable || 0,
        availableForSale: v.node.availableForSale,
      }));
      return {
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        price: edge.node.priceRange.minVariantPrice.amount,
        currency: edge.node.priceRange.minVariantPrice.currencyCode,
        imageUrl: (edge.node.images.edges[0]?.node.url || "").replace(/^http:\/\//, 'https://'),
        variantId: variants[0]?.id || "",
        variants,
      };
    });
    if (products.length === 0) {
      const errorMsg =
        "Shopify liefert 0 Produkte. Checke Kanal-Berechtigung im Shopify Admin unter Einstellungen > Apps > Storefront API.";
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }
    return { products };
  } catch (error: any) {
    console.error('Shopify Fetch fehlgeschlagen bei:', error?.message, error?.stack);
    return { products: [], error: `Shopify Fetch Fehler: ${error.message}` };
  }
}
