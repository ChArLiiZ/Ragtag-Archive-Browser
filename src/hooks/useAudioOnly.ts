"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "archive-browser-audio-only";

export function useAudioOnly() {
  const [audioOnly, setAudioOnlyState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setAudioOnlyState(true);
      }
    } catch {
      // localStorage 不可用
    }
  }, []);

  const setAudioOnly = useCallback((value: boolean) => {
    setAudioOnlyState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const toggleAudioOnly = useCallback(() => {
    setAudioOnlyState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { audioOnly, setAudioOnly, toggleAudioOnly };
}
