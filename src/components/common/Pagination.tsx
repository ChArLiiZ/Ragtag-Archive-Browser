"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";

interface PaginationProps {
    /** 目前頁碼（從 1 開始） */
    currentPage: number;
    /** 總頁數 */
    totalPages: number;
    /** 頁碼變更時觸發 */
    onPageChange: (page: number) => void;
    /** 顯示的頁碼數量（預設 5） */
    visiblePages?: number;
}

/**
 * 分頁元件
 * 包含上一頁/下一頁、頁碼列表和直接輸入頁碼
 */
export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    visiblePages = 5,
}: PaginationProps) {
    const [inputValue, setInputValue] = useState("");

    // 計算要顯示的頁碼範圍
    const getPageNumbers = useCallback(() => {
        const pages: number[] = [];
        const half = Math.floor(visiblePages / 2);
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + visiblePages - 1);

        // 調整起始位置，確保顯示足夠的頁碼
        if (end - start + 1 < visiblePages) {
            start = Math.max(1, end - visiblePages + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }, [currentPage, totalPages, visiblePages]);

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(inputValue, 10);
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
            setInputValue("");
        }
    };

    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* 上一頁 */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                title="上一頁"
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* 第一頁和省略號 */}
            {pageNumbers[0] > 1 && (
                <>
                    <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(1)}
                    >
                        1
                    </Button>
                    {pageNumbers[0] > 2 && (
                        <span className="px-2 text-muted-foreground">...</span>
                    )}
                </>
            )}

            {/* 頁碼列表 */}
            {pageNumbers.map((page) => (
                <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </Button>
            ))}

            {/* 最後一頁和省略號 */}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(totalPages)}
                    >
                        {totalPages}
                    </Button>
                </>
            )}

            {/* 下一頁 */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                title="下一頁"
            >
                <ChevronRight className="w-4 h-4" />
            </Button>

            {/* 直接輸入頁碼 */}
            <form onSubmit={handleInputSubmit} className="flex items-center gap-1 ml-2">
                <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={String(currentPage)}
                    className="w-16 h-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={1}
                    max={totalPages}
                />
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
            </form>
        </div>
    );
}
