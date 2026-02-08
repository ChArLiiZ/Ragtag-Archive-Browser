"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface RequireAuthProps {
    children: React.ReactNode;
    /** 未登入時顯示的圖示 */
    icon?: LucideIcon;
    /** 功能名稱，用於顯示「登入後即可使用X功能」 */
    featureName?: string;
}

/**
 * 登入驗證包裝元件
 * 未登入時顯示提示 UI，已登入時渲染 children
 */
export function RequireAuth({
    children,
    icon: Icon,
    featureName = "此功能",
}: RequireAuthProps) {
    const { user, loading } = useAuth();

    // 載入中時顯示骨架
    if (loading) {
        return (
            <div className="container-custom py-8">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-video rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 未登入時顯示提示
    if (!user) {
        return (
            <div className="container-custom py-8">
                <Card className="p-8 text-center">
                    {Icon && <Icon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                    <h2 className="text-xl font-bold mb-2">請先登入</h2>
                    <p className="text-muted-foreground mb-4">
                        登入後即可使用{featureName}
                    </p>
                    <Button asChild>
                        <Link href="/">返回首頁</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
