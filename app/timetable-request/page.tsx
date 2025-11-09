"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

// ==========================================
// 型定義
// ==========================================

type Event = {
  event_id: string;
  event_name: string;
  event_date: string;
  start_date?: string;
  end_date?: string;
};

type TimeSlot = {
  id: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
};

type DayRequest = {
  date: string;
  dayOfWeek: string;
  allDay: boolean;
  unavailable: boolean;
  timeSlots: TimeSlot[];
};

// ==========================================
// 定数定義
// ==========================================

// 開始時刻の選択肢（09:00～20:00）
const START_HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  (9 + i).toString().padStart(2, "0")
);

// 終了時刻の選択肢（09:00～21:00）
const END_HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) =>
  (9 + i).toString().padStart(2, "0")
);

// 分の選択肢（0, 10, 20, 30, 40, 50）
const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];

// ==========================================
// ユーティリティ関数
// ==========================================

const getDayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr);
  return DAY_OF_WEEK[date.getDay()];
};

const generateDaysFromEvent = (
  startDate: string,
  endDate: string
): { date: string; dayOfWeek: string }[] => {
  const days: { date: string; dayOfWeek: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      dayOfWeek: getDayOfWeek(dateStr),
    });
  }

  return days;
};

// 60分後の時間を計算（21:00を上限）
const add30Minutes = (
  hour: string,
  minute: string
): { hour: string; minute: string } => {
  let h = parseInt(hour);
  let m = parseInt(minute);

  m += 60;
  if (m >= 60) {
    m -= 60;
    h += 1;
  }

  // 21:00を超えないように制限
  if (h > 21 || (h === 21 && m > 0)) {
    return { hour: "21", minute: "00" };
  }

  return {
    hour: h.toString().padStart(2, "0"),
    minute: m.toString().padStart(2, "0"),
  };
};

const validateRequests = (requests: DayRequest[]): string[] => {
  const errors: string[] = [];

  requests.forEach((day) => {
    const dayLabel = `${day.date}（${day.dayOfWeek}）`;

    if (!day.allDay && !day.unavailable && day.timeSlots.length === 0) {
      errors.push(`${dayLabel}：出席時間を選択してください`);
    }

    day.timeSlots.forEach((slot, slotIndex) => {
      const start = parseInt(slot.startHour) * 60 + parseInt(slot.startMinute);
      const end = parseInt(slot.endHour) * 60 + parseInt(slot.endMinute);

      if (start >= end) {
        errors.push(
          `${dayLabel}の時間帯${
            slotIndex + 1
          }：終了時間は開始時間より後にしてください`
        );
      }
    });

    // 重複チェック
    for (let i = 0; i < day.timeSlots.length; i++) {
      for (let j = i + 1; j < day.timeSlots.length; j++) {
        const slot1 = day.timeSlots[i];
        const slot2 = day.timeSlots[j];

        const start1 =
          parseInt(slot1.startHour) * 60 + parseInt(slot1.startMinute);
        const end1 = parseInt(slot1.endHour) * 60 + parseInt(slot1.endMinute);
        const start2 =
          parseInt(slot2.startHour) * 60 + parseInt(slot2.startMinute);
        const end2 = parseInt(slot2.endHour) * 60 + parseInt(slot2.endMinute);

        if (start1 < end2 && start2 < end1) {
          errors.push(`${dayLabel}：時間帯が重複しています`);
          break;
        }
      }
    }
  });

  return errors;
};

// ==========================================
// メインコンポーネント
// ==========================================

