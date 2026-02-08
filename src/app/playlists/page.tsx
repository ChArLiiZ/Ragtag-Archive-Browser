"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlaylistsWithDetails,
  createPlaylist,
  deletePlaylist,
} from "@/lib/supabase";
import type { Playlist } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ListVideo, Plus, Trash2, Play, Lock, Globe } from "lucide-react";
import { EmptyState } from "@/components/common";

// 擴展 Playlist 類型，包含詳細資訊
interface PlaylistWithDetails extends Playlist {
  itemCount: number;
  thumbnails: string[];
}

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchPlaylists() {
      if (!user) return;

      try {
        setLoading(true);
        const data = await getPlaylistsWithDetails(user.id);
        setPlaylists(data || []);
      } catch (err) {
        console.error("Failed to fetch playlists:", err);
        setError("載入播放清單失敗");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchPlaylists();
    }
  }, [user, authLoading]);

  const handleCreate = async () => {
    if (!user || !newPlaylistName.trim()) return;

    try {
      setCreating(true);
      const newPlaylist = await createPlaylist(user.id, newPlaylistName.trim());
      // 新增到列表（帶預設值）
      setPlaylists((prev) => [
        { ...newPlaylist, itemCount: 0, thumbnails: [] },
        ...prev,
      ]);
      setNewPlaylistName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (playlistId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("確定要刪除此播放清單嗎？")) return;

    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  // 未登入狀態
  if (!authLoading && !user) {
    return (
      <div className="container-custom py-8">
        <EmptyState
          icon={ListVideo}
          title="請先登入"
          description="登入後即可管理播放清單"
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
          <h1 className="text-3xl font-bold">我的播放清單</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增播放清單
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : playlists.length === 0 ? (
          <EmptyState
            icon={ListVideo}
            title="沒有播放清單"
            description="建立您的第一個播放清單"
            action={{ label: "新增播放清單", onClick: () => setShowCreateModal(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/playlists/${playlist.id}`}>
                  <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {/* 縮圖預覽區 */}
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {playlist.thumbnails.length > 0 ? (
                        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                          {/* 顯示最多 4 個縮圖 */}
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="relative overflow-hidden bg-muted"
                            >
                              {playlist.thumbnails[i] ? (
                                <img
                                  src={playlist.thumbnails[i]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListVideo className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* 播放按鈕覆蓋層 */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-6 h-6 text-black fill-current ml-1" />
                        </div>
                      </div>

                      {/* 影片數量標籤 */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-medium text-white flex items-center gap-1">
                        <ListVideo className="w-3 h-3" />
                        {playlist.itemCount} 部影片
                      </div>
                    </div>

                    {/* 資訊區 */}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                            {playlist.name}
                          </h3>
                          {playlist.description && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {playlist.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            {playlist.is_public ? (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                公開
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                私人
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(playlist.id, e)}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* 建立播放清單彈窗 */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增播放清單</DialogTitle>
            </DialogHeader>
            <Input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="播放清單名稱"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPlaylistName.trim()) {
                  handleCreate();
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newPlaylistName.trim() || creating}
              >
                {creating ? "建立中..." : "建立"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
