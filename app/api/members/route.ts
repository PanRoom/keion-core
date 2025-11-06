import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/lib/auth";

/**
 * GET: 部員一覧を取得
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("member_id", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("部員一覧取得エラー:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

/**
 * POST: 新しい部員を登録 (役員専用)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, board } = body;

    console.log("📥 部員登録リクエスト:", { email, name, board });

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "email, password, and name are required" },
        { status: 400 }
      );
    }

    // ユーザー作成 (Supabase Auth + membersテーブル)
    const result = await createUser(email, password, name, board || false);

    console.log("✅ 部員登録成功:", result.member);

    return NextResponse.json(result.member, { status: 201 });
  } catch (error) {
    console.error("❌ 部員登録エラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create member",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 部員情報を更新
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { member_id, name, practice_available, board } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: "member_id is required" },
        { status: 400 }
      );
    }

    // 更新データの準備
    const updateData: {
      name?: string;
      practice_available?: boolean;
      executive?: boolean;
      grade?: number;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (practice_available !== undefined)
      updateData.practice_available = practice_available;
    if (board !== undefined) updateData.executive = board;

    const { data, error } = await supabase
      .from("members")
      .update(updateData)
      .eq("member_id", member_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("部員情報更新エラー:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}
