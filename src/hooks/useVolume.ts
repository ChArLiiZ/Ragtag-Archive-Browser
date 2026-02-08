"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const VOLUME_KEY = "archive-browser-volume";
const MUTED_KEY = "archive-browser-muted";

const DEFAULT_VOLUME = 1;

export function useVolume() {
  const [volume, setVolumeRaw] = useLocalStorage(VOLUME_KEY, DEFAULT_VOLUME);
  const [isMuted, setIsMutedRaw] = useLocalStorage(MUTED_KEY, false);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeRaw(clamped);
  }, [setVolumeRaw]);

  const setIsMuted = useCallback((value: boolean) => {
    setIsMutedRaw(value);
  }, [setIsMutedRaw]);

  const toggleMute = useCallback(() => {
    setIsMutedRaw((prev) => !prev);
  }, [setIsMutedRaw]);

  return { volume, isMuted, setVolume, setIsMuted, toggleMute };
}
