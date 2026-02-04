# Archive Browser 開發路線圖

本文件記錄待實作的功能需求與實作方向，方便後續開發參考。

---

## 功能實作狀態

| # | 功能 | 優先級 | 狀態 | 完成日期 |
|---|------|--------|------|----------|
| 1 | 頻道列表頁面 `/channels` | 高 | ✅ 已完成 | 2024 |
| 3 | 404 錯誤頁面 | 高 | ✅ 已完成 | 2024 |
| 4 | 進階搜尋篩選 | 中 | ✅ 已完成 | 2024 |
| 5 | 播放清單排序與增強 | 中 | ✅ 已完成 | 2024 |
| 7 | 搜尋歷史與建議 | 中 | ✅ 已完成 | 2024 |
| 8 | 用戶頭像自訂 | 中 | ✅ 已完成 | 2024 |
| 13 | 效能優化 | 低 | ✅ 已完成 | 2024 |
| 14 | 下載功能 | 低 | ✅ 已完成 | 2024 |

---

## 已完成功能詳情

### 1. 頻道列表頁面 `/channels` ✅

**實作檔案：**
- `src/app/channels/page.tsx` - 頻道列表頁面
- `src/lib/types.ts` - 新增 `ChannelInfo` 型別

**功能：**
- 顯示所有已存檔的頻道列表
- 頻道卡片顯示：頭像、名稱、影片數量、總觀看數
- 搜尋頻道名稱
- 排序選項：影片數量、最近更新、名稱字母順序
- 分頁功能

---

### 3. 404 錯誤頁面 ✅

**實作檔案：**
- `src/app/not-found.tsx` - 404 頁面
- `src/app/error.tsx` - 通用錯誤頁面

**功能：**
- 友善的 404 錯誤訊息
- 返回首頁連結
- Framer Motion 動畫效果

---

### 4. 進階搜尋篩選 ✅

**實作檔案：**
- `src/components/search/SearchFilters.tsx` - 篩選元件
- `src/lib/types.ts` - 新增 `SearchFilters` 型別
- `src/app/search/page.tsx` - 整合篩選功能

**功能：**
- 日期範圍篩選（上傳日期/存檔日期）
- 影片長度篩選（短片/中等/長片/自訂）
- 觀看次數範圍篩選
- 篩選條件 URL 同步
- 快速預設選項

---

### 5. 播放清單排序與增強 ✅

**實作檔案：**
- `src/components/playlist/SortablePlaylistItem.tsx` - 可拖曳項目
- `src/components/playlist/PlaylistDownload.tsx` - 播放清單下載
- `src/lib/supabase.ts` - `reorderPlaylistItems` 函數（支援部分失敗處理）
- `src/app/playlists/[id]/page.tsx` - 整合拖曳排序與下載

**功能：**
- 拖曳重新排序播放清單項目（使用 @dnd-kit）
- 多種排序選項（自訂順序、標題、頻道、加入時間）
- 「從頭開始播放」選項
- 播放清單批次下載腳本生成
- 支援 Bash、PowerShell、CMD 和 URL 列表格式
- 檔案按播放清單名稱分資料夾

---

### 7. 搜尋歷史與建議 ✅

**實作檔案：**
- `src/hooks/useSearchHistory.ts` - 搜尋歷史 hook
- `src/components/search/SearchSuggestions.tsx` - 搜尋建議元件
- `src/components/layout/Header.tsx` - 整合搜尋建議

**功能：**
- 儲存最近 15 筆搜尋記錄（localStorage）
- 搜尋框聚焦時顯示歷史記錄
- 可清除單一或全部歷史
- 熱門搜尋關鍵字顯示
- 鍵盤導航支援

---

### 8. 用戶頭像自訂 ✅

**實作檔案：**
- `src/components/settings/AvatarUpload.tsx` - 頭像上傳元件
- `src/app/settings/page.tsx` - 整合頭像設定
- `src/components/auth/UserMenu.tsx` - 顯示自訂頭像

**功能：**
- 支援 URL 輸入或檔案上傳
- 圖片預覽
- 檔案轉換為 Data URL 儲存
- 限制檔案大小和類型

---

### 13. 效能優化 ✅

**實作檔案：**
- `src/lib/cache.ts` - 快取層
- `src/lib/api.ts` - 整合快取

**功能：**
- 記憶體快取層（支援 TTL 和容量限制）
- 請求去重器（防止重複請求）
- 搜尋結果快取（3 分鐘 TTL）
- 影片資料快取（10 分鐘 TTL）
- 頻道資料快取（15 分鐘 TTL）
- 快取失效和清除功能

**API：**
```typescript
// 清除所有快取
clearAllCache()

// 清除特定影片快取
invalidateVideoCache(videoId)

// 清除搜尋快取
invalidateSearchCache()

// 清除頻道快取
invalidateChannelCache(channelId?)

// 取得快取統計
getCacheStats()
```

---

### 14. 下載功能 ✅

**實作檔案：**
- `src/lib/download.ts` - 下載工具函數
- `src/components/video/DownloadSection.tsx` - 下載區塊
- `src/components/playlist/PlaylistDownload.tsx` - 播放清單下載
- `src/components/ui/collapsible.tsx` - Collapsible 元件
- `src/components/ui/progress.tsx` - Progress 元件
- `src/app/watch/[id]/page.tsx` - 整合下載區塊
- `src/app/playlists/[id]/page.tsx` - 整合播放清單下載

**單一影片下載功能：**
- 下載影片檔案（MP4、WebM、MKV 等）
- 下載縮圖
- 下載聊天記錄（TXT/JSON 格式）
- 下載影片元資料（TXT/JSON 格式）

**播放清單批次下載功能：**
- 生成下載腳本（Bash、PowerShell、CMD）
- 生成 URL 列表
- 檔案按播放清單名稱分資料夾
- 顯示預計下載大小
- 使用說明

---

## 新增的 UI 元件

| 元件 | 檔案路徑 | 用途 |
|------|----------|------|
| Collapsible | `src/components/ui/collapsible.tsx` | 可摺疊區塊 |
| Progress | `src/components/ui/progress.tsx` | 進度條 |

---

## 新增的依賴套件

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@radix-ui/react-collapsible": "*",
  "@radix-ui/react-progress": "*"
}
```

---

## 未來可能的功能擴展

以下是一些可考慮的未來功能：

1. **離線支援** - Service Worker 快取
2. **多語言支援** - i18n 國際化
3. **鍵盤快捷鍵** - 播放器和導航快捷鍵
4. **通知系統** - 新影片通知
5. **社交功能** - 評論、分享
6. **進階統計** - 觀看時間統計、偏好分析
7. **匯入/匯出** - 收藏和播放清單匯出
