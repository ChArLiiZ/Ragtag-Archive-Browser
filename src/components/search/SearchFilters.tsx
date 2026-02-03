"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SearchFilters as SearchFiltersType } from "@/lib/types";

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
}

// 日期預設選項
const DATE_PRESETS = [
  { label: "不限", value: "" },
  { label: "最近一週", value: "week" },
  { label: "最近一個月", value: "month" },
  { label: "最近三個月", value: "3months" },
  { label: "最近一年", value: "year" },
  { label: "自訂範圍", value: "custom" },
];

// 影片長度預設選項
const DURATION_PRESETS = [
  { label: "不限", value: "", min: undefined, max: undefined },
  { label: "短片 (<5分鐘)", value: "short", min: 0, max: 300 },
  { label: "中等 (5-20分鐘)", value: "medium", min: 300, max: 1200 },
  { label: "長片 (20-60分鐘)", value: "long", min: 1200, max: 3600 },
  { label: "超長 (>1小時)", value: "verylong", min: 3600, max: undefined },
];

// 觀看次數預設選項
const VIEW_COUNT_PRESETS = [
  { label: "不限", value: "", min: undefined, max: undefined },
  { label: ">1,000", value: "1k", min: 1000, max: undefined },
  { label: ">10,000", value: "10k", min: 10000, max: undefined },
  { label: ">100,000", value: "100k", min: 100000, max: undefined },
  { label: ">1,000,000", value: "1m", min: 1000000, max: undefined },
];

/**
 * 計算日期預設值對應的日期範圍
 */
function getDateRangeFromPreset(preset: string): { from?: string; to?: string } {
  const today = new Date();
  const formatDate = (date: Date) => {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  };

  switch (preset) {
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: formatDate(weekAgo), to: formatDate(today) };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: formatDate(monthAgo), to: formatDate(today) };
    }
    case "3months": {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return { from: formatDate(threeMonthsAgo), to: formatDate(today) };
    }
    case "year": {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { from: formatDate(yearAgo), to: formatDate(today) };
    }
    default:
      return {};
  }
}

/**
 * 將 YYYYMMDD 轉換為 YYYY-MM-DD（用於 input[type="date"]）
 */
