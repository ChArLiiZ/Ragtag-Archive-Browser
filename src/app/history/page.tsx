"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getWatchHistory, clearWatchHistory } from "@/lib/supabase";
import { getThumbnailUrl, formatDuration, formatRelativeTime } from "@/lib/api";
import type { WatchHistory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;

      try {
        setLoading(true);
        const data = await getWatchHistory(user.id);
        setHistory(data || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("載入觀看紀錄失敗");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchHistory();
    }
  }, [user, authLoading]);

  const handleClearHistory = async () => {
    if (!user || !confirm("確定要清除所有觀看紀錄嗎？")) return;

    try {
      setClearing(true);
      await clearWatchHistory(user.id);
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    } finally {
      setClearing(false);
    }
  };

  // 未登入狀態
  if (!authLoading && !user) {
    return (
      <div className="container-custom py-8">
        <EmptyState
          icon={Clock}
          title="請先登入"
          description="登入後即可查看觀看紀錄"
          action={{ label: "返回首頁", href: "/" }}
        />
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">觀看紀錄</h1>
          {history.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearHistory}
              disabled={clearing}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {clearing ? "清除中..." : "清除全部"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 flex gap-4">
                <Skeleton className="w-40 aspect-video rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="沒有觀看紀錄"
            description="開始觀看影片後會顯示在這裡"
            action={{ label: "探索影片", href: "/" }}
          />
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => {
              const progressPercent =
                item.duration_seconds && item.duration_seconds > 0
                  ? (item.progress_seconds / item.duration_seconds) * 100
                  : 0;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/watch/${item.video_id}`}>
                    <Card className="p-4 flex gap-4 hover:bg-accent/50 transition-colors group">
                      {/* 縮圖 */}
                      <div className="relative w-40 shrink-0">
                        <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                          <img
                            src={item.thumbnail_url || getThumbnailUrl(item.video_id)}
                            alt={item.video_title || item.video_id}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          {/* 觀看進度條 */}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 資訊 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {item.video_title || item.video_id}
                        </h3>
                        {item.channel_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.channel_name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          觀看進度: {formatDuration(item.progress_seconds)}
                          {item.duration_seconds &&
                            ` / ${formatDuration(item.duration_seconds)}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(item.last_watched_at)}
                        </p>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
