// ============================================
// Ragtag Archive API 類型定義
// ============================================

/**
 * 影片檔案資訊
 */
export interface VideoFile {
  name: string;
  size: number;
  url?: string;
}

/**
 * 影片時間戳資訊（直播用）
 */
export interface VideoTimestamps {
  actualStartTime: string | null;
  publishedAt: string | null;
  scheduledStartTime: string | null;
  actualEndTime: string | null;
}

/**
 * 影片元資料
 */
export interface VideoMetadata {
  video_id: string;
  channel_name: string;
  channel_id: string;
  upload_date: string;
  title: string;
  description: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  format_id: string;
  view_count: number;
  like_count: number;
  dislike_count: number;
  files: VideoFile[];
  drive_base?: string;
  archived_timestamp: string;
  timestamps?: VideoTimestamps;
}

/**
 * 搜尋結果項目
 */
export interface SearchHit {
  _id: string;
  _score: number;
  _source: VideoMetadata;
}

/**
 * 搜尋回應
 */
export interface SearchResponse {
  took: number;
  timed_out: boolean;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: SearchHit[];
  };
}

/**
 * 搜尋選項
 */
export interface SearchOptions {
  query?: string;
  videoId?: string;
  channelId?: string;
  sort?: SortField;
  sortOrder?: SortOrder;
  from?: number;
  size?: number;
}

/**
 * 排序欄位
 */
export type SortField =
  | "relevance"
  | "archived_timestamp"
  | "upload_date"
  | "duration"
  | "view_count"
  | "like_count"
  | "dislike_count";

/**
 * 排序順序
 */
export type SortOrder = "asc" | "desc";

// ============================================
// Supabase 資料庫類型定義
// ============================================

/**
 * 用戶資料
 */
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * 收藏
 */
export interface Favorite {
  id: string;
  user_id: string;
  video_id: string;
  video_title: string | null;
  channel_name: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

/**
 * 播放清單
 */
export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 播放清單項目
 */
export interface PlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  video_title: string | null;
  channel_name: string | null;
  thumbnail_url: string | null;
  position: number;
  added_at: string;
}

/**
 * 觀看紀錄
 */
export interface WatchHistory {
  id: string;
  user_id: string;
  video_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  last_watched_at: string;
}

// ============================================
// UI 相關類型
// ============================================

/**
 * 分頁資訊
 */
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * 載入狀態
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Toast 通知類型
 */
export type ToastType = "success" | "error" | "info" | "warning";

/**
 * Toast 通知
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ============================================
// 聊天重播類型
// ============================================

/**
 * 聊天訊息
 */
export interface ChatMessage {
  id: string;
  author: {
    id: string;
    name: string;
    images?: Array<{ url: string }>;
    badges?: Array<{ label: string }>;
  };
  message: string;
  timestamp: number;
  time_in_seconds: number;
}

/**
 * 聊天記錄檔案格式
 */
export interface ChatReplayData {
  messages: ChatMessage[];
}
