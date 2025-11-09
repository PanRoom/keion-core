"use client";

import { useState, useCallback } from "react";

// ==========================================
// 型定義
// ==========================================

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
const add30Minutes = (hour: string, minute: string): { hour: string; minute: string } => {
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
    minute: m.toString().padStart(2, "0")
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
          `${dayLabel}の時間帯${slotIndex + 1}：終了時間は開始時間より後にしてください`
        );
      }
    });

    // 重複チェック
    for (let i = 0; i < day.timeSlots.length; i++) {
      for (let j = i + 1; j < day.timeSlots.length; j++) {
        const slot1 = day.timeSlots[i];
        const slot2 = day.timeSlots[j];
        
        const start1 = parseInt(slot1.startHour) * 60 + parseInt(slot1.startMinute);
        const end1 = parseInt(slot1.endHour) * 60 + parseInt(slot1.endMinute);
        const start2 = parseInt(slot2.startHour) * 60 + parseInt(slot2.startMinute);
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
  const [eventName] = useState("秋の軽音祭 2025（ダミー）");
  const [memberName] = useState("テストユーザー");
  const [requests, setRequests] = useState<DayRequest[]>(() => {
    const dummyEvent = {
      start_date: "2025-11-08",
      end_date: "2025-11-10",
    };

    const days = generateDaysFromEvent(
      dummyEvent.start_date,
      dummyEvent.end_date
    );

    return days.map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      allDay: false,
      unavailable: false,
      timeSlots: [],
    }));
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // イベントハンドラー
  // ==========================================

  const handleAllDayChange = useCallback((dayIndex: number, checked: boolean) => {
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
  }, []);

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
      const { hour: endHour, minute: endMinute } = add30Minutes(startHour, startMinute);

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
    setSubmitted(false);
    setApiError(null);

    const validationErrors = validateRequests(requests);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const structuredTimeSlots: { date: string; start: string; end: string }[] = [];

    requests.forEach((day) => {
      if (day.unavailable) {
        return;
      }

      if (day.allDay) {
        structuredTimeSlots.push({ date: day.date, start: "09:00", end: "21:00" });
      } else {
        day.timeSlots.forEach((slot) => {
          const start = `${slot.startHour}:${slot.startMinute}`;
          const end = `${slot.endHour}:${slot.endMinute}`;
          structuredTimeSlots.push({ date: day.date, start, end });
        });
      }
    });

    const availableTimes = structuredTimeSlots.map(({ date, start, end }) => [
      date,
      start,
      end,
    ]);

    if (availableTimes.length === 0) {
      setErrors(["少なくとも1つの出席可能時間を選択してください"]);
      return;
    }

    const submitData = {
      event_id: 1,
      member_id: 999,
      available_times: availableTimes,
    };

    console.log("📤 送信データ:", JSON.stringify(submitData, null, 2));
    console.log("\n📋 フォーマット済み出力:");
    console.log(JSON.stringify(availableTimes, null, 2));

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/live-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const message =
          Array.isArray(result?.errors) && result.errors.length > 0
            ? result.errors.join("\n")
            : result?.error || "ライブ出席情報の登録に失敗しました。";
        setApiError(message);
        return;
      }

      setSubmitted(true);
      setErrors([]);
    } catch (error) {
      console.error("Failed to submit live attendance", error);
      setApiError(
        error instanceof Error
          ? error.message
          : "ライブ出席情報の送信中にエラーが発生しました。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

    // ==========================================
    // レンダリング
    // ==========================================

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-md">
          <header className="mb-6 rounded-lg bg-white p-4 shadow">
            <h1 className="text-xl font-bold text-gray-900">
              ライブ出席確認フォーム
            </h1>
            <p className="mt-2 text-sm text-gray-600">イベント：{eventName}</p>
            <p className="text-sm text-gray-600">メンバー：{memberName}</p>
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

        {/* APIエラー表示 */}
        {apiError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3">
            <h3 className="mb-1 text-sm font-semibold text-red-800">❌ 送信エラー</h3>
            <p className="text-xs text-red-700 whitespace-pre-line">{apiError}</p>
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
                <span className="ml-2 text-sm text-gray-700">
                  終日出席可能
                </span>
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
                          {(slot.endHour === "21" ? ["00"] : MINUTE_OPTIONS).map((minute) => (
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

          {apiError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <h3 className="mb-1 text-sm font-semibold text-red-800">❌ 送信エラー</h3>
              <p className="text-xs text-red-700 whitespace-pre-line">{apiError}</p>
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
            disabled={isSubmitting}
            className={`w-full rounded-lg px-6 py-4 text-base font-semibold text-white ${
              isSubmitting
                ? "cursor-not-allowed bg-blue-300"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "送信中..." : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}