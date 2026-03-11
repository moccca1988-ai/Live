"use client";

import { useState, useRef, useEffect } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatOverlayProps {
  isHost: boolean;
}

export function ChatOverlay({ isHost }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { localParticipant } = useLocalParticipant();

  const { send } = useDataChannel("chat", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "CHAT_MESSAGE") {
        setMessages((prev) => [...prev, data.message].slice(-50));
      }
    } catch (e) {
      console.error("Failed to parse chat message", e);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !localParticipant) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: isHost ? "Host" : localParticipant.identity,
      text: inputText.trim(),
      timestamp: Date.now(),
    };

    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "CHAT_MESSAGE", message: newMessage }),
    );
    send(payload, { reliable: true });

    // Optimistically add to local state
    setMessages((prev) => [...prev, newMessage].slice(-50));
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full w-full pointer-events-auto">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide flex flex-col justify-end">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="flex flex-col group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {msg.sender}
                </span>
                <span className="text-[9px] text-zinc-600 font-medium">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-white bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl rounded-tl-none w-fit shadow-sm group-hover:bg-white/10 transition-colors">
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="relative flex items-center mt-auto">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something nice..."
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-2xl py-4 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 placeholder:text-zinc-600 transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="absolute right-2 p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-0 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
