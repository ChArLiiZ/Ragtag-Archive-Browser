"use client";

import { useState, useCallback } from "react";
import { searchVideos } from "@/lib/api";
import type { VideoMetadata, SearchOptions, SortField, SortOrder } from "@/lib/types";

interface UseSearchOptions {
  initialQuery?: string;
  initialSort?: SortField;
  initialSortOrder?: SortOrder;
  pageSize?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    initialQuery = "",
    initialSort = "archived_timestamp",
    initialSortOrder = "desc",
    pageSize = 20,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [page, setPage] = useState(1);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (searchOptions?: Partial<SearchOptions>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await searchVideos({
          query: (searchOptions?.query ?? query) || undefined,
          sort: searchOptions?.sort ?? sort,
          sortOrder: searchOptions?.sortOrder ?? sortOrder,
          from: ((searchOptions?.from ?? page) - 1) * pageSize,
          size: searchOptions?.size ?? pageSize,
          channelId: searchOptions?.channelId,
          videoId: searchOptions?.videoId,
        });

        setVideos(response.hits.hits.map((hit) => hit._source));
        setTotalCount(response.hits.total.value);
      } catch (err) {
        console.error("Search failed:", err);
        setError("搜尋失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    },
    [query, sort, sortOrder, page, pageSize]
  );

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
  }, []);

  const updateSort = useCallback((newSort: SortField) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const updateSortOrder = useCallback((newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder);
    setPage(1);
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    // 狀態
    query,
    sort,
    sortOrder,
    page,
    videos,
    totalCount,
    totalPages,
    loading,
    error,
    // 方法
    search,
    setQuery: updateQuery,
    setSort: updateSort,
    setSortOrder: updateSortOrder,
    toggleSortOrder,
    goToPage,
    nextPage,
    prevPage,
  };
}
