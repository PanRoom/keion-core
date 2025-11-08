import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET: 部員の練習希望申請を取得
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
      .from("practice_requests")
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
      requested_times: item.requested_times
        ? JSON.parse(item.requested_times)
        : null,
      priority: item.priority ? JSON.parse(item.priority) : null,
    }));

    return NextResponse.json(formattedData || []);
  } catch (error) {
    console.error("練習希望申請取得エラー:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice requests" },
      { status: 500 }
    );
  }
}

/**
 * POST: 新しい練習希望申請を作成
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, week_id, requested_times, priority } = body;

    console.log("📥 練習希望申請受信:", { member_id, week_id });

    // バリデーション
    if (!member_id || !week_id || !requested_times) {
      return NextResponse.json(
        { error: "member_id, week_id, and requested_times are required" },
        { status: 400 }
      );
    }

    // 配列の形式チェック (6x12)
    if (
      !Array.isArray(requested_times) ||
      requested_times.length !== 6 ||
      !requested_times.every((row) => Array.isArray(row) && row.length === 12)
    ) {
      return NextResponse.json(
        { error: "requested_times must be a 6x12 array" },
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
    const requestedTimesStr = JSON.stringify(requested_times);
    const priorityStr = priority ? JSON.stringify(priority) : null;

    // UPSERT: 既存のレコードがあれば更新、なければ挿入
    const { data, error } = await supabase
      .from("practice_requests")
      .upsert(
        {
          member_id,
          week_id,
          requested_times: requestedTimesStr,
          priority: priorityStr,
        },
        {
          onConflict: "member_id,week_id", // ユニーク制約に基づいて更新
        }
      )
      .select()
      .single();

    if (error) throw error;

    console.log("✅ 練習希望申請保存成功:", data);

    // レスポンス用に配列に戻す
    const formattedData = {
      ...data,
      requested_times: JSON.parse(data.requested_times),
      priority: data.priority ? JSON.parse(data.priority) : null,
    };

    return NextResponse.json(formattedData, { status: 201 });
  } catch (error) {
    console.error("❌ 練習希望申請保存エラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create request",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: 練習希望申請を更新
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, requested_times, priority } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // 更新データの準備
    const updateData: {
      requested_times?: string;
      priority?: string | null;
    } = {};

    if (requested_times) {
      // 配列の形式チェック (6x12)
      if (
        !Array.isArray(requested_times) ||
        requested_times.length !== 6 ||
        !requested_times.every((row) => Array.isArray(row) && row.length === 12)
      ) {
        return NextResponse.json(
          { error: "requested_times must be a 6x12 array" },
          { status: 400 }
        );
      }
      updateData.requested_times = JSON.stringify(requested_times);
    }

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
      .from("practice_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // レスポンス用に配列に戻す
    const formattedData = {
      ...data,
      requested_times: JSON.parse(data.requested_times),
      priority: data.priority ? JSON.parse(data.priority) : null,
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("練習希望申請更新エラー:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 練習希望申請を削除
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("practice_requests")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("練習希望申請削除エラー:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
