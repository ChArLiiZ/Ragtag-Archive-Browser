/**
 * 下載功能相關工具函數
 */

import type { ChatMessage, VideoMetadata, VideoFile, PlaylistItem } from "./types";
import { formatDuration } from "./api";

// ============================================
// 單檔下載
// ============================================

/**
 * 觸發瀏覽器下載
 * 使用 download 屬性觸發瀏覽器的下載行為
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 下載 Blob 資料
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  // 延遲釋放 URL 以確保下載開始
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 下載 JSON 資料
 */
export function downloadJson(data: object, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  downloadBlob(blob, filename);
}

/**
 * 下載文字檔案
 */
export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

// ============================================
// 聊天記錄下載
// ============================================

/**
 * 格式化聊天訊息為文字
 */
function formatChatMessage(message: ChatMessage): string {
  const time = formatDuration(Math.floor(message.time_in_seconds));
  const author = message.author.name;
  const badges = message.author.badges?.map((b) => `[${b.label}]`).join("") || "";
  return `[${time}] ${badges}${author}: ${message.message}`;
}

/**
 * 下載聊天記錄為純文字格式
 */
export function downloadChatAsText(
  messages: ChatMessage[],
  filename: string,
  videoTitle?: string
): void {
  const lines: string[] = [];

  // 加入標題資訊
  if (videoTitle) {
    lines.push(`聊天記錄 - ${videoTitle}`);
    lines.push(`訊息數量: ${messages.length}`);
    lines.push("=".repeat(50));
    lines.push("");
  }

  // 格式化每則訊息
  messages.forEach((msg) => {
    lines.push(formatChatMessage(msg));
  });

  downloadText(lines.join("\n"), filename);
}

/**
 * 下載聊天記錄為 JSON 格式
 */
export function downloadChatAsJson(
  messages: ChatMessage[],
  filename: string,
  metadata?: { videoId?: string; videoTitle?: string }
): void {
  const data = {
    metadata: {
      ...metadata,
      messageCount: messages.length,
      exportedAt: new Date().toISOString(),
    },
    messages,
  };
  downloadJson(data, filename);
}

// ============================================
// 影片資訊下載
// ============================================

/**
 * 下載影片元資料為 JSON
 */
export function downloadVideoMetadata(video: VideoMetadata, filename: string): void {
  downloadJson(video, filename);
}

/**
 * 下載影片元資料為可讀文字格式
 */
export function downloadVideoMetadataAsText(video: VideoMetadata, filename: string): void {
  const lines = [
    `影片資訊`,
    `=`.repeat(50),
    ``,
    `標題: ${video.title}`,
    `影片 ID: ${video.video_id}`,
    `頻道: ${video.channel_name}`,
    `頻道 ID: ${video.channel_id}`,
    `上傳日期: ${video.upload_date}`,
    `時長: ${formatDuration(video.duration)}`,
    `解析度: ${video.width}x${video.height}`,
    `FPS: ${video.fps}`,
    `觀看次數: ${video.view_count?.toLocaleString() || "N/A"}`,
    `讚數: ${video.like_count?.toLocaleString() || "N/A"}`,
    ``,
    `描述:`,
    `-`.repeat(50),
    video.description || "(無描述)",
    ``,
    `檔案列表:`,
    `-`.repeat(50),
    ...video.files.map((f) => `- ${f.name} (${formatFileSize(f.size)})`),
    ``,
    `存檔時間: ${video.archived_timestamp}`,
  ];

  downloadText(lines.join("\n"), filename);
}

// ============================================
// 播放清單批次下載
// ============================================

/**
 * 播放清單下載項目
 */
export interface PlaylistDownloadItem {
  playlistName: string;
  videoId: string;
  videoTitle: string;
  files: VideoFile[];
  driveBase?: string;
}

/**
 * 生成播放清單下載腳本
 * 生成可在命令行執行的下載腳本（支援資料夾結構）
 *
 * @param items 要下載的項目列表
 * @param options 選項
 * @returns 腳本內容
 */
