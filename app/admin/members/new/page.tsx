"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NewMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    board: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("部員を追加しました");
        router.push("/admin/members");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "部員の追加に失敗しました");
      }
    } catch (err) {
      console.error("部員追加エラー:", err);
      setError("部員の追加に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            新しい部員を追加
          </h1>
          <p className="text-muted-foreground mt-2">
            新しい部員のアカウントを作成します (役員専用)
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-card p-6 rounded-lg border"
        >
          {/* 名前 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={isLoading}
              className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="山田太郎"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={isLoading}
              className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="example@email.com"
            />
          </div>

          {/* パスワード */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
            >
              初期パスワード <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              disabled={isLoading}
              minLength={6}
              className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="6文字以上"
            />
            <p className="text-xs text-muted-foreground mt-1">
              最低6文字以上のパスワードを設定してください
            </p>
          </div>

          {/* 役員フラグ */}
          <div className="flex items-center space-x-3">
            <input
              id="board"
              type="checkbox"
              checked={formData.board}
              onChange={(e) =>
                setFormData({ ...formData, board: e.target.checked })
              }
              disabled={isLoading}
              className="w-5 h-5 rounded border-input"
            />
            <label htmlFor="board" className="text-sm font-medium">
              この部員を役員として登録する
            </label>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "登録中..." : "部員を追加"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
