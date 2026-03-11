"use client";

import { ShopifyProduct } from "@/lib/shopify";
import { useState, useEffect } from "react";
import { PinnedProduct } from "./PinnedProduct";
import { ProductList } from "./ProductList";
import { ChatOverlay } from "./ChatOverlay";
import { FloatingHearts } from "./FloatingHearts";
import { getProductInventory } from "@/app/actions/inventory";
import { Users, Heart, DollarSign, Video, TrendingUp } from "lucide-react";
import Image from "next/image";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  ParticipantTile,
  VideoTrack,
  useDataChannel,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

interface LiveRoomProps {
  token: string;
  isHost: boolean;
  products: ShopifyProduct[];
}

export function LiveRoom({ token, isHost, products }: LiveRoomProps) {
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-red-500">
          NEXT_PUBLIC_LIVEKIT_URL is not defined in .env
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={isHost}
      audio={isHost}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      className="relative flex h-full w-full max-w-md mx-auto bg-black overflow-hidden"
    >
      <StreamContent isHost={isHost} products={products} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function StreamContent({
  isHost,
  products,
}: {
  isHost: boolean;
  products: ShopifyProduct[];
}) {
  const [pinnedProduct, setPinnedProduct] = useState<ShopifyProduct | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [estimatedSales, setEstimatedSales] = useState<number>(0);
  const [prevPinnedProductId, setPrevPinnedProductId] = useState<string | null>(null);

  const currentPinnedId = pinnedProduct?.id ?? null;
  if (currentPinnedId !== prevPinnedProductId) {
    if (!pinnedProduct) {
      setInventoryCount(null);
    }
    setPrevPinnedProductId(currentPinnedId);
  }
  
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: !isHost },
  );

  const hostTrack = tracks.find(
    (t) => t.participant.identity === "host" || t.participant.isLocal,
  );

  const { send: sendPin } = useDataChannel("product-pin", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "PIN_PRODUCT") {
        setPinnedProduct(data.product);
      } else if (data.type === "UNPIN_PRODUCT") {
        setPinnedProduct(null);
      }
    } catch (e) {
      console.error("Failed to parse data message", e);
    }
  });

  const { send: sendSales } = useDataChannel("sales-tracking", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "TRACK_SALE") {
        setEstimatedSales((prev) => prev + parseFloat(data.price || "0"));
      }
    } catch (e) {
      console.error("Failed to parse sales message", e);
    }
  });

  useEffect(() => {
    if (!pinnedProduct) {
      return;
    }

    const fetchInventory = async () => {
      const count = await getProductInventory(pinnedProduct.id);
      setInventoryCount(count);
    };

    fetchInventory();
    const interval = setInterval(fetchInventory, 30000); // 30s
    return () => clearInterval(interval);
  }, [pinnedProduct]);

  const handlePinProduct = (product: ShopifyProduct) => {
    setPinnedProduct(product);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "PIN_PRODUCT", product }),
    );
    sendPin(payload, { reliable: true });
  };

  const handleUnpinProduct = () => {
    setPinnedProduct(null);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "UNPIN_PRODUCT" }),
    );
    sendPin(payload, { reliable: true });
  };

  return (
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        {hostTrack && hostTrack.publication ? (
          <VideoTrack
            trackRef={hostTrack as any}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.15)_0%,transparent_60%)] animate-pulse" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-emerald-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                <div className="w-8 h-8 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Stream starting soon</h2>
              <p className="text-zinc-400 text-center text-sm max-w-[250px]">The host is getting ready. Grab a snack and hold tight!</p>
            </div>
          </div>
        )}
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
        {/* Top Header */}
        <div className="p-4 flex flex-col gap-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex justify-between items-start">
            <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider animate-pulse shadow-lg shadow-red-500/20">
              Live
            </div>
            <div className="bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {isHost ? "Host" : "Viewer"}
            </div>
          </div>

          {/* Host Stats Overlay */}
          {isHost && (
            <div className="flex gap-2 pointer-events-auto">
              <div className="bg-black/40 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-white/10">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white text-xs font-bold">1.2k</span>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-white/10">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-white text-xs font-bold">8.4k</span>
              </div>
            </div>
          )}
        </div>

        {/* Host Live Analytics Banner & Products */}
        {isHost && (
          <div className="absolute top-20 left-4 right-4 bottom-72 pointer-events-auto flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl flex flex-col gap-1 shrink-0">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <TrendingUp className="w-4 h-4 text-[#39FF14]" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Live Analytics</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#39FF14] drop-shadow-[0_0_15px_rgba(57,255,20,0.4)] tracking-tighter">
                  ${estimatedSales.toFixed(2)}
                </span>
                <span className="text-zinc-500 text-xs font-medium">Est. Revenue</span>
              </div>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center shrink-0">
                <p className="text-red-400 text-sm font-medium">No products loaded.</p>
                <p className="text-zinc-400 text-xs mt-1">Check if SHOPIFY_STOREFRONT_ACCESS_TOKEN is set correctly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-4 shrink-0">
                {products.map((product) => {
                  const isPinned = product.id === pinnedProduct?.id;
                  const totalInventory = product.variants?.reduce((sum, v) => sum + (v.inventoryQuantity || 0), 0) || 0;
                  const isSoldOut = totalInventory === 0;

                  return (
                    <div key={product.id} className={`bg-zinc-900/90 backdrop-blur-md rounded-xl border ${isPinned ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-white/10'} p-3 flex flex-col`}>
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-3">
                        <Image src={product.imageUrl} alt={product.title} fill className="object-cover" referrerPolicy="no-referrer" />
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-red-500/80 px-2 py-1 rounded">Sold Out</span>
                          </div>
                        )}
                      </div>
                      <h4 className="text-white text-sm font-medium line-clamp-2 mb-1">{product.title}</h4>
                      <p className="text-emerald-400 text-xs font-bold mb-3">{product.price} {product.currency}</p>
                      
                      <button
                        onClick={() => isPinned ? handleUnpinProduct() : handlePinProduct(product)}
                        className={`mt-auto w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                          isPinned
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {isPinned ? "Unpin from Stream" : "Pin to Stream"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Floating Hearts Overlay */}
        <FloatingHearts isHost={isHost} />

        {/* Middle Section: Pinned Product */}
        {pinnedProduct && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <PinnedProduct
              product={pinnedProduct}
              isHost={isHost}
              onUnpin={handleUnpinProduct}
              inventoryCount={inventoryCount}
            />
          </div>
        )}

        {/* Bottom Section: Chat & Host Controls */}
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-6 px-4 pointer-events-auto flex flex-col justify-end">
          <div className="h-48 flex flex-col justify-end mb-4">
            <ChatOverlay isHost={isHost} />
          </div>
        </div>
      </div>
    </div>
  );
}
