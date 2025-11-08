import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET: 部員の練習希望を取得
 * クエリパラメータ:
 *   - member_id: 部員ID
 *   - week_id: 週ID（オプション）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");
    const weekId = searchParams.get("week_id");

    if (!memberId) {
      return NextResponse.json(
        { error: "member_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("members_prefer")
      .select("*")
      .eq("member_id", memberId);

    // 特定の週のみ取得する場合
    if (weekId) {
      query = query.eq("week_id", weekId);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // TEXT型から配列に変換
    const formattedData = data?.map((item) => ({
      ...item,
      priority: item.priority ? JSON.parse(item.priority) : null,
    }));

    return NextResponse.json(formattedData || []);
  } catch (error) {
    console.error("練習希望取得エラー:", error);
    return NextResponse.json(
      { error: "Failed to fetch member preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST: 新しい練習希望を作成
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, week_id, priority } = body;

    console.log("📥 練習希望受信:", { member_id, week_id });

    // バリデーション
    if (!member_id || !week_id) {
      return NextResponse.json(
        { error: "member_id and week_id are required" },
        { status: 400 }
      );
    }

    // priority がある場合は形式チェック
    if (priority) {
      if (
        !Array.isArray(priority) ||
        priority.length !== 6 ||
        !priority.every((row) => Array.isArray(row) && row.length === 12)
      ) {
        return NextResponse.json(
          { error: "priority must be a 6x12 array" },
          { status: 400 }
        );
      }
    }

    // JSONを文字列に変換
    const priorityStr = priority ? JSON.stringify(priority) : null;

    // UPSERT: 既存のレコードがあれば更新、なければ挿入
    const { data, error } = await supabase
      .from("members_prefer")
      .upsert(
        {
          member_id,
          week_id,
          priority: priorityStr,
        },
        {
          onConflict: "member_id,week_id", // ユニーク制約に基づいて更新
        }
      )
      .select()
      .single();

    if (error) throw error;

    console.log("✅ 練習希望保存成功:", data);

    // レスポンス用に配列に戻す
    const formattedData = {
      ...data,
      priority: data.priority ? JSON.parse(data.priority) : null,
    };

    return NextResponse.json(formattedData, { status: 201 });
  } catch (error) {
    console.error("❌ 練習希望保存エラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save preference",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 練習希望を更新
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, priority } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // 更新データの準備
    const updateData: {
      priority?: string | null;
    } = {};

    if (priority !== undefined) {
      if (priority === null) {
        updateData.priority = null;
      } else {
        // 配列の形式チェック (6x12)
        if (
          !Array.isArray(priority) ||
          priority.length !== 6 ||
          !priority.every((row) => Array.isArray(row) && row.length === 12)
        ) {
          return NextResponse.json(
            { error: "priority must be a 6x12 array" },
            { status: 400 }
          );
        }
        updateData.priority = JSON.stringify(priority);
      }
    }

    const { data, error } = await supabase
      .from("members_prefer")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // レスポンス用に配列に戻す
    const formattedData = {
      ...data,
      priority: data.priority ? JSON.parse(data.priority) : null,
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("練習希望更新エラー:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 練習希望を削除
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("members_prefer")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("練習希望削除エラー:", error);
    return NextResponse.json(
      { error: "Failed to delete preference" },
      { status: 500 }
    );
  }
}
