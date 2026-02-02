import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 檢查是否有配置 Supabase
export const isSupabaseConfigured =
  supabaseUrl !== "" &&
  supabaseUrl !== "your-supabase-url" &&
  supabaseAnonKey !== "" &&
  supabaseAnonKey !== "your-supabase-anon-key" &&
  supabaseUrl.startsWith("https://");

// 建立 Supabase 客戶端（只有在配置有效時才建立）
// @ts-ignore - 允許在未配置時使用空客戶端
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error("Supabase not configured") }),
        signUp: async () => ({ error: new Error("Supabase not configured") }),
        signOut: async () => {},
        signInWithOAuth: async () => ({ error: new Error("Supabase not configured") }),
        exchangeCodeForSession: async () => ({ error: new Error("Supabase not configured") }),
      },
      from: () => ({
        select: () => ({ data: null, error: new Error("Supabase not configured") }),
        insert: () => ({ data: null, error: new Error("Supabase not configured") }),
        update: () => ({ data: null, error: new Error("Supabase not configured") }),
        delete: () => ({ data: null, error: new Error("Supabase not configured") }),
        upsert: () => ({ data: null, error: new Error("Supabase not configured") }),
      }),
    } as unknown as SupabaseClient);

// ============================================
// 資料庫操作函數
// ============================================

// ---------- 收藏相關 ----------

/**
 * 取得用戶收藏列表
 */
export async function getFavorites(userId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 新增收藏
 */
export async function addFavorite(
  userId: string,
  videoId: string,
  videoTitle?: string,
  channelName?: string,
  thumbnailUrl?: string
) {
  const { data, error } = await supabase
    .from("favorites")
    .insert({
      user_id: userId,
      video_id: videoId,
      video_title: videoTitle,
      channel_name: channelName,
      thumbnail_url: thumbnailUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 移除收藏
 */
export async function removeFavorite(userId: string, videoId: string) {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("video_id", videoId);

  if (error) throw error;
}

/**
 * 檢查是否已收藏
 */
export async function isFavorited(userId: string, videoId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

// ---------- 播放清單相關 ----------

/**
 * 取得用戶播放清單
 */
export async function getPlaylists(userId: string) {
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 建立播放清單
 */
export async function createPlaylist(
  userId: string,
  name: string,
  description?: string,
  isPublic: boolean = false
) {
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: userId,
      name,
      description,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新播放清單
 */
export async function updatePlaylist(
  playlistId: string,
  updates: { name?: string; description?: string; is_public?: boolean }
) {
  const { data, error } = await supabase
    .from("playlists")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", playlistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 刪除播放清單
 */
export async function deletePlaylist(playlistId: string) {
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) throw error;
}

/**
 * 取得播放清單項目
 */
export async function getPlaylistItems(playlistId: string) {
  const { data, error } = await supabase
    .from("playlist_items")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * 新增影片到播放清單
 */
export async function addToPlaylist(
  playlistId: string,
  videoId: string,
  videoTitle?: string,
  channelName?: string,
  thumbnailUrl?: string
) {
  // 取得目前最大 position
  const { data: items } = await supabase
    .from("playlist_items")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1);

  const position = items && items.length > 0 ? items[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("playlist_items")
    .insert({
      playlist_id: playlistId,
      video_id: videoId,
      video_title: videoTitle,
      channel_name: channelName,
      thumbnail_url: thumbnailUrl,
      position,
    })
    .select()
    .single();

  if (error) throw error;

  // 更新播放清單的 updated_at
  await supabase
    .from("playlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", playlistId);

  return data;
}

/**
 * 從播放清單移除影片
 */
export async function removeFromPlaylist(playlistId: string, videoId: string) {
  const { error } = await supabase
    .from("playlist_items")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("video_id", videoId);

  if (error) throw error;
}

// ---------- 觀看紀錄相關 ----------

/**
 * 取得觀看紀錄
 */
export async function getWatchHistory(userId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("user_id", userId)
    .order("last_watched_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * 更新觀看進度
 */
export async function updateWatchProgress(
  userId: string,
  videoId: string,
  progressSeconds: number,
  durationSeconds?: number
) {
  const { data, error } = await supabase
    .from("watch_history")
    .upsert(
      {
        user_id: userId,
        video_id: videoId,
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 取得特定影片的觀看進度
 */
export async function getWatchProgress(userId: string, videoId: string) {
  const { data, error } = await supabase
    .from("watch_history")
    .select("progress_seconds, duration_seconds")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * 清除觀看紀錄
 */
export async function clearWatchHistory(userId: string) {
  const { error } = await supabase
    .from("watch_history")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

// ---------- 用戶資料相關 ----------

/**
 * 取得用戶資料
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * 更新用戶資料
 */
export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
) {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({ id: userId, ...updates })
    .select()
    .single();

  if (error) throw error;
  return data;
}
