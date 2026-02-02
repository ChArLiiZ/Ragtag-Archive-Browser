"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlaylists, createPlaylist, addToPlaylist } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { Playlist } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Check, Plus, Loader2 } from "lucide-react";

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string;
    videoTitle?: string;
    channelName?: string;
    thumbnailUrl?: string;
}

export function AddToPlaylistModal({
    isOpen,
    onClose,
    videoId,
    videoTitle,
    channelName,
    thumbnailUrl,
}: AddToPlaylistModalProps) {
    const { user } = useAuth();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState<string | null>(null);
    const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
    const [showCreate, setShowCreate] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    // 載入播放清單
    useEffect(() => {
        async function fetchPlaylists() {
            if (!user || !isOpen) return;

            try {
                setLoading(true);
                const data = await getPlaylists(user.id);
                setPlaylists(data || []);

                // 檢查影片已加入哪些播放清單
                const { data: existingItems } = await supabase
                    .from("playlist_items")
                    .select("playlist_id")
                    .eq("video_id", videoId);

                if (existingItems) {
                    setAddedTo(new Set(existingItems.map((item) => item.playlist_id)));
                }
            } catch (err) {
                console.error("Failed to fetch playlists:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchPlaylists();
    }, [user, isOpen, videoId]);

    // 加入播放清單
    const handleAddToPlaylist = async (playlistId: string) => {
        if (addedTo.has(playlistId)) return;

        try {
            setAdding(playlistId);
            await addToPlaylist(playlistId, videoId, videoTitle, channelName, thumbnailUrl);
            setAddedTo((prev) => new Set(Array.from(prev).concat(playlistId)));
        } catch (err) {
            console.error("Failed to add to playlist:", err);
            setError("加入失敗，請稍後再試");
        } finally {
            setAdding(null);
        }
    };

    // 創建新播放清單
    const handleCreatePlaylist = async () => {
        if (!user || !newPlaylistName.trim()) return;

        try {
            setCreating(true);
            setError("");

            // 創建播放清單
            const newPlaylist = await createPlaylist(user.id, newPlaylistName.trim());

            // 加入影片
            await addToPlaylist(
                newPlaylist.id,
                videoId,
                videoTitle,
                channelName,
                thumbnailUrl
            );

            // 更新狀態
            setPlaylists((prev) => [newPlaylist, ...prev]);
            setAddedTo((prev) => new Set(Array.from(prev).concat(newPlaylist.id)));
            setNewPlaylistName("");
            setShowCreate(false);
        } catch (err) {
            console.error("Failed to create playlist:", err);
            setError("創建失敗，請稍後再試");
        } finally {
            setCreating(false);
        }
    };

    // 關閉時重置
    const handleClose = () => {
        setShowCreate(false);
        setNewPlaylistName("");
        setError("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>加入播放清單</DialogTitle>
                </DialogHeader>

                {/* 錯誤訊息 */}
                {error && (
                    <div className="p-3 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive text-sm">
                        {error}
                    </div>
                )}

                {/* 播放清單列表 */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : playlists.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">還沒有播放清單</p>
                    ) : (
                        <div className="space-y-2">
                            {playlists.map((playlist) => {
                                const isAdded = addedTo.has(playlist.id);
                                const isAdding = adding === playlist.id;

                                return (
                                    <button
                                        key={playlist.id}
                                        onClick={() => handleAddToPlaylist(playlist.id)}
                                        disabled={isAdded || isAdding}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isAdded
                                                ? "bg-primary/20 text-primary"
                                                : "hover:bg-accent"
                                            }`}
                                    >
                                        <span className="truncate">{playlist.name}</span>
                                        {isAdding ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : isAdded ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <Plus className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 創建新播放清單 */}
                <div className="mt-4 pt-4 border-t shrink-0">
                    {showCreate ? (
                        <div className="flex gap-2">
                            <Input
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="新播放清單名稱"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreatePlaylist();
                                    if (e.key === "Escape") setShowCreate(false);
                                }}
                            />
                            <Button
                                onClick={handleCreatePlaylist}
                                disabled={!newPlaylistName.trim() || creating}
                            >
                                {creating ? "..." : "建立"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreate(false)}>
                                取消
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            建立新播放清單
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
