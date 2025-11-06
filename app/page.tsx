"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const router = useRouter();
  const { user, member, isLoading } = useAuth();

  useEffect(() => {
    console.log("Home page useEffect:", { isLoading, user: !!user, member: !!member });
    if (!isLoading) {
      if (!user) {
        // ログインしていない場合はログイン画面へ
        console.log("No user, redirecting to /login");
        router.push("/login");
      } else if (member) {
        // ログイン済みの場合は役員/部員で振り分け
        console.log("User and member found, checking executive status:", member.executive);
        if (member.executive) {
          // 役員の場合
          console.log("Executive user, redirecting to /admin/dashboard");
          router.push("/admin/dashboard");
        } else {
          // 部員の場合
          console.log("Regular member, redirecting to /member/dashboard");
          router.push("/member/dashboard");
        }
      } else {
        console.log("User exists but member is null");
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
