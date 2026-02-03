"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { updateUserProfile, getUserProfile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { Settings, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || ""
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  );
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 載入用戶資料
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        setLoadingProfile(true);
        const profile = await getUserProfile(user.id);
        if (profile) {
          // 使用 "in" 檢查屬性是否存在，而不是檢查 truthy
          // 這樣可以正確處理用戶清除欄位（設為空字串或 null）的情況
          if ("display_name" in profile) {
            setDisplayName(profile.display_name || "");
          }
          if ("avatar_url" in profile) {
            setAvatarUrl(profile.avatar_url || null);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await updateUserProfile(user.id, {
        display_name: displayName,
        // Explicitly handle null -> undefined conversion for TypeScript
        avatar_url: avatarUrl ?? undefined,
      });
      setMessage({ type: "success", text: "設定已儲存" });
    } catch (err) {
      console.error("Failed to save profile:", err);
      setMessage({ type: "error", text: "儲存失敗" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 處理頭像變更
  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
  };

  // 未登入狀態
  if (!authLoading && !user) {
    return (
      <div className="container-custom py-8">
        <Card className="p-8 text-center">
          <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-4">登入後即可修改設定</p>
          <Button asChild>
            <Link href="/">返回首頁</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-8">設定</h1>

        {/* 訊息提示 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${message.type === "success"
              ? "bg-green-500/20 text-green-500"
              : "bg-destructive/20 text-destructive"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* 外觀設定 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>外觀</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">主題</label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="flex-1"
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    深色
                  </Button>
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="flex-1"
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    淺色
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 個人資料 */}
        {user && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>個人資料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 頭像設定 */}
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                displayName={displayName || user.email?.split("@")[0] || "用戶"}
                onAvatarChange={handleAvatarChange}
                disabled={saving || loadingProfile}
              />

              <div className="border-t pt-6">
                <label className="block text-sm text-muted-foreground mb-2">
                  電子信箱
                </label>
                <Input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  顯示名稱
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="輸入顯示名稱"
                  disabled={loadingProfile}
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving || loadingProfile}>
                {saving ? "儲存中..." : "儲存變更"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 關於 */}
        <Card>
          <CardHeader>
            <CardTitle>關於</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Ragtag Archive Browser v1.0.0</p>
            <p>
              使用{" "}
              <a
                href="https://archive.ragtag.moe/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ragtag Archive API
              </a>
            </p>
            <p>
              <a
                href="https://github.com/ragtag-archive/archive-browser"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub 原始碼
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
