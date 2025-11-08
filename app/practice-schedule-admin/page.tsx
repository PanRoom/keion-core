"use client";

import { useState, useEffect } from "react";
import { PracticeScheduleAdminTable } from "@/components/practice-schedule-admin-table";
import { Button } from "@/components/ui/button";

export default function PracticeScheduleAdminPage() {
  // スケジュールマトリックス
  const [scheduleMatrix, setScheduleMatrix] = useState<number[][]>(
    Array(6)
      .fill(0)
      .map(() => Array(12).fill(0))
  );

  // 週の開始日 (火曜日の日付)
  const [startDate, setStartDate] = useState<string>("");

  // ローディング状態
  const [isLoading, setIsLoading] = useState(false);

  // 既存スケジュールID (更新用)
  const [existingScheduleId, setExistingScheduleId] = useState<number | null>(
    null
  );

  // 希望提出者数
  const [submissionCount, setSubmissionCount] = useState<number>(0);

  // 募集中かどうか
  const [isRecruiting, setIsRecruiting] = useState(false);

  // 初回ロード時に既存のスケジュールを取得
  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/practice-schedule");
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setScheduleMatrix(data.available);
            setStartDate(data.start_date);
            setExistingScheduleId(data.week_id);
            setIsRecruiting(true); // スケジュールが存在する = 募集中

            // 希望提出者数を取得
            await fetchSubmissionCount(data.week_id);
          }
        } else if (response.status !== 404) {
          console.error("スケジュール取得エラー:", await response.text());
        }
      } catch (error) {
        console.error("スケジュール取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // 希望提出者数を取得
  const fetchSubmissionCount = async (weekId: number) => {
    try {
      const response = await fetch(`/api/practice-requests?week_id=${weekId}`);
      if (response.ok) {
        const data = await response.json();
        // ユニークなmember_idの数を数える
        const uniqueMembers = new Set(
          data.map((item: { member_id: number }) => item.member_id)
        );
        setSubmissionCount(uniqueMembers.size);
      }
    } catch (error) {
      console.error("提出者数取得エラー:", error);
    }
  };

  // 火曜日のみを取得する関数
  const getTuesdays = () => {
    const tuesdays: string[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 今月から3ヶ月分の火曜日を取得
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      // その月の全ての日をチェック
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);

        // 月が変わったら終了
        if (date.getMonth() !== month) break;

        // 火曜日 (getDay() === 2) のみ追加
        if (date.getDay() === 2) {
          // UTCではなくローカル時刻でフォーマット
          const dateString = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          tuesdays.push(dateString);
        }
      }
    }

    return tuesdays;
  };

  const tuesdays = getTuesdays();

  // 日付をフォーマット (YYYY-MM-DD -> YYYY年MM月DD日)
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getFullYear()}年${
      date.getMonth() + 1
    }月${date.getDate()}日 (火)`;
  };

  // 決定(募集開始)ボタン
  const handleSubmit = async () => {
    if (!startDate) {
      alert("週の開始日を選択してください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/practice-schedule", {
        method: existingScheduleId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(existingScheduleId && { week_id: existingScheduleId }),
          start_date: startDate,
          available: scheduleMatrix,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExistingScheduleId(data.week_id);
        setIsRecruiting(true);
        alert("募集を開始しました");
        // 提出者数を更新
        await fetchSubmissionCount(data.week_id);
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || "保存に失敗しました"}`);
      }
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 募集終了ボタン
  const handleEndRecruitment = async () => {
    if (!confirm("募集を終了してもよろしいですか？")) {
      return;
    }

    setIsLoading(true);

    try {
      // スケジュールを削除
      const response = await fetch(
        `/api/practice-schedule?week_id=${existingScheduleId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setExistingScheduleId(null);
        setIsRecruiting(false);
        setSubmissionCount(0);
        setStartDate("");
        setScheduleMatrix(
          Array(6)
            .fill(0)
            .map(() => Array(12).fill(0))
        );
        alert("募集を終了しました");
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || "募集終了に失敗しました"}`);
      }
    } catch (error) {
      console.error("募集終了エラー:", error);
      alert("募集終了に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // スケジュール変更時のコールバック
  const handleScheduleChange = (matrix: number[][]) => {
    setScheduleMatrix(matrix);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            練習スケジュール設定 (役員用)
          </h1>
          <p className="text-muted-foreground mt-2">
            練習可能な曜日と時間を設定してください。チェックが入っている時間は練習できません。
          </p>
        </div>

        {/* ローディング表示 */}
        {isLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700">読み込み中...</p>
          </div>
        )}

        {/* 募集中の表示 */}
        {isRecruiting && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-green-900 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  募集中
                </p>
                <p className="text-sm text-green-700 mt-1">
                  希望提出者:{" "}
                  <span className="font-bold text-xl">{submissionCount}</span>{" "}
                  人
                </p>
              </div>
              <Button
                onClick={handleEndRecruitment}
                variant="destructive"
                disabled={isLoading}
              >
                募集終了
              </Button>
            </div>
          </div>
        )}

        {/* スケジュール表示・編集エリア */}
        <div className="mb-6">
          <PracticeScheduleAdminTable
            initialMatrix={scheduleMatrix}
            onScheduleChange={handleScheduleChange}
            isEditable={!isRecruiting}
          />
        </div>

        {/* 週の開始日選択 */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <label className="block mb-2 font-medium">
            週の開始日を選択 (火曜日のみ):
          </label>
          <select
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isRecruiting}
            className="w-full max-w-md p-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">選択してください</option>
            {tuesdays.map((tuesday) => (
              <option key={tuesday} value={tuesday}>
                {formatDate(tuesday)}
              </option>
            ))}
          </select>
        </div>

        {/* ボタンエリア */}
        <div className="flex gap-4">
          {!isRecruiting && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "保存中..." : "決定（募集開始）"}
            </Button>
          )}
        </div>

        {/* 募集中の注意書き */}
        {isRecruiting && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              💡
              スケジュールを変更する場合は、一度「募集終了」ボタンで募集を終了してから、新規で作成してください。
            </p>
          </div>
        )}

        {/* デバッグ情報 */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">🔍 デバッグ情報:</p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                募集状態: {isRecruiting ? "募集中" : "募集前"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                週の開始日: {startDate ? formatDate(startDate) : "未選択"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                希望提出者数: {submissionCount}人
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                練習可能スケジュール:
              </p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                {JSON.stringify(scheduleMatrix, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
