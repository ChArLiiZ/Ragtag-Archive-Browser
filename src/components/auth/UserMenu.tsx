"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
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

  const handleSignOut = async () => {
    await signOut();
  };

  // 取得用戶顯示名稱
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "用戶";

  // 取得用戶頭像
  const avatarUrl = user?.user_metadata?.avatar_url;

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
