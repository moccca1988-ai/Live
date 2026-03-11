"use client";

import { motion, AnimatePresence } from "motion/react";
import { ShopifyProduct } from "@/lib/shopify";
import { X, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

interface CheckoutDrawerProps {
  product: ShopifyProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CheckoutDrawer({ product, isOpen, onClose }: CheckoutDrawerProps) {
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    if (product && !selectedVariantId) {
      setSelectedVariantId(product.variantId);
    }
  }, [product, selectedVariantId]);

  if (!product) return null;

  const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "jayjaym.com";
  const checkoutUrl = `https://${shopDomain}/cart/${selectedVariantId}:1`;
  const hasVariants = product.variants && product.variants.length > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-[70] p-6 border-t border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Checkout</h2>
              <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
                <Image src={product.imageUrl} alt={product.title} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-white font-semibold text-lg line-clamp-2">{product.title}</h3>
                <p className="text-emerald-400 font-bold text-xl mt-1">{product.price} {product.currency}</p>
              </div>
            </div>

            {hasVariants && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Select Option</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 text-white text-base rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                >
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id} className="text-black">
                      {variant.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-xl text-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Proceed to Checkout
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
