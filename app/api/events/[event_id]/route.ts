import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * イベント情報を取得
 * GET /api/events/[event_id]
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ event_id: string }> }
) {
  try {
    // Next.js 15: params は Promise なので await が必要
    const { event_id } = await params;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("event_id", event_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching event:", error);
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
