# Ragtag Archive Browser V2 - 專案規劃

## 專案概述

建立一個現代化的影片存檔瀏覽器前端,使用 Ragtag Archive 官方 API 獲取影片資料,並整合 Supabase 提供用戶認證和個人化功能。

### 目標

- 🎨 現代化 UI/UX 設計 (shadcn/ui + Glassmorphism)
- 🔐 用戶認證系統(登入/註冊)
- ❤️ 收藏功能
- 📋 播放清單管理
- 📍 觀看進度記憶
- 🔍 強大的搜尋功能
- 📱 響應式設計(RWD)

---

## 技術架構

```
┌─────────────────────────────────────────────────────────────────┐
│                     Archive Browser V2                          │
│                    (Next.js 14 App Router)                      │
└───────────────────────┬─────────────────────────────────┘
                        │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Ragtag API   │ │  檔案伺服器   │ │   Supabase   │
    │  (影片資料)  │ │ (影片/圖片)  │ │  (用戶資料)  │
    │    公開      │ │    公開      │ │   您的帳號   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

### 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **語言** | TypeScript |
| **樣式** | Tailwind CSS 3 + shadcn/ui |
| **圖標** | lucide-react |
| **動畫** | Framer Motion |
| **認證** | Supabase Auth |
| **資料庫** | Supabase (PostgreSQL) |
| **狀態管理** | React Context + Hooks |
| **HTTP 客戶端** | Fetch API |
| **影片播放** | HTML5 Video API |

---

## 外部 API 整合

### Ragtag Archive API

> 基礎 URL: `https://archive.ragtag.moe`

#### 搜尋影片
```http
GET /api/v1/search
```

| 參數 | 說明 |
|------|------|
| `q` | 搜尋關鍵字 |
| `v` | 指定影片 ID |
| `channel_id` | 指定頻道 ID |
| `sort` | 排序欄位:`archived_timestamp`, `upload_date`, `duration`, `view_count`, `like_count`, `dislike_count` |
| `sort_order` | `asc` 或 `desc` |
| `from` | 分頁起始位置 |
| `size` | 每頁數量(預設 10) |

**回應格式:**
```typescript
interface SearchResponse {
  took: number;
  timed_out: boolean;
  hits: {
    total: { value: number; relation: string };
    max_score: number;
    hits: Array<{
      _id: string;
      _score: number;
      _source: VideoMetadata;
    }>;
  };
}

interface VideoMetadata {
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
  files: Array<{ name: string; size: number }>;
  drive_base?: string;
  archived_timestamp: string;
  timestamps?: {
    actualStartTime: string | null;
    publishedAt: string | null;
    scheduledStartTime: string | null;
    actualEndTime: string | null;
  };
}
```

### 檔案伺服器

> 基礎 URL: `https://content.archive.ragtag.moe`

**檔案路徑格式:**
```
/{video_id}/{video_id}.webp          # 縮圖
/{video_id}/{video_id}.mp4           # 影片
/{video_id}/{video_id}.webm          # 影片 (WebM)
/{video_id}/{video_id}.f{format}.webm # 特定格式
/{video_id}/{video_id}.chat.json     # 聊天記錄
/{channel_id}/profile.jpg            # 頻道頭像
```

---

## Supabase 資料庫結構

### 資料表

#### 1. user_profiles(用戶資料)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. favorites(收藏)
```sql
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
```

#### 3. playlists(播放清單)
```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. playlist_items(播放清單項目)
```sql
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
```

#### 5. watch_history(觀看紀錄)
```sql
CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  progress_seconds REAL DEFAULT 0,
  duration_seconds REAL,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);
