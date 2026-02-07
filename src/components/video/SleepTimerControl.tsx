"use client";

import { useState } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRESETS = [
  { label: "15 分鐘", seconds: 15 * 60 },
  { label: "30 分鐘", seconds: 30 * 60 },
  { label: "45 分鐘", seconds: 45 * 60 },
  { label: "1 小時", seconds: 60 * 60 },
  { label: "90 分鐘", seconds: 90 * 60 },
  { label: "2 小時", seconds: 120 * 60 },
];

interface SleepTimerControlProps {
  isActive: boolean;
  remainingFormatted: string;
  onStart: (durationSeconds: number) => void;
  onCancel: () => void;
}

export function SleepTimerControl({
  isActive,
  remainingFormatted,
  onStart,
  onCancel,
}: SleepTimerControlProps) {
  const [customMinutes, setCustomMinutes] = useState("");

  const handleCustomSubmit = () => {
    const minutes = parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes >= 1 && minutes <= 480) {
      onStart(minutes * 60);
      setCustomMinutes("");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "outline"}
          className={isActive ? "text-primary" : ""}
        >
          <Timer className="w-4 h-4 mr-2" />
          {isActive ? remainingFormatted : "睡眠計時"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isActive ? (
          <>
            <DropdownMenuLabel>
              計時器進行中 — {remainingFormatted}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              取消計時器
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              更換時間
            </DropdownMenuLabel>
            {PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.seconds}
                onClick={(e) => {
                  e.preventDefault();
                  onStart(preset.seconds);
                }}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <>
            <DropdownMenuLabel>睡眠計時器</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.seconds}
                onClick={(e) => {
                  e.preventDefault();
                  onStart(preset.seconds);
                }}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div
              className="px-2 py-1.5 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCustomSubmit();
                }
                e.stopPropagation();
              }}
            >
              <input
                type="number"
                min={1}
                max={480}
                placeholder="分鐘"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCustomSubmit}
                disabled={
                  !customMinutes ||
                  isNaN(parseInt(customMinutes, 10)) ||
                  parseInt(customMinutes, 10) < 1 ||
                  parseInt(customMinutes, 10) > 480
                }
                className="shrink-0"
              >
                設定
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
