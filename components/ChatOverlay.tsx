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
        setMessages((prev) => [...prev, data.message].slice(-7));
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

    // Optimistically add to local state and limit to 7 messages
    setMessages((prev) => [...prev, newMessage].slice(-7));
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[85%] pointer-events-auto">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide mask-image-to-top flex flex-col justify-end">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col"
            >
              <span className="text-xs font-bold text-white/70 drop-shadow-md mb-0.5 ml-1">
                {msg.sender}
              </span>
              <span className="text-sm text-white bg-black/30 backdrop-blur-md px-3 py-2 rounded-2xl rounded-tl-sm w-fit shadow-sm border border-white/5">
                {msg.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="relative flex items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-sm rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/60 shadow-lg"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="absolute right-1.5 p-1.5 bg-white/20 text-white rounded-full hover:bg-white/30 disabled:opacity-0 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
