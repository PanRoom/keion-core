"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.member) {
        // ログイン成功、ホーム画面にリダイレクト
        router.push("/");
        router.refresh();
      } else {
        setError("部員情報が見つかりません");
      }
    } catch (err) {
      console.error("ログインエラー:", err);
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">ログイン</h1>
          <p className="text-muted-foreground mt-2">軽音部練習管理システム</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ログインボタン */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        {/* 注意書き */}
        <div className="text-center text-sm text-muted-foreground">
          <p>アカウントをお持ちでない場合は、役員にお問い合わせください。</p>
        </div>
      </div>
    </div>
  );
}
