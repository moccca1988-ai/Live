"use client";

import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useDataChannel } from "@livekit/components-react";

export function FloatingHearts({ isHost }: { isHost: boolean }) {
  const [hearts, setHearts] = useState<{ id: number; x: number; targetX: number }[]>([]);
  const addHeartRef = useRef<(broadcast?: boolean) => void>(() => {});

  const { send } = useDataChannel("hearts", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "HEART") {
        addHeartRef.current(false);
      }
    } catch (e) {
      // ignore
    }
  });

  const addHeart = useCallback((broadcast = true) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 40 - 20; // Random horizontal offset
    const targetX = x + (Math.random() * 40 - 20);
    setHearts((prev) => [...prev, { id, x, targetX }]);

    if (broadcast) {
      const payload = new TextEncoder().encode(JSON.stringify({ type: "HEART" }));
      send(payload, { reliable: false });
    }

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  }, [send]);

  useEffect(() => {
    addHeartRef.current = addHeart;
  }, [addHeart]);

  return (
    <>
      <div className="absolute bottom-32 right-4 w-16 h-64 pointer-events-none z-40 flex justify-center">
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 1, y: 0, x: h.x, scale: 0.5 }}
              animate={{ opacity: 0, y: -300, x: h.targetX, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute bottom-0"
            >
              <Heart className="w-8 h-8 text-red-500 fill-red-500 drop-shadow-lg" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!isHost && (
        <button
          onClick={() => addHeart(true)}
          className="absolute bottom-28 right-4 z-50 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 hover:bg-black/60 transition-colors shadow-lg active:scale-90"
        >
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        </button>
      )}
    </>
  );
}
