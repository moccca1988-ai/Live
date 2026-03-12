"use client";

import { useState, useEffect, useCallback } from "react";
import { LiveRoom } from "@/components/LiveRoom";
import { getLiveProducts } from "@/app/actions/shopify";
import { ShopifyProduct } from "@/lib/shopify";

export default function HostPage() {
  const [token, setToken] = useState<string>("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [error, setError] = useState<string>("");
  const [shopifyError, setShopifyError] = useState<string>("");
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [retryVisible, setRetryVisible] = useState<boolean>(false);

  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);
    setShopifyError("");
    setRetryVisible(false);

    // 10-Sekunden Timeout - danach "Erneut versuchen" Button anzeigen
    const timeout = setTimeout(() => {
      setRetryVisible(true);
    }, 10000);

    getLiveProducts()
      .then((res) => {
        clearTimeout(timeout);
        setLoadingProducts(false);
        if (res.error) {
          setShopifyError(res.error);
        }
        setProducts(res.products || []);
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
    <main className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative">
      {shopifyError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-black/80 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-2xl border border-red-500/30 max-w-sm text-center">
          <div className="text-red-400 mb-1">Shopify Fehler:</div>
          <div className="text-zinc-300">{shopifyError}</div>
          {retryVisible && (
            <button
              onClick={fetchProducts}
              className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-xs font-bold transition-colors"
            >
              Erneut versuchen
            </button>
          )}
        </div>
      )}
      {loadingProducts && !shopifyError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-black/60 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-2xl border border-white/10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Produkte werden geladen...
          </div>
          {retryVisible && (
            <button
              onClick={fetchProducts}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-bold transition-colors"
            >
              Erneut versuchen
            </button>
          )}
        </div>
      )}
      <LiveRoom token={token} isHost={true} products={products} />
    </main>
  );
}
