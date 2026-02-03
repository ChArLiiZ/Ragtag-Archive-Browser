"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X } from "lucide-react";
import type { PlaylistItem } from "@/lib/types";

interface SortablePlaylistItemProps {
  item: PlaylistItem;
  playlistId: string;
  index: number;
  progressPercent?: number;
  onRemove: (videoId: string) => void;
  isDragDisabled?: boolean;
}

export function SortablePlaylistItem({
  item,
  playlistId,
  index,
  progressPercent = 0,
  onRemove,
  isDragDisabled = false,
}: SortablePlaylistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`p-3 flex gap-4 group hover:bg-accent/50 transition-colors ${
          isDragging ? "shadow-lg ring-2 ring-primary" : ""
        }`}
      >
        {/* 拖曳手柄 */}
        {!isDragDisabled && (
          <div
            {...attributes}
            {...listeners}
            className="w-8 flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 hover:text-foreground transition-colors"
            title="拖曳以排序"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        {/* 序號（禁用拖曳時顯示） */}
        {isDragDisabled && (
          <div className="w-8 flex items-center justify-center text-muted-foreground shrink-0">
            {index + 1}
          </div>
        )}

        {/* 縮圖 */}
        <Link
          href={`/watch/${item.video_id}?playlist=${playlistId}`}
          className="relative w-40 h-24 shrink-0 overflow-hidden rounded-lg bg-muted"
        >
          {item.thumbnail_url && (
            <img
              src={item.thumbnail_url}
              alt={item.video_title || ""}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          )}
          {/* 觀看進度條 */}
          {progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div
                className="h-full bg-red-600"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          )}
        </Link>

        {/* 資訊 */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/watch/${item.video_id}?playlist=${playlistId}`}
            className="block group-hover:text-primary transition-colors"
          >
            <h3 className="font-medium line-clamp-2 mb-1">
              {item.video_title || "未知標題"}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">
            {item.channel_name || "未知頻道"}
          </p>
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.video_id)}
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="移除"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
