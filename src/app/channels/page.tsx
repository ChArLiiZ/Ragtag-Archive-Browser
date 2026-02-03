"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { searchVideos, getChannelAvatarUrl } from "@/lib/api";
import type { ChannelInfo, VideoMetadata } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Video, ChevronDown, ChevronUp, Eye } from "lucide-react";

type SortOption = "video_count" | "name" | "latest";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "video_count", label: "影片數量" },
  { value: "latest", label: "最近更新" },
  { value: "name", label: "頻道名稱" },
];

const PAGE_SIZE = 24;

/**
 * 從影片列表聚合頻道資訊
 */
function aggregateChannels(videos: VideoMetadata[]): ChannelInfo[] {
  const channelMap = new Map<string, ChannelInfo>();

  videos.forEach((video) => {
    const existing = channelMap.get(video.channel_id);
    if (existing) {
      existing.video_count++;
      existing.total_views = (existing.total_views || 0) + (video.view_count || 0);
      // 更新最新影片日期
      if (video.upload_date > (existing.latest_video_date || "")) {
        existing.latest_video_date = video.upload_date;
      }
    } else {
      channelMap.set(video.channel_id, {
        channel_id: video.channel_id,
        channel_name: video.channel_name,
        video_count: 1,
        latest_video_date: video.upload_date,
        total_views: video.view_count || 0,
      });
    }
  });

  return Array.from(channelMap.values());
}

/**
 * 排序頻道
 */
function sortChannels(
  channels: ChannelInfo[],
  sort: SortOption,
  order: "asc" | "desc"
): ChannelInfo[] {
  const sorted = [...channels].sort((a, b) => {
    switch (sort) {
      case "video_count":
        return b.video_count - a.video_count;
      case "latest":
        return (b.latest_video_date || "").localeCompare(a.latest_video_date || "");
      case "name":
        return a.channel_name.localeCompare(b.channel_name, "zh-TW");
      default:
        return 0;
    }
  });

  return order === "asc" ? sorted.reverse() : sorted;
}

function ChannelsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as SortOption) || "video_count";
  const sortOrder = (searchParams.get("order") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [allChannels, setAllChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query);

  // 取得頻道列表
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 取得大量影片以聚合頻道資訊
      // 由於 API 沒有直接的頻道列表端點，我們需要這樣做
      const response = await searchVideos({
        sort: "archived_timestamp",
        sortOrder: "desc",
        size: 1000, // 取得足夠多的影片來覆蓋大部分頻道
      });

      const videos = response.hits.hits.map((hit) => hit._source);
      const channels = aggregateChannels(videos);
      setAllChannels(channels);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
      setError("載入頻道列表失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // 篩選和排序頻道
  const filteredChannels = useMemo(() => {
    let result = allChannels;

    // 搜尋過濾
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (channel) =>
          channel.channel_name.toLowerCase().includes(lowerQuery) ||
          channel.channel_id.toLowerCase().includes(lowerQuery)
      );
    }

    // 排序
    return sortChannels(result, sort, sortOrder);
  }, [allChannels, query, sort, sortOrder]);

  // 分頁
  const totalPages = Math.ceil(filteredChannels.length / PAGE_SIZE);
  const paginatedChannels = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredChannels.slice(start, start + PAGE_SIZE);
  }, [filteredChannels, page]);

  // 更新 URL 參數
  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // 搜尋或排序變更時重置頁碼
    if ("q" in updates || "sort" in updates || "order" in updates) {
      params.set("page", "1");
    }
    router.push(`/channels?${params.toString()}`);
  };

  // 處理搜尋
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput });
  };

  return (
    <div className="container-custom py-8">
      {/* 標題和搜尋 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              頻道列表
            </h1>
            {!loading && (
              <p className="text-muted-foreground mt-1">
                共 {filteredChannels.length} 個頻道
              </p>
            )}
          </div>

          {/* 搜尋框 */}
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜尋頻道..."
                className="pl-10"
              />
            </div>
            <Button type="submit">搜尋</Button>
          </form>
        </div>

        {/* 排序選項 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">排序:</span>
          <Select value={sort} onValueChange={(value) => updateParams({ sort: value })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              updateParams({ order: sortOrder === "desc" ? "asc" : "desc" })
            }
            title={sortOrder === "desc" ? "降序" : "升序"}
          >
            {sortOrder === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* 錯誤狀態 */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchChannels}>重試</Button>
        </Card>
      )}

      {/* 載入狀態 */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 頻道列表 */}
      {!loading && !error && (
        <>
          {paginatedChannels.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {query ? `找不到符合「${query}」的頻道` : "沒有頻道資料"}
              </p>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {paginatedChannels.map((channel, index) => (
                <motion.div
                  key={channel.channel_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link href={`/channel/${channel.channel_id}`}>
                    <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer h-full">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={getChannelAvatarUrl(channel.channel_id)}
                            alt={channel.channel_name}
                          />
                          <AvatarFallback className="text-lg">
                            {channel.channel_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate" title={channel.channel_name}>
                            {channel.channel_name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {channel.video_count} 部影片
                            </span>
                          </div>
                          {channel.total_views !== undefined && channel.total_views > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Eye className="h-3 w-3" />
                              {formatViewCount(channel.total_views)} 總觀看
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1}
              >
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                第 {page} / {totalPages} 頁
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: String(page + 1) })}
                disabled={page >= totalPages}
              >
                下一頁
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * 格式化觀看次數
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

export default function ChannelsPage() {
  return (
    <Suspense
      fallback={
        <div className="container-custom py-8">
          <div className="animate-pulse">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ChannelsContent />
    </Suspense>
  );
}
