"use client";

import { useEffect, useState, useMemo } from "react";
import type { VideoMetadata } from "@/lib/types";
import {
    searchVideos,
    getChannelVideos,
    getPopularVideos,
    extractKeywords,
} from "@/lib/api";
import { getFavorites } from "@/lib/supabase";
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
 * 推薦影片元件
 * 混合策略：同頻道 + 關鍵字搜尋 + 熱門影片 + 收藏頻道
 */
export function RecommendedVideos({ currentVideo }: RecommendedVideosProps) {
    const { user } = useAuth();
    const [recommendedVideos, setRecommendedVideos] = useState<VideoMetadata[]>(
        []
    );
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

            try {
                // 平行請求各推薦來源
                const [channelResult, keywordResult, popularResult, favoritesResult] =
                    await Promise.allSettled([
                        // 1. 同頻道影片 (6 部)
                        getChannelVideos(currentVideo.channel_id, {
                            sort: "upload_date",
                            sortOrder: "desc",
                            size: 7,
                        }),

                        // 2. 標題關鍵字搜尋 (4 部)
                        (async () => {
                            const keywords = extractKeywords(currentVideo.title);
                            if (!keywords) return null;
                            return searchVideos({
                                query: keywords,
                                size: 5,
                                sort: "view_count",
                                sortOrder: "desc",
                            });
                        })(),

                        // 3. 熱門影片 (3 部)
                        getPopularVideos(4),

                        // 4. 收藏頻道推薦 (登入用戶)
                        (async () => {
                            if (!user) return null;
                            const favorites = await getFavorites(user.id);
                            if (!favorites || favorites.length === 0) return null;

                            // 從收藏中取得不同頻道
                            const channelIds = new Set<string>();
                            favorites.forEach((fav) => {
                                // 從 thumbnail_url 提取 channel_id（備用方案）
                                // 或者我們需要儲存 channel_id
                            });

                            // 目前收藏沒有 channel_id，改用隨機熱門
                            return getPopularVideos(3);
                        })(),
                    ]);

                // 處理同頻道結果
                if (channelResult.status === "fulfilled" && channelResult.value) {
                    const videos = channelResult.value.hits.hits
                        .map((h) => h._source)
                        .filter((v) => !seenIds.has(v.video_id));
                    videos.slice(0, 6).forEach((v) => {
                        allVideos.push(v);
                        seenIds.add(v.video_id);
                    });
                }

                // 處理關鍵字結果
                if (keywordResult.status === "fulfilled" && keywordResult.value) {
                    const videos = keywordResult.value.hits.hits
                        .map((h) => h._source)
                        .filter((v) => !seenIds.has(v.video_id));
                    videos.slice(0, 4).forEach((v) => {
                        allVideos.push(v);
                        seenIds.add(v.video_id);
                    });
                }

                // 處理熱門結果
                if (popularResult.status === "fulfilled" && popularResult.value) {
                    const videos = popularResult.value.hits.hits
                        .map((h) => h._source)
                        .filter((v) => !seenIds.has(v.video_id));
                    videos.slice(0, 3).forEach((v) => {
                        allVideos.push(v);
                        seenIds.add(v.video_id);
                    });
                }

                // 處理收藏頻道結果
                if (favoritesResult.status === "fulfilled" && favoritesResult.value) {
                    const videos = favoritesResult.value.hits.hits
                        .map((h) => h._source)
                        .filter((v) => !seenIds.has(v.video_id));
                    videos.slice(0, 3).forEach((v) => {
                        allVideos.push(v);
                        seenIds.add(v.video_id);
                    });
                }

                // 限制最多 12 部
                setRecommendedVideos(allVideos.slice(0, 12));
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
