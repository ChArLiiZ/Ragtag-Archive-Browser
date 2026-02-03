"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getWatchProgressBatch } from "@/lib/supabase";

export type WatchProgressMap = Map<string, { progress: number; duration: number }>;

interface UseWatchProgressBatchOptions {
    videoIds: string[];
    enabled?: boolean;
}

/**
 * 批次載入多個影片的觀看進度
 * 用於在影片卡片上顯示進度條
 */
export function useWatchProgressBatch({
    videoIds,
    enabled = true,
}: UseWatchProgressBatchOptions) {
    const { user } = useAuth();
    const [progressMap, setProgressMap] = useState<WatchProgressMap>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 快取已載入的進度，避免重複請求
    const cacheRef = useRef<WatchProgressMap>(new Map());
    const loadedIdsRef = useRef<Set<string>>(new Set());

    const loadProgress = useCallback(async () => {
        if (!user || !enabled || videoIds.length === 0) {
            return;
        }

        // 過濾出還沒載入過的影片 ID
        const newIds = videoIds.filter((id) => !loadedIdsRef.current.has(id));

        if (newIds.length === 0) {
            // 所有 ID 都已經載入過，直接使用快取
            setProgressMap(new Map(cacheRef.current));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getWatchProgressBatch(user.id, newIds);

            // 合併到快取
            data.forEach((value, key) => {
                cacheRef.current.set(key, value);
            });

            // 記錄已載入的 ID
            newIds.forEach((id) => loadedIdsRef.current.add(id));

            // 更新狀態
            setProgressMap(new Map(cacheRef.current));
        } catch (err) {
            console.error("Failed to load watch progress batch:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [user, videoIds, enabled]);

    useEffect(() => {
        loadProgress();
    }, [loadProgress]);

    // 取得特定影片的進度百分比
    const getProgressPercent = useCallback(
        (videoId: string): number => {
            const data = progressMap.get(videoId);
            if (!data || data.duration <= 0) return 0;
            return (data.progress / data.duration) * 100;
        },
        [progressMap]
    );

    // 重新載入（清除快取）
    const reload = useCallback(() => {
        cacheRef.current.clear();
        loadedIdsRef.current.clear();
        loadProgress();
    }, [loadProgress]);

    return {
        progressMap,
        loading,
        error,
        getProgressPercent,
        reload,
    };
}
