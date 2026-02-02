"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateWatchProgress, getWatchProgress } from "@/lib/supabase";

interface UseWatchProgressOptions {
  videoId: string;
  autoSaveInterval?: number; // 自動儲存間隔（毫秒）
}

export function useWatchProgress({
  videoId,
  autoSaveInterval = 10000,
}: UseWatchProgressOptions) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastSavedProgress = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 載入初始進度
  useEffect(() => {
    async function loadProgress() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getWatchProgress(user.id, videoId);
        if (data) {
          setProgress(data.progress_seconds);
          lastSavedProgress.current = data.progress_seconds;
          if (data.duration_seconds) {
            setDuration(data.duration_seconds);
          }
        }
      } catch (err) {
        console.error("Failed to load watch progress:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [user, videoId]);

  // 儲存進度
  const saveProgress = useCallback(
    async (currentProgress: number, currentDuration?: number) => {
      if (!user) return;

      // 避免頻繁儲存相同的進度
      if (Math.abs(currentProgress - lastSavedProgress.current) < 5) {
        return;
      }

      try {
        await updateWatchProgress(
          user.id,
          videoId,
          currentProgress,
          currentDuration || duration
        );
        lastSavedProgress.current = currentProgress;
      } catch (err) {
        console.error("Failed to save watch progress:", err);
      }
    },
    [user, videoId, duration]
  );

  // 更新進度（帶防抖）
  const updateProgress = useCallback(
    (currentProgress: number, currentDuration?: number) => {
      setProgress(currentProgress);
      if (currentDuration) {
        setDuration(currentDuration);
      }

      // 清除之前的定時器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 設置新的定時器
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(currentProgress, currentDuration);
      }, autoSaveInterval);
    },
    [saveProgress, autoSaveInterval]
  );

  // 立即儲存（用於頁面離開時）
  const saveImmediately = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveProgress(progress, duration);
  }, [saveProgress, progress, duration]);

  // 清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 計算觀看百分比
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return {
    progress,
    duration,
    progressPercent,
    loading,
    updateProgress,
    saveImmediately,
  };
}
