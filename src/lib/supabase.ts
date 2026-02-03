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
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: async () => ({ error: new Error("Supabase not configured") }),
      signUp: async () => ({ error: new Error("Supabase not configured") }),
      signOut: async () => { },
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

/**
 * 取得用戶所有相關的影片 ID (收藏和播放清單)
 * 用於在列表中顯示影片狀態
 */
export async function getUserLibraryVideoIds(userId: string) {
  // 平行取得收藏和播放清單項目
  const [favoritesResult, playlistItemsResult] = await Promise.all([
    supabase.from("favorites").select("video_id").eq("user_id", userId),
    // 取得該用戶所有播放清單中的影片項目
    // 注意：這需要透過關聯查詢，或者先取得播放清單 ID 再查項目
    // 為了效能，這裡我們使用一個稍微複雜的查詢，或者假設 RLS 允許我們直接查 playlist_items
    // 根據 RLS 策略 "Users can manage own playlist items"，我們可以直接查
    // 但需要確保是我們自己的播放清單。這裡用簡單的方式：先查播放清單 ID
    (async () => {
      const { data: playlists } = await supabase
        .from("playlists")
        .select("id")
        .eq("user_id", userId);

      if (!playlists || playlists.length === 0) return { data: [] };

      const playlistIds = playlists.map(p => p.id);
      return supabase
        .from("playlist_items")
        .select("video_id")
        .in("playlist_id", playlistIds);
    })()
  ]);

  if (favoritesResult.error) console.error("Error fetching favorites:", favoritesResult.error);
  // playlistItemsResult 可能是手動執行的結果，可能沒有 error 屬性完全匹配 Supabase 回傳，但這裡簡化處理

  const favoritedIds = new Set<string>((favoritesResult.data || []).map(f => f.video_id));
  const playlistedIds = new Set<string>(((playlistItemsResult as any)?.data || []).map((i: any) => i.video_id));

  return {
    favorites: favoritedIds,
    playlistItems: playlistedIds
  };
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
 * 取得播放清單預覽（包含前 4 個影片的縮圖）
 */
export async function getPlaylistPreview(
  playlistId: string,
  limit: number = 4
) {
  const { data, error } = await supabase
    .from("playlist_items")
    .select("video_id, thumbnail_url")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * 取得播放清單的影片數量
 */
export async function getPlaylistItemCount(playlistId: string): Promise<number> {
  const { count, error } = await supabase
    .from("playlist_items")
    .select("*", { count: "exact", head: true })
    .eq("playlist_id", playlistId);

  if (error) throw error;
  return count || 0;
}

/**
 * 取得用戶播放清單（含影片數量和預覽縮圖）
 */
export async function getPlaylistsWithDetails(userId: string) {
  // 先取得播放清單基本資訊
  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!playlists) return [];

  // 平行取得每個播放清單的預覽
  const playlistsWithDetails = await Promise.all(
    playlists.map(async (playlist) => {
      const [preview, count] = await Promise.all([
        getPlaylistPreview(playlist.id, 4),
        getPlaylistItemCount(playlist.id),
      ]);
      return {
        ...playlist,
        itemCount: count,
        thumbnails: preview?.map((item) => item.thumbnail_url).filter(Boolean) || [],
      };
    })
  );

  return playlistsWithDetails;
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
  durationSeconds?: number,
  videoTitle?: string,
  channelName?: string,
  thumbnailUrl?: string
) {
  const updateData: Record<string, unknown> = {
    user_id: userId,
    video_id: videoId,
    progress_seconds: progressSeconds,
    duration_seconds: durationSeconds,
    last_watched_at: new Date().toISOString(),
  };

  // 只有在有值的時候才更新這些欄位
  if (videoTitle !== undefined) updateData.video_title = videoTitle;
  if (channelName !== undefined) updateData.channel_name = channelName;
  if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;

  const { data, error } = await supabase
    .from("watch_history")
    .upsert(updateData, { onConflict: "user_id,video_id" })
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

/**
 * 批次取得多個影片的觀看進度
 * @param userId 用戶 ID
 * @param videoIds 影片 ID 陣列
 * @returns Map<video_id, { progress: number, duration: number }>
 */
export async function getWatchProgressBatch(
  userId: string,
  videoIds: string[]
): Promise<Map<string, { progress: number; duration: number }>> {
  if (videoIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("watch_history")
    .select("video_id, progress_seconds, duration_seconds")
    .eq("user_id", userId)
    .in("video_id", videoIds);

  if (error) throw error;

  const progressMap = new Map<string, { progress: number; duration: number }>();
  data?.forEach((item) => {
    progressMap.set(item.video_id, {
      progress: item.progress_seconds || 0,
      duration: item.duration_seconds || 0,
    });
  });
  return progressMap;
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
