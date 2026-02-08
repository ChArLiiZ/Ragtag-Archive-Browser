"use client";

import { memo } from "react";

import Link from "next/link";
import type { VideoMetadata } from "@/lib/types";
import { useUserLibrary } from "@/hooks/useUserLibrary";
import { useThumbnailFallback } from "@/hooks/useThumbnailFallback";
import { Heart, ListVideo } from "lucide-react";
import { formatDuration, formatViewCount } from "@/lib/api";

interface RecommendedVideoCardProps {
    video: VideoMetadata;
    watchProgress?: { progress: number; duration: number };
}

/**
 * 緊湊型影片卡片，用於推薦區塊
 */
export const RecommendedVideoCard = memo(function RecommendedVideoCard({
    video,
    watchProgress,
}: RecommendedVideoCardProps) {
    const { favorites, playlistItems } = useUserLibrary();
    const isFavorited = favorites.has(video.video_id);
    const isInPlaylist = playlistItems.has(video.video_id);

    // 計算觀看進度百分比
    const progressPercent =
        watchProgress && watchProgress.duration > 0
            ? (watchProgress.progress / watchProgress.duration) * 100
            : 0;

    // 使用縮圖 fallback hook
    const { currentThumbnailUrl, handleImageError } = useThumbnailFallback(video);

    return (
        <Link
            href={`/watch/${video.video_id}`}
            className="flex gap-3 group hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors"
        >
            {/* 縮圖 */}
            <div className="relative w-28 shrink-0">
                <div className="aspect-video rounded overflow-hidden bg-muted">
                    <img
                        src={currentThumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                    />
                    {/* 時長標籤 */}
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[10px] font-medium text-white z-10">
                        {formatDuration(video.duration)}
                    </div>

                    {/* 狀態圖示 */}
                    <div className="absolute top-1 right-1 flex flex-col gap-0.5 z-10">
                        {isFavorited && (
                            <div className="bg-black/70 p-0.5 rounded text-red-500">
                                <Heart className="w-2.5 h-2.5 fill-current" />
                            </div>
                        )}
                        {isInPlaylist && (
                            <div className="bg-black/70 p-0.5 rounded text-primary">
                                <ListVideo className="w-2.5 h-2.5" />
                            </div>
                        )}
                    </div>

                    {/* 觀看進度條 */}
                    {progressPercent > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/50">
                            <div
                                className="h-full bg-red-600"
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 資訊 */}
            <div className="flex-1 min-w-0 py-0.5">
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {video.channel_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {formatViewCount(video.view_count)} 次觀看
                </p>
            </div>
        </Link>
    );
});

RecommendedVideoCard.displayName = "RecommendedVideoCard";

/**
 * 推薦影片骨架載入
 */
export function RecommendedVideoCardSkeleton() {
    return (
        <div className="flex gap-3 p-2 -mx-2">
            <div className="w-28 shrink-0">
                <div className="aspect-video rounded bg-muted animate-pulse" />
            </div>
            <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
            </div>
        </div>
    );
}
