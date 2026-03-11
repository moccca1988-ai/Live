"use client";

import { useState, useEffect } from "react";
import { ShopifyProduct } from "@/lib/shopify";
import { X, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useDataChannel } from "@livekit/components-react";

interface PinnedProductProps {
  product: ShopifyProduct;
  isHost: boolean;
  onUnpin: () => void;
  inventoryCount: number | null;
}

export function PinnedProduct({
  product,
  isHost,
  onUnpin,
  inventoryCount,
}: PinnedProductProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [prevProductId, setPrevProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    if (product.variants && product.variants.length === 1) {
      return product.variants[0].id;
    }
    return "";
  });

  if (product.id !== prevProductId) {
    setIsExpanded(true);
    setPrevProductId(product.id);
  }

  const { send: sendSales } = useDataChannel("sales-tracking");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 6000); // Give viewers 6 seconds before minimizing
    return () => clearTimeout(timer);
  }, [product.id]);

  const hasVariants = product.variants && product.variants.length > 1;
  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
  const isSelectedSoldOut = selectedVariant ? (!selectedVariant.availableForSale || selectedVariant.inventoryQuantity === 0) : false;
  const isCompletelySoldOut = product.variants?.every(v => !v.availableForSale || v.inventoryQuantity === 0) || inventoryCount === 0;

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedVariantId || isSelectedSoldOut) return;

    // Send tracking event to host
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "TRACK_SALE", price: product.price })
    );
    sendSales(payload, { reliable: true });

    // Open checkout
    window.open(`https://jayjaym.com/cart/${selectedVariantId}:1`, "_blank");
  };

  const renderInventoryBadge = () => {
    if (inventoryCount === null || inventoryCount >= 5) return null;
    return (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-pulse border border-red-400 z-10">
        {isCompletelySoldOut ? "Sold Out!" : `Only ${inventoryCount} left!`}
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {isExpanded ? (
        <motion.div
          key="expanded"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none flex flex-col justify-end"
        >
          <div className="bg-zinc-950/95 backdrop-blur-3xl border-t border-white/10 p-6 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] w-full pointer-events-auto flex flex-col relative pb-10">
            {/* Drawer Handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
            
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-6 right-6 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {renderInventoryBadge()}
            
            <div className="flex gap-4 items-start mb-6">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/5">
                <Image
                  src={product.imageUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">{product.title}</h3>
                <p className="text-emerald-400 font-black text-xl">
                  {product.price} {product.currency}
                </p>
              </div>
            </div>

            {hasVariants && (
              <div className="w-full mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold">Select Size</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSoldOut = !variant.availableForSale || variant.inventoryQuantity === 0;
                    const isSelected = selectedVariantId === variant.id;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        disabled={isSoldOut}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]"
                            : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                        } ${isSoldOut ? "opacity-30 cursor-not-allowed" : ""}`}
                      >
                        {variant.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isSelectedSoldOut ? (
              <button
                disabled
                className="w-full bg-zinc-800 text-zinc-500 py-4 px-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                Sold Out
              </button>
            ) : (
              <button
                onClick={handleBuy}
                disabled={hasVariants && !selectedVariantId}
                className={`w-full py-4 px-4 rounded-2xl text-base font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                  hasVariants && !selectedVariantId
                    ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-[1.02]"
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {hasVariants && !selectedVariantId ? "Bitte Variante wählen" : "Jetzt verbindlich kaufen"}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="minimized"
          initial={{ opacity: 0, scale: 0.8, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: -20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute bottom-4 left-4 pointer-events-auto cursor-pointer group"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/20 p-1.5 pr-4 rounded-2xl shadow-2xl hover:bg-black/70 transition-all hover:scale-105 active:scale-95 relative">
            {renderInventoryBadge()}
            
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-white font-bold text-[11px] truncate max-w-[100px]">
                {product.title}
              </h3>
              <p className="text-emerald-400 font-black text-xs mt-0.5">
                {product.price} {product.currency}
              </p>
            </div>

            <div className="ml-2 bg-white/10 rounded-full p-1.5 group-hover:bg-white/20 transition-colors">
              <ShoppingCart className="w-3 h-3 text-white" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
