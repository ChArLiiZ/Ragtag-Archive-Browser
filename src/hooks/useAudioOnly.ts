"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "archive-browser-audio-only";

export function useAudioOnly() {
  const [audioOnly, setAudioOnly] = useLocalStorage(STORAGE_KEY, false);

  const toggleAudioOnly = useCallback(() => {
    setAudioOnly((prev) => !prev);
  }, [setAudioOnly]);

  return { audioOnly, setAudioOnly, toggleAudioOnly };
}
