import { useState, useEffect, useCallback } from "react";

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
  const [history, setHistory] = useState<string[]>([]);

  // 從 localStorage 載入歷史記錄
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, maxItems));
        }
      }
    } catch (err) {
      console.error("Failed to load search history:", err);
    }
  }, [maxItems]);

  // 儲存到 localStorage
  const saveHistory = useCallback((newHistory: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (err) {
      console.error("Failed to save search history:", err);
    }
  }, []);

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
        const newHistory = [trimmed, ...filtered].slice(0, maxItems);
        saveHistory(newHistory);
        return newHistory;
      });
    },
    [maxItems, saveHistory]
  );

  // 移除單一記錄
  const removeFromHistory = useCallback(
    (query: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter(
          (item) => item.toLowerCase() !== query.toLowerCase()
        );
        saveHistory(newHistory);
        return newHistory;
      });
    },
    [saveHistory]
  );

  // 清除所有記錄
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear search history:", err);
    }
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
