"use client";

import { useEffect, useState, useMemo } from "react";
import type { VideoMetadata } from "@/lib/types";
import {
  searchVideos,
  getChannelVideos,
  getPopularVideos,
  extractKeywords,
} from "@/lib/api";
import {
  getUserPreferredChannels,
  getRecentWatchedChannels,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchProgressBatch } from "@/hooks/useWatchProgressBatch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RecommendedVideoCard,
  RecommendedVideoCardSkeleton,
} from "./RecommendedVideoCard";

interface RecommendedVideosProps {
  currentVideo: VideoMetadata;
}

/**
 * 推薦來源類型
 */
type RecommendationSource =
  | "same_channel"      // 同頻道
  | "keyword"           // 關鍵字相關
  | "user_preferred"    // 用戶喜好頻道
  | "recent_watched"    // 最近觀看的頻道
  | "popular";          // 熱門影片

/**
 * 推薦影片配額設定
 */
interface RecommendationQuota {
  source: RecommendationSource;
  count: number;
  // 是否需要登入
  requiresAuth: boolean;
}

/**
 * 已登入用戶的推薦配額
 */
const LOGGED_IN_QUOTAS: RecommendationQuota[] = [
  { source: "same_channel", count: 4, requiresAuth: false },
  { source: "user_preferred", count: 3, requiresAuth: true },
  { source: "keyword", count: 3, requiresAuth: false },
  { source: "recent_watched", count: 2, requiresAuth: true },
];

/**
 * 未登入用戶的推薦配額
 */
const GUEST_QUOTAS: RecommendationQuota[] = [
  { source: "same_channel", count: 5, requiresAuth: false },
  { source: "keyword", count: 4, requiresAuth: false },
  { source: "popular", count: 3, requiresAuth: false },
];

const MAX_RECOMMENDATIONS = 12;

/**
 * 推薦影片元件
 *
 * 改進的推薦策略：
 *
 * 【已登入用戶】
 * 1. 同頻道影片 (4部) - 保持頻道關聯性
 * 2. 用戶喜好頻道 (3部) - 基於收藏和觀看歷史分析
 * 3. 關鍵字相關 (3部) - 改進的關鍵字提取
 * 4. 最近觀看頻道 (2部) - 基於觀看歷史
 *
 * 【未登入用戶】
 * 1. 同頻道影片 (5部)
 * 2. 關鍵字相關 (4部)
 * 3. 熱門影片 (3部)
 */
export function RecommendedVideos({ currentVideo }: RecommendedVideosProps) {
  const { user } = useAuth();
  const [recommendedVideos, setRecommendedVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      const allVideos: VideoMetadata[] = [];
      const seenIds = new Set<string>([currentVideo.video_id]);
      const quotas = user ? LOGGED_IN_QUOTAS : GUEST_QUOTAS;

      /**
       * 輔助函數：將影片加入推薦列表
       */
      const addVideos = (
        videos: VideoMetadata[],
        maxCount: number
      ): number => {
        let added = 0;
        for (const video of videos) {
          if (added >= maxCount) break;
          if (!seenIds.has(video.video_id)) {
            allVideos.push(video);
            seenIds.add(video.video_id);
            added++;
          }
        }
        return added;
      };

      try {
        // 收集所有 Promise
        const fetchPromises: Promise<{
          source: RecommendationSource;
          videos: VideoMetadata[];
        }>[] = [];

        for (const quota of quotas) {
          if (quota.requiresAuth && !user) continue;

          switch (quota.source) {
            case "same_channel":
              fetchPromises.push(
                getChannelVideos(currentVideo.channel_id, {
                  sort: "upload_date",
                  sortOrder: "desc",
                  size: quota.count + 2, // 多取幾部以防重複
                }).then((res) => ({
                  source: quota.source,
                  videos: res.hits.hits.map((h) => h._source),
                })).catch(() => ({ source: quota.source, videos: [] }))
              );
              break;

            case "keyword":
              fetchPromises.push(
                (async () => {
                  const keywords = extractKeywords(currentVideo.title);
                  if (!keywords) return { source: quota.source, videos: [] };
                  const res = await searchVideos({
                    query: keywords,
                    size: quota.count + 3,
                    sort: "view_count",
                    sortOrder: "desc",
                  });
                  return {
                    source: quota.source,
                    videos: res.hits.hits.map((h) => h._source),
                  };
                })().catch(() => ({ source: quota.source, videos: [] }))
              );
              break;

            case "user_preferred":
              if (!user) break;
              fetchPromises.push(
                (async () => {
                  const preferredChannels = await getUserPreferredChannels(
                    user.id,
                    5
                  );
                  if (preferredChannels.length === 0) {
                    return { source: quota.source, videos: [] };
                  }

                  // 從喜好頻道中各取一部最新影片
                  const channelPromises = preferredChannels
                    .filter((c) => c.channelId !== currentVideo.channel_id)
                    .slice(0, 3)
                    .map((c) =>
                      getChannelVideos(c.channelId, {
                        sort: "upload_date",
                        sortOrder: "desc",
                        size: 2,
                      }).catch(() => null)
                    );

                  const results = await Promise.all(channelPromises);
                  const videos: VideoMetadata[] = [];
                  results.forEach((res) => {
                    if (res?.hits.hits.length) {
                      videos.push(res.hits.hits[0]._source);
                    }
                  });
                  return { source: quota.source, videos };
                })().catch(() => ({ source: quota.source, videos: [] }))
              );
              break;

            case "recent_watched":
              if (!user) break;
              fetchPromises.push(
                (async () => {
                  const recentChannels = await getRecentWatchedChannels(
                    user.id,
                    currentVideo.channel_id,
                    3
                  );
                  if (recentChannels.length === 0) {
                    return { source: quota.source, videos: [] };
                  }

                  // 從最近觀看的頻道各取一部
                  const channelPromises = recentChannels.map((channelId) =>
                    getChannelVideos(channelId, {
                      sort: "upload_date",
                      sortOrder: "desc",
                      size: 2,
                    }).catch(() => null)
                  );

                  const results = await Promise.all(channelPromises);
                  const videos: VideoMetadata[] = [];
                  results.forEach((res) => {
                    if (res?.hits.hits.length) {
                      videos.push(res.hits.hits[0]._source);
                    }
                  });
                  return { source: quota.source, videos };
                })().catch(() => ({ source: quota.source, videos: [] }))
              );
              break;

            case "popular":
              fetchPromises.push(
                getPopularVideos(quota.count + 2)
                  .then((res) => ({
                    source: quota.source,
                    videos: res.hits.hits.map((h) => h._source),
                  }))
                  .catch(() => ({ source: quota.source, videos: [] }))
              );
              break;
          }
        }

        // 平行執行所有請求
        const results = await Promise.all(fetchPromises);

        // 根據配額順序處理結果
        for (const quota of quotas) {
          const result = results.find((r) => r.source === quota.source);
          if (result) {
            addVideos(result.videos, quota.count);
          }
        }

        // 如果推薦數量不足，用熱門影片補充
        if (allVideos.length < MAX_RECOMMENDATIONS) {
          const remaining = MAX_RECOMMENDATIONS - allVideos.length;
          try {
            const popularRes = await getPopularVideos(remaining + 5);
            const popularVideos = popularRes.hits.hits.map((h) => h._source);
            addVideos(popularVideos, remaining);
          } catch {
            // 忽略補充失敗
          }
        }

        setRecommendedVideos(allVideos.slice(0, MAX_RECOMMENDATIONS));
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setRecommendedVideos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [currentVideo, user]);

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
