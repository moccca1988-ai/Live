"use client";

import { useState, useEffect } from "react";
import { LiveRoom } from "@/components/LiveRoom";
import { getLiveProducts } from "@/app/actions/shopify";
import { ShopifyProduct } from "@/lib/shopify";

export default function ViewerPage() {
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Fetch products
    getLiveProducts().then(setProducts).catch(console.error);

    // Fetch LiveKit token
    const fetchToken = async () => {
      // Generate a random username for the viewer
      const randomUser = `viewer_${Math.floor(Math.random() * 10000)}`;

      try {
        const res = await fetch(
          `/api/livekit/token?room=live-shopping-room&username=${randomUser}&isHost=false`,
        );
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          setUsername(randomUser);
        } else {
          setError(data.details || data.error || "Failed to get token");
        }
      } catch (e) {
        setError("Error fetching token");
      }
    };
    fetchToken();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Configuration Required</h2>
          <p className="text-zinc-300 mb-4">{error}</p>
          <p className="text-sm text-zinc-400">
            Please ask the host to configure the LiveKit credentials.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="animate-pulse">Joining live stream...</div>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden">
      <LiveRoom token={token} isHost={false} products={products} />
    </main>
  );
}
