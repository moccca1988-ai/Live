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
    const rawDomain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "jayjaym.com";
    // Strip protocol and trailing slash if present
    const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const domain = cleanDomain === "jayjaym.com" ? "www.jayjaym.com" : cleanDomain;
    const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || process.env.ACCESS_TOKEN;

    if (!domain || !storefrontAccessToken) {
      const errorMsg = `Shopify credentials missing. Domain: ${domain ? 'Set' : 'Missing'}, Token: ${storefrontAccessToken ? 'Set' : 'Missing'}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    const url = `https://${domain}/api/2024-01/graphql.json`;
    const query = `
      query {
        products(first: 250) {
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
      },
      body: JSON.stringify({ query }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorMsg = `Shopify API response not OK: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    const json = await response.json();
    
    if (json.errors) {
      const errorMsg = `Shopify GraphQL errors: ${JSON.stringify(json.errors)}`;
      console.error(errorMsg);
      return { products: [], error: errorMsg };
    }

    if (!json.data || !json.data.products) {
      const errorMsg = `Shopify API empty response: ${JSON.stringify(json)}`;
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

    if (products.length === 0) {
      const errorMsg = `Shopify API returned 0 products. Query successful but list is empty.`;
      console.warn(errorMsg);
      return { products: [], error: errorMsg };
    }

    return { products };
  } catch (error: any) {
    const errorMsg = `Error fetching Shopify products: ${error.message}`;
    console.error(errorMsg, error);
    return { products: [], error: errorMsg };
  }
}

