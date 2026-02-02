"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { VideoGrid } from "@/components/video/VideoGrid";
import {
  getChannelVideos,
  getChannelAvatarUrl,
} from "@/lib/api";
import type { VideoMetadata, SortField, SortOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp } from "lucide-react";

const PAGE_SIZE = 20;

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.id as string;

  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [channelName, setChannelName] = useState<string>("");
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortField>("upload_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getChannelVideos(channelId, {
        sort,
        sortOrder,
        from: (page - 1) * PAGE_SIZE,
        size: PAGE_SIZE,
      });

      setVideos(response.hits.hits.map((hit) => hit._source));
      setTotalCount(response.hits.total.value);

      // 從第一個影片取得頻道名稱
      if (response.hits.hits.length > 0) {
        setChannelName(response.hits.hits[0]._source.channel_name);
      }
    } catch (err) {
      console.error("Failed to fetch channel videos:", err);
      setError("載入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [channelId, sort, sortOrder, page]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleSortChange = (newSort: SortField) => {
    setSort(newSort);
    setPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const avatarUrl = getChannelAvatarUrl(channelId);

  return (
    <div className="container-custom py-8">
      {/* 頻道資訊 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-28 w-28">
              <AvatarImage src={avatarUrl} alt={channelName || "頻道"} />
              <AvatarFallback className="text-2xl">
                {channelName?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {channelName || "載入中..."}
              </h1>
              <p className="text-muted-foreground">
                {totalCount.toLocaleString()} 部影片
              </p>
              <p className="text-muted-foreground/60 text-sm mt-1 font-mono">{channelId}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 排序選項 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 mb-6"
      >
        <span className="text-muted-foreground">排序:</span>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "upload_date" as SortField, label: "上傳日期" },
            { value: "archived_timestamp" as SortField, label: "存檔時間" },
            { value: "view_count" as SortField, label: "觀看次數" },
            { value: "duration" as SortField, label: "時長" },
          ].map((option) => (
            <Button
              key={option.value}
              variant={sort === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleSortOrder}
          className="ml-auto"
          title={sortOrder === "desc" ? "降序" : "升序"}
        >
          {sortOrder === "desc" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </motion.div>

      {/* 影片列表 */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchVideos} className="mt-4">
            重試
          </Button>
        </Card>
      ) : (
        <>
          <VideoGrid videos={videos} loading={loading} />

          {/* 分頁 */}
          {totalPages > 1 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center gap-2 mt-8"
            >
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                上一頁
              </Button>

              <span className="px-4 py-2 text-muted-foreground">
                第 {page} 頁 / 共 {totalPages} 頁
              </span>

              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                下一頁
              </Button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
