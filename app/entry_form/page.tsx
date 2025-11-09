"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Band = {
  band_id: number;
  band_name: string;
};

type Event = {
  event_name: string;
  event_date: string;
};

type Entry = {
  event_id: string;
  band_id: number;
  duration: number;
  wants_finale: boolean;
  submitted_by: string;
  submitted_at: string;
};

export default function RequestForm() {
  const { member, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [myBand, setMyBand] = useState<Band | null>(null);
  const [duration, setDuration] = useState("");
  const [wantsFinale, setWantsFinale] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const event_id = "evt_welcome_26";

  // イベント情報、自分のバンド情報、既存申し込みを取得
  useEffect(() => {
    async function loadData() {
      // AuthProviderのローディングが完了するまで待つ
      if (authLoading) {
        return;
      }

      if (!member?.member_id) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. イベント情報取得
        const { data: eventData } = await supabase
          .from("events")
          .select("event_name, event_date")
          .eq("event_id", event_id)
          .single();
        setEvent(eventData);

        // 2. 自分が所属するバンドを取得
        const { data: bandMemberData, error: bandError } = await supabase
          .from("band_members")
          .select("band_id")
          .eq("member_id", member.member_id)
          .single();

        if (bandError) {
          console.error("バンド情報取得エラー:", bandError);
        }

        if (bandMemberData?.band_id) {
          // band_id からバンド情報を取得
          const { data: bandData, error: bandError2 } = await supabase
            .from("bands")
            .select("band_id, band_name")
            .eq("band_id", bandMemberData.band_id)
            .maybeSingle();

          console.log("bandData:", bandData);
          console.log("bandError2:", bandError2);

          if (bandData) {
            setMyBand(bandData);

            // 3. 既に申し込み済みかチェック
            const { data: entryData } = await supabase
              .from("entry_table")
              .select("*")
              .eq("event_id", event_id)
              .eq("band_id", bandData.band_id)
              .single();

            if (entryData) {
              setExistingEntry(entryData);
              setDuration(String(entryData.duration));
              setWantsFinale(entryData.wants_finale ?? false);
            }
          }
        }
      } catch (error) {
        console.error("データ読み込みエラー:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [member, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!member?.member_id || !myBand) {
      alert("ログインが必要です");
      return;
    }

    if (existingEntry) {
      alert("既に申し込み済みです");
      return;
    }

    try {
      const { error } = await supabase.from("entry_table").insert({
        event_id,
        band_id: myBand.band_id,
        duration: Number(duration),
        wants_finale: wantsFinale,
        submitted_by: member.user_id,
      });

      if (error) throw error;

      alert("✅ 申し込みが送信されました！");

      // 役員は /admin/dashboard、一般部員は /member/dashboard にリダイレクト
      const redirectPath = member.executive
        ? "/admin/dashboard"
        : "/member/dashboard";

      router.push(redirectPath);
    } catch (error) {
      console.error("送信エラー:", error);
      alert("送信に失敗しました");
    }
  };

  let formattedDate = "";
  if (event?.event_date) {
    const d = new Date(event.event_date);
    const w = ["日", "月", "火", "水", "木", "金", "土"];
    formattedDate = `${d.getMonth() + 1}/${d.getDate()}（${w[d.getDay()]}）`;
  }

  // AuthProviderのローディング中、または自分のデータローディング中
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 text-center">
          <p className="text-gray-600 mb-4">ログインが必要です</p>
          <a
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  if (!myBand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 text-center">
          <p className="text-gray-600">
            あなたはどのバンドにも所属していません
          </p>
        </div>
      </div>
    );
  }

  const isSubmitted = !!existingEntry;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 space-y-6">
        <h2 className="text-center text-2xl font-bold">
          🎸 {event?.event_name}
        </h2>
        <p className="text-center text-gray-600">{formattedDate}</p>

        {isSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-semibold">✅ 申し込み済み</p>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(existingEntry.submitted_at).toLocaleString("ja-JP")}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">バンド名</label>
            <input
              type="text"
              className="w-full border rounded-lg p-3 bg-gray-100 text-gray-700"
              value={myBand.band_name}
              disabled
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">出演枠（分）</label>
            <select
              className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              disabled={isSubmitted}
            >
              <option value="">選択してください</option>
              {[15, 20, 25, 30].map((min) => (
                <option key={min} value={min}>
                  {min} 分
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="wants-finale"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              checked={wantsFinale}
              onChange={(e) => setWantsFinale(e.target.checked)}
              disabled={isSubmitted}
            />
            <label
              htmlFor="wants-finale"
              className="font-semibold text-gray-700"
            >
              トリ（最後の演奏）を希望する
            </label>
          </div>

          {!isSubmitted && (
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition"
            >
              提出する
            </button>
          )}

          {isSubmitted && (
            <div className="text-center text-sm text-gray-500 mt-4">
              申し込み後の変更はできません。
              <br />
              変更が必要な場合は役員に連絡してください。
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
