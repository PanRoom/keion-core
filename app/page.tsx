"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const router = useRouter();
  const { user, member, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // ログインしていない場合はログイン画面へ
        router.push("/login");
      } else if (member) {
        // ログイン済みの場合は役員/部員で振り分け
        if (member.board) {
          // 役員の場合
          router.push("/admin/dashboard");
        } else {
          // 部員の場合
          router.push("/member/dashboard");
        }
      }
    }
  }, [user, member, isLoading, router]);

  // ローディング中の表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}
