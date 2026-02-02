# Ragtag Archive API 參考文檔

## 概述

Ragtag Archive 提供公開的 API 來查詢存檔中的影片資料。

- **API 基礎 URL**: `https://archive.ragtag.moe`
- **內容伺服器 URL**: `https://content.archive.ragtag.moe`
- **官方原始碼**: [GitHub - ragtag-archive/archive-browser](https://github.com/ragtag-archive/archive-browser)

---

## 搜尋 API

### 基本搜尋

```http
GET /api/v1/search
```

#### 查詢參數

| 參數 | 類型 | 說明 |
|------|------|------|
| `q` | string | 搜尋關鍵字（支援模糊搜尋） |
| `v` | string | 指定影片 ID（取得單一影片） |
| `channel_id` | string | 篩選特定頻道的影片 |
| `sort` | string | 排序欄位（見下表） |
| `sort_order` | string | `asc`（升序）或 `desc`（降序） |
| `from` | number | 分頁偏移量（預設 0） |
| `size` | number | 每頁結果數量（預設 10） |

#### 可用排序欄位

| 欄位 | 說明 |
|------|------|
| `archived_timestamp` | 存檔時間 |
| `upload_date` | 上傳日期 |
| `duration` | 影片時長 |
| `view_count` | 觀看次數 |
| `like_count` | 按讚數 |
| `dislike_count` | 倒讚數 |

#### 回應格式

```typescript
interface SearchResponse {
  took: number;           // 查詢耗時（毫秒）
  timed_out: boolean;     // 是否超時
  hits: {
    total: {
      value: number;      // 總結果數
      relation: 'eq' | 'gt' | 'lt';  // 關係
    };
    max_score: number;    // 最高相關性分數
    hits: Array<{
      _id: string;        // 文檔 ID（通常等於 video_id）
      _score: number;     // 相關性分數
      _source: VideoMetadata;
    }>;
  };
}
```

#### 影片元資料結構

```typescript
interface VideoFile {
  name: string;           // 檔案名稱（如 "VIDEO_ID.webp"）
  size: number;           // 檔案大小（bytes）
  url?: string;           // 完整 URL（伺服器端生成）
}

interface VideoMetadata {
  video_id: string;           // YouTube 影片 ID
  channel_name: string;       // 頻道名稱
  channel_id: string;         // 頻道 ID
  upload_date: string;        // 上傳日期（YYYYMMDD 格式）
  title: string;              // 影片標題
  description: string;        // 影片描述
  duration: number;           // 時長（秒）
  width: number;              // 影片寬度
  height: number;             // 影片高度
  fps: number;                // 幀率
  format_id: string;          // 格式 ID（如 "303+251"）
  view_count: number;         // 觀看次數
  like_count: number;         // 按讚數
  dislike_count: number;      // 倒讚數
  files: VideoFile[];         // 可用檔案列表
  drive_base: string;         // 儲存位置識別碼
  archived_timestamp: string; // 存檔時間戳（ISO 格式）
  timestamps?: {              // 直播時間戳（可選）
    actualStartTime?: string;
    publishedAt?: string;
    scheduledStartTime?: string;
    actualEndTime?: string;
  };
}
```

---

## 使用範例

### 搜尋影片

```bash
# 搜尋 "haachama"，按時長降序排列
curl "https://archive.ragtag.moe/api/v1/search?q=haachama&sort=duration&sort_order=desc"

# 搜尋最新存檔
curl "https://archive.ragtag.moe/api/v1/search?sort=archived_timestamp&sort_order=desc&size=20"
```

### 取得單一影片

```bash
# 取得特定影片 ID 的資料
curl "https://archive.ragtag.moe/api/v1/search?v=VIDEO_ID"
```

### 取得頻道所有影片

```bash
# 取得特定頻道的影片，按上傳日期排序
curl "https://archive.ragtag.moe/api/v1/search?channel_id=CHANNEL_ID&sort=upload_date&sort_order=desc&size=50"
```

### 分頁查詢

```bash
# 取得第 2 頁（每頁 20 筆，from = 20）
curl "https://archive.ragtag.moe/api/v1/search?q=hololive&size=20&from=20"

# 取得第 3 頁
curl "https://archive.ragtag.moe/api/v1/search?q=hololive&size=20&from=40"
```

### JavaScript/TypeScript 範例

```typescript
// 搜尋影片
async function searchVideos(query: string, options?: { 
  sort?: string; 
  size?: number; 
  from?: number;
}) {
  const params = new URLSearchParams({ q: query });
  if (options?.sort) params.set('sort', options.sort);
  if (options?.size) params.set('size', String(options.size));
  if (options?.from) params.set('from', String(options.from));
  
  const response = await fetch(
    `https://archive.ragtag.moe/api/v1/search?${params}`
  );
  return response.json();
}

