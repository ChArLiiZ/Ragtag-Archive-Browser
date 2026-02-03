"use client";

import { useMemo } from "react";
import type { VideoMetadata } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchProgressBatch } from "@/hooks/useWatchProgressBatch";
import { useUserLibrary } from "@/hooks/useUserLibrary";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";

interface VideoGridProps {
  videos: VideoMetadata[];
  loading?: boolean;
  skeletonCount?: number;
}

export function VideoGrid({
  videos,
  loading = false,
  skeletonCount = 12,
}: VideoGridProps) {
  const { user } = useAuth();

  // 取得所有影片 ID
  const videoIds = useMemo(
    () => videos.map((v) => v.video_id),
    [videos]
  );

  // 批次載入觀看進度（只在登入時啟用）
  const { progressMap } = useWatchProgressBatch({
    videoIds,
    enabled: !!user,
  });

  // 載入用戶收藏/播放清單狀態（只呼叫一次，避免每個卡片重複呼叫）
  const { favorites, playlistItems } = useUserLibrary();
  const userLibrary = useMemo(
    () => ({ favorites, playlistItems }),
    [favorites, playlistItems]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-400">沒有找到影片</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video, index) => (
        <VideoCard
          key={video.video_id}
          video={video}
          index={index}
          watchProgress={progressMap.get(video.video_id)}
          userLibrary={userLibrary}
        />
      ))}
    </div>
  );
}
