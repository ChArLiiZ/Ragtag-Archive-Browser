"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Playlist, PlaylistItem } from "@/lib/types";
import { getPlaylistItems } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

interface UsePlaylistNavigationOptions {
    videoId: string;
    playlistId: string | null;
}

interface UsePlaylistNavigationReturn {
    playlist: Playlist | null;
    playlistItems: PlaylistItem[];
    currentIndex: number;
    shuffleMode: boolean;
    restartMode: boolean;
    showPlaylistPanel: boolean;
    setShowPlaylistPanel: (show: boolean) => void;
    toggleShuffle: () => void;
    playNextVideo: () => void;
    playPrevVideo: () => void;
}

/**
 * 播放清單導航 Hook
 * 處理播放清單載入、上下一部、隨機播放等邏輯
 */
export function usePlaylistNavigation({
    videoId,
    playlistId,
}: UsePlaylistNavigationOptions): UsePlaylistNavigationReturn {
    const router = useRouter();
    const searchParams = useSearchParams();
    const shuffleMode = searchParams.get("shuffle") === "true";
    const restartMode = searchParams.get("restart") === "true";

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [showPlaylistPanel, setShowPlaylistPanel] = useState(true);
    const [playedIndices, setPlayedIndices] = useState<Set<number>>(new Set());

    // 載入播放清單資料
    useEffect(() => {
        let cancelled = false;

        async function fetchPlaylist() {
            if (!playlistId) return;

            try {
                const { data: playlistData } = await supabase
                    .from("playlists")
                    .select("*")
                    .eq("id", playlistId)
                    .single();

                if (cancelled) return;
                if (playlistData) {
                    setPlaylist(playlistData);
                }

                const items = await getPlaylistItems(playlistId);
                if (cancelled) return;

                setPlaylistItems(items || []);

                const index = items?.findIndex((item) => item.video_id === videoId) ?? -1;
                setCurrentIndex(index);
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch playlist:", err);
                }
            }
        }

        fetchPlaylist();

        return () => {
            cancelled = true;
        };
    }, [playlistId, videoId]);

    // 切換播放清單時重置已播放記錄
    useEffect(() => {
        setPlayedIndices(new Set());
    }, [playlistId]);

    // 切換隨機模式
    const toggleShuffle = useCallback(() => {
        const newShuffleMode = !shuffleMode;
        const params = new URLSearchParams(searchParams.toString());
        if (newShuffleMode) {
            params.set("shuffle", "true");
        } else {
            params.delete("shuffle");
        }
        const queryString = params.toString();
        router.push(`/watch/${videoId}${queryString ? `?${queryString}` : ""}`);
    }, [searchParams, router, videoId, shuffleMode]);

    // 播放下一部
    const playNextVideo = useCallback(() => {
        if (playlistItems.length === 0) return;

        let nextIndex: number;
        if (shuffleMode) {
            const newPlayedIndices = new Set(playedIndices);
            if (currentIndex >= 0) {
                newPlayedIndices.add(currentIndex);
            }

            const availableIndices = playlistItems
                .map((_, i) => i)
                .filter((i) => !newPlayedIndices.has(i));

            if (availableIndices.length === 0) {
                const resetIndices = playlistItems
                    .map((_, i) => i)
                    .filter((i) => i !== currentIndex);
                if (resetIndices.length === 0) return;
                nextIndex = resetIndices[Math.floor(Math.random() * resetIndices.length)];
                setPlayedIndices(new Set([currentIndex]));
            } else {
                nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                setPlayedIndices(newPlayedIndices);
            }
        } else {
            nextIndex = currentIndex + 1;
            if (nextIndex >= playlistItems.length) {
                nextIndex = 0;
            }
        }

        const nextItem = playlistItems[nextIndex];
        if (nextItem) {
            const restartParam = restartMode ? "&restart=true" : "";
            router.push(`/watch/${nextItem.video_id}?playlist=${playlistId}${shuffleMode ? "&shuffle=true" : ""}${restartParam}`);
        }
    }, [playlistItems, currentIndex, shuffleMode, playedIndices, playlistId, router, restartMode]);

    // 播放上一部
    const playPrevVideo = useCallback(() => {
        if (playlistItems.length === 0 || currentIndex <= 0) return;

        const prevItem = playlistItems[currentIndex - 1];
        if (prevItem) {
            const restartParam = restartMode ? "&restart=true" : "";
            router.push(`/watch/${prevItem.video_id}?playlist=${playlistId}${shuffleMode ? "&shuffle=true" : ""}${restartParam}`);
        }
    }, [playlistItems, currentIndex, shuffleMode, playlistId, router, restartMode]);

    return {
        playlist,
        playlistItems,
        currentIndex,
        shuffleMode,
        restartMode,
        showPlaylistPanel,
        setShowPlaylistPanel,
        toggleShuffle,
        playNextVideo,
        playPrevVideo,
    };
}
