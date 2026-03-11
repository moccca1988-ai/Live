export interface ShopifyVariant {
  id: string;
  title: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  variantId: string;
  variants: ShopifyVariant[];
}

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function getLiveProducts(): Promise<ShopifyProduct[]> {
  if (!domain || !storefrontAccessToken) {
    console.warn("Shopify credentials missing, returning empty products.");
    return [];
  }

  const query = `
    {
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
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({ query }),
    });

    const json = await response.json();
    return json.data.products.edges.map((edge: any) => {
      const variants = edge.node.variants.edges.map((v: any) => ({
        id: v.node.id.split("/").pop(),
        title: v.node.title,
      }));
      
      return {
        id: edge.node.id,
        title: edge.node.title,
        price: edge.node.priceRange.minVariantPrice.amount,
        currency: edge.node.priceRange.minVariantPrice.currencyCode,
        imageUrl: edge.node.images.edges[0]?.node.url || "",
        variantId: variants[0]?.id || "",
        variants: variants,
      };
    });
  } catch (error) {
    console.error("Error fetching Shopify products:", error);
    return [];
  }
}
