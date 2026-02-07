# Ragtag Archive Browser

現代化的影片存檔瀏覽器，使用 Next.js 14 建構，整合 Ragtag Archive API 提供影片搜尋與觀看功能，並透過 Supabase 提供用戶認證和個人化功能。

## 功能特色

- 🎨 **現代化 UI** - Glassmorphism 玻璃擬態設計風格
- 🔍 **強大搜尋** - 支援關鍵字搜尋、多種排序選項
- 📺 **影片播放** - 自訂播放器，支援鍵盤快捷鍵
- 🔇 **純音模式** - 音訊播放模式，節省頻寬
- 🔊 **音量記憶** - 自動保存音量與靜音狀態
- ⏰ **睡眠計時** - 設定時間後自動暫停播放
- 🔐 **用戶認證** - Email 登入/註冊、OAuth 第三方登入
- ❤️ **收藏功能** - 收藏喜愛的影片
- 📋 **播放清單** - 建立和管理播放清單，支援拖放排序
- 📍 **觀看進度** - 自動記憶觀看進度
- 💬 **聊天重播** - 同步顯示直播聊天記錄
- 📥 **下載功能** - 影片、聊天記錄、播放清單批次下載腳本
- 🧠 **智能推薦** - 根據觀看紀錄和偏好推薦影片
- 📱 **響應式設計** - 完美支援桌面和行動裝置
- 🌓 **深色/淺色主題** - 支援主題切換

## 技術棧

- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **UI 元件**: Radix UI + shadcn/ui 風格
- **狀態管理**: TanStack Query (React Query)
- **動畫**: Framer Motion
- **拖放排序**: @dnd-kit
- **圖示**: lucide-react
- **認證**: Supabase Auth
- **資料庫**: Supabase (PostgreSQL)
- **API**: Ragtag Archive API
- **影片**: HLS 串流播放器

## 快速開始

### 前置需求

- Node.js 18+
- npm 或 yarn
- Supabase 帳號（選用，用於用戶功能）

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd archive-browser
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設定環境變數**
   
   複製 `.env.local.example` 為 `.env.local` 並填入設定：
   ```bash
   cp .env.local.example .env.local
   ```
   
   編輯 `.env.local`：
   ```env
   # Ragtag Archive API（預設值即可）
   NEXT_PUBLIC_API_BASE_URL=https://archive.ragtag.moe
   NEXT_PUBLIC_CONTENT_BASE_URL=https://content.archive.ragtag.moe
   
   # Supabase（選用，用於用戶功能）
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **設定 Supabase（選用）**
   
   如需啟用用戶功能，請參考 `docs/SUPABASE-SETUP.md` 設定 Supabase。

5. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

6. **開啟瀏覽器**
   
   訪問 [http://localhost:3000](http://localhost:3000)

## 專案結構

```
src/
├── app/                    # Next.js App Router 頁面
│   ├── page.tsx           # 首頁（最新/熱門影片）
│   ├── search/            # 搜尋頁（進階篩選）
│   ├── watch/[id]/        # 影片播放頁
│   ├── channel/[id]/      # 頻道影片頁
│   ├── channels/          # 頻道瀏覽頁
│   ├── favorites/         # 收藏頁
│   ├── playlists/         # 播放清單管理
│   │   └── [id]/          # 單一播放清單檢視
│   ├── history/           # 觀看紀錄頁
│   └── settings/          # 設定頁
├── components/
│   ├── auth/              # 登入彈窗、用戶選單
│   ├── features/          # 加入播放清單等功能
│   ├── layout/            # Header 等 Layout 組件
│   ├── playlist/          # 播放清單組件（拖放排序、批次下載）
│   ├── providers/         # React providers (TanStack Query)
│   ├── search/            # 搜尋篩選、自動完成
│   ├── settings/          # 頭像上傳等設定組件
│   ├── ui/                # 通用 UI 組件 (shadcn/ui 風格)
│   └── video/             # 影片播放器、推薦、聊天重播、睡眠計時
├── contexts/
│   ├── AuthContext.tsx     # 認證狀態管理
│   └── ThemeContext.tsx    # 深色/淺色主題
├── hooks/                 # Custom React Hooks
│   ├── useAudioOnly.ts    # 純音模式
│   ├── useFavorites.ts    # 收藏管理
│   ├── useSleepTimer.ts   # 睡眠計時器
│   ├── useVolume.ts       # 音量記憶
│   └── ...                # 搜尋、觀看進度、推薦等
└── lib/
    ├── api.ts             # Ragtag API 封裝
    ├── cache.ts           # API 快取層
    ├── download.ts        # 下載工具
    ├── supabase.ts        # Supabase 操作
    ├── types.ts           # TypeScript 類型定義
    └── utils.ts           # 工具函式
```

## API 文件

詳細的 API 使用說明請參考：
- `docs/RAGTAG-API.md` - Ragtag Archive API 參考
- `docs/SUPABASE-SETUP.md` - Supabase 設定指南

## 主要功能說明

### 睡眠計時器
在影片播放頁面可設定睡眠計時器，支援 15/30/45/60/90/120 分鐘預設值或自訂時間（1-480 分鐘）。計時結束後自動暫停播放。

### 純音模式
切換為純音訊播放，適合背景聆聽，設定透過 localStorage 持久保存。

### 播放清單批次下載
支援產生 bash/PowerShell/cmd 批次下載腳本，以及 URL 清單供下載管理器使用。

### 智能推薦
根據當前影片、觀看紀錄、收藏頻道等資訊推薦相關影片。已登入用戶享有個人化推薦。

## 鍵盤快捷鍵

影片播放器支援以下快捷鍵：

| 按鍵 | 功能 |
|------|------|
| `Space` / `K` | 播放/暫停 |
| `←` | 快退 5 秒 |
| `→` | 快進 5 秒 |
| `↑` | 增加音量 |
| `↓` | 降低音量 |
| `M` | 靜音切換 |
| `F` | 全螢幕切換 |

## 開發指令

```bash
# 開發模式
npm run dev

# 建構專案
npm run build

# 啟動生產模式
npm start

# 程式碼檢查
npm run lint
```

## 授權

MIT License

## 致謝

- [Ragtag Archive](https://archive.ragtag.moe/) - 提供影片存檔 API
- [Supabase](https://supabase.com/) - 後端即服務平台
