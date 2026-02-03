"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { VideoGrid } from "@/components/video/VideoGrid";
import { searchVideos } from "@/lib/api";
import type { VideoMetadata, SortField, SortOrder } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "relevance", label: "相關性" },
  { value: "archived_timestamp", label: "存檔時間" },
  { value: "upload_date", label: "上傳日期" },
  { value: "view_count", label: "觀看次數" },
  { value: "duration", label: "影片時長" },
  { value: "like_count", label: "按讚數" },
];

const PAGE_SIZE = 20;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";

  // 如果有搜尋關鍵字，預設使用相關性排序，否則使用存檔時間
  const defaultSort = query ? "relevance" : "archived_timestamp";
  const sort = (searchParams.get("sort") as SortField) || defaultSort;
  const sortOrder = (searchParams.get("sort_order") as SortOrder) || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await searchVideos({
        query: query || undefined,
        sort,
        sortOrder,
        from: (page - 1) * PAGE_SIZE,
        size: PAGE_SIZE,
      });

      setVideos(response.hits.hits.map((hit) => hit._source));
      setTotalCount(response.hits.total.value);
    } catch (err) {
      console.error("Search failed:", err);
      setError("搜尋失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [query, sort, sortOrder, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // 更改排序時重置到第一頁
    if (updates.sort || updates.sort_order) {
      params.set("page", "1");
    }
    router.push(`/search?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="container-custom py-8">
      {/* 搜尋標題和篩選 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {query ? `搜尋: ${query}` : "所有影片"}
            </h1>
            {!loading && (
              <p className="text-muted-foreground mt-1">
                找到 {totalCount.toLocaleString()} 個結果
              </p>
            )}
          </div>

          {/* 排序選項 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">排序:</span>
            <Select value={sort} onValueChange={(value) => updateParams({ sort: value })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="選擇排序" />
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
                updateParams({ sort_order: sortOrder === "desc" ? "asc" : "desc" })
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
        </div>
      </motion.div>

      {/* 結果 */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchResults} className="mt-4">
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
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1}
              >
                上一頁
              </Button>

              <span className="px-4 py-2 text-muted-foreground">
                第 {page} 頁 / 共 {totalPages} 頁
              </span>

              <Button
                variant="outline"
                onClick={() => updateParams({ page: String(page + 1) })}
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

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container-custom py-8">
          <div className="animate-pulse">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-4 w-1/4 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video" />
                  <div className="space-y-2">
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
