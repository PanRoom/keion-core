"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

type Member = {
  member_id: number;
  name: string;
  email: string;
  executive: boolean;
  practice_available: boolean;
  user_id: string;
  grade?: number;
};

export default function AdminMembersPage() {
  const router = useRouter();
  const { member, logout } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("部員一覧取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">部員一覧</h1>
            <p className="text-muted-foreground mt-2">
              登録されている部員の一覧
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => router.push("/admin/dashboard")}>
              ダッシュボードに戻る
            </Button>
            <Button variant="outline" onClick={logout}>
              ログアウト
            </Button>
          </div>
        </div>

        {/* 新規追加ボタン */}
        <div className="mb-6">
          <Button onClick={() => router.push("/admin/members/new")}>
            ＋ 新しい部員を追加
          </Button>
        </div>

        {/* ローディング */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        )}

        {/* 部員一覧テーブル */}
        {!isLoading && (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    役員
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    練習参加
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      部員が登録されていません
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.member_id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm">{m.member_id}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {m.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {m.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {m.executive ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            役員
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            部員
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {m.practice_available ? (
                          <span className="text-green-600">✓ 可能</span>
                        ) : (
                          <span className="text-red-600">✗ 不可</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 部員数 */}
        {!isLoading && members.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            合計: {members.length}人
          </div>
        )}
      </div>
    </div>
  );
}
