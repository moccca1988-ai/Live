"use client";

import { ShopifyProduct } from "@/lib/shopify";
import { useState, useEffect } from "react";
import { PinnedProduct } from "./PinnedProduct";
import { ProductList } from "./ProductList";
import { ChatOverlay } from "./ChatOverlay";
import { FloatingHearts } from "./FloatingHearts";
import { Users, Heart, DollarSign, Video, TrendingUp, ShoppingCart, X, Mic, MicOff } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  ParticipantTile,
  VideoTrack,
  useDataChannel,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

interface LiveRoomProps {
  token: string;
  isHost: boolean;
  products: ShopifyProduct[];
}

export function LiveRoom({ token, isHost, products }: LiveRoomProps) {
  const rawUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const serverUrl = rawUrl
    ? (rawUrl.startsWith('http') ? rawUrl.replace('http', 'ws') : (rawUrl.startsWith('ws') ? rawUrl : 'wss://' + rawUrl))
    : undefined;

  if (!serverUrl) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-red-500">NEXT_PUBLIC_LIVEKIT_URL is not defined in .env</p>
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
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      className="relative flex h-full w-full bg-black overflow-hidden"
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
  const [estimatedSales, setEstimatedSales] = useState(0);
  const [prevPinnedProductId, setPrevPinnedProductId] = useState<string | null>(null);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);

  const participants = useParticipants();
  const viewerCount = participants.length;

  const currentPinnedId = pinnedProduct?.id ?? null;
  if (currentPinnedId !== prevPinnedProductId) {
    if (!pinnedProduct) {
      setInventoryCount(null);
    }
    setPrevPinnedProductId(currentPinnedId);
  }

  const { localParticipant } = useLocalParticipant();
  const [micLevel, setMicLevel] = useState(0);
  useEffect(() => {
    if (!isHost || !localParticipant) return;
    const interval = setInterval(() => {
      setMicLevel(localParticipant.audioLevel * 100);
    }, 100);
    return () => clearInterval(interval);
  }, [isHost, localParticipant]);

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

  // Inventory via API-Route statt Server Action (verhindert 404 nach Re-Deployments)
  useEffect(() => {
    if (!pinnedProduct) return;

    const fetchInventory = async () => {
      try {
        const res = await fetch(`/api/shopify/inventory?productId=${encodeURIComponent(pinnedProduct.id)}`);
        const data = await res.json();
        setInventoryCount(data.count ?? null);
      } catch (e) {
        console.error("Error fetching inventory:", e);
      }
    };

    fetchInventory();
    const interval = setInterval(fetchInventory, 30000);
    return () => clearInterval(interval);
  }, [pinnedProduct]);

  const handlePinProduct = (product: ShopifyProduct) => {
    setPinnedProduct(product);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "PIN_PRODUCT", product }),
    );
    sendPin(payload, { reliable: true });
    setIsProductDrawerOpen(false);
  };

  const handleUnpinProduct = () => {
    setPinnedProduct(null);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "UNPIN_PRODUCT" }),
    );
    sendPin(payload, { reliable: true });
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* === VIDEO BACKGROUND: Fullscreen fixed === */}
      <div className="absolute inset-0 bg-black">
        {hostTrack && hostTrack.publication ? (
          <VideoTrack trackRef={hostTrack} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <Video className="w-16 h-16 text-zinc-600" />
          </div>
        )}
      </div>

      {/* === OVERLAY LAYER: All UI on top of video === */}
      <div className="relative z-10 flex flex-col h-full w-full pointer-events-none">

        {/* Top Bar: Stats & Badges */}
        <div className="flex items-center gap-2 p-3 pointer-events-auto">
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">Live</span>
          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Users className="w-3 h-3" />{viewerCount}
          </span>
          {isHost && (
            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <DollarSign className="w-3 h-3" />${estimatedSales.toFixed(2)}
            </span>
          )}
          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />8.4k
          </span>
        </div>

        {/* Middle: Pinned Product */}
        <div className="flex-1 flex items-end pb-4 px-3 pointer-events-auto">
          {pinnedProduct && (
            <PinnedProduct
              product={pinnedProduct}
              inventoryCount={inventoryCount}
              onUnpin={isHost ? handleUnpinProduct : undefined}
            />
          )}
        </div>

        {/* Bottom Area: Chat & Controls */}
        <div className="flex items-end gap-3 p-3 pointer-events-auto">
          <div className="flex-1">
            {!isHost && (<ChatOverlay />)}
          </div>

          {isHost && (
            <button
              onClick={() => setIsProductDrawerOpen(true)}
              className="w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <ShoppingCart className="w-6 h-6" />
            </button>
          )}

          {isHost && (
            <div
              className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center"
              style={{ boxShadow: `0 0 ${micLevel}px ${micLevel / 2}px rgba(255,255,255,0.3)` }}
            >
              {localParticipant?.isMicrophoneEnabled
                ? <Mic className="w-6 h-6 text-white" />
                : <MicOff className="w-6 h-6 text-red-400" />}
            </div>
          )}
        </div>
      </div>

      {/* Floating Hearts */}
      <FloatingHearts />

      {/* Host Product Drawer */}
      {isHost && isProductDrawerOpen && (
        <>
          <div
            onClick={() => setIsProductDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-[120] max-h-[70vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-lg">Products</h2>
                <p className="text-zinc-400 text-sm">Select to pin to stream</p>
              </div>
              <button
                onClick={() => setIsProductDrawerOpen(false)}
                className="p-3 bg-white/5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No products available.</p>
                <p className="text-xs mt-1">Checke SHOPIFY_STORE_DOMAIN in Vercel (muss .myshopify.com sein)</p>
              </div>
            ) : (
              <ProductList
                products={products}
                onPin={handlePinProduct}
                pinnedProductId={pinnedProduct?.id}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
