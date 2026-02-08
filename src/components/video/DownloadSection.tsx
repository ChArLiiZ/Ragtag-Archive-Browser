"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VideoMetadata, VideoFile, ChatMessage } from "@/lib/types";
import { formatFileSize, normalizeDriveBase } from "@/lib/api";
import {
  downloadChatAsText,
  downloadChatAsJson,
  downloadVideoMetadata,
  downloadVideoMetadataAsText,
} from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  ChevronDown,
  ChevronUp,
  FileVideo,
  FileImage,
  FileJson,
  FileText,
  MessageSquare,
  Info,
  ExternalLink,
} from "lucide-react";

// 內容基礎 URL
const CONTENT_BASE_URL =
  process.env.NEXT_PUBLIC_CONTENT_BASE_URL ||
  "https://content.archive.ragtag.moe";

interface DownloadSectionProps {
  video: VideoMetadata;
  chatMessages?: ChatMessage[];
  isLoadingChat?: boolean;
}

/**
 * 取得檔案 URL
 */
function getFileUrl(videoId: string, filename: string, driveBase?: string): string {
  const basePath = driveBase
    ? `${CONTENT_BASE_URL}/${normalizeDriveBase(driveBase)}/${videoId}`
    : `${CONTENT_BASE_URL}/${videoId}`;
  return `${basePath}/${filename}`;
}

/**
 * 取得檔案圖示
 */
function getFileIcon(filename: string) {
  if (filename.endsWith(".mp4") || filename.endsWith(".webm") || filename.endsWith(".mkv")) {
    return FileVideo;
  }
  if (filename.endsWith(".jpg") || filename.endsWith(".webp") || filename.endsWith(".png")) {
    return FileImage;
  }
  if (filename.endsWith(".json")) {
    return FileJson;
  }
  return FileText;
}

/**
 * 取得檔案類型標籤
 */
function getFileTypeLabel(filename: string): string {
  if (filename.endsWith(".mp4")) return "MP4";
  if (filename.endsWith(".webm")) return "WebM";
  if (filename.endsWith(".mkv")) return "MKV";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "JPG";
  if (filename.endsWith(".webp")) return "WebP";
  if (filename.endsWith(".png")) return "PNG";
  if (filename.endsWith(".json")) return "JSON";
  if (filename.endsWith(".txt")) return "TXT";
  return "檔案";
}

/**
 * 分類檔案
 */
function categorizeFiles(files: VideoFile[]) {
  const videos: VideoFile[] = [];
  const images: VideoFile[] = [];
  const others: VideoFile[] = [];

  files.forEach((file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mkv")) {
      videos.push(file);
    } else if (
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp") ||
      name.endsWith(".png")
    ) {
      images.push(file);
    } else {
      others.push(file);
    }
  });

  return { videos, images, others };
}

export function DownloadSection({
  video,
  chatMessages,
  isLoadingChat,
}: DownloadSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { videos, images, others } = categorizeFiles(video.files);
  const hasChatMessages = chatMessages && chatMessages.length > 0;

  // 下載聊天記錄
  const handleDownloadChat = (format: "txt" | "json") => {
    if (!chatMessages) return;

    if (format === "txt") {
      downloadChatAsText(
        chatMessages,
        `${video.video_id}_chat.txt`,
        video.title
      );
    } else {
      downloadChatAsJson(chatMessages, `${video.video_id}_chat.json`, {
        videoId: video.video_id,
        videoTitle: video.title,
      });
    }
  };

  // 下載影片資訊
  const handleDownloadMetadata = (format: "json" | "txt") => {
    if (format === "json") {
      downloadVideoMetadata(video, `${video.video_id}_info.json`);
    } else {
      downloadVideoMetadataAsText(video, `${video.video_id}_info.txt`);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                下載
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent forceMount>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 space-y-3">
                  {/* 影片檔案 - 直接下載連結 */}
                  {videos.length > 0 && (
                    <div className="space-y-2">
                      {videos.map((file) => (
                        <FileDownloadLink
                          key={file.name}
                          file={file}
                          url={getFileUrl(video.video_id, file.name, video.drive_base)}
                        />
                      ))}
                    </div>
                  )}

                  {/* 縮圖 */}
                  {images.length > 0 && (
                    <div className="space-y-2">
                      {images.map((file) => (
                        <FileDownloadLink
                          key={file.name}
                          file={file}
                          url={getFileUrl(video.video_id, file.name, video.drive_base)}
                        />
                      ))}
                    </div>
                  )}

                  {/* 其他檔案 */}
                  {others.length > 0 && (
                    <div className="space-y-2">
                      {others.map((file) => (
                        <FileDownloadLink
                          key={file.name}
                          file={file}
                          url={getFileUrl(video.video_id, file.name, video.drive_base)}
                        />
                      ))}
                    </div>
                  )}

                  {/* 聊天記錄和影片資訊 - 較小的區塊 */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {/* 聊天記錄 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!hasChatMessages}
                          className="text-xs"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {isLoadingChat
                            ? "載入中..."
                            : hasChatMessages
                              ? `聊天記錄 (${chatMessages.length})`
                              : "無聊天記錄"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleDownloadChat("txt")}>
                          <FileText className="h-4 w-4 mr-2" />
                          純文字 (.txt)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadChat("json")}>
                          <FileJson className="h-4 w-4 mr-2" />
                          JSON (.json)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 影片資訊 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Info className="h-3 w-3 mr-1" />
                          影片資訊
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleDownloadMetadata("txt")}>
                          <FileText className="h-4 w-4 mr-2" />
                          可讀格式 (.txt)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadMetadata("json")}>
                          <FileJson className="h-4 w-4 mr-2" />
                          JSON (.json)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Card>
    </Collapsible>
  );
}

/**
 * 檔案下載連結 - 直接點擊下載
 */
function FileDownloadLink({
  file,
  url,
}: {
  file: VideoFile;
  url: string;
}) {
  const Icon = getFileIcon(file.name);
  const typeLabel = getFileTypeLabel(file.name);

  return (
    <a
      href={url}
      download={file.name}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate group-hover:text-primary transition-colors" title={file.name}>
          {file.name}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {typeLabel} • {formatFileSize(file.size)}
      </span>
      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </a>
  );
}
