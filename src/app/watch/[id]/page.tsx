"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  getVideoById,
  getVideoUrl,
  getThumbnailUrl,
  getChannelAvatarUrl,
  formatDuration,
  formatViewCount,
  formatUploadDate,
  formatFileSize,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  addFavorite,
  removeFavorite,
  isFavorited,
  updateWatchProgress,
  getWatchProgress,
  getPlaylistItems,
} from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { VideoMetadata, PlaylistItem, Playlist } from "@/lib/types";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { RecommendedVideos } from "@/components/video/RecommendedVideos";
import { AddToPlaylistModal } from "@/components/features/AddToPlaylistModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Heart,
  ListVideo,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Calendar,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Play,
  SkipBack,
  SkipForward,
  Shuffle
} from "lucide-react";

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = params.id as string;
  const playlistId = searchParams.get("playlist");
  const shuffleMode = searchParams.get("shuffle") === "true";
  const restartMode = searchParams.get("restart") === "true";
  const { user } = useAuth();

  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [initialProgress, setInitialProgress] = useState(0);
  const [showDescription, setShowDescription] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // 播放清單相關
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(true);

  // 載入影片資料
  useEffect(() => {
    async function fetchVideo() {
      try {
        setLoading(true);
        const data = await getVideoById(videoId);
        if (data) {
          setVideo(data);
        } else {
          setError("找不到此影片");
        }
      } catch (err) {
        console.error("Failed to fetch video:", err);
        setError("載入失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    }

    fetchVideo();
  }, [videoId]);

  // 載入收藏狀態和觀看進度
  useEffect(() => {
    async function loadUserData() {
      if (!user || !videoId) return;

      try {
        // 檢查收藏狀態
        const favorited = await isFavorited(user.id, videoId);
        setIsFavorite(favorited);

        // 載入觀看進度
        // 如果有 restart=true，則忽略之前的進度（從 0 開始）
        if (restartMode) {
          setInitialProgress(0);
        } else {
          const progress = await getWatchProgress(user.id, videoId);
          if (progress?.progress_seconds) {
            setInitialProgress(progress.progress_seconds);
          }
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
      }
    }

    loadUserData();
  }, [user, videoId, restartMode]);

  // 載入播放清單資料
  useEffect(() => {
    async function fetchPlaylist() {
      if (!playlistId) return;

      try {
        // 取得播放清單資訊
        const { data: playlistData } = await supabase
          .from("playlists")
          .select("*")
          .eq("id", playlistId)
          .single();

        if (playlistData) {
          setPlaylist(playlistData);
        }

        // 取得播放清單項目
        const items = await getPlaylistItems(playlistId);
        setPlaylistItems(items || []);

        // 找到目前影片的索引
        const index = items?.findIndex((item) => item.video_id === videoId) ?? -1;
        setCurrentIndex(index);
      } catch (err) {
        console.error("Failed to fetch playlist:", err);
      }
    }

    fetchPlaylist();
  }, [playlistId, videoId]);

  // 切換隨機模式
  const toggleShuffle = useCallback(() => {
    const newShuffleMode = !shuffleMode;
    const params = new URLSearchParams(searchParams.toString());
    if (newShuffleMode) {
      params.set("shuffle", "true");
    } else {
      params.delete("shuffle");
    }
    const queryString = params.toString();
    router.push(`/watch/${videoId}${queryString ? `?${queryString}` : ""}`);
  }, [searchParams, router, videoId, shuffleMode]);

  // 播放下一部
  const playNextVideo = useCallback(() => {
    if (playlistItems.length === 0) return;

    let nextIndex: number;
    if (shuffleMode) {
      // 隨機選擇（排除目前的）
      const availableIndices = playlistItems
        .map((_, i) => i)
        .filter((i) => i !== currentIndex);
      if (availableIndices.length === 0) return;
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      // 順序播放
      nextIndex = currentIndex + 1;
      if (nextIndex >= playlistItems.length) {
        nextIndex = 0; // 循環播放
      }
    }

    const nextItem = playlistItems[nextIndex];
    if (nextItem) {
      const restartParam = restartMode ? "&restart=true" : "";
      router.push(`/watch/${nextItem.video_id}?playlist=${playlistId}${shuffleMode ? "&shuffle=true" : ""}${restartParam}`);
    }
  }, [playlistItems, currentIndex, shuffleMode, playlistId, router, restartMode]);

  // 播放上一部
  const playPrevVideo = useCallback(() => {
    if (playlistItems.length === 0 || currentIndex <= 0) return;

    const prevItem = playlistItems[currentIndex - 1];
    if (prevItem) {
      const restartParam = restartMode ? "&restart=true" : "";
      router.push(`/watch/${prevItem.video_id}?playlist=${playlistId}${shuffleMode ? "&shuffle=true" : ""}${restartParam}`);
    }
  }, [playlistItems, currentIndex, shuffleMode, playlistId, router, restartMode]);

  // 切換收藏
  const toggleFavorite = async () => {
    if (!user || !video) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(user.id, videoId);
        setIsFavorite(false);
      } else {
        await addFavorite(
          user.id,
          videoId,
          video.title,
          video.channel_id,
          video.channel_name,
          getThumbnailUrl(videoId, video.drive_base, video.files)
        );
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 更新觀看進度
  const handleProgressUpdate = useCallback(
    async (currentTime: number, duration: number) => {
      if (!user || !video) return;
      try {
        await updateWatchProgress(
          user.id,
          videoId,
          currentTime,
          duration,
          video.title,
          video.channel_id,
          video.channel_name,
          getThumbnailUrl(videoId, video.drive_base, video.files)
        );
      } catch (err) {
        console.error("Failed to update progress:", err);
      }
    },
    [user, videoId, video]
  );

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="space-y-4">
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container-custom py-8">
        <Card className="p-8 text-center">
          <div className="text-destructive mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-destructive mb-4">{error || "找不到此影片"}</p>
          <Button asChild>
            <Link href="/">返回首頁</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const videoUrl = getVideoUrl(videoId, video.files, video.drive_base);
  const posterUrl = getThumbnailUrl(videoId, video.drive_base, video.files);
  const channelAvatarUrl = getChannelAvatarUrl(video.channel_id);

  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主要內容區 */}
        <div className="lg:col-span-2">
          {/* 影片播放器 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                poster={posterUrl}
                initialTime={initialProgress}
                onProgressUpdate={handleProgressUpdate}
                onEnded={playlistId ? playNextVideo : undefined}
              />
            ) : (
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">影片檔案不可用</p>
              </div>
            )}
          </motion.div>

          {/* 播放清單導航 */}
          {playlist && playlistItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6"
            >
              <Card className="overflow-hidden">
                {/* 標題列 - 可點擊展開/收合 */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setShowPlaylistPanel(!showPlaylistPanel)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ListVideo className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <Link
                        href={`/playlists/${playlistId}`}
                        className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {playlist.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {currentIndex + 1} / {playlistItems.length} 部影片
                      </p>
                    </div>
                    {/* 隨機播放控制 */}
                    <Button
                      variant={shuffleMode ? "secondary" : "ghost"}
                      size="icon"
                      className={`h-7 w-7 ${shuffleMode ? "text-primary bg-primary/20" : "text-muted-foreground"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShuffle();
                      }}
                      title={shuffleMode ? "關閉隨機播放" : "開啟隨機播放"}
                    >
                      <Shuffle className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); playPrevVideo(); }}
                      disabled={currentIndex <= 0 && !shuffleMode}
                      title="上一部"
                      className="h-8 w-8"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); playNextVideo(); }}
                      title="下一部"
                      className="h-8 w-8"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={showPlaylistPanel ? "收合清單" : "展開清單"}
                      onClick={(e) => { e.stopPropagation(); setShowPlaylistPanel(!showPlaylistPanel); }}
                    >
                      {showPlaylistPanel ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 可展開的影片列表 */}
                {showPlaylistPanel && (
                  <div className="border-t max-h-80 overflow-y-auto">
                    {playlistItems.map((item, index) => {
                      const isCurrentVideo = item.video_id === videoId;
                      const restartParam = restartMode ? "&restart=true" : "";
                      return (
                        <Link
                          key={item.id}
                          href={`/watch/${item.video_id}?playlist=${playlistId}${shuffleMode ? "&shuffle=true" : ""}${restartParam}`}
                          className={`flex gap-3 p-3 hover:bg-accent/50 transition-colors ${isCurrentVideo ? "bg-primary/10 border-l-2 border-primary" : ""
                            }`}
                        >
                          {/* 序號 */}
                          <div className="w-6 flex items-center justify-center text-xs text-muted-foreground shrink-0">
                            {isCurrentVideo ? (
                              <Play className="w-3 h-3 text-primary fill-current" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* 縮圖 */}
                          <div className="relative w-24 shrink-0">
                            <div className="aspect-video rounded overflow-hidden bg-muted">
                              {item.thumbnail_url && (
                                <img
                                  src={item.thumbnail_url}
                                  alt={item.video_title || ""}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          </div>

                          {/* 資訊 */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm line-clamp-2 ${isCurrentVideo ? "font-medium text-primary" : ""}`}>
                              {item.video_title || "未知標題"}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {item.channel_name || "未知頻道"}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* 影片標題 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold mb-4">{video.title}</h1>

            {/* 統計和操作按鈕 */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatViewCount(video.view_count)} 次觀看
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatUploadDate(video.upload_date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 按讚/倒讚顯示 */}
                <div className="flex items-center bg-muted rounded-md overflow-hidden border">
                  <div className="flex items-center gap-2 px-3 py-2 border-r border-border">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">{formatViewCount(video.like_count)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm">{video.dislike_count > 0 ? formatViewCount(video.dislike_count) : ""}</span>
                  </div>
                </div>

                {/* 收藏按鈕 */}
                {user && (
                  <Button
                    variant={isFavorite ? "secondary" : "outline"}
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className={isFavorite ? "text-red-500 hover:text-red-600" : ""}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                    {isFavorite ? "已收藏" : "收藏"}
                  </Button>
                )}

                {/* 加入播放清單按鈕 */}
                {user && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPlaylistModal(true)}
                  >
                    <ListVideo className="w-4 h-4 mr-2" />
                    加入清單
                  </Button>
                )}
              </div>
            </div>

            {/* 頻道資訊 */}
            <Link href={`/channel/${video.channel_id}`}>
              <Card className="mb-6 hover:bg-accent/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={channelAvatarUrl} alt={video.channel_name} />
                    <AvatarFallback>{video.channel_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{video.channel_name}</h3>
                    <p className="text-sm text-muted-foreground">查看頻道 →</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* 描述 */}
            <Card className="p-4">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="w-full text-left flex items-center justify-between"
              >
                <h3 className="font-medium">描述</h3>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${showDescription ? "rotate-180" : ""}`}
                />
              </button>
              {showDescription && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap border-t pt-4"
                >
                  {video.description || "無描述"}
                </motion.div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* 側邊欄 - 影片資訊 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* 影片詳細資訊 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">影片資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">影片 ID</dt>
                  <dd className="font-mono text-xs">{video.video_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">解析度</dt>
                  <dd>
                    {video.width}x{video.height}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">幀率</dt>
                  <dd>{video.fps} FPS</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">觀看次數</dt>
                  <dd>{video.view_count.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">時長</dt>
                  <dd>{formatDuration(video.duration)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* 檔案列表 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">可用檔案</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {video.files.map((file) => (
                  <li
                    key={file.name}
                    className="flex justify-between items-center py-1 border-b last:border-0 border-border/50"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate text-foreground/80">
                        {file.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatFileSize(file.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 推薦影片 */}
          <RecommendedVideos currentVideo={video} />
        </motion.div>
      </div>

      {/* 加入播放清單彈窗 */}
      <AddToPlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        videoId={videoId}
        videoTitle={video.title}
        channelName={video.channel_name}
        thumbnailUrl={posterUrl}
      />
    </div>
  );
}
