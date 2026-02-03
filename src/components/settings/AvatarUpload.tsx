"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Link as LinkIcon, X, Upload } from "lucide-react";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  displayName: string;
  onAvatarChange: (url: string | null) => void;
  disabled?: boolean;
}

export function AvatarUpload({
  currentAvatarUrl,
  displayName,
  onAvatarChange,
  disabled = false,
}: AvatarUploadProps) {
  const [mode, setMode] = useState<"view" | "url">("view");
  const [urlInput, setUrlInput] = useState(currentAvatarUrl || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 預覽用的 URL
  const displayUrl = previewUrl || currentAvatarUrl;

  // 處理 URL 輸入變更
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setUrlInput(url);
    setError(null);

    // 簡單的 URL 驗證
    if (url && !url.match(/^https?:\/\/.+/)) {
      setError("請輸入有效的圖片網址 (以 http:// 或 https:// 開頭)");
      setPreviewUrl(null);
    } else if (url) {
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // 確認 URL 變更
  const handleUrlConfirm = () => {
    if (urlInput && !urlInput.match(/^https?:\/\/.+/)) {
      setError("請輸入有效的圖片網址");
      return;
    }
    onAvatarChange(urlInput || null);
    setMode("view");
    setPreviewUrl(null);
  };

  // 取消編輯
  const handleCancel = () => {
    setMode("view");
    setUrlInput(currentAvatarUrl || "");
    setPreviewUrl(null);
    setError(null);
  };

  // 移除頭像
  const handleRemove = () => {
    onAvatarChange(null);
    setUrlInput("");
    setPreviewUrl(null);
  };

  // 處理檔案選擇（轉為 Data URL 或上傳到 Supabase Storage）
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!file.type.startsWith("image/")) {
      setError("請選擇圖片檔案");
      return;
    }

    // 檢查檔案大小（限制 2MB）
    if (file.size > 2 * 1024 * 1024) {
      setError("圖片大小不能超過 2MB");
      return;
    }

    setError(null);

    // 轉換為 Data URL 預覽
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);
      // 直接使用 Data URL（小檔案可行，大檔案建議使用 Supabase Storage）
      // 注意：Data URL 會存在資料庫中，如果圖片太大可能會有問題
      onAvatarChange(dataUrl);
      setMode("view");
    };
    reader.onerror = () => {
      setError("讀取圖片失敗");
    };
    reader.readAsDataURL(file);

    // 清除 file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm text-muted-foreground">頭像</label>

      <div className="flex items-start gap-6">
        {/* 頭像預覽 */}
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage src={displayUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* 編輯覆蓋層 */}
          {mode === "view" && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* 操作區域 */}
        <div className="flex-1 space-y-3">
          {mode === "view" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上傳圖片
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("url")}
                  disabled={disabled}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  使用網址
                </Button>
                {currentAvatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    移除
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                支援 JPG、PNG、WebP 格式，檔案大小不超過 2MB
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Input
                  type="url"
                  value={urlInput}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={disabled}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUrlConfirm}
                  disabled={disabled || !!error}
                >
                  確認
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={disabled}
                >
                  取消
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
