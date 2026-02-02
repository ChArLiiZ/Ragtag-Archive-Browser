# Supabase 設置指南

本專案使用 Supabase 來處理用戶認證和儲存用戶特定的資料（收藏、播放清單、觀看紀錄等）。

## 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com/) 建立帳號
2. 建立新專案（選擇離你較近的區域以降低延遲）
3. 等待專案初始化完成（約 2 分鐘）
4. 在 Settings > API 取得：
   - **Project URL**: 作為 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: 作為 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 將這些值填入 `.env.local` 檔案

## 資料庫設置

在 Supabase SQL 編輯器中執行以下 SQL 來建立所需的資料表：

```sql
-- 用戶資料表
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 收藏表
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 播放清單表
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 播放清單項目表
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, video_id)
);

-- 觀看紀錄表
CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  progress_seconds REAL DEFAULT 0,
  duration_seconds REAL,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 啟用 Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能存取自己的資料
CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own playlists" ON playlists
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own playlist items" ON playlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_items.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own watch history" ON watch_history
  FOR ALL USING (auth.uid() = user_id);

-- 建立索引以提升查詢效能
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX idx_watch_history_last_watched ON watch_history(last_watched_at DESC);
```

## OAuth 設置（選用）

如果要啟用 Google、GitHub 或 Discord 登入：

1. 在 Supabase Dashboard 進入 Authentication > Providers
2. 啟用所需的 OAuth 提供者
3. 填入各平台的 Client ID 和 Client Secret

### Google OAuth
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立 OAuth 2.0 Client ID
3. 設定授權的重新導向 URI 為：`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### GitHub OAuth
1. 前往 GitHub Settings > Developer settings > OAuth Apps
2. 建立新的 OAuth App
3. 設定 Authorization callback URL 為：`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### Discord OAuth
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 建立新 Application
3. 在 OAuth2 設定 Redirect URI 為：`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## 環境變數

確保 `.env.local` 中有以下設定：

```env
# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Ragtag Archive API（可選，預設值已設定）
NEXT_PUBLIC_API_BASE_URL=https://archive.ragtag.moe
NEXT_PUBLIC_CONTENT_BASE_URL=https://content.archive.ragtag.moe
```

## 資料儲存注意事項

### 縮圖 URL 儲存

在收藏和播放清單中儲存 `thumbnail_url` 時，建議儲存完整的 URL：

```typescript
// 儲存收藏時
await supabase.from('favorites').insert({
  user_id: userId,
  video_id: video.video_id,
  video_title: video.title,
  channel_name: video.channel_name,
  thumbnail_url: getThumbnailUrl(video), // 儲存完整 URL
});
```

### 為什麼不只儲存 video_id？

雖然可以只儲存 `video_id` 然後動態生成 URL，但儲存完整 URL 有以下優點：
1. 減少客戶端計算
2. 即使 API 結構改變也能保持相容性
3. 可以快取和預載入

## 測試連線

1. 啟動開發伺服器：`npm run dev`
2. 開啟瀏覽器前往 `http://localhost:3000`
3. 點擊登入按鈕嘗試註冊新帳號
4. 如果成功，表示 Supabase 連線正常

## 疑難排解

### "Invalid API key" 錯誤
- 確認 `.env.local` 中的 key 是否正確複製（不要有多餘空格）
- 確認使用的是 `anon` key 而不是 `service_role` key

### 無法連線
- 檢查 Supabase 專案是否處於 Active 狀態
- 確認 URL 格式正確：`https://xxxxx.supabase.co`（結尾不要有斜線）

### RLS 政策錯誤
- 確保已執行所有 SQL 腳本
- 在 Supabase Dashboard 的 Table Editor 中確認 RLS 已啟用
