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
  const [pageInputValue, setPageInputValue] = useState(String(page));

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

  // 同步頁碼輸入框的值
  useEffect(() => {
    setPageInputValue(String(page));
  }, [page]);

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
              className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8"
            >
              {/* 頁碼按鈕區 */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateParams({ page: String(page - 1) })}
                  disabled={page <= 1}
                >
                  上一頁
                </Button>

                {/* 第一頁 */}
                {page > 3 && (
                  <>
                    <Button
                      variant={page === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateParams({ page: "1" })}
                    >
                      1
                    </Button>
                    {page > 4 && <span className="px-2 text-muted-foreground">...</span>}
                  </>
                )}

                {/* 顯示當前頁附近的頁碼 */}
                {Array.from({ length: 5 }, (_, i) => {
                  const pageNum = page - 2 + i;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  if (page > 3 && pageNum === 1) return null; // 已經顯示第一頁
                  if (page < totalPages - 2 && pageNum === totalPages) return null; // 最後一頁單獨顯示
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateParams({ page: String(pageNum) })}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                {/* 最後一頁 */}
                {page < totalPages - 2 && (
                  <>
                    {page < totalPages - 3 && <span className="px-2 text-muted-foreground">...</span>}
                    <Button
                      variant={page === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateParams({ page: String(totalPages) })}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateParams({ page: String(page + 1) })}
                  disabled={page >= totalPages}
                >
                  下一頁
                </Button>
              </div>

              {/* 直接跳轉輸入 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">跳至</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  className="w-16 h-8 px-2 text-center border rounded-md bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const targetPage = Math.max(1, Math.min(totalPages, parseInt(pageInputValue) || 1));
                      updateParams({ page: String(targetPage) });
                    }
                  }}
                  onBlur={() => {
                    const targetPage = Math.max(1, Math.min(totalPages, parseInt(pageInputValue) || 1));
                    if (targetPage !== page) {
                      updateParams({ page: String(targetPage) });
                    } else {
                      // 如果輸入無效值，重置為當前頁碼
                      setPageInputValue(String(page));
                    }
                  }}
                />
                <span className="text-muted-foreground">頁 / 共 {totalPages} 頁</span>
              </div>
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
