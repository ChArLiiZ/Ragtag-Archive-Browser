"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  getVideoById,
  getVideoUrl,
  getThumbnailUrl,
  getChannelAvatarUrl,
  getChatUrl,
  formatDuration,
  formatViewCount,
  formatUploadDate,
  formatFileSize,
} from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
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
import type { VideoPlayerHandle } from "@/components/video/VideoPlayer";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { SleepTimerControl } from "@/components/video/SleepTimerControl";
import { useAudioOnly } from "@/hooks/useAudioOnly";
import { useVolume } from "@/hooks/useVolume";
import { RecommendedVideos } from "@/components/video/RecommendedVideos";
import { DownloadSection } from "@/components/video/DownloadSection";
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
  const { audioOnly, toggleAudioOnly } = useAudioOnly();
  const { volume, isMuted, setVolume, setIsMuted } = useVolume();

  // 睡眠計時器
  const playerRef = useRef<VideoPlayerHandle>(null);
  const sleepTimerExpiredRef = useRef(false);
  const handleSleepTimerExpire = useCallback(() => {
    playerRef.current?.pause();
    sleepTimerExpiredRef.current = true;
  }, []);
  const sleepTimer = useSleepTimer(handleSleepTimerExpire);

  // 切換影片時重置睡眠計時器到期旗標，避免殘留狀態阻止下一部自動播放
  useEffect(() => {
    sleepTimerExpiredRef.current = false;
  }, [videoId]);

  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [initialProgress, setInitialProgress] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // 播放清單相關
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(true);
  const [playedIndices, setPlayedIndices] = useState<Set<number>>(new Set()); // 隨機播放時追蹤已播放的影片索引

  // 聊天記錄相關
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

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
    // 用來追蹤此 effect 是否已被清理（videoId 已改變）
    // 防止舊的非同步操作更新已過時的狀態
    let cancelled = false;

    async function loadUserData() {
      // 如果沒有登入用戶，直接標記進度已載入（無需等待）
      if (!user || !videoId) {
        if (!cancelled) {
          setProgressLoaded(true);
        }
        return;
      }

      try {
        // 檢查收藏狀態
        const favorited = await isFavorited(user.id, videoId);
        // 在每個 await 後檢查是否已取消
        if (cancelled) return;
        setIsFavorite(favorited);

        // 載入觀看進度
        // 如果有 restart=true，則忽略之前的進度（從 0 開始）
        if (restartMode) {
          if (!cancelled) {
            setInitialProgress(0);
          }
        } else {
          const progress = await getWatchProgress(user.id, videoId);
          // 再次檢查是否已取消
          if (cancelled) return;
          if (progress?.progress_seconds) {
            setInitialProgress(progress.progress_seconds);
          }
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
      } finally {
        // 只有在未取消時才標記進度已載入完成
        if (!cancelled) {
          setProgressLoaded(true);
        }
      }
    }

    // 重置載入狀態（當 videoId 改變時）
    // 重要：必須同步重置 initialProgress，避免 race condition
    // 如果不重置，舊影片的進度可能會在新影片進度載入前被錯誤套用
    setProgressLoaded(false);
    setInitialProgress(0);
    loadUserData();

    // 清理函數：當 videoId 改變或組件卸載時執行
    return () => {
      cancelled = true;
    };
  }, [user, videoId, restartMode]);

  // 載入播放清單資料
  useEffect(() => {
    let cancelled = false; // 防止 race condition

    async function fetchPlaylist() {
      if (!playlistId) return;

      try {
        // 取得播放清單資訊
        const { data: playlistData } = await supabase
          .from("playlists")
          .select("*")
          .eq("id", playlistId)
          .single();

        if (cancelled) return;
        if (playlistData) {
          setPlaylist(playlistData);
        }

        // 取得播放清單項目
        const items = await getPlaylistItems(playlistId);
        if (cancelled) return;

        setPlaylistItems(items || []);

        // 找到目前影片的索引
        const index = items?.findIndex((item) => item.video_id === videoId) ?? -1;
        setCurrentIndex(index);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch playlist:", err);
        }
      }
    }

    fetchPlaylist();

    return () => {
      cancelled = true;
    };
  }, [playlistId, videoId]);

  // 切換播放清單時重置已播放記錄
  useEffect(() => {
    setPlayedIndices(new Set());
  }, [playlistId]);

  // 載入聊天記錄
  useEffect(() => {
    async function fetchChatMessages() {
      if (!videoId) return;

      setChatLoading(true);
      try {
        const chatUrl = getChatUrl(videoId);
        const response = await fetch(chatUrl);
        if (response.ok) {
          const data = await response.json();
          // 驗證資料確實是陣列，避免非陣列物件導致後續 .forEach() 錯誤
          const messages = Array.isArray(data.messages)
            ? data.messages
            : Array.isArray(data)
              ? data
              : [];
          setChatMessages(messages);
        } else {
          setChatMessages([]);
        }
      } catch (err) {
        // 聊天記錄可能不存在，這是正常的
        setChatMessages([]);
      } finally {
        setChatLoading(false);
      }
    }

    fetchChatMessages();
  }, [videoId]);

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
      // 記錄當前影片為已播放
      const newPlayedIndices = new Set(playedIndices);
      if (currentIndex >= 0) {
        newPlayedIndices.add(currentIndex);
      }

      // 找出尚未播放的影片索引
      const availableIndices = playlistItems
        .map((_, i) => i)
        .filter((i) => !newPlayedIndices.has(i));

      if (availableIndices.length === 0) {
        // 所有影片都播放過了，重置記錄並重新開始（排除當前影片）
        const resetIndices = playlistItems
          .map((_, i) => i)
          .filter((i) => i !== currentIndex);
        if (resetIndices.length === 0) return; // 只有一部影片
        nextIndex = resetIndices[Math.floor(Math.random() * resetIndices.length)];
        setPlayedIndices(new Set([currentIndex])); // 重置，只保留當前影片
      } else {
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        setPlayedIndices(newPlayedIndices);
      }
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
  }, [playlistItems, currentIndex, shuffleMode, playedIndices, playlistId, router, restartMode]);

  // 影片結束時的處理（考慮睡眠計時器）
  const handleVideoEnded = useCallback(() => {
    if (sleepTimerExpiredRef.current) {
      // 睡眠計時器已觸發，不跳到下一部
      sleepTimerExpiredRef.current = false;
      return;
    }
    playNextVideo();
  }, [playNextVideo]);

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
                ref={playerRef}
                src={videoUrl}
                poster={posterUrl}
                initialTime={initialProgress}
                onProgressUpdate={handleProgressUpdate}
                onEnded={playlistId ? handleVideoEnded : undefined}
                autoPlay={progressLoaded}
                audioOnly={audioOnly}
                onToggleAudioOnly={toggleAudioOnly}
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onMutedChange={setIsMuted}
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

                {/* 睡眠計時器 */}
                <SleepTimerControl
                  isActive={sleepTimer.isActive}
                  remainingFormatted={sleepTimer.remainingFormatted}
                  onStart={sleepTimer.start}
                  onCancel={sleepTimer.cancel}
                />
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

          {/* 下載區塊 */}
          <DownloadSection
            video={video}
            chatMessages={chatMessages}
            isLoadingChat={chatLoading}
          />

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
