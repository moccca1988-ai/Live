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
    if (product.variants && product.variants.length > 0) {
      const firstAvailable = product.variants.find(v => v.availableForSale && v.inventoryQuantity > 0);
      return firstAvailable ? firstAvailable.id : product.variants[0].id;
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
    }, 6000);
    return () => clearTimeout(timer);
  }, [product.id]);

  const hasVariants = product.variants && product.variants.length > 1;
  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
  const isSelectedSoldOut = selectedVariant
    ? (!selectedVariant.availableForSale || selectedVariant.inventoryQuantity === 0)
    : false;
  const isCompletelySoldOut =
    product.variants?.every(v => !v.availableForSale || v.inventoryQuantity === 0) ||
    inventoryCount === 0;

  // Build direct checkout URL - jayjaym.com has valid SSL, no bypass needed
  const storeDomain = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "jayjaym.com")
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  const checkoutUrl = product.handle
    ? `https://${storeDomain}/products/${product.handle}?variant=${selectedVariantId}`
    : `https://${storeDomain}/search?q=${encodeURIComponent(product.title)}`;

  const handlePurchase = () => {
    if (!selectedVariantId || isSelectedSoldOut) return;

    // Send tracking event to host
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "TRACK_SALE", price: product.price })
    );
    sendSales(payload, { reliable: true });

    // Direct link open - SSL is valid, Cloudflare bypass no longer needed
    window.open(checkoutUrl, '_blank');
  };

  const renderInventoryBadge = () => {
    if (inventoryCount === null || inventoryCount >= 5) return null;
    return (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-px-3 py-1 rounded-full shadow-lg">
        {isCompletelySoldOut ? "Sold Out!" : `Only ${inventoryCount} left!`}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isExpanded ? (
        <motion.div
          key="expanded"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          className="relative bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 w-64 shadow-2xl border border-white/10"
        >
          {/* Drawer Handle */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-6 right-6 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {renderInventoryBadge()}

          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Featured</p>

          <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-zinc-800">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{product.title}</h3>
          <p className="text-emerald-400 font-bold text-base mb-3">
            {product.price} {product.currency}
          </p>

          {hasVariants && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <p className="w-full text-xs text-zinc-400 mb-1">Select Size</p>
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
          )}

          {isSelectedSoldOut ? (
            <button
              disabled
              className="w-full py-3 rounded-xl bg-zinc-700 text-zinc-500 font-bold text-sm cursor-not-allowed"
            >
              Sold Out
            </button>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={hasVariants && !selectedVariantId}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              {hasVariants && !selectedVariantId ? "Bitte Variante wählen" : "Jetzt verbindlich kaufen"}
            </button>
          )}

          {isHost && (
            <button
              onClick={onUnpin}
              className="mt-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-colors"
            >
              Unpin product
            </button>
          )}
        </motion.div>
      ) : (
        <motion.button
          key="collapsed"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          onClick={() => setIsExpanded(true)}
          className="relative bg-zinc-900/80 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 shadow-2xl border border-white/10 max-w-[200px]"
        >
          {renderInventoryBadge()}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-left">
            <p className="text-white text-xs font-semibold line-clamp-2">{product.title}</p>
            <p className="text-emerald-400 font-bold text-sm">{product.price} {product.currency}</p>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
