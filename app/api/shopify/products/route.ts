import { NextResponse } from 'next/server';
import { getLiveProducts } from '@/app/actions/shopify';

/**
 * GET /api/shopify/products
 *
 * Stellt Shopify-Produkte als regulaere API-Route bereit.
 * Vorteil gegenueber direktem Server-Action-Aufruf aus Client-Komponenten:
 * Kein "Failed to find Server Action" 404 nach Re-Deployments.
 */
export async function GET() {
  const result = await getLiveProducts();
  return NextResponse.json(result);
}
