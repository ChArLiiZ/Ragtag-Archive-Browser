"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorited,
} from "@/lib/supabase";
import { getThumbnailUrl } from "@/lib/api";
import type { Favorite, VideoMetadata } from "@/lib/types";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入收藏列表
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getFavorites(user.id);
      setFavorites(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load favorites:", err);
      setError("載入收藏失敗");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // 新增收藏
  const add = useCallback(
    async (video: VideoMetadata) => {
      if (!user) return false;

      try {
        const newFavorite = await addFavorite(
          user.id,
          video.video_id,
          video.title,
          video.channel_name,
          getThumbnailUrl(video.video_id)
        );
        setFavorites((prev) => [newFavorite, ...prev]);
        return true;
      } catch (err) {
        console.error("Failed to add favorite:", err);
        return false;
      }
    },
    [user]
  );

  // 移除收藏
  const remove = useCallback(
    async (videoId: string) => {
      if (!user) return false;

      try {
        await removeFavorite(user.id, videoId);
        setFavorites((prev) => prev.filter((f) => f.video_id !== videoId));
        return true;
      } catch (err) {
        console.error("Failed to remove favorite:", err);
        return false;
      }
    },
    [user]
  );

  // 切換收藏狀態
  const toggle = useCallback(
    async (video: VideoMetadata) => {
      const isFav = favorites.some((f) => f.video_id === video.video_id);
      if (isFav) {
        return remove(video.video_id);
      } else {
        return add(video);
      }
    },
    [favorites, add, remove]
  );

  // 檢查是否已收藏
  const checkIsFavorited = useCallback(
    (videoId: string) => {
      return favorites.some((f) => f.video_id === videoId);
    },
    [favorites]
  );

  return {
    favorites,
    loading,
    error,
    add,
    remove,
    toggle,
    isFavorited: checkIsFavorited,
    refresh: loadFavorites,
  };
}
