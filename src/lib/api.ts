import type {
  SearchResponse,
  SearchOptions,
  VideoMetadata,
  VideoFile,
  SortField,
  SortOrder,
} from "./types";
import {
  videoCache,
  searchCache,
  channelCache,
  getSearchCacheKey,
  getVideoCacheKey,
  getChannelCacheKey,
} from "./cache";

// API 基礎 URL
// 在客戶端使用代理路徑避免 CORS 問題
const isClient = typeof window !== "undefined";
const API_BASE_URL = isClient
  ? "" // 使用相對路徑，透過 Next.js rewrites 代理
  : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://archive.ragtag.moe");
const API_PATH = isClient ? "/api/proxy" : "/api";
const CONTENT_BASE_URL =
  process.env.NEXT_PUBLIC_CONTENT_BASE_URL ||
  "https://content.archive.ragtag.moe";

/**
 * 搜尋影片（原始請求，不含快取）
 */
async function searchVideosRaw(
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const params = new URLSearchParams();

  if (options.query) {
    params.set("q", options.query);
  }
  if (options.videoId) {
    params.set("v", options.videoId);
  }
  if (options.channelId) {
    params.set("channel_id", options.channelId);
  }
  // 當使用相關性排序時，不傳送 sort 和 sort_order 參數
  // 讓 API 使用預設的相關性評分排序
  if (options.sort && options.sort !== "relevance") {
    params.set("sort", options.sort);
    // sort_order 只在有明確指定 sort 欄位時才有意義
    if (options.sortOrder) {
      params.set("sort_order", options.sortOrder);
    }
  }
  if (options.from !== undefined) {
    params.set("from", String(options.from));
  }
  if (options.size !== undefined) {
    params.set("size", String(options.size));
  }

  const response = await fetch(`${API_BASE_URL}${API_PATH}/v1/search?${params}`);

  if (!response.ok) {
    throw new Error(`搜尋失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 搜尋影片（帶快取和請求去重）
 */
export async function searchVideos(
  options: SearchOptions = {},
  cacheOptions?: { forceRefresh?: boolean }
): Promise<SearchResponse> {
  const cacheKey = getSearchCacheKey(options);

  return searchCache.fetch(
    cacheKey,
    () => searchVideosRaw(options),
    { forceRefresh: cacheOptions?.forceRefresh }
  );
}

/**
 * 取得單一影片資訊（帶快取）
 */
export async function getVideoById(
  videoId: string,
  cacheOptions?: { forceRefresh?: boolean }
): Promise<VideoMetadata | null> {
  const cacheKey = getVideoCacheKey(videoId);

  return videoCache.fetch(
    cacheKey,
    async () => {
      const response = await searchVideosRaw({ videoId, size: 1 });

      if (response.hits.hits.length === 0) {
        return null;
      }

      return response.hits.hits[0]._source;
    },
    { forceRefresh: cacheOptions?.forceRefresh }
  );
}

/**
 * 取得頻道影片（帶快取）
 */
export async function getChannelVideos(
  channelId: string,
  options: {
    sort?: SortField;
    sortOrder?: SortOrder;
    from?: number;
    size?: number;
  } = {},
  cacheOptions?: { forceRefresh?: boolean }
): Promise<SearchResponse> {
  const cacheKey = getChannelCacheKey(
    `${channelId}:${options.sort || "upload_date"}:${options.sortOrder || "desc"}:${options.from || 0}:${options.size || 20}`
  );

  return channelCache.fetch(
    cacheKey,
    () =>
      searchVideosRaw({
        channelId,
        sort: options.sort || "upload_date",
        sortOrder: options.sortOrder || "desc",
        from: options.from,
        size: options.size || 20,
      }),
    { forceRefresh: cacheOptions?.forceRefresh }
  );
}

/**
 * 取得最新影片
 */
export async function getLatestVideos(
  size: number = 20
): Promise<SearchResponse> {
  return searchVideos({
    sort: "archived_timestamp",
    sortOrder: "desc",
    size,
  });
}

/**
 * 取得熱門影片
 */
export async function getPopularVideos(
  size: number = 20
): Promise<SearchResponse> {
  return searchVideos({
    sort: "view_count",
    sortOrder: "desc",
    size,
  });
}

// ============================================
// URL 生成函數
// ============================================

/**
 * 正規化 drive_base 格式
 * 確保 drive_base 有正確的前綴格式
 */
export function normalizeDriveBase(driveBase: string): string {
  // 如果已經有 gd: 前綴，直接返回
  if (driveBase.startsWith('gd:')) {
    return driveBase;
  }
  // 如果是純 ID（沒有冒號），加上 gd: 前綴
  if (!driveBase.includes(':')) {
    return `gd:${driveBase}`;
  }
  // 其他格式保持原樣
  return driveBase;
}

/**
 * 從影片資料中取得縮圖 URL
 * 根據官方實作：從 files 中找到 .webp 或 .jpg 檔案
 */
export function getThumbnailUrl(videoId: string, driveBase?: string, files?: VideoFile[]): string {
  // 如果有 files，嘗試找到縮圖檔案
  if (files && files.length > 0) {
    const thumbFile = files.find(
      (file) => file.name.endsWith('.webp') || file.name.endsWith('.jpg')
    );
    if (thumbFile && driveBase) {
      // 構建 URL：CONTENT_BASE_URL / normalized_drive_base / video_id / filename
      const normalizedBase = normalizeDriveBase(driveBase);
      return `${CONTENT_BASE_URL}/${normalizedBase}/${videoId}/${thumbFile.name}`;
    }
  }

  // 預設格式（不使用 drive_base）
  return `${CONTENT_BASE_URL}/${videoId}/${videoId}.webp`;
}

/**
 * 取得備用縮圖 URL 列表
 * 當主要 URL 載入失敗時可嘗試的備用 URL
 */
export function getFallbackThumbnailUrls(videoId: string, driveBase?: string, files?: VideoFile[]): string[] {
  const urls: string[] = [];

  // 嘗試不同的縮圖格式
  const extensions = ['.webp', '.jpg'];

  // 方案 1：使用 drive_base（如果有的話）
  if (driveBase) {
    const normalizedBase = normalizeDriveBase(driveBase);
    for (const ext of extensions) {
      urls.push(`${CONTENT_BASE_URL}/${normalizedBase}/${videoId}/${videoId}${ext}`);
    }
  }

  // 方案 2：直接使用 video_id 路徑
  for (const ext of extensions) {
    urls.push(`${CONTENT_BASE_URL}/${videoId}/${videoId}${ext}`);
  }

  // 方案 3：從 files 中找其他可能的縮圖
  if (files) {
    const thumbFiles = files.filter(
      (file) => file.name.endsWith('.webp') || file.name.endsWith('.jpg')
    );
    for (const thumbFile of thumbFiles) {
      if (driveBase) {
        const normalizedBase = normalizeDriveBase(driveBase);
        urls.push(`${CONTENT_BASE_URL}/${normalizedBase}/${videoId}/${thumbFile.name}`);
      }
      urls.push(`${CONTENT_BASE_URL}/${videoId}/${thumbFile.name}`);
    }
  }

  // 去重
  return Array.from(new Set(urls));
}

/**
 * 取得影片檔案 URL
 */
export function getVideoUrl(videoId: string, files: VideoFile[], driveBase?: string): string | null {
  // 構建基礎路徑
  const basePath = driveBase
    ? `${CONTENT_BASE_URL}/${normalizeDriveBase(driveBase)}/${videoId}`
    : `${CONTENT_BASE_URL}/${videoId}`;

  // 優先選擇 MP4，其次 WebM（完整影片檔案，非分軌）
  const mp4File = files.find((f) => f.name.endsWith(".mp4"));
  if (mp4File) {
    return `${basePath}/${mp4File.name}`;
  }

  const webmFile = files.find(
    (f) => f.name.endsWith(".webm") && !f.name.includes(".f")
  );
  if (webmFile) {
    return `${basePath}/${webmFile.name}`;
  }

  // 找 MKV 格式
  const mkvFile = files.find((f) => f.name.endsWith(".mkv"));
  if (mkvFile) {
    return `${basePath}/${mkvFile.name}`;
  }

  // 如果沒有找到主要格式，嘗試任何影片檔案（包含分軌）
  const anyVideo = files.find(
    (f) => f.name.endsWith(".mp4") || f.name.endsWith(".webm") || f.name.endsWith(".mkv")
  );
  if (anyVideo) {
    return `${basePath}/${anyVideo.name}`;
  }

  return null;
}

/**
 * 取得聊天記錄 URL
 */
export function getChatUrl(videoId: string): string {
  return `${CONTENT_BASE_URL}/${videoId}/${videoId}.chat.json`;
}

/**
 * 取得頻道頭像 URL
 */
export function getChannelAvatarUrl(channelId: string): string {
  return `${CONTENT_BASE_URL}/${channelId}/profile.jpg`;
}

/**
 * 取得嵌入播放器 URL
 */
export function getEmbedUrl(videoId: string): string {
  return `${API_BASE_URL}/embed/${videoId}`;
}

// ============================================
// 輔助函數
// ============================================

/**
 * 格式化時長（秒 -> HH:MM:SS 或 MM:SS）
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 格式化觀看次數
 */
export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

/**
 * 格式化日期（YYYYMMDD -> YYYY/MM/DD）
 */
export function formatUploadDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;

  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);

  return `${year}/${month}/${day}`;
}

/**
 * 格式化相對時間
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears} 年前`;
  if (diffMonths > 0) return `${diffMonths} 個月前`;
  if (diffWeeks > 0) return `${diffWeeks} 週前`;
  if (diffDays > 0) return `${diffDays} 天前`;
  if (diffHours > 0) return `${diffHours} 小時前`;
  if (diffMinutes > 0) return `${diffMinutes} 分鐘前`;
  return "剛剛";
}

/**
 * 檔案大小格式化
 */
export function formatFileSize(bytes: number): string {
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

// ============================================
// 推薦功能輔助函數
// ============================================

/**
 * 停用詞列表（中日英常見詞彙）
 */
const STOP_WORDS = new Set([
  // 中文
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "個",
  "上", "也", "很", "到", "說", "要", "去", "你", "會", "著", "沒", "看", "好",
  "自己", "這", "那", "什麼", "怎麼", "為什麼", "可以", "因為", "所以",
  // 日文
  "の", "に", "は", "を", "が", "で", "と", "た", "し", "て", "も", "な", "か",
  "ら", "だ", "です", "ます", "する", "ある", "いる", "れる", "られる",
  // 英文
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "can", "to", "of", "in", "for", "on",
  "with", "at", "by", "from", "or", "and", "but", "not", "this", "that",
  "it", "as", "so", "if", "what", "when", "where", "how", "why", "who",
  // 常見標記
  "【", "】", "「", "」", "[", "]", "(", ")", "【", "】",
  "live", "stream", "streaming", "archive", "vol", "part", "ep", "episode",
  // 直播/影片常見無意義詞
  "配信", "放送", "生放送", "アーカイブ", "切り抜き", "まとめ",
  "free", "chat", "waiting", "room", "premiere", "shorts",
]);

/**
 * VTuber/直播常見的有意義標籤模式
 * 這些詞如果出現，應該被保留為關鍵字
 */
const IMPORTANT_PATTERNS = [
  // 遊戲名稱常見格式
  /^[a-z]+craft$/i,        // Minecraft, Warcraft 等
  /^[a-z]+zone$/i,         // Warzone 等
  /^[a-z]+legends?$/i,     // Apex Legends 等
  /^genshin$/i,
  /^原神$/,
  /^minecraft$/i,
  /^apex$/i,
  /^valorant$/i,
  /^fortnite$/i,
  /^elden\s?ring$/i,
  /^艾爾登法環$/,
  /^雀魂$/,
  /^麻雀$/,
  /^雑談$/,
  /^歌枠$/,
  /^歌回$/,
  /^耐久$/,
  /^コラボ$/,
  /^collab$/i,
  /^cover$/i,
  /^original$/i,
  /^mv$/i,
  /^asmr$/i,
  /^karaoke$/i,
];

/**
 * 從影片標題提取搜尋關鍵字（改進版）
 *
 * 改進點：
 * 1. 保留括號內的重要內容（如遊戲名）
 * 2. 識別 VTuber 常見的標籤格式
 * 3. 對中文/日文進行 n-gram 處理
 * 4. 優先提取有意義的複合詞
 *
 * @param title 影片標題
 * @param maxKeywords 最多返回幾個關鍵字
 * @returns 關鍵字字串（空格分隔）
 */
export function extractKeywords(title: string, maxKeywords: number = 3): string {
  const keywords: string[] = [];

  // 第一步：提取括號內的內容（通常是遊戲名或主題標籤）
  const bracketContents = title.match(/【([^】]+)】|「([^」]+)」|\[([^\]]+)\]|（([^）]+)）/g);
  if (bracketContents) {
    bracketContents.forEach((match) => {
      // 移除括號
      const content = match.replace(/[【】「」\[\]（）]/g, "").trim();
      // 如果內容看起來像遊戲名或主題，加入關鍵字
      if (content.length >= 2 && content.length <= 30 && !isCommonPhrase(content)) {
        keywords.push(content);
      }
    });
  }

  // 第二步：處理剩餘標題
  let cleaned = title
    // 先移除已提取的括號內容
    .replace(/【[^】]*】|「[^」]*」|\[[^\]]*\]|（[^）]*）/g, " ")
    // 移除其他特殊符號
    .replace(/[#@!！?？。，、：；~～♪♡★☆]/g, " ")
    // 移除純數字（如日期、編號）
    .replace(/\b\d+\b/g, " ");

  // 第三步：分詞處理
  const segments = cleaned.split(/[\s\-_\/\\|・→]+/).filter(Boolean);

  segments.forEach((segment) => {
    const trimmed = segment.trim();
    if (trimmed.length < 2) return;

    // 檢查是否符合重要模式
    const isImportant = IMPORTANT_PATTERNS.some((p) => p.test(trimmed));
    if (isImportant) {
      keywords.push(trimmed);
      return;
    }

    // 英文詞處理
    if (/^[a-zA-Z]+$/.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      if (!STOP_WORDS.has(lower) && trimmed.length >= 3) {
        keywords.push(trimmed);
      }
      return;
    }

    // 中日文處理：提取連續的中日文字符
    const cjkMatches = trimmed.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g);
    if (cjkMatches) {
      cjkMatches.forEach((cjk) => {
        if (cjk.length >= 2 && !STOP_WORDS.has(cjk)) {
          keywords.push(cjk);
        }
      });
    }
  });

  // 第四步：去重、過濾停用詞、取前 N 個
  const uniqueKeywords = Array.from(new Set(keywords))
    .filter((kw) => {
      const lower = kw.toLowerCase();
      return !STOP_WORDS.has(lower) && !STOP_WORDS.has(kw);
    })
    .slice(0, maxKeywords);

  return uniqueKeywords.join(" ");
}

/**
 * 判斷是否為常見的無意義短語
 */
function isCommonPhrase(text: string): boolean {
  const commonPhrases = [
    "初見", "初見プレイ", "参加型", "参加OK",
    "メン限", "アーカイブ", "切り抜き",
    "日本語", "中文", "English",
    "Part", "Vol", "EP",
  ];
  return commonPhrases.some((p) =>
    text.toLowerCase() === p.toLowerCase() ||
    text === p
  );
}

// ============================================
// 快取管理函數
// ============================================

/**
 * 清除所有 API 快取
 */
export function clearAllCache(): void {
  videoCache.clear();
  searchCache.clear();
  channelCache.clear();
}

/**
 * 清除特定影片的快取
 */
export function invalidateVideoCache(videoId: string): void {
  videoCache.invalidate(`video:${videoId}`);
}

/**
 * 清除搜尋快取
 */
export function invalidateSearchCache(): void {
  searchCache.clear();
}

/**
 * 清除頻道快取
 */
export function invalidateChannelCache(channelId?: string): void {
  if (channelId) {
    channelCache.invalidate(`channel:${channelId}`);
  } else {
    channelCache.clear();
  }
}

/**
 * 取得快取統計資訊
 */
export function getCacheStats() {
  return {
    video: videoCache.getStats(),
    search: searchCache.getStats(),
    channel: channelCache.getStats(),
  };
}
