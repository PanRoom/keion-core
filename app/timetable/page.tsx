import { createClient } from "@supabase/supabase-js";

export default async function TimetablePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const event_id = "evt_welcome_26";

  // ✅ 1) イベント情報取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("event_name, event_date")
    .eq("event_id", event_id)
    .single();

  if (eventError) {
    console.error("event fetch error:", eventError);
  }

  // ✅ 日付フォーマット（例: 2026-04-19 → 4/19（日））
  let formattedDate = "";
  if (event?.event_date) {
    const date = new Date(event.event_date);
    const weekdayJP = ["日", "月", "火", "水", "木", "金", "土"];
    formattedDate = `${date.getMonth() + 1}/${date.getDate()}（${
      weekdayJP[date.getDay()]
    }）`;
  }

  // ✅ 2) スロット取得
  const { data: slots, error: slotsError } = await supabase
    .from("eventslots")
    .select("start_time, end_time, band_id")
    .eq("event_id", event_id)
    .order("start_time");

  if (slotsError) {
    console.error("slots fetch error:", slotsError);
    return <div>データ取得エラー: {slotsError.message}</div>;
  }

  // ✅ 3) バンド情報のマップ化
  const bandIds = Array.from(
    new Set(slots?.map((s: any) => s.band_id).filter(Boolean))
  ) as string[];

  let bandMap: Record<string, string> = {};
  if (bandIds.length > 0) {
    const { data: bands } = await supabase
      .from("bands")
      .select("band_id, band_name")
      .in("band_id", bandIds);

    if (bands) {
      for (const b of bands) bandMap[b.band_id] = b.band_name;
    }
  }

  return (
    <div className="w-full max-w-md mx-auto font-sans pt-6">

      {/* ✅ タイトルを DB から表示 */}
      <h2 className="text-center bg-orange-400 text-white py-2 font-bold">
        {event?.event_name ?? "イベント名未設定"} {formattedDate}
      </h2>

      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr className="bg-[#FFF4C6] border">
            <th className="border p-1">時間</th>
            <th className="border p-1">バンド名</th>
            <th className="border p-1">分数</th>
          </tr>
        </thead>
        <tbody>
          {slots?.map((slot: any, index: number) => {
            const duration =
              (new Date(`2000-01-01T${slot.end_time}`) -
                new Date(`2000-01-01T${slot.start_time}`)) /
              60000;

            const isBreak = slot.band_id === null;
            const bandName = isBreak ? "休憩" : bandMap[slot.band_id] ?? slot.band_id;

            return (
              <tr key={index} className={isBreak ? "bg-orange-300 font-bold" : ""}>
                <td className="border p-1">{slot.start_time.slice(0, 5)}</td>
                <td className="border p-1">{bandName}</td>
                <td className="border p-1">{duration}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
