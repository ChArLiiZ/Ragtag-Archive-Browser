"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    /** 顯示的圖示 */
    icon: LucideIcon;
    /** 標題 */
    title: string;
    /** 說明文字 */
    description?: string;
    /** 操作按鈕 */
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

/**
 * 空白狀態 UI 元件
 * 用於顯示「沒有資料」、「找不到結果」等情況
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <Card className="p-8 text-center">
            <Icon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            {description && (
                <p className="text-muted-foreground mb-4">{description}</p>
            )}
            {action && (
                action.href ? (
                    <Button asChild>
                        <Link href={action.href}>{action.label}</Link>
                    </Button>
                ) : (
                    <Button variant="outline" onClick={action.onClick}>
                        {action.label}
                    </Button>
                )
            )}
        </Card>
    );
}
