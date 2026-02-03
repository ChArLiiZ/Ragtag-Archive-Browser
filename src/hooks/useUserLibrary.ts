"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserLibraryVideoIds } from "@/lib/supabase";

export interface UserLibraryStatus {
    favorites: Set<string>;
    playlistItems: Set<string>;
    loading: boolean;
    refresh: () => Promise<void>;
}

// 全域快取，避免重複請求
let globalCache: {
    favorites: Set<string>;
    playlistItems: Set<string>;
    timestamp: number;
} | null = null;

const CACHE_TTL = 30000; // 30秒快取

export function useUserLibrary(): UserLibraryStatus {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [playlistItems, setPlaylistItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const loadLibrary = useCallback(async (force = false) => {
        if (!user) {
            setFavorites(new Set());
            setPlaylistItems(new Set());
            setLoading(false);
            return;
        }

        const now = Date.now();

        // 使用快取
        if (!force && globalCache && (now - globalCache.timestamp < CACHE_TTL)) {
            setFavorites(globalCache.favorites);
            setPlaylistItems(globalCache.playlistItems);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { favorites: userFavorites, playlistItems: userPlaylistItems } =
                await getUserLibraryVideoIds(user.id);

            setFavorites(userFavorites);
            setPlaylistItems(userPlaylistItems);

            // 更新快取
            globalCache = {
                favorites: userFavorites,
                playlistItems: userPlaylistItems,
                timestamp: now
            };
        } catch (err) {
            console.error("Failed to load user library:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadLibrary();

        // 監聽視窗聚焦，重新驗證資料
        const handleFocus = () => loadLibrary();
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, [loadLibrary]);

    return {
        favorites,
        playlistItems,
        loading,
        refresh: () => loadLibrary(true),
    };
}
