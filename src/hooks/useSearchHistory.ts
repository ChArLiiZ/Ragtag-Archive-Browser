"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "archive-browser-search-history";
const MAX_HISTORY_ITEMS = 15;

export interface UseSearchHistoryReturn {
  history: string[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

/**
 * 搜尋歷史 Hook
 * 使用 localStorage 儲存搜尋記錄
 */
export function useSearchHistory(
  maxItems: number = MAX_HISTORY_ITEMS
): UseSearchHistoryReturn {
  const [history, setHistory] = useLocalStorage<string[]>(STORAGE_KEY, []);

  // 新增搜尋記錄
  const addToHistory = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setHistory((prev) => {
        // 移除重複的（如果有的話）
        const filtered = prev.filter(
          (item) => item.toLowerCase() !== trimmed.toLowerCase()
        );
        // 新的放在最前面
        return [trimmed, ...filtered].slice(0, maxItems);
      });
    },
    [maxItems, setHistory]
  );

  // 移除單一記錄
  const removeFromHistory = useCallback(
    (query: string) => {
      setHistory((prev) =>
        prev.filter((item) => item.toLowerCase() !== query.toLowerCase())
      );
    },
    [setHistory]
  );

  // 清除所有記錄
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
