"use client";

import { useState, useMemo, useCallback } from "react";
import type { VideoMetadata } from "@/lib/types";
import { getThumbnailUrl, getFallbackThumbnailUrls } from "@/lib/api";

// 預設的佔位圖片
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect fill='%231a1a2e' width='320' height='180'/%3E%3Ctext fill='%234a4a5a' font-family='Arial' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Thumbnail%3C/text%3E%3C/svg%3E";

export interface UseThumbnailFallbackReturn {
    currentThumbnailUrl: string;
    handleImageError: () => void;
}

/**
 * 縮圖 fallback 邏輯 hook
 * 當縮圖載入失敗時自動切換到下一個備選 URL
 */
export function useThumbnailFallback(video: VideoMetadata): UseThumbnailFallbackReturn {
    // 建立所有可能的縮圖 URL（包含主要和備選方案）
    const allThumbnailUrls = useMemo(() => {
        const primaryUrl = getThumbnailUrl(video.video_id, video.drive_base, video.files);
        const fallbackUrls = getFallbackThumbnailUrls(video.video_id, video.drive_base, video.files);
        // 確保主要 URL 在最前面，並過濾重複
        return [primaryUrl, ...fallbackUrls.filter(url => url !== primaryUrl)];
    }, [video.video_id, video.drive_base, video.files]);

    const [urlIndex, setUrlIndex] = useState(0);
    const [hasError, setHasError] = useState(false);

    const handleImageError = useCallback(() => {
        if (urlIndex < allThumbnailUrls.length - 1) {
            // 還有備用 URL，嘗試下一個
            setUrlIndex((prev) => prev + 1);
        } else {
            // 所有 URL 都失敗了，顯示佔位圖片
            setHasError(true);
        }
    }, [urlIndex, allThumbnailUrls.length]);

    const currentThumbnailUrl = hasError
        ? PLACEHOLDER_IMAGE
        : allThumbnailUrls[urlIndex];

    return { currentThumbnailUrl, handleImageError };
}
