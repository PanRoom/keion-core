import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * メンバーの出席可能時間を保存
 * POST /api/member-availability
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_id, member_id, time_slots } = body;

    console.log("📥 受信データ:", { event_id, member_id, time_slots });

    // バリデーション
    if (!event_id || !member_id || !time_slots) {
      return NextResponse.json(
        { error: "event_id, member_id, and time_slots are required" },
        { status: 400 }
      );
    }

    // event_id は TEXT型なのでそのまま、member_id は整数に変換
    const memberIdInt =
      typeof member_id === "string" ? parseInt(member_id, 10) : member_id;

    if (isNaN(memberIdInt)) {
      return NextResponse.json(
        { error: "member_id must be a valid integer" },
        { status: 400 }
      );
    }

    // event_id が文字列であることを確認
    if (typeof event_id !== "string") {
      return NextResponse.json(
        { error: "event_id must be a string" },
        { status: 400 }
      );
    }

    // time_slots が配列かチェック
    if (!Array.isArray(time_slots)) {
      return NextResponse.json(
        { error: "time_slots must be an array" },
        { status: 400 }
      );
    }

    // time_slots の各要素が [日付, 開始時刻, 終了時刻] の形式かチェック
    const isValidFormat = time_slots.every(
      (slot) =>
        Array.isArray(slot) &&
        slot.length === 3 &&
        typeof slot[0] === "string" && // 日付
        typeof slot[1] === "string" && // 開始時刻
        typeof slot[2] === "string" // 終了時刻
    );

    if (!isValidFormat) {
      return NextResponse.json(
        {
          error:
            'time_slots must be in format: [["2025-11-08", "09:00", "12:00"], ...]',
        },
        { status: 400 }
      );
    }

    console.log("✅ バリデーション通過");

    // 既存のリクエストがあるかチェック
    const { data: existingData } = await supabase
      .from("timetable_requests")
      .select("id")
      .eq("member_id", memberIdInt)
      .eq("event_id", event_id)
      .maybeSingle();

    let result;

    if (existingData) {
      // 更新
      console.log("📝 既存データを更新中...");
      const { data, error } = await supabase
        .from("timetable_requests")
        .update({
          requests: time_slots,
          updated_at: new Date().toISOString(),
        })
        .eq("member_id", memberIdInt)
        .eq("event_id", event_id)
        .select()
        .single();

      if (error) {
        console.error("❌ 更新エラー:", error);
        throw error;
      }

      result = data;
      console.log("✅ 更新成功:", result);
    } else {
      // 新規作成
      console.log("📝 新規データ挿入中...");
      const { data, error } = await supabase
        .from("timetable_requests")
        .insert({
          member_id: memberIdInt,
          event_id: event_id,
          requests: time_slots,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ 挿入エラー:", error);
        throw error;
      }

      result = data;
      console.log("✅ 挿入成功:", result);
    }

    return NextResponse.json(
      {
        success: true,
        message: "出席可能時間を保存しました",
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error saving member availability:", error);
    return NextResponse.json(
      { error: "Failed to save member availability" },
      { status: 500 }
    );
  }
}

/**
 * メンバーの出席可能時間を取得
 * GET /api/member-availability?event_id=XXX&member_id=YYY
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id");
    const memberId = searchParams.get("member_id");

    if (!eventId || !memberId) {
      return NextResponse.json(
        { error: "event_id and member_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("timetable_requests")
      .select("*")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching member availability:", error);
      throw error;
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error("Error fetching member availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch member availability" },
      { status: 500 }
    );
  }
}
