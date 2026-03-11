"use server";

export async function getProductInventory(productId: string) {
  const rawDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "jayjaym.com";
  // Strip protocol and trailing slash if present
  const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const domain = cleanDomain === "jayjaym.com" ? "www.jayjaym.com" : cleanDomain;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !storefrontAccessToken) {
    console.warn("Shopify credentials missing for inventory. Domain:", domain);
    return null;
  }

  const url = `https://${domain}/api/2024-01/graphql.json`;
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
    const response = await fetch(url, {
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
