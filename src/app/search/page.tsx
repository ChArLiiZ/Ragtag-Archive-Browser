"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { VideoGrid } from "@/components/video/VideoGrid";
import { SearchFilters } from "@/components/search/SearchFilters";
import { searchVideos } from "@/lib/api";
import type { VideoMetadata, SortField, SortOrder, SearchFilters as SearchFiltersType } from "@/lib/types";
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
import { Pagination } from "@/components/common";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "relevance", label: "相關性" },
  { value: "archived_timestamp", label: "存檔時間" },
  { value: "upload_date", label: "上傳日期" },
  { value: "view_count", label: "觀看次數" },
  { value: "duration", label: "影片時長" },
  { value: "like_count", label: "按讚數" },
];

const PAGE_SIZE = 20;
// 為了在客戶端進行篩選，我們需要取得更多結果
const FETCH_SIZE_WITH_FILTERS = 200;

/**
 * 從 URL 參數解析篩選條件
 */
function parseFiltersFromParams(params: URLSearchParams): SearchFiltersType {
  const filters: SearchFiltersType = {};

  // 日期範圍
  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");
  const dateField = params.get("date_field") as "upload_date" | "archived_timestamp" | null;
  if (dateFrom || dateTo) {
    filters.dateRange = {
      field: dateField || "upload_date",
      from: dateFrom || undefined,
      to: dateTo || undefined,
    };
  }

  // 影片長度
  const durationMin = params.get("duration_min");
  const durationMax = params.get("duration_max");
  if (durationMin || durationMax) {
    filters.duration = {
      min: durationMin ? parseInt(durationMin, 10) : undefined,
      max: durationMax ? parseInt(durationMax, 10) : undefined,
    };
  }

  // 觀看次數
  const viewMin = params.get("view_min");
  const viewMax = params.get("view_max");
  if (viewMin || viewMax) {
    filters.viewCount = {
      min: viewMin ? parseInt(viewMin, 10) : undefined,
      max: viewMax ? parseInt(viewMax, 10) : undefined,
    };
  }

  return filters;
}

/**
 * 將篩選條件轉為 URL 參數
 */
function filtersToParams(filters: SearchFiltersType): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.dateRange) {
    if (filters.dateRange.from) params.date_from = filters.dateRange.from;
    if (filters.dateRange.to) params.date_to = filters.dateRange.to;
    if (filters.dateRange.field) params.date_field = filters.dateRange.field;
  }

  if (filters.duration) {
    if (filters.duration.min !== undefined) params.duration_min = String(filters.duration.min);
    if (filters.duration.max !== undefined) params.duration_max = String(filters.duration.max);
  }

  if (filters.viewCount) {
    if (filters.viewCount.min !== undefined) params.view_min = String(filters.viewCount.min);
    if (filters.viewCount.max !== undefined) params.view_max = String(filters.viewCount.max);
  }

  return params;
}

/**
 * 檢查影片是否符合篩選條件
 */
function matchesFilters(video: VideoMetadata, filters: SearchFiltersType): boolean {
  // 日期篩選
  if (filters.dateRange) {
    const dateField = filters.dateRange.field || "upload_date";
    const videoDate = dateField === "upload_date"
      ? video.upload_date
      : video.archived_timestamp?.slice(0, 10).replace(/-/g, "");

    if (videoDate) {
      if (filters.dateRange.from && videoDate < filters.dateRange.from) return false;
      if (filters.dateRange.to && videoDate > filters.dateRange.to) return false;
    }
  }

  // 長度篩選
  if (filters.duration) {
    if (filters.duration.min !== undefined && video.duration < filters.duration.min) return false;
    if (filters.duration.max !== undefined && video.duration > filters.duration.max) return false;
  }

  // 觀看次數篩選
  if (filters.viewCount) {
    if (filters.viewCount.min !== undefined && video.view_count < filters.viewCount.min) return false;
    if (filters.viewCount.max !== undefined && video.view_count > filters.viewCount.max) return false;
  }

  return true;
}

/**
 * 檢查是否有任何篩選條件
 */
function hasActiveFilters(filters: SearchFiltersType): boolean {
  return !!(
    (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) ||
    (filters.duration && (filters.duration.min !== undefined || filters.duration.max !== undefined)) ||
    (filters.viewCount && (filters.viewCount.min !== undefined || filters.viewCount.max !== undefined))
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";

  // 如果有搜尋關鍵字，預設使用相關性排序，否則使用存檔時間
  const defaultSort = query ? "relevance" : "archived_timestamp";
  const sort = (searchParams.get("sort") as SortField) || defaultSort;
  const sortOrder = (searchParams.get("sort_order") as SortOrder) || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // 從 URL 解析篩選條件
  const filters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
  const hasFilters = hasActiveFilters(filters);

  const [allVideos, setAllVideos] = useState<VideoMetadata[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 如果有篩選條件，取得更多結果以便在客戶端篩選
      const fetchSize = hasFilters ? FETCH_SIZE_WITH_FILTERS : PAGE_SIZE;
      const fetchFrom = hasFilters ? 0 : (page - 1) * PAGE_SIZE;

      const response = await searchVideos({
        query: query || undefined,
        sort,
        sortOrder,
        from: fetchFrom,
        size: fetchSize,
      });

      const fetchedVideos = response.hits.hits.map((hit) => hit._source);

      if (hasFilters) {
        // 在客戶端進行篩選
        const filteredVideos = fetchedVideos.filter((video) => matchesFilters(video, filters));
        setAllVideos(filteredVideos);
        setTotalCount(filteredVideos.length);
      } else {
        setAllVideos(fetchedVideos);
        setTotalCount(response.hits.total.value);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setError("搜尋失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [query, sort, sortOrder, page, filters, hasFilters]);

  // 分頁處理（客戶端篩選時）
  const videos = useMemo(() => {
    if (hasFilters) {
      const start = (page - 1) * PAGE_SIZE;
      return allVideos.slice(start, start + PAGE_SIZE);
    }
    return allVideos;
  }, [allVideos, page, hasFilters]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const updateParams = (updates: Record<string, string>, resetPage = false) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // 更改排序或篩選時重置到第一頁
    if (updates.sort || updates.sort_order || resetPage) {
      params.set("page", "1");
    }
    router.push(`/search?${params.toString()}`);
  };

  // 處理篩選變更
  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    const params = new URLSearchParams(searchParams.toString());

    // 先清除所有篩選相關參數
    params.delete("date_from");
    params.delete("date_to");
    params.delete("date_field");
    params.delete("duration_min");
    params.delete("duration_max");
    params.delete("view_min");
    params.delete("view_max");

    // 設定新的篩選參數
    const filterParams = filtersToParams(newFilters);
    Object.entries(filterParams).forEach(([key, value]) => {
      params.set(key, value);
    });

    // 重置到第一頁
    params.set("page", "1");

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

        {/* 篩選選項 */}
        <div className="mt-4">
          <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* 篩選提示 */}
        {hasFilters && !loading && (
          <p className="mt-2 text-sm text-muted-foreground">
            已套用篩選，顯示前 {FETCH_SIZE_WITH_FILTERS} 個結果中符合條件的影片
          </p>
        )}
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
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => updateParams({ page: String(newPage) })}
              />
            </div>
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
