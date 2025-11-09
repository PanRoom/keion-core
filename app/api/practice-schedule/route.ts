import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("practice_session")
      .select("*")
      .eq("is_finished", false) // アクティブなスケジュールを取得
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116: No rows found. これはエラーではなく、アクティブなスケジュールがないという正常な状態。
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "アクティブな練習スケジュールが見つかりません" },
          { status: 404 }
        );
      }
      // その他のDBエラー
      throw error;
    }

    // データが見つからない場合（理論上 .single() がエラーを投げるはずだが念のため）
    if (!data) {
      return NextResponse.json(
        { error: "アクティブな練習スケジュールが見つかりません" },
        { status: 404 }
      );
    }

    // TEXT型から配列に変換
    try {
      data.available = JSON.parse(data.available);
    } catch (e) {
      console.warn("Failed to parse available:", e);
      data.available = [];
    }
    // result は JSON型カラムなのでパース不要

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching practice schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice schedule" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { start_date, available } = body;

    console.log("📥 受信データ:", { start_date, available });

    // バリデーション
    if (!start_date || !available) {
      return NextResponse.json(
        { error: "start_date and available are required" },
        { status: 400 }
      );
    }

    // スケジュールの形式チェック (6x12の配列)
    if (
      !Array.isArray(available) ||
      available.length !== 6 ||
      !available.every((row) => Array.isArray(row) && row.length === 12)
    ) {
      return NextResponse.json(
        { error: "available must be a 6x12 array" },
        { status: 400 }
      );
    }

    console.log("✅ バリデーション通過");

    // 既存の未完了スケジュールを完了に変更
    const { error: updateError } = await supabase
      .from("practice_session")
      .update({ is_finished: true })
      .eq("is_finished", false);

    if (updateError) {
      console.error("⚠️ 既存スケジュール更新エラー:", updateError);
    }

    console.log("📝 新規スケジュール挿入中...");

    // 新しいスケジュールを挿入
    const { data, error } = await supabase
      .from("practice_session")
      .insert({
        start_date,
        available: JSON.stringify(available), // TEXT型なのでJSON文字列化
        result: [], // JSON型なので配列をそのまま渡す
        is_finished: false,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ 挿入エラー詳細:", error);
      throw error;
    }

    console.log("✅ 挿入成功:", data);

    // レスポンス用にavailableを配列形式に変換
    const responseData = {
      ...data,
      available: JSON.parse(data.available),
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating practice schedule:", error);
    return NextResponse.json(
      { error: "Failed to create practice schedule" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { week_id, start_date, available } = body;

    if (!week_id) {
      return NextResponse.json(
        { error: "week_id is required" },
        { status: 400 }
      );
    }

    // 更新データの準備
    const updateData: { start_date?: string; available?: string } = {};
    if (start_date) updateData.start_date = start_date;
    if (available) updateData.available = JSON.stringify(available); // TEXT型に変換

    const { data, error } = await supabase
      .from("practice_session")
      .update(updateData)
      .eq("week_id", week_id)
      .select()
      .single();

    if (error) throw error;

    // レスポンス用にavailableを配列形式に変換（TEXT型）
    // resultはJSON型なのでそのまま
    const responseData = {
      ...data,
      available: data.available ? JSON.parse(data.available) : [],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error updating practice schedule:", error);
    return NextResponse.json(
      { error: "Failed to update practice schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekId = searchParams.get("week_id");

    if (!weekId) {
      return NextResponse.json(
        { error: "week_id is required" },
        { status: 400 }
      );
    }

    // スケジュールを削除（または is_finished を true にする）
    const { error } = await supabase
      .from("practice_session")
      .update({ is_finished: true })
      .eq("week_id", weekId);

    if (error) throw error;

    // 募集終了後、bands-prefer API を呼び出してスロット割当結果を保存する
    try {
      const origin = new URL(request.url).origin;
      const resp = await fetch(
        `${origin}/api/bands-prefer?week_id=${encodeURIComponent(weekId)}`
      );

      if (resp.ok) {
        const payload = await resp.json();
        const { nice_prefer } = payload || {};

        console.log("📊 Saving nice_prefer to database:", nice_prefer);

        // practice_session.result カラムに割当結果（nice_preferのみ）を保存する
        // nice_preferは 3次元配列: [日][時間][場所]
        // 形式: [[[バンド名 | 0, バンド名 | 0], ...], ...]
        // ⚠️ JSON型カラムの場合は JSON.stringify() を使わない
        const { error: saveError } = await supabase
          .from("practice_session")
          .update({
            result: nice_prefer || [], // 直接配列を保存
          })
          .eq("week_id", weekId);

        if (saveError) {
          console.error("Failed to save practice result:", saveError);
        } else {
          console.log("Saved practice result for week_id:", weekId);
        }
      } else {
        console.warn("bands-prefer API returned non-OK status:", resp.status);
      }
    } catch (err) {
      console.error("Error while fetching/saving bands-prefer result:", err);
    }

    return NextResponse.json({ success: true, message: "募集を終了しました" });
  } catch (error) {
    console.error("Error ending recruitment:", error);
    return NextResponse.json(
      { error: "Failed to end recruitment" },
      { status: 500 }
    );
  }
}
