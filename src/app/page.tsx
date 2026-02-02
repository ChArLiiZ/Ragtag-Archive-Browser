"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { VideoGrid } from "@/components/video/VideoGrid";
import { getLatestVideos } from "@/lib/api";
import type { VideoMetadata } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function HomePage() {
  const [latestVideos, setLatestVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        const response = await getLatestVideos(20);
        setLatestVideos(response.hits.hits.map((hit) => hit._source));
      } catch (err) {
        console.error("Failed to fetch videos:", err);
        setError("無法載入影片，請稍後再試");
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  return (
    <div className="container-custom py-8">
      {/* Hero 區塊 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Ragtag Archive Browser
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          探索並觀看存檔影片，支援搜尋、收藏、播放清單等功能
        </p>
      </motion.section>

      {/* 搜尋提示 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12"
      >
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              使用上方的搜尋列來搜尋您想觀看的影片
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["hololive", "vtuber", "music", "karaoke", "gaming"].map((tag) => (
                <Button key={tag} variant="outline" size="sm" asChild>
                  <Link href={`/search?q=${tag}`}>{tag}</Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* 最新影片 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">最新存檔</h2>
          <Button variant="link" asChild className="gap-1">
            <Link href="/search?sort=archived_timestamp&sort_order=desc">
              查看更多 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {error ? (
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              重新載入
            </Button>
          </Card>
        ) : (
          <VideoGrid videos={latestVideos} loading={loading} />
        )}
      </motion.section>
    </div>
  );
}