```

### RLS 安全策略
```sql
-- 所有表格啟用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- 用戶只能存取自己的資料
CREATE POLICY "Users can manage own data" ON user_profiles
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
```

---

## 頁面規劃

### 頁面結構

```
/                           # 首頁 - 熱門/最新影片
/search                     # 搜尋結果頁
/watch/[videoId]            # 影片播放頁
/channel/[channelId]        # 頻道頁面
/channels                   # 所有頻道列表
/favorites                  # 我的收藏
/playlists                  # 我的播放清單
/playlists/[playlistId]     # 播放清單詳情
/history                    # 觀看紀錄
/settings                   # 設定頁面
```

### 頁面詳情

#### 首頁 (/)
- 顯示最新存檔的影片
- 顯示最近上傳的影片
- 搜尋功能入口
- 快速分類導覽

#### 搜尋頁 (/search)
- 搜尋結果網格
- 排序選項(日期、觀看次數、時長等)
- 篩選功能(頻道、日期範圍)
- 分頁/無限捲動

#### 影片播放頁 (/watch/[videoId])
- 影片播放器
  - 播放/暫停控制
  - 進度條(支援拖曳)
  - 音量控制
  - 全螢幕切換
  - 畫質選擇(如有多個格式)
  - 截圖功能
- 影片資訊(標題、描述、頻道、日期)
- 收藏按鈕
- 加入播放清單按鈕
- 聊天重播(懶載入)
- 相關影片推薦

#### 頻道頁 (/channel/[channelId])
- 頻道資訊和頭像
- 頻道影片列表
- 排序和篩選

#### 收藏頁 (/favorites)
- 收藏的影片網格
- 移除收藏功能

#### 播放清單頁 (/playlists)
- 播放清單列表
- 建立新播放清單
- 編輯/刪除播放清單

---

## 組件架構

### 共用組件

```
components/
├── layout/
│   ├── Header.tsx           # 頁首(Logo、搜尋、用戶選單)
│   ├── Footer.tsx           # 頁尾
│   ├── Sidebar.tsx          # 側邊欄(可選)
│   └── PageContainer.tsx    # 頁面容器
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Dropdown.tsx
│   ├── Skeleton.tsx         # 載入骨架
│   └── Toast.tsx            # 通知
├── video/
│   ├── VideoCard.tsx        # 影片卡片
│   ├── VideoGrid.tsx        # 影片網格
│   ├── VideoPlayer.tsx      # 影片播放器
│   └── ChatReplay.tsx       # 聊天重播
├── auth/
│   ├── LoginModal.tsx       # 登入彈出視窗
│   ├── UserMenu.tsx         # 用戶下拉選單
│   └── AuthGuard.tsx        # 需登入的頁面保護
└── features/
    ├── FavoriteButton.tsx   # 收藏按鈕
    ├── AddToPlaylistButton.tsx
    ├── SearchBar.tsx        # 搜尋列
    └── SortDropdown.tsx     # 排序下拉
```

### Context Providers

```
contexts/
├── AuthContext.tsx          # 認證狀態
├── ThemeContext.tsx         # 主題(亮/暗)
└── PlayerContext.tsx        # 播放器狀態(可選)
```

### Custom Hooks

```
hooks/
├── useAuth.ts              # 認證相關
├── useFavorites.ts         # 收藏操作
├── usePlaylists.ts         # 播放清單操作
├── useWatchProgress.ts     # 觀看進度
├── useSearch.ts            # 搜尋功能
└── useLocalStorage.ts      # localStorage 操作
```

### API 服務

```
lib/
├── supabase.ts             # Supabase 客戶端
├── api.ts                  # Ragtag API 封裝
└── types.ts                # TypeScript 類型定義
```

---

## UI/UX 設計

### 設計風格

- **Glassmorphism** - 玻璃擬態效果
- **暗色主題**為主,支援亮色主題切換
- 漸層色彩 + 半透明背景
- 平滑動畫和過渡效果

### 色彩系統

```css
/* 暗色主題 */
--bg-primary: #0a0a0f;
--bg-secondary: #1a1a2e;
--bg-glass: rgba(255, 255, 255, 0.05);
--border-glass: rgba(255, 255, 255, 0.1);
--text-primary: #ffffff;
--text-secondary: #a0a0a0;
--accent: #6366f1;  /* Indigo */
--accent-hover: #818cf8;
--success: #22c55e;
--error: #ef4444;

