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
  const [estimatedSales, setEstimatedSales] = useState<number>(0);
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
  
  // Mic Level Indicator Logic
  const [micLevel, setMicLevel] = useState(0);
  useEffect(() => {
    if (!isHost || !localParticipant) return;
    
    const interval = setInterval(() => {
      // LiveKit audioLevel is 0-1
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
    setIsProductDrawerOpen(false); // Close drawer on pin
  };

  const handleUnpinProduct = () => {
    setPinnedProduct(null);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "UNPIN_PRODUCT" }),
    );
    sendPin(payload, { reliable: true });
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Video Background Anker */}
      <div className="fixed inset-0 z-0 bg-zinc-900 flex items-center justify-center">
        {hostTrack && hostTrack.publication ? (
          <VideoTrack
            trackRef={hostTrack}
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 relative overflow-hidden">
            <Image 
              src="https://picsum.photos/seed/stream-bg/1920/1080?blur=10" 
              alt="Coming Soon" 
              fill 
              className="object-cover opacity-30"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-zinc-900/80 border-2 border-emerald-500/50 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(52,211,153,0.2)] backdrop-blur-xl">
                <Video className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Coming Soon</h2>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <p className="text-zinc-300 font-bold text-xs uppercase tracking-widest">Host is preparing the stage</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Layer */}
      <div className="relative z-10 h-full w-full pointer-events-none flex flex-col">
        {/* Top Bar: Stats & Badges */}
        <div className="p-4 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse shadow-lg flex items-center gap-1 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              Live
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-black/40 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-xl">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="font-bold">{viewerCount}</span>
              </div>
              {isHost && (
                <div className="bg-black/40 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-xl">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="font-bold">${estimatedSales.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-xl">
            <Heart className="w-3 h-3 text-pink-400" />
            <span className="font-bold">8.4k</span>
          </div>
        </div>

        {/* Middle Area: Pinned Product */}
        <div className="flex-1 flex items-center justify-center">
          {pinnedProduct && (
            <div className="w-full max-w-md px-4 pointer-events-auto">
              <PinnedProduct
                product={pinnedProduct}
                isHost={isHost}
                onUnpin={handleUnpinProduct}
                inventoryCount={inventoryCount}
              />
            </div>
          )}
        </div>

        {/* Bottom Area: Chat & Controls */}
        <div className="p-4 flex items-end justify-between gap-4">
          {/* Chat Overlay - Floating Bottom Left */}
          <div className="w-full max-w-[320px] h-[300px] bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden pointer-events-auto flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <ChatOverlay isHost={isHost} />
            </div>
          </div>

          {/* Host Controls / Product Trigger */}
          <div className="flex flex-col gap-3 pointer-events-auto">
            {isHost && (
              <button
                onClick={() => setIsProductDrawerOpen(true)}
                className="w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <ShoppingCart className="w-6 h-6" />
              </button>
            )}
            {!isHost && (
              <button className="w-12 h-12 bg-pink-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-transform">
                <Heart className="w-6 h-6 fill-current" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Hearts Layer */}
      <div className="fixed inset-0 pointer-events-none z-20">
        <FloatingHearts isHost={isHost} />
      </div>

      {/* Host Product Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {isHost && isProductDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductDrawerOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-zinc-950 border-t border-white/10 rounded-t-[40px] z-[120] max-h-[85vh] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-5 shrink-0" />
              
              <div className="px-8 pb-6 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-white font-black text-2xl tracking-tight">Products</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Select to pin to stream</p>
                </div>
                <button
                  onClick={() => setIsProductDrawerOpen(false)}
                  className="p-3 bg-white/5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
                {products.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 font-bold">No products available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {products.map((product) => {
                      const isPinned = product.id === pinnedProduct?.id;
                      return (
                        <div key={product.id} className={`flex items-center gap-5 p-5 rounded-[24px] border transition-all ${
                          isPinned 
                            ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        }`}>
                          <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/5">
                            <Image src={product.imageUrl} alt={product.title} fill className="object-cover" />
                            {isPinned && (
                              <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">Pinned</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-base truncate mb-1">{product.title}</h4>
                            <p className="text-emerald-400 font-black text-lg">{product.price} {product.currency}</p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {isPinned ? (
                              <button
                                onClick={handleUnpinProduct}
                                className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                              >
                                Unpin
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePinProduct(product)}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
