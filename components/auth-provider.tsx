"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, onAuthStateChange, signOut } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

type Member = {
  "member_id(PK)": number;
  name: string;
  email: string;
  board: boolean;
  "Practice available": boolean;
  user_id: string;
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
    getCurrentUser().then((result) => {
      if (result) {
        setUser(result.user);
        setMember(result.member);
      }
      setIsLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, session) => {
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
    await signOut();
    setUser(null);
    setMember(null);
    router.push("/login");
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
