"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Search, Trash2, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchSuggestionsProps {
  isOpen: boolean;
  history: string[];
  currentQuery: string;
  onSelect: (query: string) => void;
  onRemoveHistory: (query: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

// 熱門搜尋關鍵字（靜態資料，可根據需要從 API 取得）
const POPULAR_SEARCHES = [
  "hololive",
  "歌回",
  "雜談",
  "Minecraft",
  "ASMR",
  "karaoke",
  "cover",
  "歌枠",
];

export function SearchSuggestions({
  isOpen,
  history,
  currentQuery,
  onSelect,
  onRemoveHistory,
  onClearHistory,
  onClose,
}: SearchSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // 過濾符合的歷史記錄
  const filteredHistory = currentQuery
    ? history.filter((item) =>
        item.toLowerCase().includes(currentQuery.toLowerCase())
      )
    : history;

  // 過濾符合的熱門搜尋
  const filteredPopular = currentQuery
    ? POPULAR_SEARCHES.filter(
        (item) =>
          item.toLowerCase().includes(currentQuery.toLowerCase()) &&
          !filteredHistory.some(
            (h) => h.toLowerCase() === item.toLowerCase()
          )
      )
    : POPULAR_SEARCHES.filter(
        (item) =>
          !history.some((h) => h.toLowerCase() === item.toLowerCase())
      );

  // 所有建議項目
  const allSuggestions = [
    ...filteredHistory.map((item) => ({ type: "history" as const, value: item })),
    ...filteredPopular.map((item) => ({ type: "popular" as const, value: item })),
  ];

  // 鍵盤導航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < allSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : allSuggestions.length - 1
          );
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
            e.preventDefault();
            onSelect(allSuggestions[selectedIndex].value);
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, allSuggestions, onSelect, onClose]);

  // 重置選擇索引當建議變更時
  useEffect(() => {
    setSelectedIndex(-1);
  }, [currentQuery]);

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || allSuggestions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden z-50"
      >
        {/* 歷史記錄區塊 */}
        {filteredHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                最近搜尋
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearHistory();
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                清除全部
              </Button>
            </div>
            <ul className="py-1">
              {filteredHistory.map((item, index) => (
                <li key={`history-${item}`}>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => onSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{item}</span>
                    <button
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistory(item);
                      }}
                      title="移除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 熱門搜尋區塊 */}
        {filteredPopular.length > 0 && (
          <div>
            {filteredHistory.length > 0 && <div className="border-t" />}
            <div className="px-3 py-2 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                熱門搜尋
              </span>
            </div>
            <ul className="py-1">
              {filteredPopular.map((item, index) => {
                const actualIndex = filteredHistory.length + index;
                return (
                  <li key={`popular-${item}`}>
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        selectedIndex === actualIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => onSelect(item)}
                      onMouseEnter={() => setSelectedIndex(actualIndex)}
                    >
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
