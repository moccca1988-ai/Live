"use client";

import { ShopifyProduct } from "@/lib/shopify";
import { useState, useEffect } from "react";
import { PinnedProduct } from "./PinnedProduct";
import { ProductList } from "./ProductList";
import { ChatOverlay } from "./ChatOverlay";
import { FloatingHearts } from "./FloatingHearts";
import { getProductInventory } from "@/app/actions/inventory";
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

  useEffect(() => {
    if (!pinnedProduct) return;
    const fetchInventory = async () => {
      const count = await getProductInventory(pinnedProduct.id);
      setInventoryCount(count);
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
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* === VIDEO BACKGROUND: Fullscreen fixed === */}
      <div className="fixed inset-0 w-full h-full z-0">
        {hostTrack && hostTrack.publication ? (
          <VideoTrack
            trackRef={hostTrack}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
            <Video className="w-16 h-16 text-zinc-700 mb-4" />
            <h2 className="text-zinc-500 text-xl font-semibold">Coming Soon</h2>
            <p className="text-zinc-600 text-sm mt-2">Host is preparing the stage</p>
          </div>
        )}
      </div>

      {/* === OVERLAY LAYER: All UI on top of video === */}
      <div className="relative z-10 w-full h-full flex flex-col">

        {/* Top Bar: Stats & Badges */}
        <div className="flex items-center gap-2 p-4">
          <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Live</span>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" />
            <span>{viewerCount}</span>
          </div>
          {isHost && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-emerald-400 text-xs px-3 py-1.5 rounded-full">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${estimatedSales.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>8.4k</span>
          </div>
        </div>

        {/* Middle: Pinned Product */}
        <div className="flex-1 flex">
          <div className="p-4 flex flex-col justify-center">
            {pinnedProduct && (
              <PinnedProduct
                product={pinnedProduct}
                isHost={isHost}
                onUnpin={handleUnpinProduct}
                inventoryCount={inventoryCount}
              />
            )}
          </div>
          <div className="flex-1" />
        </div>

        {/* Bottom Area: Chat & Controls */}
        <div className="p-4 flex items-end gap-3">
          <div className="flex-1">
            <ChatOverlay isHost={isHost} />
          </div>

          {isHost && (
            <button
              onClick={() => setIsProductDrawerOpen(true)}
              className="w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <ShoppingCart className="w-6 h-6" />
            </button>
          )}

          {!isHost && (
            <FloatingHearts isHost={isHost} />
          )}
        </div>
      </div>

      {/* Host Product Drawer */}
      {isHost && isProductDrawerOpen && (
        <>
          <div
            onClick={() => setIsProductDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]"
          />
          <div className="fixed bottom-0 left-0 right-0 z-[120] bg-zinc-950 rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white text-xl font-black">Products</h2>
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
              <p className="text-zinc-500 text-sm text-center py-8">No products available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const isPinned = product.id === pinnedProduct?.id;
                  return (
                    <div
                      key={product.id}
                      className={`relative rounded-2xl overflow-hidden border ${
                        isPinned ? "border-emerald-500" : "border-white/10"
                      } bg-zinc-900`}
                    >
                      {isPinned && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">Pinned</span>
                      )}
                      <div className="relative w-full h-32 bg-zinc-800">
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="text-white text-xs font-semibold line-clamp-2 mb-1">{product.title}</h4>
                        <p className="text-emerald-400 font-bold text-sm mb-2">{product.price} {product.currency}</p>
                        {isPinned ? (
                          <button
                            onClick={handleUnpinProduct}
                            className="w-full px-3 py-2 bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
                          >
                            Unpin
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePinProduct(product)}
                            className="w-full px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                          >
                            Pin
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