// 取得縮圖 URL
function getThumbnailUrl(video: VideoMetadata): string | null {
  const thumbFile = video.files?.find(
    (f) => f.name.endsWith('.webp') || f.name.endsWith('.jpg')
  );
  if (!thumbFile) return null;
  
  const driveBase = video.drive_base || video.video_id;
  return `https://content.archive.ragtag.moe/${driveBase}/${video.video_id}/${thumbFile.name}`;
}
```

---

## 檔案伺服器

### 基礎 URL

```
https://content.archive.ragtag.moe
```

### 檔案路徑格式

檔案 URL 的完整格式為：
```
{CONTENT_BASE_URL}/{drive_base}/{video_id}/{filename}
```

其中 `drive_base` 是影片的儲存位置識別碼，可從 `VideoMetadata.drive_base` 取得。

### 常見檔案類型

| 檔案類型 | 副檔名 | 說明 |
|----------|--------|------|
| 縮圖 | `.webp`, `.jpg` | 影片縮圖 |
| 影片 | `.mp4`, `.webm`, `.mkv` | 完整影片檔案 |
| 分離影片流 | `.f{format_id}.webm` | 僅影片（無音訊） |
| 分離音訊流 | `.f{format_id}.webm` | 僅音訊 |
| 聊天記錄 | `.chat.json`, `.live_chat.json` | JSON 格式聊天記錄 |
| 影片資訊 | `.info.json` | 原始 yt-dlp 資訊 |
| 字幕 | `.{lang}.ytt`, `.{lang}.srv3` | 字幕檔案 |
| 頻道頭像 | `profile.jpg` | 位於 `/{channel_id}/profile.jpg` |

### 取得縮圖 URL（官方做法）

根據官方實作，縮圖應該從 `files` 陣列中取得：

```typescript
// 從 files 中找到縮圖檔案
const thumbFile = video.files.find(
  (file) => file.name.endsWith('.webp') || file.name.endsWith('.jpg')
);

// 構建完整 URL
const thumbnailUrl = thumbFile 
  ? `${CONTENT_BASE_URL}/${video.drive_base}/${video.video_id}/${thumbFile.name}`
  : null;
```

### 取得影片 URL

```typescript
// 從 format_id 取得影片和音訊格式
const [fmtVideo, fmtAudio] = video.format_id.split('+');

// 依優先順序尋找影片檔案
const getFile = (suffix: string) => 
  video.files.find((file) => file.name.includes(suffix));

const urlVideo = 
  getFile('.f' + fmtVideo) ??  // 優先使用指定格式
  getFile('.webm') ?? 
  getFile('.mp4') ?? 
  getFile('.mkv');

const urlAudio = getFile('.f' + fmtAudio) ?? urlVideo;
```

### 範例 URL

```
# 縮圖（包含 drive_base）
https://content.archive.ragtag.moe/gd:FOLDER_ID/vHMV44Uza4g/vHMV44Uza4g.webp

# 影片
https://content.archive.ragtag.moe/gd:FOLDER_ID/vHMV44Uza4g/vHMV44Uza4g.mp4

# 聊天記錄
https://content.archive.ragtag.moe/gd:FOLDER_ID/vHMV44Uza4g/vHMV44Uza4g.chat.json

# 頻道頭像
https://content.archive.ragtag.moe/UC1CfXB_kRs3C-zaeTG3oGyg/profile.jpg
```

> **注意**: `drive_base` 通常是 `gd:` 開頭的 Google Drive 資料夾 ID。如果 API 回應中沒有 `drive_base`，可以使用 `video_id` 作為替代。

---

## 嵌入影片

### 嵌入 URL 格式

```
https://archive.ragtag.moe/embed/{videoId}
```

### 響應式 iframe 範例

```html
<div style="position:relative;padding-bottom:56.25%">
  <iframe
    frameborder="0"
    allow="fullscreen"
    src="https://archive.ragtag.moe/embed/vHMV44Uza4g"
    style="position:absolute;width:100%;height:100%"
  />
</div>
```

> **注意**: 嵌入式播放器目前不支援聊天重播功能。

---

## TypeScript 類型定義

完整的類型定義請參考 `src/lib/types.ts` 檔案。

---

## 相關連結

- [官方 API 文檔](https://archive.ragtag.moe/api-docs)
- [GitHub 原始碼](https://github.com/ragtag-archive/archive-browser)
