"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchProgressBatch } from "@/hooks/useWatchProgressBatch";
import {
    getPlaylistItems,
    removeFromPlaylist,
    updatePlaylist,
    deletePlaylist,
    reorderPlaylistItems,
} from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { Playlist, PlaylistItem } from "@/lib/types";
import { SortablePlaylistItem } from "@/components/playlist/SortablePlaylistItem";
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
import { ListVideo, Play, Shuffle, Pencil, Trash2, X, ArrowUpDown, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SortOption = "position" | "title" | "channel" | "added_at";
type SortOrder = "asc" | "desc";

export default function PlaylistDetailPage() {
    const router = useRouter();
    const params = useParams();
    const playlistId = params.id as string;
    const { user, loading: authLoading } = useAuth();

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [items, setItems] = useState<PlaylistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 播放選項
    const [startFromBeginning, setStartFromBeginning] = useState(false);

    // 排序
    const [sortBy, setSortBy] = useState<SortOption>("position");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    // 編輯模式
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");

    // 載入播放清單資料
    useEffect(() => {
        async function fetchPlaylist() {
            if (!user || !playlistId) return;

            try {
                setLoading(true);

                // 取得播放清單資訊
                const { data: playlistData, error: playlistError } = await supabase
                    .from("playlists")
                    .select("*")
                    .eq("id", playlistId)
                    .single();

                if (playlistError) throw playlistError;
                setPlaylist(playlistData);
                setEditName(playlistData.name);
                setEditDescription(playlistData.description || "");

                // 取得播放清單項目
                const itemsData = await getPlaylistItems(playlistId);
                setItems(itemsData || []);
            } catch (err) {
                console.error("Failed to fetch playlist:", err);
                setError("載入播放清單失敗");
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchPlaylist();
        }
    }, [user, playlistId, authLoading]);

    // 排序項目
    const sortedItems = [...items].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case "position":
                comparison = a.position - b.position;
                break;
            case "title":
                comparison = (a.video_title || "").localeCompare(b.video_title || "");
                break;
            case "channel":
                comparison = (a.channel_name || "").localeCompare(b.channel_name || "");
                break;
            case "added_at":
                comparison = new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
                break;
        }
        return sortOrder === "asc" ? comparison : -comparison;
    });

    // 取得所有影片 ID
    const videoIds = useMemo(
        () => items.map((item) => item.video_id),
        [items]
    );

    // 批次載入觀看進度
    const { progressMap } = useWatchProgressBatch({
        videoIds,
        enabled: !!user,
    });

    // 移除項目
    const handleRemoveItem = async (videoId: string) => {
        if (!confirm("確定要從播放清單移除此影片嗎？")) return;

        try {
            await removeFromPlaylist(playlistId, videoId);
            setItems((prev) => prev.filter((item) => item.video_id !== videoId));
        } catch (err) {
            console.error("Failed to remove item:", err);
        }
    };

    // 更新播放清單資訊
    const handleUpdatePlaylist = async () => {
        if (!editName.trim()) return;

        try {
            await updatePlaylist(playlistId, {
                name: editName.trim(),
                description: editDescription.trim() || undefined,
            });
            setPlaylist((prev) =>
                prev ? { ...prev, name: editName.trim(), description: editDescription.trim() } : null
            );
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to update playlist:", err);
        }
    };

    // 刪除播放清單
    const handleDeletePlaylist = async () => {
        if (!confirm("確定要刪除此播放清單嗎？此操作無法復原。")) return;

        try {
            await deletePlaylist(playlistId);
            router.push("/playlists");
        } catch (err) {
            console.error("Failed to delete playlist:", err);
        }
    };

    // 隨機播放
    const handleShufflePlay = useCallback(() => {
        if (items.length === 0) return;
        const randomIndex = Math.floor(Math.random() * items.length);
        const randomItem = items[randomIndex];
        const restartParam = startFromBeginning ? "&restart=true" : "";
        router.push(`/watch/${randomItem.video_id}?playlist=${playlistId}&shuffle=true${restartParam}`);
    }, [items, playlistId, router, startFromBeginning]);

    // 順序播放
    const handlePlayAll = useCallback(() => {
        if (sortedItems.length === 0) return;
        const restartParam = startFromBeginning ? "&restart=true" : "";
        router.push(`/watch/${sortedItems[0].video_id}?playlist=${playlistId}${restartParam}`);
    }, [sortedItems, playlistId, router, startFromBeginning]);

    // 拖曳排序結束
    // 注意：使用 sortedItems 來找索引，因為那是用戶實際看到並拖曳的順序
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        // 從 sortedItems 找索引，因為用戶拖曳的是排序後顯示的列表
        const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
        const newIndex = sortedItems.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            // 在 sortedItems 上執行移動
            const reorderedSortedItems = arrayMove(sortedItems, oldIndex, newIndex);

            // 更新每個項目的 position 以符合新的顯示順序
            const newItems = reorderedSortedItems.map((item, index) => ({
                ...item,
                position: index,
            }));

            setItems(newItems);

            // 更新資料庫
            try {
                const { failedIds } = await reorderPlaylistItems(
                    playlistId,
                    newItems.map((item) => item.id)
                );

                if (failedIds.length > 0) {
                    console.error("Failed to reorder some items:", failedIds);
                    // 有部分失敗，重新載入整個清單以確保一致性
                    const freshItems = await getPlaylistItems(playlistId);
                    setItems(freshItems || []);
                }
            } catch (err) {
                console.error("Failed to reorder playlist:", err);
                // 完全失敗時重新載入清單
                const freshItems = await getPlaylistItems(playlistId);
                setItems(freshItems || []);
            }
        }
    };

    // Dnd 感測器
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // 未登入狀態
    if (!authLoading && !user) {
        return (
            <div className="container-custom py-8">
                <Card className="p-8 text-center">
                    <ListVideo className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold mb-2">請先登入</h2>
                    <p className="text-muted-foreground mb-4">登入後即可查看播放清單</p>
                    <Button asChild>
                        <Link href="/">返回首頁</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    // 載入中
    if (loading) {
        return (
            <div className="container-custom py-8">
                <div className="space-y-4">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="grid gap-4 mt-8">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Card key={i} className="p-4 flex gap-4">
                                <Skeleton className="w-40 h-24 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 錯誤或找不到
    if (error || !playlist) {
        return (
            <div className="container-custom py-8">
                <Card className="p-8 text-center">
                    <p className="text-destructive">{error || "找不到此播放清單"}</p>
                    <Button asChild className="mt-4">
                        <Link href="/playlists">返回播放清單</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-custom py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* 標題區域 */}
                <Card className="p-6 mb-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-xl font-bold"
                                placeholder="播放清單名稱"
                            />
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm resize-none"
                                rows={2}
                                placeholder="描述（選填）"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleUpdatePlaylist}>儲存</Button>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                    取消
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold mb-2">{playlist.name}</h1>
                                    {playlist.description && (
                                        <p className="text-muted-foreground mb-2">{playlist.description}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {items.length} 部影片 • {playlist.is_public ? "公開" : "私人"}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsEditing(true)}
                                        title="編輯"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDeletePlaylist}
                                        className="text-destructive hover:text-destructive"
                                        title="刪除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* 播放按鈕 */}
                            {items.length > 0 && (
                                <div className="flex flex-col sm:flex-row gap-4 mt-4 items-start sm:items-center">
                                    <div className="flex gap-3">
                                        <Button onClick={handlePlayAll}>
                                            <Play className="w-4 h-4 mr-2" />
                                            播放全部
                                        </Button>
                                        <Button variant="outline" onClick={handleShufflePlay}>
                                            <Shuffle className="w-4 h-4 mr-2" />
                                            隨機播放
                                        </Button>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="startFromBeginning"
                                            checked={startFromBeginning}
                                            onCheckedChange={setStartFromBeginning}
                                        />
                                        <Label
                                            htmlFor="startFromBeginning"
                                            className="cursor-pointer"
                                        >
                                            從頭開始播放
                                        </Label>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>

                {/* 排序選項 */}
                {items.length > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-sm text-muted-foreground">排序方式：</span>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="position">自訂順序</SelectItem>
                                <SelectItem value="title">標題</SelectItem>
                                <SelectItem value="channel">頻道</SelectItem>
                                <SelectItem value="added_at">加入時間</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            title={sortOrder === "asc" ? "升冪" : "降冪"}
                        >
                            <ArrowUpDown className={`w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        </Button>
                    </div>
                )}

                {/* 影片列表 */}
                {items.length === 0 ? (
                    <Card className="p-8 text-center">
                        <ListVideo className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-bold mb-2">播放清單是空的</h2>
                        <p className="text-muted-foreground mb-4">瀏覽影片並將喜歡的加入播放清單</p>
                        <Button asChild>
                            <Link href="/">探索影片</Link>
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={sortedItems.map((item) => item.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {sortedItems.map((item, index) => {
                                    const progress = progressMap.get(item.video_id);
                                    const percent = progress && progress.duration > 0
                                        ? (progress.progress / progress.duration) * 100
                                        : 0;

                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <SortablePlaylistItem
                                                item={item}
                                                playlistId={playlistId}
                                                index={index}
                                                progressPercent={percent}
                                                onRemove={handleRemoveItem}
                                                isDragDisabled={sortBy !== "position"}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
