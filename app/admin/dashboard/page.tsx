"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { member, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              役員ダッシュボード
            </h1>
            <p className="text-muted-foreground mt-2">
              ようこそ、{member?.name}さん
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            ログアウト
          </Button>
        </div>

        {/* 役員機能セクション */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">役員機能</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* イベント作成 */}
            <div
              className="p-6 bg-card border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/event_create")}
            >
              <h3 className="text-xl font-semibold mb-2">🎸 イベント作成</h3>
              <p className="text-muted-foreground text-sm">
                新しいライブイベントを作成します
              </p>
            </div>

            {/* 練習スケジュール設定 */}
            <div
              className="p-6 bg-card border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/practice-schedule-admin")}
            >
              <h3 className="text-xl font-semibold mb-2">
                練習スケジュール設定
              </h3>
              <p className="text-muted-foreground text-sm">
                練習可能な日時を設定します
              </p>
            </div>

            {/* 部員管理 */}
            <div
              className="p-6 bg-card border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/admin/members/new")}
            >
              <h3 className="text-xl font-semibold mb-2">部員追加</h3>
              <p className="text-muted-foreground text-sm">
                新しい部員を登録します
              </p>
            </div>

            {/* タイムテーブル作成（準備中） */}
            <div className="p-6 bg-card border rounded-lg opacity-50">
              <h3 className="text-xl font-semibold mb-2">
                タイムテーブル作成 (準備中)
              </h3>
              <p className="text-muted-foreground text-sm">
                ライブの演奏順を決定します
              </p>
            </div>

            {/* その他の機能 */}
            <div className="p-6 bg-card border rounded-lg opacity-50">
              <h3 className="text-xl font-semibold mb-2">
                練習結果確認 (準備中)
              </h3>
              <p className="text-muted-foreground text-sm">
                確定した練習時間を確認します
              </p>
            </div>
          </div>
        </div>

        {/* 部員機能セクション */}
        <div>
          <h2 className="text-2xl font-bold mb-4">部員機能</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 練習希望提出 */}
            <div
              className="p-6 bg-card border-2 border-blue-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/member/practice-request")}
            >
              <h3 className="text-xl font-semibold mb-2">練習希望提出</h3>
              <p className="text-muted-foreground text-sm">
                練習可能な時間を提出します
              </p>
            </div>

            {/* ライブ出演申し込み */}
            <div
              className="p-6 bg-card border-2 border-orange-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/entry_form")}
            >
              <h3 className="text-xl font-semibold mb-2">
                🎸 ライブ出演申し込み
              </h3>
              <p className="text-muted-foreground text-sm">
                バンドの出演時間を申し込みます
              </p>
            </div>

            {/* 出席可能時間申請 */}
            <div
              className="p-6 bg-card border-2 border-green-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/timetable-request")}
            >
              <h3 className="text-xl font-semibold mb-2">
                🎸 出席可能時間申請
              </h3>
              <p className="text-muted-foreground text-sm">
                ライブ当日の出席時間を申請します
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
