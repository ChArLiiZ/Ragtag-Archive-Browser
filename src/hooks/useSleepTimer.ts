"use client";

import { useState, useEffect, useCallback, useRef } from "react";

function formatTimerDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function useSleepTimer(onExpire: () => void) {
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const targetTimeRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);

  // 保持 onExpire ref 為最新版本
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // 計時器 tick
  useEffect(() => {
    if (!isActive) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((targetTimeRef.current - Date.now()) / 1000)
      );
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsActive(false);
        onExpireRef.current();
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [isActive]);

  const start = useCallback((durationSeconds: number) => {
    targetTimeRef.current = Date.now() + durationSeconds * 1000;
    setRemainingSeconds(durationSeconds);
    setIsActive(true);
  }, []);

  const cancel = useCallback(() => {
    setIsActive(false);
    setRemainingSeconds(0);
    targetTimeRef.current = 0;
  }, []);

  return {
    isActive,
    remainingSeconds,
    remainingFormatted: formatTimerDuration(remainingSeconds),
    start,
    cancel,
  };
}