function toInputDate(yyyymmdd?: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/**
 * 將 YYYY-MM-DD 轉換為 YYYYMMDD
 */
function fromInputDate(date: string): string {
  return date.replace(/-/g, "");
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [datePreset, setDatePreset] = useState("");
  const [durationPreset, setDurationPreset] = useState("");
  const [viewCountPreset, setViewCountPreset] = useState("");

  // 計算已套用的篩選數量
  const activeFilterCount = [
    filters.dateRange?.from || filters.dateRange?.to,
    filters.duration?.min !== undefined || filters.duration?.max !== undefined,
    filters.viewCount?.min !== undefined || filters.viewCount?.max !== undefined,
  ].filter(Boolean).length;

  // 處理日期預設變更
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);

    if (!preset || preset === "custom") {
      if (preset !== "custom") {
        onFiltersChange({
          ...filters,
          dateRange: undefined,
        });
      }
      return;
    }

    const range = getDateRangeFromPreset(preset);
    onFiltersChange({
      ...filters,
      dateRange: {
        field: filters.dateRange?.field || "upload_date",
        ...range,
      },
    });
  };

  // 處理自訂日期變更
  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    const newValue = value ? fromInputDate(value) : undefined;
    onFiltersChange({
      ...filters,
      dateRange: {
        field: filters.dateRange?.field || "upload_date",
        ...filters.dateRange,
        [field]: newValue,
      },
    });
  };

  // 處理日期欄位變更
  const handleDateFieldChange = (field: "upload_date" | "archived_timestamp") => {
    if (filters.dateRange) {
      onFiltersChange({
        ...filters,
        dateRange: {
          ...filters.dateRange,
          field,
        },
      });
    }
  };

  // 處理影片長度預設變更
  const handleDurationPresetChange = (preset: string) => {
    setDurationPreset(preset);
    const option = DURATION_PRESETS.find((p) => p.value === preset);
    if (!option || !preset) {
      onFiltersChange({
        ...filters,
        duration: undefined,
      });
      return;
    }
    onFiltersChange({
      ...filters,
      duration: {
        min: option.min,
        max: option.max,
      },
    });
  };

  // 處理觀看次數預設變更
  const handleViewCountPresetChange = (preset: string) => {
    setViewCountPreset(preset);
    const option = VIEW_COUNT_PRESETS.find((p) => p.value === preset);
    if (!option || !preset) {
      onFiltersChange({
        ...filters,
        viewCount: undefined,
      });
      return;
    }
    onFiltersChange({
      ...filters,
      viewCount: {
        min: option.min,
        max: option.max,
      },
    });
  };

  // 清除所有篩選
  const handleClearAll = () => {
    setDatePreset("");
    setDurationPreset("");
    setViewCountPreset("");
    onFiltersChange({});
  };

  // 移除單一篩選
  const handleRemoveFilter = (filterType: "dateRange" | "duration" | "viewCount") => {
    const newFilters = { ...filters };
    delete newFilters[filterType];

    if (filterType === "dateRange") setDatePreset("");
    if (filterType === "duration") setDurationPreset("");
    if (filterType === "viewCount") setViewCountPreset("");

    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* 篩選按鈕 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        篩選
        {activeFilterCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
            {activeFilterCount}
          </span>
        )}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* 已套用的篩選標籤 */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {filters.dateRange && (filters.dateRange.from || filters.dateRange.to) && (
            <FilterTag
              label={`日期: ${getDateLabel(filters.dateRange, datePreset)}`}
              onRemove={() => handleRemoveFilter("dateRange")}
            />
          )}
          {filters.duration && (filters.duration.min !== undefined || filters.duration.max !== undefined) && (
            <FilterTag
              label={`長度: ${getDurationLabel(filters.duration)}`}
              onRemove={() => handleRemoveFilter("duration")}
            />
          )}
          {filters.viewCount && filters.viewCount.min !== undefined && (
            <FilterTag
              label={`觀看: >${formatNumber(filters.viewCount.min)}`}
              onRemove={() => handleRemoveFilter("viewCount")}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            清除全部
          </Button>
        </div>
      )}

      {/* 展開的篩選面板 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-muted/30 rounded-lg space-y-6">
              {/* 日期篩選 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  日期範圍
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇日期範圍" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value || "none"}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.dateRange?.field || "upload_date"}
                    onValueChange={(v) => handleDateFieldChange(v as "upload_date" | "archived_timestamp")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload_date">上傳日期</SelectItem>
                      <SelectItem value="archived_timestamp">存檔日期</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {datePreset === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={toInputDate(filters.dateRange?.from)}
                      onChange={(e) => handleCustomDateChange("from", e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">至</span>
                    <Input
                      type="date"
                      value={toInputDate(filters.dateRange?.to)}
                      onChange={(e) => handleCustomDateChange("to", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>

              {/* 影片長度篩選 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  影片長度
                </div>
                <Select value={durationPreset} onValueChange={handleDurationPresetChange}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="選擇影片長度" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value || "none"}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 觀看次數篩選 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  觀看次數
                </div>
                <Select value={viewCountPreset} onValueChange={handleViewCountPresetChange}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="選擇觀看次數" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIEW_COUNT_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value || "none"}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 清除按鈕 */}
              {activeFilterCount > 0 && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    清除所有篩選
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 篩選標籤元件
function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// 輔助函數：取得日期標籤
function getDateLabel(
  dateRange: { from?: string; to?: string },
  preset: string
): string {
  const presetOption = DATE_PRESETS.find((p) => p.value === preset);
  if (presetOption && preset !== "custom" && preset !== "") {
    return presetOption.label;
  }
  const from = dateRange.from
    ? `${dateRange.from.slice(0, 4)}/${dateRange.from.slice(4, 6)}/${dateRange.from.slice(6, 8)}`
    : "";
  const to = dateRange.to
    ? `${dateRange.to.slice(0, 4)}/${dateRange.to.slice(4, 6)}/${dateRange.to.slice(6, 8)}`
    : "";
  if (from && to) return `${from} - ${to}`;
  if (from) return `${from} 之後`;
  if (to) return `${to} 之前`;
  return "";
}

// 輔助函數：取得長度標籤
function getDurationLabel(duration: { min?: number; max?: number }): string {
  const preset = DURATION_PRESETS.find(
    (p) => p.min === duration.min && p.max === duration.max
  );
  if (preset) return preset.label;

  const minMin = duration.min !== undefined ? Math.floor(duration.min / 60) : null;
  const maxMin = duration.max !== undefined ? Math.floor(duration.max / 60) : null;

  if (minMin !== null && maxMin !== null) return `${minMin}-${maxMin}分鐘`;
  if (minMin !== null) return `>${minMin}分鐘`;
  if (maxMin !== null) return `<${maxMin}分鐘`;
  return "";
}

// 輔助函數：格式化數字
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return String(num);
}
