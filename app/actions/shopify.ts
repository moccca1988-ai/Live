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
    // Korrekte Domain - MUSS .myshopify.com sein, nicht custom domain
    const rawDomain =
      process.env.SHOPIFY_STORE_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

    if (!rawDomain) {
      const errorMsg = "SHOPIFY_STORE_DOMAIN ist nicht gesetzt!";
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    // Strip protocol and trailing slash
    const domain = rawDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    // Korrekte Token-Reihenfolge: Storefront-Token zuerst!
    const storefrontAccessToken =
      process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_SHOPIFY_ACCESS_TOKEN ||
      process.env.SHOPIFY_ACCESS_TOKEN;

    console.log("[Shopify Debug] Domain:", domain);
    console.log("[Shopify Debug] Token vorhanden:", !!storefrontAccessToken);
    console.log("[Shopify Debug] Token Prefix:", storefrontAccessToken?.substring(0, 10));

    if (!storefrontAccessToken) {
      const errorMsg = "Shopify Storefront Access Token fehlt!";
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    const url = `https://${domain}/api/2024-01/graphql.json`;
    console.log("[Shopify Debug] URL:", url);

    // Vereinfachte Query ohne Filter
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
              variants(first: 1) {
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
      },
      body: JSON.stringify({ query }),
      cache: 'no-store'
    });

    console.log("[Shopify Debug] Response Status:", response.status, response.statusText);

    if (!response.ok) {
      const body = await response.text();
      const errorMsg = `Shopify API ${response.status} ${response.statusText}: ${body}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    const json = await response.json();
    console.log("[Shopify Debug] Response JSON:", JSON.stringify(json).substring(0, 500));

    if (json.errors) {
      const errorMsg = `Shopify GraphQL Fehler: ${JSON.stringify(json.errors)}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    if (!json.data?.products?.edges) {
      const errorMsg = `Shopify leere Antwort: ${JSON.stringify(json)}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    const products = json.data.products.edges.map((edge: any) => {
      const variants = edge.node.variants.edges.map((v: any) => ({
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
        variants: variants,
      };
    });

    console.log("[Shopify Debug] Produkte gefunden:", products.length);

    if (products.length === 0) {
      const errorMsg = "Shopify liefert 0 Produkte. Checke Kanal-Berechtigung im Shopify Admin unter Einstellungen > Apps > Storefront API.";
      console.warn(errorMsg);
      return { products: [], error: errorMsg };
    }

    return { products };

  } catch (error: any) {
    const errorMsg = `Shopify Fetch Fehler: ${error.message}`;
    console.error(errorMsg, error);
    return { products: [], error: errorMsg };
  }
}
