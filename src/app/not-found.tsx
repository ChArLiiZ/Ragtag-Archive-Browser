"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-custom py-16 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg mx-auto"
      >
        {/* 404 數字動畫 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <span className="text-9xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            404
          </span>
        </motion.div>

        {/* 錯誤訊息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl font-bold mb-4">找不到您要的頁面</h1>
          <p className="text-muted-foreground mb-8">
            您要找的頁面可能已被移除、名稱已變更，或暫時無法使用。
          </p>
        </motion.div>

        {/* 操作按鈕 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Button asChild size="lg">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              返回首頁
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/search">
              <Search className="mr-2 h-5 w-5" />
              搜尋影片
            </Link>
          </Button>
        </motion.div>

        {/* 返回上一頁 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上一頁
          </Button>
        </motion.div>

        {/* 熱門搜尋建議 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                或者試試這些熱門搜尋：
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["hololive", "歌回", "雜談", "遊戲", "ASMR"].map((tag) => (
                  <Button key={tag} variant="secondary" size="sm" asChild>
                    <Link href={`/search?q=${encodeURIComponent(tag)}`}>
                      {tag}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
