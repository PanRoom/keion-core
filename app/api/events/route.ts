import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

type EventRow = {
  event_id: string;
  event_name: string | null;
  event_date?: string | null;
};

type EventOption = {
  id: string;
  name: string;
  date?: string | null;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("event_id, event_name, event_date")
      .order("event_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const events: EventOption[] = (data ?? []).map((row: EventRow) => ({
      id: row.event_id,
      name: row.event_name ?? row.event_id,
      date: row.event_date ?? null,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("[events][GET]", error);
    const message = error instanceof Error ? error.message : "イベント一覧の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
