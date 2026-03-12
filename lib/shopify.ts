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

async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN ?? '',
    },
    body: JSON.stringify({ query, variables }),
  }).catch((err) => {
    console.error('Shopify Fetch fehlgeschlagen bei:', endpoint);
    throw err;
  });

  if (!response.ok) {
    console.error('Shopify Fetch fehlgeschlagen bei:', endpoint);
    throw new Error(`Shopify API Fehler: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    console.error('Shopify Fetch fehlgeschlagen bei:', endpoint);
    throw new Error(JSON.stringify(json.errors));
  }

  return json.data as T;
}

const PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first) {
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
          featuredImage {
            url
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

export async function getProducts(first = 20): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{
    products: {
      edges: {
        node: {
          id: string;
          title: string;
          handle: string;
          priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
          featuredImage?: { url: string };
          variants: {
            edges: {
              node: {
                id: string;
                title: string;
                availableForSale: boolean;
                quantityAvailable: number;
              };
            }[];
          };
        };
      }[];
    };
  }>(PRODUCTS_QUERY, { first });

  return data.products.edges.map(({ node }) => {
    const variants: ShopifyVariant[] = node.variants.edges.map(({ node: v }) => ({
      id: v.id,
      title: v.title,
      availableForSale: v.availableForSale,
      inventoryQuantity: v.quantityAvailable,
    }));

    return {
      id: node.id,
      title: node.title,
      handle: node.handle,
      price: node.priceRange.minVariantPrice.amount,
      currency: node.priceRange.minVariantPrice.currencyCode,
      imageUrl: node.featuredImage?.url ?? '',
      variantId: variants[0]?.id ?? '',
      variants,
    };
  });
}
