import { NextRequest, NextResponse } from 'next/server';
import { getProductInventory } from '@/app/actions/inventory';

/**
 * GET /api/shopify/inventory?productId=...
 *
 * Gibt Live-Inventar eines Shopify-Produkts zurueck.
 * Wird von LiveRoom.tsx aufgerufen statt direktem Server-Action-Call
 * (verhindert "Failed to find Server Action" 404 nach Re-Deployments).
 */
feat: Neue API-Route /api/shopify/inventory (Inventory via GET statt Server Action)  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    return NextResponse.json(
      { error: 'productId query parameter is required' },
      { status: 400 }
    );
  }

  const count = await getProductInventory(productId);
  return NextResponse.json({ count });
}
