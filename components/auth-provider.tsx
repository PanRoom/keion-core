"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, onAuthStateChange, signOut } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

type Member = {
  member_id: number;
  name: string;
  email: string;
  executive: boolean;
  practice_available: boolean;
  user_id: string;
  grade?: number;
};

type AuthContextType = {
  user: User | null;
  member: Member | null;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  isLoading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初回ロード時にユーザー情報を取得
    const loadUser = async () => {
      try {
        console.log("AuthProvider: 初回ユーザー情報取得開始");

        // タイムアウト設定（5秒）
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("認証タイムアウト")), 5000)
        );

        const result = (await Promise.race([
          getCurrentUser(),
          timeoutPromise,
        ])) as Awaited<ReturnType<typeof getCurrentUser>>;

        console.log("AuthProvider: ユーザー情報取得完了", { result });

        if (result) {
          setUser(result.user);
          setMember(result.member);
        }
      } catch (error) {
        console.error("AuthProvider: ユーザー情報取得エラー", error);
        // エラーでもローディングは解除
      } finally {
        setIsLoading(false);
        console.log("AuthProvider: ローディング解除");
      }
    };

    loadUser();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: 認証状態変更", { event });

      if (event === "SIGNED_IN" && session) {
        const result = await getCurrentUser();
        setUser(result?.user || null);
        setMember(result?.member || null);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setMember(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    try {
      console.log("ログアウト処理開始");
      await signOut();
      setUser(null);
      setMember(null);
      router.push("/login");
      console.log("ログアウト完了");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      alert("ログアウトに失敗しました");
    }
  };

  return (
    <AuthContext.Provider value={{ user, member, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
