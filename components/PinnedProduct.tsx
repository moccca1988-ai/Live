"use client";

import { useState, useEffect } from "react";
import { ShopifyProduct } from "@/lib/shopify";
import { X, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

interface PinnedProductProps {
  product: ShopifyProduct;
  isHost: boolean;
  onUnpin: () => void;
  onBuyClick: () => void;
  inventoryCount: number | null;
}

export function PinnedProduct({
  product,
  isHost,
  onUnpin,
  onBuyClick,
  inventoryCount,
}: PinnedProductProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsExpanded(true);
    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [product.id, product.variantId]);

  const hasVariants = product.variants && product.variants.length > 1;

  const renderInventoryBadge = () => {
    if (inventoryCount === null || inventoryCount >= 5) return null;
    return (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-pulse border border-red-400 z-10">
        {inventoryCount === 0 ? "Sold Out!" : `Only ${inventoryCount} left!`}
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {isExpanded ? (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
        >
          <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-5 rounded-3xl shadow-2xl w-full max-w-[320px] pointer-events-auto flex flex-col items-center text-center relative">
            {renderInventoryBadge()}
            {isHost && (
              <button
                onClick={onUnpin}
                className="absolute top-4 right-4 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="relative w-40 h-40 rounded-2xl overflow-hidden mb-4 shadow-xl">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{product.title}</h3>
            <p className="text-emerald-400 font-black text-xl mb-4">
              {product.price} {product.currency}
            </p>

            {!isHost && (
              <button
                onClick={onBuyClick}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-xl text-base font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {hasVariants ? "Select Option" : "Buy Now"}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="minimized"
          initial={{ opacity: 0, scale: 0.8, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`absolute right-4 pointer-events-auto cursor-pointer ${isHost ? 'bottom-48' : 'bottom-24'}`}
          onClick={() => !isHost && setIsExpanded(true)}
        >
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/20 p-2 pr-4 rounded-2xl shadow-2xl max-w-[220px] hover:bg-black/70 transition-colors relative">
            {renderInventoryBadge()}
            {isHost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin();
                }}
                className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 hover:bg-zinc-700 transition-colors shadow-lg border border-white/10 z-10"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-xs truncate">
                {product.title}
              </h3>
              <p className="text-emerald-400 font-bold text-sm mt-0.5">
                {product.price} {product.currency}
              </p>
              {!isHost && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuyClick();
                  }}
                  className="mt-1.5 flex items-center justify-center gap-1.5 w-full bg-emerald-500 text-white py-1 px-2 rounded-lg text-[10px] font-bold shadow-lg shadow-emerald-500/20"
                >
                  <ShoppingCart className="w-3 h-3" />
                  {hasVariants ? "Options" : "Buy"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
