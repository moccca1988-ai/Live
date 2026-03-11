"use client";

import { ShopifyProduct } from "@/lib/shopify";
import { Pin, PinOff } from "lucide-react";
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
