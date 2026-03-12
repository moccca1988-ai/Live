// lib/shopify.ts - Zentrale Typen und Fetch-Hilfsfunktion
// HINWEIS: Die eigentliche Produkt-Logik liegt in app/actions/shopify.ts (Server Action)
// Diese Datei stellt nur die Interfaces und eine generische Fetch-Funktion bereit.

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

/**
 * Generische Shopify Storefront API Fetch-Funktion.
 * WICHTIG: SHOPIFY_STORE_DOMAIN MUSS eine .myshopify.com Domain sein.
 * Die custom Domain (z.B. jayjaym.com) hat ein abgelaufenes TLS-Zertifikat
 * und verursacht CERT_HAS_EXPIRED auf Vercel-Servern.
 */
export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // Nur noch envEndpoint - KEIN jayjaym.com Fallback (CERT_HAS_EXPIRED!)
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!rawDomain) {
    throw new Error('SHOPIFY_STORE_DOMAIN ist nicht gesetzt!');
  }

  const domain = rawDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  const endpoint = `https://${domain}/api/2024-01/graphql.json`;

  const maxRetries = 2;
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
      console.error('DEBUG FETCH:', error?.message, error?.stack);
      console.error('Shopify Fetch fehlgeschlagen bei:', endpoint);

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
