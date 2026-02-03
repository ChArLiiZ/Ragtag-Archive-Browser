import { useQuery } from "@tanstack/react-query";
import type { VideoMetadata } from "@/lib/types";
import {
    searchVideos,
    getChannelVideos,
    extractKeywords,
} from "@/lib/api";
import {
    getUserPreferredChannels,
    getRecentWatchedChannels,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { shuffleArray } from "@/lib/utils";

/**
 * 推薦來源類型
 */
type RecommendationSource =
    | "same_channel"      // 同頻道
    | "keyword"           // 關鍵字相關
    | "user_preferred"    // 用戶喜好頻道
    | "recent_watched";   // 最近觀看的頻道

/**
 * 推薦影片配額設定
 */
interface RecommendationQuota {
    source: RecommendationSource;
    count: number;
    requiresAuth: boolean;
}

const LOGGED_IN_QUOTAS: RecommendationQuota[] = [
    { source: "same_channel", count: 5, requiresAuth: false },
    { source: "user_preferred", count: 3, requiresAuth: true },
    { source: "keyword", count: 3, requiresAuth: false },
    { source: "recent_watched", count: 2, requiresAuth: true },
];

const GUEST_QUOTAS: RecommendationQuota[] = [
    { source: "same_channel", count: 8, requiresAuth: false },
    { source: "keyword", count: 4, requiresAuth: false },
];

const MAX_RECOMMENDATIONS = 12;

export function useRecommendedVideos(currentVideo: VideoMetadata) {
    const { user } = useAuth();
    const quotas = user ? LOGGED_IN_QUOTAS : GUEST_QUOTAS;

    return useQuery({
        queryKey: ['recommendations', currentVideo.video_id, !!user],
        queryFn: async () => {
            const allVideos: VideoMetadata[] = [];
            const seenIds = new Set<string>([currentVideo.video_id]);

            /**
             * 輔助函數：將影片加入推薦列表
             */
            const addVideos = (
                videos: VideoMetadata[],
                maxCount: number
            ): number => {
                let added = 0;
                const shuffledVideos = shuffleArray(videos);

                for (const video of shuffledVideos) {
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
                                    size: 20,
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
                                        size: 20,
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
                                        10
                                    );
                                    if (preferredChannels.length === 0) {
                                        return { source: quota.source, videos: [] };
                                    }

                                    const candidateChannels = preferredChannels
                                        .filter((c) => c.channelId !== currentVideo.channel_id)
                                        .map(c => c.channelId);

                                    const selectedChannels = shuffleArray(candidateChannels).slice(0, 3);

                                    const channelPromises = selectedChannels.map((channelId) =>
                                        getChannelVideos(channelId, {
                                            sort: "upload_date",
                                            sortOrder: "desc",
                                            size: 5,
                                        }).catch(() => null)
                                    );

                                    const results = await Promise.all(channelPromises);
                                    const videos: VideoMetadata[] = [];
                                    results.forEach((res) => {
                                        if (res?.hits.hits.length) {
                                            const randomVideo = shuffleArray(res.hits.hits)[0]._source;
                                            videos.push(randomVideo);
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
                                        10
                                    );
                                    if (recentChannels.length === 0) {
                                        return { source: quota.source, videos: [] };
                                    }

                                    const selectedChannels = shuffleArray(recentChannels).slice(0, 3);

                                    const channelPromises = selectedChannels.map((channelId) =>
                                        getChannelVideos(channelId, {
                                            sort: "upload_date",
                                            sortOrder: "desc",
                                            size: 5,
                                        }).catch(() => null)
                                    );

                                    const results = await Promise.all(channelPromises);
                                    const videos: VideoMetadata[] = [];
                                    results.forEach((res) => {
                                        if (res?.hits.hits.length) {
                                            const randomVideo = shuffleArray(res.hits.hits)[0]._source;
                                            videos.push(randomVideo);
                                        }
                                    });
                                    return { source: quota.source, videos };
                                })().catch(() => ({ source: quota.source, videos: [] }))
                            );
                            break;
                    }
                }

                const results = await Promise.all(fetchPromises);

                for (const quota of quotas) {
                    const result = results.find((r) => r.source === quota.source);
                    if (result) {
                        addVideos(result.videos, quota.count);
                    }
                }

                // 補充不足
                if (allVideos.length < MAX_RECOMMENDATIONS) {
                    const sameChannelResult = results.find(r => r.source === "same_channel");
                    if (sameChannelResult) {
                        const remaining = MAX_RECOMMENDATIONS - allVideos.length;
                        addVideos(sameChannelResult.videos, remaining);
                    }
                }

                return allVideos.slice(0, MAX_RECOMMENDATIONS);
            } catch (err) {
                console.error("Failed to fetch recommendations:", err);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000, // 5分鐘快取
        enabled: !!currentVideo.video_id,
    });
}
