"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useCallback } from "react";
import type { VideoMetadata } from "@/lib/types";
import { Heart, ListVideo } from "lucide-react";
import {
  getThumbnailUrl,
  getFallbackThumbnailUrls,
  formatDuration,
  formatViewCount,
  formatUploadDate,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoCardProps {
  video: VideoMetadata;
  index?: number;
  watchProgress?: { progress: number; duration: number };
  userLibrary?: { favorites: Set<string>; playlistItems: Set<string> };
}

// 預設的佔位圖片（灰色背景）
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect fill='%231a1a2e' width='320' height='180'/%3E%3Ctext fill='%234a4a5a' font-family='Arial' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Thumbnail%3C/text%3E%3C/svg%3E";

export function VideoCard({ video, index = 0, watchProgress, userLibrary }: VideoCardProps) {
  const router = useRouter();

  // 使用從 props 傳入的 userLibrary，避免每個卡片都呼叫 hook
  const isFavorited = userLibrary?.favorites.has(video.video_id) ?? false;
  const isInPlaylist = userLibrary?.playlistItems.has(video.video_id) ?? false;

  // 計算觀看進度百分比
  const progressPercent = watchProgress && watchProgress.duration > 0
    ? (watchProgress.progress / watchProgress.duration) * 100
    : 0;

  // 取得所有可能的縮圖 URL
  const allThumbnailUrls = useMemo(() => {
    const primaryUrl = getThumbnailUrl(video.video_id, video.drive_base, video.files);
    const fallbackUrls = getFallbackThumbnailUrls(video.video_id, video.drive_base, video.files);
    // 確保主要 URL 在最前面，並過濾重複
    const urls = [primaryUrl, ...fallbackUrls.filter(url => url !== primaryUrl)];
    return urls;
  }, [video.video_id, video.drive_base, video.files]);

  // 追蹤目前使用的縮圖 URL 索引
  const [urlIndex, setUrlIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // 目前顯示的縮圖 URL
  const currentThumbnailUrl = hasError ? PLACEHOLDER_IMAGE : allThumbnailUrls[urlIndex];

  // 處理圖片載入錯誤
  const handleImageError = useCallback(() => {
    if (urlIndex < allThumbnailUrls.length - 1) {
      // 還有備用 URL，嘗試下一個
      setUrlIndex(prev => prev + 1);
    } else {
      // 所有 URL 都失敗了，顯示佔位圖片
      setHasError(true);
    }
  }, [urlIndex, allThumbnailUrls.length]);

  const handleChannelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/channel/${video.channel_id}`);
  };

  return (
    <div className="animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
      <Link href={`/watch/${video.video_id}`} className="group block">
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card/50 backdrop-blur">
          {/* 縮圖容器 */}
          <div className="relative aspect-video overflow-hidden bg-muted">
            <img
              src={currentThumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={handleImageError}
            />
            {/* 時長標籤 */}
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs font-medium text-white z-10">
              {formatDuration(video.duration)}
            </div>

            {/* 狀態圖示 */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
              {isFavorited && (
                <div className="bg-black/70 p-1 rounded text-red-500" title="已收藏">
                  <Heart className="w-3 h-3 fill-current" />
                </div>
              )}
              {isInPlaylist && (
                <div className="bg-black/70 p-1 rounded text-primary" title="已加入播放清單">
                  <ListVideo className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* 觀看進度條 */}
            {progressPercent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                <div
                  className="h-full bg-red-600"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* 影片資訊 */}
          <CardContent className="p-3">
            {/* 標題 */}
            <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>

            {/* 頻道名稱 */}
            <span
              onClick={handleChannelClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {video.channel_name}
            </span>

            {/* 統計資訊 */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formatViewCount(video.view_count)} 次觀看</span>
              <span>•</span>
              <span>{formatUploadDate(video.upload_date)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

// 骨架載入元件
export function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video rounded-none" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </CardContent>
    </Card>
  );
}