export default function TimetableRequestPage() {
  const { member, isLoading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [requests, setRequests] = useState<DayRequest[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // イベント情報を取得
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // TODO: 実際のイベントIDに変更する（クエリパラメータやコンテキストから取得）
        const eventId = "evt_welcome_26";

        const response = await fetch(`/api/events/${eventId}`);
        if (response.ok) {
          const eventData = await response.json();
          console.log("取得したイベントデータ:", eventData);
          setEvent(eventData);

          // イベントの日程から日付リストを生成
          if (eventData.start_date && eventData.end_date) {
            console.log(
              "日付範囲:",
              eventData.start_date,
              "～",
              eventData.end_date
            );
            const days = generateDaysFromEvent(
              eventData.start_date,
              eventData.end_date
            );
            console.log("生成した日付リスト:", days);
            setRequests(
              days.map((day) => ({
                date: day.date,
                dayOfWeek: day.dayOfWeek,
                allDay: false,
                unavailable: false,
                timeSlots: [],
              }))
            );
          } else {
            console.warn(
              "イベントにstart_dateまたはend_dateがありません:",
              eventData
            );
            // フォールバック: event_dateを使用
            if (eventData.event_date) {
              // event_dateが配列の場合は最初の要素を取得
              const eventDate = Array.isArray(eventData.event_date)
                ? eventData.event_date[0]
                : eventData.event_date;

              const days = [
                {
                  date: eventDate,
                  dayOfWeek: getDayOfWeek(eventDate),
                },
              ];
              console.log("event_dateから生成した日付リスト:", days);
              setRequests(
                days.map((day) => ({
                  date: day.date,
                  dayOfWeek: day.dayOfWeek,
                  allDay: false,
                  unavailable: false,
                  timeSlots: [],
                }))
              );
            }
          }
        } else {
          // イベントが見つからない場合はダミーデータを使用
          console.warn("イベントが見つかりません。ダミーデータを使用します。");
          const dummyEvent = {
            event_id: eventId,
            event_name: "秋の軽音祭 2025（ダミー）",
            event_date: "2025-11-08",
            start_date: "2025-11-08",
            end_date: "2025-11-10",
          };
          setEvent(dummyEvent);

          const days = generateDaysFromEvent(
            dummyEvent.start_date,
            dummyEvent.end_date
          );
          setRequests(
            days.map((day) => ({
              date: day.date,
              dayOfWeek: day.dayOfWeek,
              allDay: false,
              unavailable: false,
              timeSlots: [],
            }))
          );
        }
      } catch (error) {
        console.error("イベント取得エラー:", error);
        // エラー時もダミーデータを使用
        const dummyEvent = {
          event_id: "evt_welcome_26",
          event_name: "秋の軽音祭 2025（ダミー）",
          event_date: "2025-11-08",
          start_date: "2025-11-08",
          end_date: "2025-11-10",
        };
        setEvent(dummyEvent);

        const days = generateDaysFromEvent(
          dummyEvent.start_date,
          dummyEvent.end_date
        );
        setRequests(
          days.map((day) => ({
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            allDay: false,
            unavailable: false,
            timeSlots: [],
          }))
        );
      } finally {
        setEventLoading(false);
      }
    };

    fetchEvent();
  }, []);

  // ==========================================
  // イベントハンドラー
  // ==========================================

  const handleAllDayChange = useCallback(
    (dayIndex: number, checked: boolean) => {
      setRequests((prev) => {
        const newRequests = [...prev];
        newRequests[dayIndex] = {
          ...newRequests[dayIndex],
          allDay: checked,
          unavailable: false,
          timeSlots: [],
        };
        return newRequests;
      });
      setErrors([]);
    },
    []
  );

  const handleUnavailableChange = useCallback(
    (dayIndex: number, checked: boolean) => {
      setRequests((prev) => {
        const newRequests = [...prev];
        newRequests[dayIndex] = {
          ...newRequests[dayIndex],
          unavailable: checked,
          allDay: false,
          timeSlots: [],
        };
        return newRequests;
      });
      setErrors([]);
    },
    []
  );

  const handleAddTimeSlot = useCallback((dayIndex: number) => {
    setRequests((prev) => {
      const newRequests = [...prev];

      const startHour = START_HOUR_OPTIONS[0];
      const startMinute = MINUTE_OPTIONS[0];
      const { hour: endHour, minute: endMinute } = add30Minutes(
        startHour,
        startMinute
      );

      const newSlot: TimeSlot = {
        id: `slot-${dayIndex}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        startHour,
        startMinute,
        endHour,
        endMinute,
      };

      newRequests[dayIndex] = {
        ...newRequests[dayIndex],
        timeSlots: [...newRequests[dayIndex].timeSlots, newSlot],
      };

      return newRequests;
    });
  }, []);

  const handleRemoveTimeSlot = useCallback(
    (dayIndex: number, slotId: string) => {
      setRequests((prev) => {
        const newRequests = [...prev];
        newRequests[dayIndex] = {
          ...newRequests[dayIndex],
          timeSlots: newRequests[dayIndex].timeSlots.filter(
            (slot) => slot.id !== slotId
          ),
        };
        return newRequests;
      });
    },
    []
  );
  const handleTimeChange = useCallback(
    (
      dayIndex: number,
      slotId: string,
      field: "startHour" | "startMinute" | "endHour" | "endMinute",
      value: string
    ) => {
      setRequests((prev) => {
        const newRequests = [...prev];
        const slotIndex = newRequests[dayIndex].timeSlots.findIndex(
          (s) => s.id === slotId
        );

        if (slotIndex === -1) {
          return newRequests;
        }

        const updatedSlot: TimeSlot = {
          ...newRequests[dayIndex].timeSlots[slotIndex],
        };

        if (field === "startHour") {
          updatedSlot.startHour = value;
        } else if (field === "startMinute") {
          updatedSlot.startMinute = value;
        } else if (field === "endHour") {
          updatedSlot.endHour = value;
        } else {
          updatedSlot.endMinute = value;
        }

        if (field === "startHour" || field === "startMinute") {
          const { hour, minute } = add30Minutes(
            updatedSlot.startHour,
            updatedSlot.startMinute
          );
          updatedSlot.endHour = hour;
          updatedSlot.endMinute = minute;
        } else if (field === "endHour" && value === "21") {
          updatedSlot.endMinute = "00";
        }

        const endHourNum = parseInt(updatedSlot.endHour, 10);
        if (endHourNum > 21 || Number.isNaN(endHourNum)) {
          updatedSlot.endHour = "21";
          updatedSlot.endMinute = "00";
        }

        if (updatedSlot.endHour === "21" && updatedSlot.endMinute !== "00") {
          updatedSlot.endMinute = "00";
        }

        newRequests[dayIndex] = {
          ...newRequests[dayIndex],
          timeSlots: newRequests[dayIndex].timeSlots.map((slot, idx) =>
            idx === slotIndex ? updatedSlot : slot
          ),
        };

        return newRequests;
      });
    },
    []
  );

  const handleSubmit = async () => {
    // 認証チェック
    if (!member) {
      setErrors(["ログインが必要です"]);
      return;
    }

    // イベント情報チェック
    if (!event) {
      setErrors(["イベント情報の読み込みに失敗しました"]);
      return;
    }

    console.log("送信前のrequests:", requests);

    const validationErrors = validateRequests(requests);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 二次元配列形式に変換: [["2025-11-08", "09:00", "12:00"], ...]
    const timeSlots: [string, string, string][] = [];

    requests.forEach((day) => {
      console.log("処理中のday:", day);

      if (day.unavailable) {
        return; // 出席不可の日はスキップ
      }

      if (day.allDay) {
        // 終日の場合
        console.log("終日登録:", [day.date, "09:00", "21:00"]);
        timeSlots.push([day.date, "09:00", "21:00"]);
      } else {
        // 個別時間帯の場合
        day.timeSlots.forEach((slot) => {
          const start = `${slot.startHour}:${slot.startMinute}`;
          const end = `${slot.endHour}:${slot.endMinute}`;
          console.log("時間帯登録:", [day.date, start, end]);
          timeSlots.push([day.date, start, end]);
        });
      }
    });

    const submitData = {
      event_id: event.event_id, // 動的に取得したevent_id
      member_id: member.member_id, // ログインユーザーのmember_id
      time_slots: timeSlots,
    };

    console.log("📤 送信データ:", JSON.stringify(submitData, null, 2));

    try {
      const response = await fetch("/api/member-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "送信に失敗しました");
      }

      const result = await response.json();
      console.log("✅ 送信成功:", result);

      setSubmitted(true);
      setErrors([]);
    } catch (error) {
      console.error("❌ 送信エラー:", error);
      setErrors([
        error instanceof Error
          ? error.message
          : "送信に失敗しました。もう一度お試しください。",
      ]);
    }
  };

  // ==========================================
  // レンダリング
  // ==========================================

  // デバッグログ
  console.log("TimetableRequest render:", {
    authLoading,
    eventLoading,
    member: member?.name,
    event: event?.event_name,
    requestsCount: requests.length,
  });

  // 認証チェック
  if (authLoading || eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">ログインが必要です</p>
          <a href="/login" className="mt-4 text-blue-600 hover:underline">
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">
            イベント情報の読み込みに失敗しました
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        <header className="mb-6 rounded-lg bg-white p-4 shadow">
          <h1 className="text-xl font-bold text-gray-900">
            ライブ出席確認フォーム
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            イベント：{event.event_name}
          </p>
          <p className="text-sm text-gray-600">
            メンバー：{member.name || "ユーザー"}
          </p>
        </header>

        {/* エラー表示 */}
        {errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-red-800">
              ⚠️ 入力エラー
            </h3>
            <ul className="list-inside list-disc space-y-1 text-xs text-red-700">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 送信完了メッセージ */}
        {submitted && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3">
            <h3 className="mb-1 text-sm font-semibold text-green-800">
              ✅ 送信完了
            </h3>
            <p className="text-xs text-green-700">
              ライブ出席情報を送信しました。
            </p>
          </div>
        )}

        {/* 日程ごとの入力フォーム */}
        <div className="space-y-4">
          {requests.map((day, dayIndex) => (
            <div
              key={day.date}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow"
            >
              <h2 className="mb-3 text-base font-semibold text-gray-900">
                {day.date}（{day.dayOfWeek}）
              </h2>

              {/* 終日出席可能 */}
              <label className="mb-2 flex items-center">
                <input
                  type="checkbox"
                  checked={day.allDay}
                  onChange={(e) =>
                    handleAllDayChange(dayIndex, e.target.checked)
                  }
                  className="h-5 w-5 rounded border-gray-300 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">終日出席可能</span>
              </label>

              {/* 出席不可 */}
              <label className="mb-3 flex items-center">
                <input
                  type="checkbox"
                  checked={day.unavailable}
                  onChange={(e) =>
                    handleUnavailableChange(dayIndex, e.target.checked)
                  }
                  className="h-5 w-5 rounded border-gray-300 text-red-600"
                />
                <span className="ml-2 text-sm text-gray-700">
                  この日は出席できない
                </span>
              </label>

              {/* 時間帯指定 */}
              {!day.allDay && !day.unavailable && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    出席可能時間帯
                  </h3>

                  {day.timeSlots.length === 0 && (
                    <p className="text-xs text-gray-500">
                      ＋ボタンから希望時間帯を追加してください（10分刻みで指定できます）。
                    </p>
                  )}

                  {day.timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2"
                    >
                      <div className="flex items-center gap-1">
                        <select
                          value={slot.startHour}
                          onChange={(e) =>
                            handleTimeChange(
                              dayIndex,
                              slot.id,
                              "startHour",
                              e.target.value
                            )
                          }
                          className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                        >
                          {START_HOUR_OPTIONS.map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-600">:</span>
                        <select
                          value={slot.startMinute}
                          onChange={(e) =>
                            handleTimeChange(
                              dayIndex,
                              slot.id,
                              "startMinute",
                              e.target.value
                            )
                          }
                          className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                        >
                          {MINUTE_OPTIONS.map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-sm text-gray-600">～</span>

                      <div className="flex items-center gap-1">
                        <select
                          value={slot.endHour}
                          onChange={(e) =>
                            handleTimeChange(
                              dayIndex,
                              slot.id,
                              "endHour",
                              e.target.value
                            )
                          }
                          className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                        >
                          {END_HOUR_OPTIONS.map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-600">:</span>
                        <select
                          value={slot.endMinute}
                          onChange={(e) =>
                            handleTimeChange(
                              dayIndex,
                              slot.id,
                              "endMinute",
                              e.target.value
                            )
                          }
                          className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                        >
                          {(slot.endHour === "21"
                            ? ["00"]
                            : MINUTE_OPTIONS
                          ).map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTimeSlot(dayIndex, slot.id)}
                        className="ml-auto rounded bg-red-100 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddTimeSlot(dayIndex)}
                    className="w-full rounded border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600"
                  >
                    ＋ 時間帯を追加
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 送信ボタン */}
        <div className="mt-6 space-y-4 pb-6">
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <h3 className="mb-2 text-sm font-semibold text-red-800">
                ⚠️ 入力エラー
              </h3>
              <ul className="list-inside list-disc space-y-1 text-xs text-red-700">
                {errors.map((error, index) => (
                  <li key={`bottom-error-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {submitted && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3">
              <h3 className="mb-1 text-sm font-semibold text-green-800">
                ✅ 送信完了
              </h3>
              <p className="text-xs text-green-700">
                ライブ出席情報を送信しました。コンソールで確認できます。
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-base font-semibold text-white"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