export function generatePlaylistDownloadScript(
  items: PlaylistDownloadItem[],
  options: {
    format?: "bash" | "powershell" | "cmd";
    organizeByPlaylist?: boolean;
    contentBaseUrl?: string;
  } = {}
): string {
  const {
    format = "bash",
    organizeByPlaylist = true,
    contentBaseUrl = "https://content.archive.ragtag.moe",
  } = options;

  const lines: string[] = [];

  // 按播放清單分組
  const byPlaylist = new Map<string, PlaylistDownloadItem[]>();
  items.forEach((item) => {
    const key = item.playlistName;
    if (!byPlaylist.has(key)) {
      byPlaylist.set(key, []);
    }
    byPlaylist.get(key)!.push(item);
  });

  if (format === "bash") {
    lines.push("#!/bin/bash");
    lines.push("# 播放清單批次下載腳本");
    lines.push(`# 生成時間: ${new Date().toISOString()}`);
    lines.push(`# 影片數量: ${items.length}`);
    lines.push("");

    byPlaylist.forEach((playlistItems, playlistName) => {
      const safeName = sanitizeFilename(playlistName);
      if (organizeByPlaylist) {
        lines.push(`# 播放清單: ${playlistName}`);
        lines.push(`mkdir -p "${safeName}"`);
        lines.push(`cd "${safeName}"`);
      }

      playlistItems.forEach((item, index) => {
        const videoFile = item.files.find(
          (f) => f.name.endsWith(".mp4") || f.name.endsWith(".webm") || f.name.endsWith(".mkv")
        );
        if (videoFile) {
          const basePath = item.driveBase
            ? `${contentBaseUrl}/${normalizeDriveBase(item.driveBase)}/${item.videoId}`
            : `${contentBaseUrl}/${item.videoId}`;
          const url = `${basePath}/${videoFile.name}`;
          const filename = `${String(index + 1).padStart(3, "0")}_${sanitizeFilename(item.videoTitle)}_${item.videoId}${getExtension(videoFile.name)}`;

          lines.push(`echo "下載 (${index + 1}/${playlistItems.length}): ${item.videoTitle}"`);
          lines.push(`curl -L -o "${filename}" "${url}"`);
          lines.push("");
        }
      });

      if (organizeByPlaylist) {
        lines.push("cd ..");
        lines.push("");
      }
    });

    lines.push('echo "下載完成!"');
  } else if (format === "powershell") {
    lines.push("# 播放清單批次下載腳本 (PowerShell)");
    lines.push(`# 生成時間: ${new Date().toISOString()}`);
    lines.push(`# 影片數量: ${items.length}`);
    lines.push("");

    byPlaylist.forEach((playlistItems, playlistName) => {
      const safeName = sanitizeFilename(playlistName);
      if (organizeByPlaylist) {
        lines.push(`# 播放清單: ${playlistName}`);
        lines.push(`New-Item -ItemType Directory -Force -Path "${safeName}" | Out-Null`);
        lines.push(`Set-Location "${safeName}"`);
      }

      playlistItems.forEach((item, index) => {
        const videoFile = item.files.find(
          (f) => f.name.endsWith(".mp4") || f.name.endsWith(".webm") || f.name.endsWith(".mkv")
        );
        if (videoFile) {
          const basePath = item.driveBase
            ? `${contentBaseUrl}/${normalizeDriveBase(item.driveBase)}/${item.videoId}`
            : `${contentBaseUrl}/${item.videoId}`;
          const url = `${basePath}/${videoFile.name}`;
          const filename = `${String(index + 1).padStart(3, "0")}_${sanitizeFilename(item.videoTitle)}_${item.videoId}${getExtension(videoFile.name)}`;

          lines.push(`Write-Host "下載 (${index + 1}/${playlistItems.length}): ${item.videoTitle}"`);
          lines.push(`Invoke-WebRequest -Uri "${url}" -OutFile "${filename}"`);
          lines.push("");
        }
      });

      if (organizeByPlaylist) {
        lines.push("Set-Location ..");
        lines.push("");
      }
    });

    lines.push('Write-Host "下載完成!"');
  } else {
    // CMD batch
    lines.push("@echo off");
    lines.push("REM 播放清單批次下載腳本");
    lines.push(`REM 生成時間: ${new Date().toISOString()}`);
    lines.push(`REM 影片數量: ${items.length}`);
    lines.push("");

    byPlaylist.forEach((playlistItems, playlistName) => {
      const safeName = sanitizeFilename(playlistName);
      if (organizeByPlaylist) {
        lines.push(`REM 播放清單: ${playlistName}`);
        lines.push(`if not exist "${safeName}" mkdir "${safeName}"`);
        lines.push(`cd "${safeName}"`);
      }

      playlistItems.forEach((item, index) => {
        const videoFile = item.files.find(
          (f) => f.name.endsWith(".mp4") || f.name.endsWith(".webm") || f.name.endsWith(".mkv")
        );
        if (videoFile) {
          const basePath = item.driveBase
            ? `${contentBaseUrl}/${normalizeDriveBase(item.driveBase)}/${item.videoId}`
            : `${contentBaseUrl}/${item.videoId}`;
          const url = `${basePath}/${videoFile.name}`;
          const filename = `${String(index + 1).padStart(3, "0")}_${sanitizeFilename(item.videoTitle)}_${item.videoId}${getExtension(videoFile.name)}`;

          lines.push(`echo 下載 (${index + 1}/${playlistItems.length}): ${item.videoTitle}`);
          lines.push(`curl -L -o "${filename}" "${url}"`);
          lines.push("");
        }
      });

      if (organizeByPlaylist) {
        lines.push("cd ..");
        lines.push("");
      }
    });

    lines.push("echo 下載完成!");
    lines.push("pause");
  }

  return lines.join("\n");
}

