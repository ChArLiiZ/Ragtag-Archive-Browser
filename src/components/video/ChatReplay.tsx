"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getChatUrl } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, Loader2 } from "lucide-react";

interface ChatReplayProps {
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
}

export function ChatReplay({ videoId, currentTime, isPlaying }: ChatReplayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 載入聊天記錄
  useEffect(() => {
    async function loadChat() {
      try {
        setLoading(true);
        const chatUrl = getChatUrl(videoId);
        const response = await fetch(chatUrl);

        if (!response.ok) {
          throw new Error("聊天記錄不可用");
        }

        const data = await response.json();
        // 根據不同的資料格式處理
        const chatMessages = Array.isArray(data) ? data : data.messages || [];
        setMessages(chatMessages);
      } catch (err) {
        console.error("Failed to load chat:", err);
        setError("無法載入聊天記錄");
      } finally {
        setLoading(false);
      }
    }

    loadChat();
  }, [videoId]);

  // 根據目前時間更新可見訊息
  useEffect(() => {
    if (messages.length === 0) return;

    const visible = messages.filter(
      (msg) => msg.time_in_seconds <= currentTime
    );

    // 只顯示最近的 100 條訊息
    setVisibleMessages(visible.slice(-100));
  }, [messages, currentTime]);

  // 自動捲動到底部
  useEffect(() => {
    if (chatContainerRef.current && isPlaying) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages, isPlaying]);

  if (loading) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">載入聊天記錄中...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* 標題列 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">聊天重播</span>
          <span className="text-sm text-muted-foreground">
            ({messages.length.toLocaleString()} 則訊息)
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 聊天內容 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={chatContainerRef}
              className="h-80 overflow-y-auto p-4 space-y-2"
            >
              {visibleMessages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  等待聊天訊息...
                </p>
              ) : (
                visibleMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm"
                  >
                    {/* 作者頭像和名稱 */}
                    <span className="inline-flex items-center gap-1">
                      {msg.author.images?.[0]?.url && (
                        <img
                          src={msg.author.images[0].url}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className="font-medium text-primary">
                        {msg.author.name}
                      </span>
                      {msg.author.badges?.map((badge, i) => (
                        <span
                          key={i}
                          className="px-1 py-0.5 bg-primary/20 rounded text-xs"
                        >
                          {badge.label}
                        </span>
                      ))}
                    </span>
                    {/* 訊息內容 */}
                    <span className="text-foreground/80 ml-1">{msg.message}</span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
