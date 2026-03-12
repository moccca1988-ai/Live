"use server";

/**
 * getProductInventory - liest Live-Inventar eines Produkts via Shopify Storefront API.
 * WICHTIG: Domain muss .myshopify.com sein, NICHT jayjaym.com (CERT_HAS_EXPIRED!).
 * Token: Nur SHOPIFY_ACCESS_TOKEN.
 */
export async function getProductInventory(productId: string): Promise<number | null> {
  const rawDomain =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

  const storefrontAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!rawDomain || !storefrontAccessToken) {
    console.error('Shopify credentials missing for inventory. Domain:', rawDomain);
    return null;
  }

  // Strip protocol and trailing slash
  const domain = rawDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  // Sicherheit: nur .myshopify.com erlauben
  if (!domain.includes('.myshopify.com')) {
    console.error('[Inventory] Domain ist keine .myshopify.com:', domain);
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
        "User-Agent": "Vercel-Server-Fetch",
      },
      body: JSON.stringify({ query, variables: { id: productId } }),
      cache: 'no-store',
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
    console.error('Error fetching inventory:', e);
    return null;
  }
}