/**
 * 下載播放清單下載腳本
 */
export function downloadPlaylistScript(
  items: PlaylistDownloadItem[],
  playlistName: string,
  format: "bash" | "powershell" | "cmd" = "bash"
): void {
  const script = generatePlaylistDownloadScript(items, {
    format,
    organizeByPlaylist: true,
  });

  const extensions = {
    bash: "sh",
    powershell: "ps1",
    cmd: "bat",
  };

  const filename = `download_${sanitizeFilename(playlistName)}.${extensions[format]}`;
  downloadText(script, filename);
}

/**
 * 生成播放清單下載 URL 列表
 */
export function generatePlaylistUrlList(
  items: PlaylistDownloadItem[],
  options: {
    includeMetadata?: boolean;
    contentBaseUrl?: string;
  } = {}
): string {
  const {
    includeMetadata = true,
    contentBaseUrl = "https://content.archive.ragtag.moe",
  } = options;

  const lines: string[] = [];

  if (includeMetadata) {
    lines.push(`# 播放清單下載連結`);
    lines.push(`# 生成時間: ${new Date().toISOString()}`);
    lines.push(`# 影片數量: ${items.length}`);
    lines.push("");
  }

  items.forEach((item, index) => {
    const videoFile = item.files.find(
      (f) => f.name.endsWith(".mp4") || f.name.endsWith(".webm") || f.name.endsWith(".mkv")
    );
    if (videoFile) {
      const basePath = item.driveBase
        ? `${contentBaseUrl}/${normalizeDriveBase(item.driveBase)}/${item.videoId}`
        : `${contentBaseUrl}/${item.videoId}`;
      const url = `${basePath}/${videoFile.name}`;

      if (includeMetadata) {
        lines.push(`# ${index + 1}. ${item.videoTitle}`);
      }
      lines.push(url);
      if (includeMetadata) {
        lines.push("");
      }
    }
  });

  return lines.join("\n");
}

/**
 * 下載播放清單 URL 列表
 */
export function downloadPlaylistUrlList(
  items: PlaylistDownloadItem[],
  playlistName: string
): void {
  const content = generatePlaylistUrlList(items, { includeMetadata: true });
  const filename = `${sanitizeFilename(playlistName)}_urls.txt`;
  downloadText(content, filename);
}

// ============================================
// 輔助函數
// ============================================

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * 清理檔案名（移除不安全字元）
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 100); // 限制長度
}

/**
 * 取得副檔名
 */
function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

/**
 * 正規化 drive_base
 */
function normalizeDriveBase(driveBase: string): string {
  if (driveBase.startsWith("gd:")) {
    return driveBase;
  }
  if (!driveBase.includes(":")) {
    return `gd:${driveBase}`;
  }
  return driveBase;
}
