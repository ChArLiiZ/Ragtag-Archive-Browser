"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlaylists,
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
import { ListVideo, Plus, Trash2 } from "lucide-react";

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
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
        const data = await getPlaylists(user.id);
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
      setPlaylists((prev) => [newPlaylist, ...prev]);
      setNewPlaylistName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (playlistId: string) => {
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
        <Card className="p-8 text-center">
          <ListVideo className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-4">登入後即可管理播放清單</p>
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">我的播放清單</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增播放清單
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : playlists.length === 0 ? (
          <Card className="p-8 text-center">
            <ListVideo className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">沒有播放清單</h2>
            <p className="text-muted-foreground mb-4">建立您的第一個播放清單</p>
            <Button onClick={() => setShowCreateModal(true)}>
              新增播放清單
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 group hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/playlists/${playlist.id}`}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {playlist.name}
                      </h3>
                      {playlist.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {playlist.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>
                          {playlist.is_public ? "公開" : "私人"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(playlist.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(playlist.id)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
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
