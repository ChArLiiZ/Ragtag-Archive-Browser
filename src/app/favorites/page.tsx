"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getFavorites, removeFavorite } from "@/lib/supabase";
import type { Favorite } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, X } from "lucide-react";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-3xl font-bold mb-8">我的收藏</h1>

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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
        )}
      </motion.div>
    </div>
  );
}
