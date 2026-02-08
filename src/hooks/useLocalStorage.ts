"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * 通用的 localStorage hook
 * 支援 SSR（伺服器端渲染時使用預設值）
 * 
 * @param key localStorage 的 key
 * @param defaultValue 預設值
 * @returns [value, setValue] tuple
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // 使用 lazy initializer 避免每次渲染都執行 localStorage 讀取
    const [value, setValue] = useState<T>(() => {
        // SSR 時直接返回預設值
        if (typeof window === "undefined") {
            return defaultValue;
        }

        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item) as T;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    // 同步到 localStorage
    const setStoredValue = useCallback(
        (newValue: T | ((prev: T) => T)) => {
            setValue((prev) => {
                const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;

                try {
                    if (typeof window !== "undefined") {
                        localStorage.setItem(key, JSON.stringify(valueToStore));
                    }
                } catch (error) {
                    console.warn(`Error setting localStorage key "${key}":`, error);
                }

                return valueToStore;
            });
        },
        [key]
    );

    // 監聽其他分頁的 localStorage 變化
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setValue(JSON.parse(e.newValue) as T);
                } catch {
                    // ignore parse errors
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [key]);

    return [value, setStoredValue];
}
