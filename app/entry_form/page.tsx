"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button"; // ← 追加
// 必要なら： import { Label } from "@/components/ui/label";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RequestForm() {
  const [bands, setBands] = useState<any[]>([]);
  const [selectedBand, setSelectedBand] = useState("");
  const [duration, setDuration] = useState("");
  const [loadingBands, setLoadingBands] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
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
      setLoadingBands(true);
      setApiError(null);
      try {
        const { data, error } = await supabase
          .from("bands")
          .select("band_id, band_name")
          .order("band_id")
          .limit(1000);

        if (error) {
          console.error("bands fetch error:", error);
          setApiError(error.message || "bands fetch failed");
          setBands([]);
        } else {
          setBands((data ?? []).map((b: any) => ({ ...b, band_id: String(b.band_id) })));
        }
      } catch (err: any) {
        console.error(err);
        setApiError(err?.message || String(err));
        setBands([]);
      } finally {
        setLoadingBands(false);
      }
    }
    loadBands();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setApiError(null);
    if (!selectedBand) {
      setApiError("バンドを選択してください");
      return;
    }
    if (!duration) {
      setApiError("出演枠を選択してください");
      return;
    }

    try {
      const payload = {
        event_id,
        band_id: Number(selectedBand),
        duration: Number(duration),
      };
      const { data, error } = await supabase.from("entry_table").insert(payload).select();

      if (error) {
        console.error("insert error:", error);
        setApiError(error.message || "送信に失敗しました");
        return;
      }

      alert("✅ 申し込みが送信されました！");
      setSelectedBand("");
      setDuration("");
    } catch (err: unknown) {
      console.error(err);
      setApiError(String(err));
    }
  };

  let formattedDate = "";
  if (event?.event_date) {
    const d = new Date(event.event_date);
    const w = ["日", "月", "火", "水", "木", "金", "土"];
    formattedDate = `${d.getMonth() + 1}/${d.getDate()}（${w[d.getDay()]}）`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-sm border rounded-xl p-6 space-y-6">

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">🎸 {event?.event_name}</h2>
          <p className="text-gray-600">{formattedDate}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1">
            <label className="font-semibold">バンド名</label>
            <select
              className="w-full border rounded-md p-2 bg-white"
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

          <div className="space-y-1">
            <label className="font-semibold">出演枠（分）</label>
            <select
              className="w-full border rounded-md p-2 bg-white"
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

          {/* エラーメッセージ */}
          {apiError && (
            <p className="text-sm text-red-600">{apiError}</p>
          )}

          {/* ← ここだけ shadcn Button に置き換え */}
          <Button disabled={loadingBands} className="w-full py-2 text-base font-semibold">
            {loadingBands ? "読み込み中…" : "提出する"}
          </Button>

        </form>
      </div>
    </div>
  );
}
