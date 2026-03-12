// KEIN 'use server' hier! Diese Datei wird von API-Route-Handlern importiert.
// 'use server' wuerde einen Build-Fehler verursachen (Server Actions != Route Handlers).
export async function getProductInventory(productId: string): Promise<number | null> {
  const rawDomain =
    process.env.SHOPIFY_MYSHOPIFY_DOMAIN ||
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!rawDomain || !storefrontAccessToken) {
    console.error('Shopify credentials missing for inventory. Domain:', rawDomain);
    return null;
  }
  const domain = rawDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        'User-Agent': 'Vercel-Server-Fetch',
      },
      body: JSON.stringify({ query, variables: { id: productId } }),
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('Shopify Fetch fehlgeschlagen bei:', url);
      return null;
    }
    const json = await response.json();
    const variants = json?.data?.product?.variants?.edges;
    if (!variants) return null;
    const total = variants.reduce((sum: number, v: any) => sum + (v.node.quantityAvailable || 0), 0);
    return total;
  } catch (error: any) {
    console.error('Shopify Fetch fehlgeschlagen bei:', error?.message, error?.stack);
    return null;
  }
}
