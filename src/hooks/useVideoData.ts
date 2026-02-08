"use client";

import { useState, useEffect, useCallback } from "react";
import type { VideoMetadata } from "@/lib/types";
import { getVideoById, getThumbnailUrl } from "@/lib/api";
import {
    isFavorited,
    addFavorite,
    removeFavorite,
    getWatchProgress,
    updateWatchProgress,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface UseVideoDataOptions {
    videoId: string;
    user: User | null;
    restartMode?: boolean;
}

interface UseVideoDataReturn {
    video: VideoMetadata | null;
    loading: boolean;
    error: string | null;
    isFavorite: boolean;
    favoriteLoading: boolean;
    initialProgress: number;
    progressLoaded: boolean;
    toggleFavorite: () => Promise<void>;
    handleProgressUpdate: (currentTime: number, duration: number) => Promise<void>;
}

/**
 * 影片資料載入 Hook
 * 處理影片載入、收藏狀態和觀看進度
 */
export function useVideoData({
    videoId,
    user,
    restartMode = false,
}: UseVideoDataOptions): UseVideoDataReturn {
    const [video, setVideo] = useState<VideoMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFavoriteState, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [initialProgress, setInitialProgress] = useState(0);
    const [progressLoaded, setProgressLoaded] = useState(false);

    // 載入影片資料
    useEffect(() => {
        async function fetchVideo() {
            try {
                setLoading(true);
                const data = await getVideoById(videoId);
                if (data) {
                    setVideo(data);
                } else {
                    setError("找不到此影片");
                }
            } catch (err) {
                console.error("Failed to fetch video:", err);
                setError("載入失敗，請稍後再試");
            } finally {
                setLoading(false);
            }
        }

        fetchVideo();
    }, [videoId]);

    // 載入收藏狀態和觀看進度
    useEffect(() => {
        let cancelled = false;

        async function loadUserData() {
            if (!user || !videoId) {
                if (!cancelled) {
                    setProgressLoaded(true);
                }
                return;
            }

            try {
                const favorited = await isFavorited(user.id, videoId);
                if (cancelled) return;
                setIsFavorite(favorited);

                if (restartMode) {
                    if (!cancelled) {
                        setInitialProgress(0);
                    }
                } else {
                    const progress = await getWatchProgress(user.id, videoId);
                    if (cancelled) return;
                    if (progress?.progress_seconds) {
                        setInitialProgress(progress.progress_seconds);
                    }
                }
            } catch (err) {
                console.error("Failed to load user data:", err);
            } finally {
                if (!cancelled) {
                    setProgressLoaded(true);
                }
            }
        }

        setProgressLoaded(false);
        setInitialProgress(0);
        loadUserData();

        return () => {
            cancelled = true;
        };
    }, [user, videoId, restartMode]);

    // 切換收藏
    const toggleFavorite = useCallback(async () => {
        if (!user || !video) return;

        setFavoriteLoading(true);
        try {
            if (isFavoriteState) {
                await removeFavorite(user.id, videoId);
                setIsFavorite(false);
            } else {
                await addFavorite(
                    user.id,
                    videoId,
                    video.title,
                    video.channel_id,
                    video.channel_name,
                    getThumbnailUrl(videoId, video.drive_base, video.files)
                );
                setIsFavorite(true);
            }
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
        } finally {
            setFavoriteLoading(false);
        }
    }, [user, video, videoId, isFavoriteState]);

    // 更新觀看進度
    const handleProgressUpdate = useCallback(
        async (currentTime: number, duration: number) => {
            if (!user || !video) return;
            try {
                await updateWatchProgress(
                    user.id,
                    videoId,
                    currentTime,
                    duration,
                    video.title,
                    video.channel_id,
                    video.channel_name,
                    getThumbnailUrl(videoId, video.drive_base, video.files)
                );
            } catch (err) {
                console.error("Failed to update progress:", err);
            }
        },
        [user, videoId, video]
    );

    return {
        video,
        loading,
        error,
        isFavorite: isFavoriteState,
        favoriteLoading,
        initialProgress,
        progressLoaded,
        toggleFavorite,
        handleProgressUpdate,
    };
}
