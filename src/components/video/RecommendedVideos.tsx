"use client";

import { useMemo } from "react";
import type { VideoMetadata } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchProgressBatch } from "@/hooks/useWatchProgressBatch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RecommendedVideoCard,
  RecommendedVideoCardSkeleton,
} from "./RecommendedVideoCard";
import { useRecommendedVideos } from "@/hooks/useRecommendedVideos";

interface RecommendedVideosProps {
  currentVideo: VideoMetadata;
}

export function RecommendedVideos({ currentVideo }: RecommendedVideosProps) {
  const { user } = useAuth();

  // 使用 React Query Hook 獲取推薦影片 (包含快取)
  const { data: recommendedVideos = [], isLoading: loading } = useRecommendedVideos(currentVideo);

  // 取得推薦影片的 ID 列表
  const videoIds = useMemo(
    () => recommendedVideos.map((v) => v.video_id),
    [recommendedVideos]
  );

  // 批次載入觀看進度
  const { progressMap } = useWatchProgressBatch({
    videoIds,
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">推薦影片</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          // 骨架載入
          Array.from({ length: 6 }).map((_, i) => (
            <RecommendedVideoCardSkeleton key={i} />
          ))
        ) : recommendedVideos.length > 0 ? (
          recommendedVideos.map((video) => (
            <RecommendedVideoCard
              key={video.video_id}
              video={video}
              watchProgress={progressMap.get(video.video_id)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            沒有推薦影片
          </p>
        )}
      </CardContent>
    </Card>
  );
}
