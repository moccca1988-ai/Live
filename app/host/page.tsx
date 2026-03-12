"use client";
import { useState, useEffect, useCallback } from "react";
import { LiveRoom } from "@/components/LiveRoom";
import { ShopifyProduct } from "@/lib/shopify";
export default function HostPage() {
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [error, setError] = useState("");
  const [shopifyError, setShopifyError] = useState("");
  const [shopifyDebug, setShopifyDebug] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [retryVisible, setRetryVisible] = useState(false);
  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);
    setShopifyError("");
    setShopifyDebug("");
    setRetryVisible(false);
    // 10-Sekunden Timeout
    const timeout = setTimeout(() => {
      setRetryVisible(true);
    }, 10000);
    // Produkte via API-Route
    fetch('/api/shopify/products')
      .then((res) => res.json())
      .then((res) => {
        clearTimeout(timeout);
        setLoadingProducts(false);
        if (res.error) {
          setShopifyError(res.error);
        }
        if (res.debug) {
          setShopifyDebug(res.debug);
        }
        const loadedProducts = res.products || [];
        setProducts(loadedProducts);
        // If 0 products and no explicit error, show debug info
        if (loadedProducts.length === 0 && !res.error) {
          const debugInfo = res.debug || `Domain: ${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? 'nicht gesetzt'}`;
          setShopifyError(`Shopify liefert 0 Produkte. Debug-Info: ${debugInfo}`);
          setShopifyDebug(debugInfo);
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        setLoadingProducts(false);
        console.error("Shopify fetch error:", err);
        setShopifyError(err.message || "Failed to load Shopify products");
      });
  }, []);
  useEffect(() => {
    // Fetch products
    fetchProducts();
    // Fetch LiveKit token
    const fetchToken = async () => {
      try {
        const res = await fetch(
          "/api/livekit/token?room=live-shopping-room&username=host&isHost=true",
        );
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.details || data.error || "Failed to get token");
        }
      } catch (e) {
        setError("Error fetching token");
      }
    };
    fetchToken();
  }, [fetchProducts]);
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Configuration Required</h2>
          <p className="text-zinc-300 mb-4">{error}</p>
          <p className="text-sm text-zinc-400">
            Please add the required LiveKit credentials in the AI Studio Secrets panel.
          </p>
        </div>
      </div>
    );
  }
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="animate-pulse">Preparing live stream...</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {shopifyError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 m-4">
          <p className="text-red-400 font-bold">Shopify Fehler:</p>
          <p className="text-red-300 text-sm font-mono mt-1">{shopifyError}</p>
          {shopifyDebug && (
            <p className="text-red-400 text-xs mt-2 font-mono">Debug: {shopifyDebug}</p>
          )}
          {products.length === 0 && (
            <p className="text-yellow-400 text-xs mt-2">
              Tipp: Setze <code className="bg-zinc-800 px-1 rounded">SHOPIFY_MYSHOPIFY_DOMAIN=deinshop.myshopify.com</code> und{' '}
              <code className="bg-zinc-800 px-1 rounded">SHOPIFY_ACCESS_TOKEN=dein_token</code> in den Vercel Environment Variables.
            </p>
          )}
          {retryVisible && (
            <button
              onClick={fetchProducts}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Erneut versuchen
            </button>
          )}
        </div>
      )}
      {loadingProducts && !shopifyError && (
        <div className="bg-zinc-800/50 rounded-xl p-4 m-4 text-center">
          <p className="text-zinc-300 animate-pulse">Produkte werden geladen...</p>
          {retryVisible && (
            <button
              onClick={fetchProducts}
              className="mt-2 px-4 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500"
            >
              Erneut versuchen
            </button>
          )}
        </div>
      )}
      <LiveRoom token={token} isHost={true} products={products} />
    </div>
  );
}