/* 亮色主題 */
--bg-primary-light: #f8fafc;
--bg-secondary-light: #ffffff;
--text-primary-light: #1e293b;
```

### Glassmorphism 效果

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
```

---

## 實作步驟

### Phase 1: 專案初始化 ✅
1. [x] 建立 Next.js 14 專案
2. [x] 設置 TypeScript
3. [x] 安裝並配置 Tailwind CSS
4. [x] 建立基本目錄結構
5. [x] 設置環境變數

### Phase 2: API 整合 ✅
1. [x] 建立 Ragtag API 封裝 (`lib/api.ts`)
2. [x] 建立 TypeScript 類型定義
3. [x] 測試搜尋 API
4. [x] 建立 Supabase 客戶端

### Phase 3: 基礎 UI 組件 ✅
1. [x] 建立 Header 組件
2. [x] 建立 VideoCard 組件
3. [x] 建立 VideoGrid 組件
4. [x] 設置 Layout 結構

### Phase 4: 核心頁面 ✅
1. [x] 首頁 - 最新影片展示
2. [x] 搜尋頁 - 搜尋功能
3. [x] 影片播放頁 - 播放器和資訊

### Phase 5: 認證系統 ✅
1. [x] 設置 Supabase Auth
2. [x] 建立 AuthContext
3. [x] 建立 LoginModal
4. [x] 建立 UserMenu

### Phase 6: 用戶功能 ✅
1. [x] 建立 Supabase 資料表
2. [x] 實作收藏功能
3. [x] 實作播放清單功能
4. [x] 實作觀看進度

### Phase 7: 影片播放器增強 ✅
1. [x] 自訂播放器控制項
2. [x] 進度條和緩衝
3. [x] 截圖功能 (部分完成)
4. [x] 聊天重播(懶載入)

### Phase 8: UI 重構與優化 (shadcn/ui) ✅
1. [x] 初始化 shadcn/ui
2. [x] 替換核心組件 (Button, Input, Card, etc.)
3. [x] 全面重構頁面 (Home, Search, Watch, etc.)
4. [x] 移除舊有 CSS 樣式
5. [x] 效能與 Build 優化

---

## 環境變數

```env
# .env.local

# Ragtag Archive API
NEXT_PUBLIC_API_BASE_URL=https://archive.ragtag.moe
NEXT_PUBLIC_CONTENT_BASE_URL=https://content.archive.ragtag.moe

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 網站資訊
NEXT_PUBLIC_SITE_NAME=Archive Browser
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 快速啟動指令

```bash
# 1. 建立專案
npx create-next-app@latest archive-browser-v2 --typescript --tailwind --app --src-dir

# 2. 進入專案
cd archive-browser-v2

# 3. 安裝依賴
npm install @supabase/supabase-js framer-motion axios

# 4. 建立 .env.local 並填入環境變數

# 5. 啟動開發伺服器
npm run dev
```

---

## 附錄:API 呼叫範例

### 搜尋影片
```typescript
const searchVideos = async (query: string, options?: SearchOptions) => {
  const params = new URLSearchParams({
    q: query,
    size: String(options?.size || 20),
    sort: options?.sort || 'upload_date',
    sort_order: options?.sortOrder || 'desc',
  });
  
  const response = await fetch(
    `https://archive.ragtag.moe/api/v1/search?${params}`
  );
  return response.json();
};
```

### 獲取單一影片
```typescript
const getVideo = async (videoId: string) => {
  const response = await fetch(
    `https://archive.ragtag.moe/api/v1/search?v=${videoId}&size=1`
  );
  const data = await response.json();
  return data.hits.hits[0]?._source;
};
```

### 獲取影片檔案 URL
```typescript
const getVideoUrl = (videoId: string, files: File[]) => {
  const videoFile = files.find(
    f => f.name.endsWith('.mp4') || f.name.endsWith('.webm')
  );
  return `https://content.archive.ragtag.moe/${videoId}/${videoFile?.name}`;
};

const getThumbnailUrl = (videoId: string) => {
  return `https://content.archive.ragtag.moe/${videoId}/${videoId}.webp`;
};
```
