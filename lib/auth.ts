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
  try {
    console.log("getCurrentUser: 開始");

    // タイムアウト付きでauth.getUserを実行
    const getUserWithTimeout = Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("auth.getUser タイムアウト")), 3000)
      ),
    ]);

    const {
      data: { user },
      error,
    } = (await getUserWithTimeout) as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >;

    console.log("getCurrentUser: auth.getUser完了", { user: user?.id, error });

    if (error || !user) {
      console.log("getCurrentUser: ユーザーなし");
      return null;
    }

    // 部員情報も取得
    console.log("getCurrentUser: 部員情報取得開始");
    const memberData = await getMemberByUserId(user.id);
    console.log("getCurrentUser: 部員情報取得完了", { memberData });

    return { user, member: memberData };
  } catch (error) {
    console.error("getCurrentUser: エラー", error);
    return null;
  }
}

/**
 * user_idから部員情報を取得
 */
export async function getMemberByUserId(userId: string) {
  try {
    console.log("getMemberByUserId: 開始", { userId });

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(); // single()ではなくmaybeSingle()を使用

    console.log("getMemberByUserId: クエリ完了", { data, error });

    if (error) {
      console.error("部員情報取得エラー:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("getMemberByUserId: 例外", error);
    return null;
  }
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
        executive: board,
        practice_available: true, // デフォルトで練習参加可能
        grade: 1, // デフォルトで1年生
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
