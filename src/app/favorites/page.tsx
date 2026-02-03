"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getFavorites, removeFavorite } from "@/lib/supabase";
import type { Favorite } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, X, Search, ArrowUpDown, Grid, List } from "lucide-react";

type SortOption = "created_at" | "title" | "channel";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 篩選和排序狀態
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) return;

      try {
        setLoading(true);
        const data = await getFavorites(user.id);
        setFavorites(data || []);
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
        setError("載入收藏失敗");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchFavorites();
    }
  }, [user, authLoading]);

  // 篩選和排序收藏
  const filteredAndSortedFavorites = useMemo(() => {
    let result = [...favorites];

    // 篩選 - 搜尋標題和頻道
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.video_title?.toLowerCase().includes(query)) ||
          (f.channel_name?.toLowerCase().includes(query))
      );
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "title":
          comparison = (a.video_title || "").localeCompare(b.video_title || "");
          break;
        case "channel":
          comparison = (a.channel_name || "").localeCompare(b.channel_name || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [favorites, searchQuery, sortBy, sortOrder]);

  const handleRemove = async (videoId: string) => {
    if (!user) return;

    try {
      await removeFavorite(user.id, videoId);
      setFavorites((prev) => prev.filter((f) => f.video_id !== videoId));
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    }
  };

  // 未登入狀態
  if (!authLoading && !user) {
    return (
      <div className="container-custom py-8">
        <Card className="p-8 text-center">
          <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-4">登入後即可使用收藏功能</p>
          <Button asChild>
            <Link href="/">返回首頁</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">我的收藏</h1>
          <span className="text-muted-foreground">
            共 {favorites.length} 部影片
          </span>
        </div>

        {/* 篩選和排序工具列 */}
        {!loading && favorites.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* 搜尋 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋收藏的影片..."
                className="pl-10"
              />
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">排序：</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">收藏時間</SelectItem>
                  <SelectItem value="title">標題</SelectItem>
                  <SelectItem value="channel">頻道</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={sortOrder === "asc" ? "升冪排序" : "降冪排序"}
              >
                <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* 視圖切換 */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
                title="網格檢視"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
                title="列表檢視"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-video" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : favorites.length === 0 ? (
          <Card className="p-8 text-center">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">沒有收藏的影片</h2>
            <p className="text-muted-foreground mb-4">開始瀏覽並收藏您喜歡的影片吧</p>
            <Button asChild>
              <Link href="/">探索影片</Link>
            </Button>
          </Card>
        ) : filteredAndSortedFavorites.length === 0 ? (
          <Card className="p-8 text-center">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">找不到符合的影片</h2>
            <p className="text-muted-foreground mb-4">試試其他關鍵字吧</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              清除搜尋
            </Button>
          </Card>
        ) : viewMode === "grid" ? (
          // 網格視圖
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedFavorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative group"
              >
                <Link href={`/watch/${favorite.video_id}`}>
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {favorite.thumbnail_url && (
                        <img
                          src={favorite.thumbnail_url}
                          alt={favorite.video_title || ""}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {favorite.video_title || "未知標題"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {favorite.channel_name || "未知頻道"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                {/* 移除按鈕 */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(favorite.video_id);
                  }}
                  title="移除收藏"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          // 列表視圖
          <div className="space-y-2">
            {filteredAndSortedFavorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-3 flex gap-4 group hover:bg-accent/50 transition-colors">
                  {/* 縮圖 */}
                  <Link
                    href={`/watch/${favorite.video_id}`}
                    className="relative w-40 shrink-0"
                  >
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      {favorite.thumbnail_url && (
                        <img
                          src={favorite.thumbnail_url}
                          alt={favorite.video_title || ""}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </Link>

                  {/* 資訊 */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/watch/${favorite.video_id}`}>
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {favorite.video_title || "未知標題"}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {favorite.channel_name || "未知頻道"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      收藏於 {new Date(favorite.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(favorite.video_id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="移除收藏"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
