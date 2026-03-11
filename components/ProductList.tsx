"use client";

import { ShopifyProduct } from "@/lib/shopify";
import { Pin, PinOff, AlertCircle } from "lucide-react";
import Image from "next/image";

interface ProductListProps {
  products: ShopifyProduct[];
  onPin: (product: ShopifyProduct) => void;
  pinnedProductId?: string;
}

export function ProductList({
  products,
  onPin,
  pinnedProductId,
}: ProductListProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
      {products.map((product) => {
        const isPinned = product.id === pinnedProductId;
        const totalInventory = product.variants?.reduce((sum, v) => sum + (v.inventoryQuantity || 0), 0) || 0;
        const isLowStock = totalInventory > 0 && totalInventory < 3;
        const isSoldOut = totalInventory === 0;

        return (
          <div
            key={product.id}
            className={`relative flex-shrink-0 w-36 bg-zinc-900/80 backdrop-blur-md rounded-xl border ${
              isPinned
                ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
                : "border-white/10"
            } p-2 snap-center transition-all`}
          >
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              {isSoldOut ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-red-500/80 px-2 py-1 rounded">Sold Out</span>
                </div>
              ) : isLowStock ? (
                <div className="absolute top-1 right-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-lg shadow-red-500/50 border border-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {totalInventory} left
                </div>
              ) : null}
            </div>
            <h4 className="text-white text-xs font-medium truncate">
              {product.title}
            </h4>
            <p className="text-emerald-400 text-[10px] font-bold mt-0.5">
              {product.price} {product.currency}
            </p>

            <button
              onClick={() => onPin(product)}
              className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
                isPinned
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isPinned ? (
                <>
                  <PinOff className="w-3 h-3" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="w-3 h-3" />
                  Pin
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
