import { supabase } from "./supabase";

// ユーザー情報の型定義
export type User = {
  id: string;
  email: string;
  member_id: number;
  name: string;
  board: boolean;
  practice_available: boolean;
};

/**
 * メールアドレスとパスワードでログイン
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("ログインエラー:", error);
    throw error;
  }

  // ログイン成功後、部員情報を取得
  if (data.user) {
    const memberData = await getMemberByUserId(data.user.id);
    return { user: data.user, member: memberData };
  }

  return { user: data.user, member: null };
}

/**
 * ログアウト
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("ログアウトエラー:", error);
    throw error;
  }
}

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // 部員情報も取得
  const memberData = await getMemberByUserId(user.id);

  return { user, member: memberData };
}

/**
 * user_idから部員情報を取得
 */
export async function getMemberByUserId(userId: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("部員情報取得エラー:", error);
    return null;
  }

  return data;
}

/**
 * 新しいユーザーを作成 (役員専用)
 * Supabase Authにユーザー登録 + membersテーブルに情報を追加
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  board: boolean = false
) {
  // 1. Supabase Authにユーザー登録
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error("ユーザー作成エラー:", authError);
    throw authError;
  }

  if (!authData.user) {
    throw new Error("ユーザー作成に失敗しました");
  }

  // 2. membersテーブルに部員情報を追加
  try {
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .insert({
        user_id: authData.user.id,
        name,
        email,
        board,
        "Practice available": true, // デフォルトで練習参加可能
      })
      .select()
      .single();

    if (memberError) {
      // membersテーブルへの追加が失敗した場合、Authユーザーも削除
      console.error("部員情報登録エラー:", memberError);

      // 作成したAuthユーザーをクリーンアップ
      await supabase.auth.admin
        .deleteUser(authData.user.id)
        .catch((cleanupError) => {
          console.error("Authユーザーのクリーンアップ失敗:", cleanupError);
        });

      throw memberError;
    }

    return { user: authData.user, member: memberData };
  } catch (error) {
    // エラー時もAuthユーザーをクリーンアップ
    await supabase.auth.admin
      .deleteUser(authData.user.id)
      .catch((cleanupError) => {
        console.error("Authユーザーのクリーンアップ失敗:", cleanupError);
      });
    throw error;
  }
}

/**
 * セッション変更を監視
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
