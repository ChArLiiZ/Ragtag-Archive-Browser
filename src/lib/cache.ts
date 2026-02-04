/**
 * API 快取層
 * 用於快取 API 請求結果，減少重複請求
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** 快取存活時間（毫秒），預設 5 分鐘 */
  ttl?: number;
  /** 最大快取數量，預設 100 */
  maxSize?: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 分鐘
const DEFAULT_MAX_SIZE = 100;

/**
 * 記憶體快取類別
 */
class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? DEFAULT_TTL;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }

  /**
   * 取得快取項目
   */
  get<R = T>(key: string): R | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as unknown as R;
  }

  /**
   * 設定快取項目
   */
  set<R = T>(key: string, data: R, customTtl?: number): void {
    // 如果快取已滿，移除最舊的項目
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = customTtl ?? this.ttl;
    const now = Date.now();

    this.cache.set(key, {
      data: data as unknown as T,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * 檢查是否有有效的快取
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 刪除特定快取項目
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 根據前綴模式使快取失效
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // 支援前綴匹配
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 取得快取統計資訊
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }

  /**
   * 移除最舊的快取項目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * 請求去重器
 * 確保同一時間相同的請求只會執行一次
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * 執行請求（去重）
   * 如果相同 key 的請求正在進行中，會返回該請求的 Promise
   */
  async execute<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 如果已有相同請求正在進行中，返回該 Promise
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // 建立新請求
    const request = fetcher().finally(() => {
      // 請求完成後移除
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * 檢查是否有進行中的請求
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * 取得進行中的請求數量
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

/**
 * 帶快取和去重的請求包裝器
 */
export class CachedFetcher {
  private cache: MemoryCache;
  private deduplicator: RequestDeduplicator;

  constructor(options: CacheOptions = {}) {
    this.cache = new MemoryCache(options);
    this.deduplicator = new RequestDeduplicator();
  }

  /**
   * 執行帶快取和去重的請求
   * @param key 快取 key
   * @param fetcher 實際的請求函數
   * @param options 可選的快取選項
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    // 如果不強制刷新，先檢查快取
    if (!options?.forceRefresh) {
      const cached = this.cache.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // 使用去重器執行請求
    const data = await this.deduplicator.execute(key, fetcher);

    // 存入快取
    this.cache.set(key, data, options?.ttl);

    return data;
  }

  /**
   * 使特定模式的快取失效
   */
  invalidate(pattern?: string): void {
    this.cache.invalidate(pattern);
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 取得快取統計
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      pendingRequests: this.deduplicator.getPendingCount(),
    };
  }
}

// ============================================
// 全域快取實例
// ============================================

/** 影片資料快取（TTL: 10 分鐘） */
export const videoCache = new CachedFetcher({ ttl: 10 * 60 * 1000, maxSize: 200 });

/** 搜尋結果快取（TTL: 3 分鐘） */
export const searchCache = new CachedFetcher({ ttl: 3 * 60 * 1000, maxSize: 50 });

/** 頻道資料快取（TTL: 15 分鐘） */
export const channelCache = new CachedFetcher({ ttl: 15 * 60 * 1000, maxSize: 100 });

// ============================================
// 快取 Key 生成工具
// ============================================

/**
 * 生成搜尋快取 key
 */
export function getSearchCacheKey(options: object): string {
  // 排序 key 以確保相同參數產生相同 key
  const sortedKeys = Object.keys(options).sort();
  const parts = sortedKeys.map((key) => `${key}:${JSON.stringify((options as Record<string, unknown>)[key])}`);
  return `search:${parts.join("|")}`;
}

/**
 * 生成影片快取 key
 */
export function getVideoCacheKey(videoId: string): string {
  return `video:${videoId}`;
}

/**
 * 生成頻道快取 key
 */
export function getChannelCacheKey(channelId: string): string {
  return `channel:${channelId}`;
}
