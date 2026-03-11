"use client";

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
import { ShopifyProduct } from "@/lib/shopify";
import { useState, useEffect } from "react";
import { PinnedProduct } from "./PinnedProduct";
import { ProductList } from "./ProductList";
import { ChatOverlay } from "./ChatOverlay";
import { FloatingHearts } from "./FloatingHearts";
import { CheckoutDrawer } from "./CheckoutDrawer";
import { getProductInventory } from "@/app/actions/inventory";
import { Users, Heart, DollarSign, Video } from "lucide-react";

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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
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

  const { send } = useDataChannel("product-pin", (msg) => {
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

  useEffect(() => {
    if (!pinnedProduct) {
      setInventoryCount(null);
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
    send(payload, { reliable: true });
  };

  const handleUnpinProduct = () => {
    setPinnedProduct(null);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "UNPIN_PRODUCT" }),
    );
    send(payload, { reliable: true });
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
        <div className="p-4 flex flex-col gap-3 bg-gradient-to-b from-black/60 to-transparent">
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
              <div className="bg-black/40 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-white/10">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white text-xs font-bold">$3.4k</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Hearts Overlay */}
        <FloatingHearts isHost={isHost} />

        {/* Middle Section: Pinned Product */}
        {pinnedProduct && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <PinnedProduct
              product={pinnedProduct}
              isHost={isHost}
              onUnpin={handleUnpinProduct}
              onBuyClick={() => setIsCheckoutOpen(true)}
              inventoryCount={inventoryCount}
            />
          </div>
        )}

        {/* Bottom Section: Chat & Host Controls */}
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-6 px-4 pointer-events-auto flex flex-col justify-end">
          <div className="h-48 flex flex-col justify-end mb-4">
            <ChatOverlay isHost={isHost} />
          </div>

          {isHost && (
            <div className="mt-2 border-t border-white/10 pt-4">
              <ProductList
                products={products}
                onPin={handlePinProduct}
                pinnedProductId={pinnedProduct?.id}
              />
            </div>
          )}
        </div>
      </div>

      <CheckoutDrawer 
        product={pinnedProduct} 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </div>
  );
}
