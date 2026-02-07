"use client";

import { useState, useEffect, useCallback } from "react";

const VOLUME_KEY = "archive-browser-volume";
const MUTED_KEY = "archive-browser-muted";

const DEFAULT_VOLUME = 1;

export function useVolume() {
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMutedState] = useState(false);

  // 從 localStorage 讀取初始值
  useEffect(() => {
    try {
      const storedVolume = localStorage.getItem(VOLUME_KEY);
      if (storedVolume !== null) {
        const parsed = parseFloat(storedVolume);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          setVolumeState(parsed);
        }
      }
      const storedMuted = localStorage.getItem(MUTED_KEY);
      if (storedMuted === "true") {
        setIsMutedState(true);
      }
    } catch {
      // localStorage 不可用
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const setIsMuted = useCallback((value: boolean) => {
    setIsMutedState(value);
    try {
      localStorage.setItem(MUTED_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { volume, isMuted, setVolume, setIsMuted, toggleMute };
}
