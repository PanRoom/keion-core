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
            className="p-6 bg-card border-2 border-blue-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push("/member/practice-request")}
          >
            <h2 className="text-xl font-semibold mb-2">練習希望提出</h2>
            <p className="text-muted-foreground text-sm">
              希望する練習時間を選択します
            </p>
          </div>

          {/* ライブ出演申し込み */}
          <div
            className="p-6 bg-card border-2 border-orange-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push("/entry_form")}
          >
            <h2 className="text-xl font-semibold mb-2">
              🎸 ライブ出演申し込み
            </h2>
            <p className="text-muted-foreground text-sm">
              バンドの出演時間を申し込みます
            </p>
          </div>

          {/* 出席可能時間申請 */}
          <div
            className="p-6 bg-card border-2 border-green-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push("/timetable-request")}
          >
            <h2 className="text-xl font-semibold mb-2">🎸 出席可能時間申請</h2>
            <p className="text-muted-foreground text-sm">
              ライブ当日の出席時間を申請します
            </p>
          </div>

          {/* タイムテーブル確認 */}
          <div
            className="p-6 bg-card border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push("/timetable")}
          >
            <h2 className="text-xl font-semibold mb-2">
              🎸 タイムテーブル確認
            </h2>
            <p className="text-muted-foreground text-sm">
              ライブの演奏順を確認します
            </p>
          </div>

          {/* 練習スケジュール確認 */}
          <div
            className="p-6 bg-card border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push("/Practice-time-result")}
          >
            <h2 className="text-xl font-semibold mb-2">
              練習スケジュール確認
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
