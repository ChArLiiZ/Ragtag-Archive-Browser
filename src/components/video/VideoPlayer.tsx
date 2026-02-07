"use client";

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialTime?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  audioOnly?: boolean;
  onToggleAudioOnly?: () => void;
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (muted: boolean) => void;
}

export interface VideoPlayerHandle {
  pause: () => void;
}

export const VideoPlayer = React.forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  src,
  poster,
  initialTime = 0,
  onProgressUpdate,
  onEnded,
  autoPlay = false,
  audioOnly = false,
  onToggleAudioOnly,
  volume: externalVolume,
  isMuted: externalIsMuted,
  onVolumeChange,
  onMutedChange,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // 音量：支援受控（external）與非受控模式
  const [internalVolume, setInternalVolume] = useState(externalVolume ?? 1);
  const [internalMuted, setInternalMuted] = useState(externalIsMuted ?? false);
  const volume = externalVolume ?? internalVolume;
  const isMuted = externalIsMuted ?? internalMuted;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const hideControlsTimeout = useRef<NodeJS.Timeout | number | null>(null);

  // 用於鍵盤快捷鍵的 ref（避免事件監聽器依賴狀態）
  // 注意：volume 直接從 media element 讀取，不需要 ref
  const durationRef = useRef(duration);
  const initialTimeRef = useRef(initialTime);
  const onToggleAudioOnlyRef = useRef(onToggleAudioOnly);
  const audioOnlyRef = useRef(audioOnly);
  const onVolumeChangeRef = useRef(onVolumeChange);
  const onMutedChangeRef = useRef(onMutedChange);

  // 取得目前使用的媒體元素（video 或 audio）
  const getActiveMedia = useCallback((): HTMLMediaElement | null => {
    return audioOnlyRef.current ? audioRef.current : videoRef.current;
  }, []);

  // 暴露 pause 方法給外部（睡眠計時器使用）
  useImperativeHandle(ref, () => ({
    pause: () => {
      const media = getActiveMedia();
      if (media) media.pause();
    },
  }), [getActiveMedia]);

  // 同步 ref 與狀態
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  useEffect(() => {
    onToggleAudioOnlyRef.current = onToggleAudioOnly;
  }, [onToggleAudioOnly]);

  useEffect(() => {
    audioOnlyRef.current = audioOnly;
  }, [audioOnly]);

  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  useEffect(() => {
    onMutedChangeRef.current = onMutedChange;
  }, [onMutedChange]);

  // 當外部受控的音量 prop 變更時，同步到媒體元素
  useEffect(() => {
    if (externalVolume === undefined) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video) video.volume = externalVolume;
    if (audio) audio.volume = externalVolume;
  }, [externalVolume]);

  // 當外部受控的靜音 prop 變更時，同步到媒體元素
  useEffect(() => {
    if (externalIsMuted === undefined) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video) video.muted = externalIsMuted;
    if (audio) audio.muted = externalIsMuted;
  }, [externalIsMuted]);

  // 純音訊模式切換：在 video 和 audio 之間同步狀態
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    if (audioOnly) {
      // video → audio：同步狀態後切換
      audio.currentTime = video.currentTime;
      audio.volume = video.volume;
      audio.muted = video.muted;
      // 同步 duration（audio 的 loadedmetadata 在非純音訊模式下不會設定 duration）
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      const wasPlaying = !video.paused;
      video.pause();
      if (wasPlaying) {
        audio.play().catch(() => {});
      }
    } else {
      // audio → video：同步狀態後切換
      video.currentTime = audio.currentTime;
      video.volume = audio.volume;
      video.muted = audio.muted;
      // 同步 duration（video 的 duration 可能與 audio 不同，切回時需要更新）
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      const wasPlaying = !audio.paused;
      audio.pause();
      if (wasPlaying) {
        video.play().catch(() => {});
      }
    }
  }, [audioOnly]);

  // 當影片來源變更時重置播放狀態
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIsPlaying(false);
    setIsLoading(true);

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [src]);

  // 處理 autoPlay prop 變更（因為 HTML5 autoPlay 屬性只在掛載時評估）
  useEffect(() => {
    const media = getActiveMedia();
    if (!media || !autoPlay) return;

    // 當 autoPlay 變為 true 時，嘗試播放
    media.play().catch((err) => {
      // 瀏覽器可能會阻止自動播放（例如用戶未互動過頁面）
      console.log("Auto-play was prevented:", err);
    });
  }, [autoPlay, getActiveMedia]);

  // 初始化影片事件監聽
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // 純音訊模式下忽略 video 的 loadedmetadata，避免覆蓋 audio 設定的 duration
      if (audioOnlyRef.current) return;
      setDuration(video.duration);
      // 初始化時設定起始時間（使用 ref 確保讀取最新值，避免閉包捕獲舊值）
      const time = initialTimeRef.current;
      if (time > 0 && time < video.duration) {
        video.currentTime = time;
      }
    };

    const handleTimeUpdate = () => {
      if (!audioOnlyRef.current) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleProgress = () => {
      if (!audioOnlyRef.current && video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleCanPlay = () => {
      if (!audioOnlyRef.current) setIsLoading(false);
    };

    const handleWaiting = () => {
      if (!audioOnlyRef.current) setIsLoading(true);
    };

    const handlePlaying = () => {
      if (!audioOnlyRef.current) {
        setIsLoading(false);
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (!audioOnlyRef.current) setIsPlaying(false);
    };

    const handleEnded = () => {
      if (!audioOnlyRef.current) {
        setIsPlaying(false);
        if (onEnded) onEnded();
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src, onEnded]); // 加入 src：換源時重新綁定事件，確保 loadedmetadata 觸發時使用最新的閉包

  // audio 元素事件監聽（純音訊模式時使用）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audioOnlyRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleProgress = () => {
      if (audioOnlyRef.current && audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };

    const handleCanPlay = () => {
      if (audioOnlyRef.current) setIsLoading(false);
    };

    const handleWaiting = () => {
      if (audioOnlyRef.current) setIsLoading(true);
    };

    const handlePlaying = () => {
      if (audioOnlyRef.current) {
        setIsLoading(false);
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (audioOnlyRef.current) setIsPlaying(false);
    };

    const handleEnded = () => {
      if (audioOnlyRef.current) {
        setIsPlaying(false);
        if (onEnded) onEnded();
      }
    };

    const handleLoadedMetadata = () => {
      // 僅在純音訊模式下設定 duration，避免與 video 的 duration 產生競態覆蓋
      if (audioOnlyRef.current) {
        setDuration(audio.duration);
        // 使用 ref 確保讀取最新值，避免閉包捕獲舊值
        const time = initialTimeRef.current;
        if (time > 0 && time < audio.duration) {
          audio.currentTime = time;
        }
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src, onEnded]); // 加入 src：換源時重新綁定事件，確保 loadedmetadata 觸發時使用最新的閉包

  // 處理 initialTime prop 變更（當進度載入完成後）
  // 這個 effect 獨立處理 initialTime 的變化，確保即使 loadedmetadata 已經觸發過
  // 也能正確更新 currentTime（video 和 audio 都需要處理）
  useEffect(() => {
    // 根據目前模式選擇正確的媒體元素
    const media = audioOnly ? audioRef.current : videoRef.current;
    if (!media) return;

    // 只有在媒體已載入 metadata（duration > 0）且 initialTime 有效時才更新
    // 這確保了當 initialTime 從 0 變成載入的進度值時，能正確 seek 到該位置
    if (media.duration > 0 && initialTime > 0 && initialTime < media.duration) {
      // 只有在目前時間與目標時間差距較大時才 seek（避免不必要的 seek）
      if (Math.abs(media.currentTime - initialTime) > 1) {
        media.currentTime = initialTime;
      }
    }
  }, [initialTime, audioOnly]);

  // 定期更新觀看進度
  useEffect(() => {
    if (!onProgressUpdate || duration === 0) return;

    const interval = setInterval(() => {
      const media = getActiveMedia();
      if (media && isPlaying) {
        onProgressUpdate(media.currentTime, duration);
      }
    }, 10000); // 每 10 秒更新一次

    return () => clearInterval(interval);
  }, [onProgressUpdate, duration, isPlaying, getActiveMedia]);

  // 全螢幕變化監聽
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 純音訊模式啟用時自動退出全螢幕
  useEffect(() => {
    if (audioOnly && isFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [audioOnly, isFullscreen]);

  // 自動隱藏控制列
  const resetHideControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // 播放/暫停
  const togglePlay = () => {
    const media = getActiveMedia();
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
  };

  // 靜音切換
  const toggleMute = () => {
    const media = getActiveMedia();
    if (!media) return;

    const newMuted = !isMuted;
    media.muted = newMuted;
    setInternalMuted(newMuted);
    onMutedChange?.(newMuted);
  };

  // 音量調整
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = getActiveMedia();
    if (!media) return;

    const newVolume = parseFloat(e.target.value);
    media.volume = newVolume;
    setInternalVolume(newVolume);
    onVolumeChange?.(newVolume);
    const newMuted = newVolume === 0;
    setInternalMuted(newMuted);
    onMutedChange?.(newMuted);
  };

  // 進度條點擊
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = getActiveMedia();
    const progressBar = progressRef.current;
    if (!media || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    media.currentTime = pos * duration;
  };

  // 全螢幕切換
  const toggleFullscreen = () => {
    if (audioOnly) return; // 純音訊模式下不允許全螢幕
    const container = containerRef.current;
    if (!container) return;

    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  // 快進/快退
  const skip = (seconds: number) => {
    const media = getActiveMedia();
    if (!media) return;

    media.currentTime = Math.max(
      0,
      Math.min(duration, media.currentTime + seconds)
    );
  };

  // 鍵盤快捷鍵（使用 ref 避免頻繁重新綁定）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const media = audioOnlyRef.current
        ? audioRef.current
        : videoRef.current;
      if (!media) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (media.paused) {
            media.play();
          } else {
            media.pause();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          media.currentTime = Math.max(0, media.currentTime - 5);
          break;
        case "ArrowRight":
          e.preventDefault();
          media.currentTime = Math.min(durationRef.current, media.currentTime + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          {
            // 直接讀取 media.volume 確保快速連按時能取得最新值
            const newVolume = Math.min(1, media.volume + 0.1);
            media.volume = newVolume;
            setInternalVolume(newVolume);
            onVolumeChangeRef.current?.(newVolume);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          {
            // 直接讀取 media.volume 確保快速連按時能取得最新值
            const newVolume = Math.max(0, media.volume - 0.1);
            media.volume = newVolume;
            setInternalVolume(newVolume);
            onVolumeChangeRef.current?.(newVolume);
          }
          break;
        case "m":
          media.muted = !media.muted;
          setInternalMuted(media.muted);
          onMutedChangeRef.current?.(media.muted);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "a":
          if (onToggleAudioOnlyRef.current) {
            onToggleAudioOnlyRef.current();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // 空依賴，只綁定一次

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={resetHideControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 影片元素 */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn("w-full h-full object-contain", audioOnly && "hidden")}
        onClick={togglePlay}
        playsInline
        autoPlay={autoPlay}
      />

      {/* 隱藏的 audio 元素（純音訊模式使用，只解碼音訊不解碼影片） */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* 純音訊模式覆蓋層 */}
      <AnimatePresence>
        {audioOnly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"
            onClick={togglePlay}
          >
            {poster && (
              <img
                src={poster}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <svg
                className="w-16 h-16 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                />
              </svg>
              <span className="text-white/60 text-sm font-medium">
                純音訊模式
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 載入中指示器 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
          >
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 中央播放按鈕 */}
      <AnimatePresence>
        {!isPlaying && !isLoading && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 z-20"
          >
            <div className="w-20 h-20 rounded-full bg-accent/80 flex items-center justify-center hover:bg-accent transition-colors">
              <svg
                className="w-10 h-10 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 控制列 */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30"
          >
            {/* 進度條 */}
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="relative h-1 bg-white/30 rounded-full mb-4 cursor-pointer group/progress"
            >
              {/* 緩衝進度 */}
              <div
                className="absolute h-full bg-white/30 rounded-full"
                style={{ width: `${(buffered / duration) * 100}%` }}
              />
              {/* 播放進度 */}
              <div
                className="absolute h-full bg-accent rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* 拖曳點 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* 左側控制 */}
              <div className="flex items-center gap-3">
                {/* 播放/暫停 */}
                <button onClick={togglePlay} className="hover:text-accent transition-colors">
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* 快退/快進 */}
                <button
                  onClick={() => skip(-10)}
                  className="hover:text-accent transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                </button>

                <button
                  onClick={() => skip(10)}
                  className="hover:text-accent transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </button>

                {/* 音量 */}
                <div className="flex items-center gap-2 group/volume">
                  <button onClick={toggleMute} className="hover:text-accent transition-colors">
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-accent"
                  />
                </div>

                {/* 時間顯示 */}
                <span className="text-sm">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              {/* 右側控制 */}
              <div className="flex items-center gap-3">
                {/* 純音訊模式切換 */}
                {onToggleAudioOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAudioOnly();
                    }}
                    className={cn(
                      "hover:text-accent transition-colors",
                      audioOnly && "text-accent"
                    )}
                    title={audioOnly ? "關閉純音訊模式 (A)" : "純音訊模式 (A)"}
                  >
                    {audioOnly ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* 全螢幕 */}
                <button
                  onClick={toggleFullscreen}
                  className={cn(
                    "hover:text-accent transition-colors",
                    audioOnly && "opacity-30 cursor-not-allowed"
                  )}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
