"use client";

import { memo } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VideoMetadata } from "@/lib/types";
import { Heart, ListVideo } from "lucide-react";
import { formatDuration, formatViewCount, formatUploadDate } from "@/lib/api";
import { useThumbnailFallback } from "@/hooks/useThumbnailFallback";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoCardProps {
  video: VideoMetadata;
  index?: number;
  watchProgress?: { progress: number; duration: number };
  userLibrary?: { favorites: Set<string>; playlistItems: Set<string> };
}

export const VideoCard = memo(function VideoCard({ video, index = 0, watchProgress, userLibrary }: VideoCardProps) {
  const router = useRouter();

  // 使用從 props 傳入的 userLibrary，避免每個卡片都呼叫 hook
  const isFavorited = userLibrary?.favorites.has(video.video_id) ?? false;
  const isInPlaylist = userLibrary?.playlistItems.has(video.video_id) ?? false;

  // 計算觀看進度百分比
  const progressPercent = watchProgress && watchProgress.duration > 0
    ? (watchProgress.progress / watchProgress.duration) * 100
    : 0;

  // 使用縮圖 fallback hook
  const { currentThumbnailUrl, handleImageError } = useThumbnailFallback(video);

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
});

VideoCard.displayName = "VideoCard";

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
