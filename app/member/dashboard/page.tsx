"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function MemberDashboard() {
  const { member, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              部員ダッシュボード
            </h1>
            <p className="text-muted-foreground mt-2">
              ようこそ、{member?.name}さん
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            ログアウト
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 練習希望提出 */}
          <div
            className="p-6 bg-card border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push("/member/practice-request")}
          >
            <h2 className="text-xl font-semibold mb-2">練習希望提出</h2>
            <p className="text-muted-foreground text-sm">
              希望する練習時間を選択します
            </p>
          </div>

          {/* その他の機能 */}
          <div className="p-6 bg-card border rounded-lg opacity-50">
            <h2 className="text-xl font-semibold mb-2">
              練習スケジュール確認 (準備中)
            </h2>
            <p className="text-muted-foreground text-sm">
              確定した練習時間を確認します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
