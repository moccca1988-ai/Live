async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // DNS-Sicherheit: einmal feste URL als Fallback/Test
  const fallbackEndpoint = 'https://jayjaym.com/api/2024-01/graphql.json';
  const envEndpoint =
    process.env.SHOPIFY_STORE_DOMAIN &&
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`;

  const endpoint = envEndpoint || fallbackEndpoint;

  const maxRetries = 2; // zusätzlich zu initialem Versuch = insgesamt 3
  const retryDelayMs = 500;

  async function attempt(tryIndex: number): Promise<Response> {
    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token':
            process.env.SHOPIFY_ACCESS_TOKEN ?? '',
          'User-Agent': 'Vercel-Server-Fetch',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error: any) {
      // Detailliertes Error-Objekt
      console.error(
        'DEBUG FETCH:',
        error?.message,
        error?.stack
      );
      console.error('Shopify Fetch fehlgeschlagen bei:', endpoint);

      // Retry, falls noch Versuche übrig
      if (tryIndex < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        return attempt(tryIndex + 1);
      }

      throw error;
    }
  }

  const response = await attempt(0);

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
