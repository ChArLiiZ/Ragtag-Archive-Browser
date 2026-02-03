"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  ListVideo,
  History,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

  // 載入用戶自訂資料
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.id);
        if (profile) {
          // 使用 "in" 檢查屬性是否存在，而不是檢查 truthy
          // 這樣可以正確處理用戶清除欄位（設為空字串或 null）的情況
          if ("avatar_url" in profile) {
            setProfileAvatarUrl(profile.avatar_url || null);
          }
          if ("display_name" in profile) {
            setProfileDisplayName(profile.display_name || null);
          }
        }
      } catch (err) {
        // 忽略錯誤，使用預設值
      }
    }
    loadProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  // 取得用戶顯示名稱（優先使用自訂名稱）
  const displayName =
    profileDisplayName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "用戶";

  // 取得用戶頭像（優先使用自訂頭像）
  const avatarUrl = profileAvatarUrl || user?.user_metadata?.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-xs">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm hidden md:block max-w-[100px] truncate">
            {displayName}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium truncate">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate font-normal">
            {user?.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/favorites" className="flex items-center gap-2 cursor-pointer">
            <Heart className="h-4 w-4" />
            我的收藏
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/playlists" className="flex items-center gap-2 cursor-pointer">
            <ListVideo className="h-4 w-4" />
            播放清單
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history" className="flex items-center gap-2 cursor-pointer">
            <History className="h-4 w-4" />
            觀看紀錄
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            設定
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
