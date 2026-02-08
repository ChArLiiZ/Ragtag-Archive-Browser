"use client";

import { useState, useEffect } from "react";
import type { PlaylistItem, VideoFile } from "@/lib/types";
import { getVideoById, formatFileSize, normalizeDriveBase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown, FileVideo, Loader2, ExternalLink } from "lucide-react";

// 內容基礎 URL
const CONTENT_BASE_URL =
  process.env.NEXT_PUBLIC_CONTENT_BASE_URL ||
  "https://content.archive.ragtag.moe";

interface PlaylistDownloadProps {
  playlistName: string;
  items: PlaylistItem[];
}

interface DownloadItem {
  videoId: string;
  videoTitle: string;
  filename: string;
  url: string;
  size: number;
}

export function PlaylistDownload({ playlistName, items }: PlaylistDownloadProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadItems, setDownloadItems] = useState<DownloadItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 當對話框開啟時，載入所有影片的詳細資訊
  useEffect(() => {
    if (!open || items.length === 0) return;

    const loadVideoDetails = async () => {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      const results: DownloadItem[] = [];
      const total = items.length;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          const videoData = await getVideoById(item.video_id);
          if (videoData && videoData.files.length > 0) {
            // 找到主要的影片檔案
            const videoFile = videoData.files.find(
              (f) => f.name.endsWith(".mp4") || f.name.endsWith(".webm") || f.name.endsWith(".mkv")
            );
            if (videoFile) {
              const basePath = videoData.drive_base
                ? `${CONTENT_BASE_URL}/${normalizeDriveBase(videoData.drive_base)}/${item.video_id}`
                : `${CONTENT_BASE_URL}/${item.video_id}`;

              results.push({
                videoId: item.video_id,
                videoTitle: item.video_title || videoData.title || item.video_id,
                filename: videoFile.name,
                url: `${basePath}/${videoFile.name}`,
                size: videoFile.size,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to load video ${item.video_id}:`, err);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      if (results.length === 0) {
        setError("無法取得任何影片的檔案資訊");
      } else {
        setDownloadItems(results);
      }

      setIsLoading(false);
    };

    loadVideoDetails();
  }, [open, items]);

  // 計算總大小
  const totalSize = downloadItems.reduce((sum, item) => sum + item.size, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="w-4 h-4 mr-2" />
          下載清單
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            下載播放清單
          </DialogTitle>
          <DialogDescription>
            點擊下方連結直接下載影片
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 載入進度 */}
          {isLoading && (
            <div className="space-y-2 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">載入影片資訊...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 摘要 */}
          {!isLoading && downloadItems.length > 0 && (
            <>
              <div className="flex justify-between text-sm py-2 border-b mb-2">
                <span className="text-muted-foreground">
                  {downloadItems.length} 部影片
                </span>
                <span className="font-medium">
                  總計 {formatFileSize(totalSize)}
                </span>
              </div>

              {/* 下載連結列表 */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {downloadItems.map((item, index) => (
                  <a
                    key={item.videoId}
                    href={item.url}
                    download={item.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
                      {index + 1}.
                    </span>
                    <FileVideo className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate group-hover:text-primary transition-colors" title={item.videoTitle}>
                        {item.videoTitle}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFileSize(item.size)}
                    </span>
                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </a>
                ))}
              </div>

              {/* 提示 */}
              <p className="text-xs text-muted-foreground pt-3 border-t mt-2">
                點擊每個項目即可下載。由於跨域限制，部分瀏覽器可能會在新分頁開啟檔案而非直接下載。
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
