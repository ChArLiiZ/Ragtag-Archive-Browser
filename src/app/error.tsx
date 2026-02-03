"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 可以在這裡記錄錯誤到錯誤追蹤服務
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="container-custom py-16 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg mx-auto"
      >
        {/* 錯誤圖示 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
        </motion.div>

        {/* 錯誤訊息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl font-bold mb-4">發生錯誤</h1>
          <p className="text-muted-foreground mb-2">
            很抱歉，載入此頁面時發生了問題。
          </p>
          <p className="text-muted-foreground mb-8 text-sm">
            請稍後再試，或返回首頁。
          </p>
        </motion.div>

        {/* 錯誤詳情（開發模式） */}
        {process.env.NODE_ENV === "development" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4 text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-muted-foreground mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 操作按鈕 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button onClick={reset} size="lg">
            <RefreshCw className="mr-2 h-5 w-5" />
            重試
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              返回首頁
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
