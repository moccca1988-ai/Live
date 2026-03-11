"use server";

export async function getProductInventory(productId: string) {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !storefrontAccessToken) return null;

  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        variants(first: 10) {
          edges {
            node {
              id
              quantityAvailable
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
      body: JSON.stringify({ query, variables: { id: productId } }),
      cache: 'no-store'
    });
    const json = await response.json();
    const variants = json.data?.product?.variants?.edges || [];
    let total = 0;
    let hasInventoryData = false;
    variants.forEach((v: any) => {
       if (typeof v.node.quantityAvailable === 'number') {
         total += v.node.quantityAvailable;
         hasInventoryData = true;
       }
    });
    return hasInventoryData ? total : null;
  } catch (e) {
    console.error("Error fetching inventory:", e);
    return null;
  }
}
