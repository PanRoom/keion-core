"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EventCreatePage() {
  const [eventName, setEventName] = useState("");
  const [selectedDays, setSelectedDays] = useState<Date[] | undefined>([]);

  const createEvent = async () => {
    if (!eventName || !selectedDays || selectedDays.length === 0) {
      alert("イベント名と日付は必須です");
      return;
    }

    const dateList = selectedDays.map((d) => format(d, "yyyy-MM-dd"));
    const event_id = `evt_${Date.now()}`;

    const { error } = await supabase.from("events").insert([
      { event_id, event_name: eventName, event_date: dateList },
    ]);

    if (error) {
      console.error(error);
      alert("エラーが発生しました");
      return;
    }

    alert("✅ イベントが作成されました！");

    // フォーム初期化
    setEventName("");
    setSelectedDays([]);
  };

  return (
    <div className="w-full max-w-md mx-auto pt-10 space-y-6">
      <h1 className="text-center text-2xl font-bold">🎸 新しいイベントを作成</h1>

      {/* イベント名 */}
      <div>
        <label className="block mb-1 font-semibold">イベント名</label>
        <input
          className="border w-full p-2 rounded"
          placeholder="例：新入生歓迎ライブ"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>

      {/* カレンダー */}
      <div>
        <label className="block mb-2 font-semibold">開催日（複数選択できます）</label>

        <div className="border rounded p-3">
          <DayPicker
            mode="multiple"
            selected={selectedDays}
            onSelect={setSelectedDays}
          />
        </div>

        {selectedDays && selectedDays.length > 0 && (
          <ul className="mt-4 space-y-1">
            {selectedDays.map((date) => (
              <li key={date.toString()} className="text-sm text-gray-700">
                {format(date, "yyyy-MM-dd")}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={createEvent}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        イベントを作成する
      </button>
    </div>
  );
}
