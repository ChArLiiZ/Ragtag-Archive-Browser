"use client";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SortOption {
    value: string;
    label: string;
}

interface SortControlsProps {
    /** 目前選擇的排序欄位 */
    sortValue: string;
    /** 排序方向 */
    sortOrder: "asc" | "desc";
    /** 可選擇的排序選項 */
    options: SortOption[];
    /** 排序欄位變更時觸發 */
    onSortChange: (value: string) => void;
    /** 排序方向切換時觸發 */
    onSortOrderToggle: () => void;
    /** 標籤文字（預設「排序：」） */
    label?: string;
}

/**
 * 排序控制元件
 * 包含排序欄位選擇和排序方向切換
 */
export function SortControls({
    sortValue,
    sortOrder,
    options,
    onSortChange,
    onSortOrderToggle,
    label = "排序：",
}: SortControlsProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
                {label}
            </span>
            <Select value={sortValue} onValueChange={onSortChange}>
                <SelectTrigger className="w-[130px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                variant="outline"
                size="icon"
                onClick={onSortOrderToggle}
                title={sortOrder === "asc" ? "升冪排序" : "降冪排序"}
            >
                {sortOrder === "desc" ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronUp className="w-4 h-4" />
                )}
            </Button>
        </div>
    );
}
