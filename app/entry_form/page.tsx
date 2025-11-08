"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RequestForm() {
  const [bands, setBands] = useState<any[]>([]);
  const [selectedBand, setSelectedBand] = useState("");
  const [duration, setDuration] = useState("");
  const [event, setEvent] = useState<any>(null);

  const event_id = "evt_welcome_26";

  useEffect(() => {
    async function loadEvent() {
      const { data } = await supabase
        .from("events")
        .select("event_name, event_date")
        .eq("event_id", event_id)
        .single();
      setEvent(data);
    }
    loadEvent();
  }, []);

  useEffect(() => {
    async function loadBands() {
      const { data } = await supabase
        .from("bands")
        .select("band_id, band_name")
        .order("band_id");
      setBands(data ?? []);
    }
    loadBands();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ★ エントリーテーブルに記録
    await supabase.from("entry_table").insert({
      event_id,
      band_id: Number(selectedBand),
      duration: Number(duration),
    });

    alert("✅ 申し込みが送信されました！");
    setSelectedBand("");
    setDuration("");
  };

  let formattedDate = "";
  if (event?.event_date) {
    const d = new Date(event.event_date);
    const w = ["日", "月", "火", "水", "木", "金", "土"];
    formattedDate = `${d.getMonth() + 1}/${d.getDate()}（${w[d.getDay()]}）`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 space-y-6">
        
        <h2 className="text-center text-2xl font-bold">
          🎸 {event?.event_name}
        </h2>
        <p className="text-center text-gray-600">{formattedDate}</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block font-semibold mb-1">バンド名</label>
            <select
              className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500"
              value={selectedBand}
              onChange={(e) => setSelectedBand(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {bands.map((band) => (
                <option key={band.band_id} value={band.band_id}>
                  {band.band_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">出演枠（分）</label>
            <select
              className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {[15, 20, 25, 30].map((min) => (
                <option key={min} value={min}>
                  {min} 分
                </option>
              ))}
            </select>
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition"
          >
            提出する
          </button>

        </form>
      </div>
    </div>
  );
}
