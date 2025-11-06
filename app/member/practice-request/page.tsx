"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PracticeConfirmationTable } from "@/components/practice-confirmation-table";
import { Button } from "@/components/ui/button";

const DEFAULT_MATRIX = Array(6)
  .fill(0)
  .map(() => Array(12).fill(0));

export default function MemberPracticeRequestPage() {
  const router = useRouter();
  const { member, isLoading } = useAuth();

  const [currentWeek, setCurrentWeek] = useState<{
    week_id: number;
    start_date: string;
  } | null>(null);

  const [selectedMatrix, setSelectedMatrix] =
    useState<number[][]>(DEFAULT_MATRIX);
  const [priorityMatrix, setPriorityMatrix] =
    useState<number[][]>(DEFAULT_MATRIX);
  const [existingRequest, setExistingRequest] = useState<{
    id: number;
    member_id: number;
    week_id: number;
    requested_times: number[][];
    priority: number[][] | null;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !member) {
      router.push("/login");
    }
  }, [member, isLoading, router]);

  // 現在の練習週を取得
  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const response = await fetch("/api/practice-schedule");
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setCurrentWeek({
              week_id: data.week_id,
              start_date: data.start_date,
            });

            // available データがあれば選択可能時間として設定
            if (data.available) {
              setSelectedMatrix(data.available);
            }
          }
        }
      } catch (error) {
        console.error("練習週取得エラー:", error);
      }
    };

    fetchCurrentWeek();
  }, []);

  // 既存の申請データを取得
  useEffect(() => {
    const fetchExistingRequest = async () => {
      if (!member || !currentWeek) return;

      try {
        const response = await fetch(
          `/api/practice-requests?member_id=${member.member_id}&week_id=${currentWeek.week_id}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const request = data[0];
            setExistingRequest(request);

            // 既存のデータを復元
            if (request.requested_times) {
              setSelectedMatrix(request.requested_times);
            }
            if (request.priority) {
              setPriorityMatrix(request.priority);
            }
          }
        }
      } catch (error) {
        console.error("既存申請取得エラー:", error);
      }
    };

    fetchExistingRequest();
  }, [member, currentWeek]);

  // 保存処理
  const handleSubmit = async (priority: number[][]) => {
    if (!member || !currentWeek) {
      setSaveMessage({
        type: "error",
        text: "ログイン情報または練習週が見つかりません",
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/practice-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: member.member_id,
          week_id: currentWeek.week_id,
          requested_times: selectedMatrix,
          priority: priority,
        }),
      });

      if (response.ok) {
        setSaveMessage({
          type: "success",
          text: "練習希望を保存しました！",
        });

        // 3秒後にダッシュボードに戻る
        setTimeout(() => {
          router.push("/member/dashboard");
        }, 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage({
          type: "error",
          text: errorData.error || "保存に失敗しました",
        });
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setSaveMessage({
        type: "error",
        text: "保存中にエラーが発生しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未ログイン
  if (!member) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                練習希望提出
              </h1>
              <p className="text-muted-foreground mt-2">
                {member.name}さんの練習希望時間を選択してください
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/member/dashboard")}
            >
              ダッシュボードに戻る
            </Button>
          </div>

          {/* 練習週情報 */}
          {currentWeek && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                📅 対象週:{" "}
                {new Date(currentWeek.start_date).toLocaleDateString("ja-JP")}{" "}
                の週
              </p>
              {existingRequest && (
                <p className="text-xs text-blue-700 mt-1">
                  ✏️ 既存の申請があります。編集して再保存できます。
                </p>
              )}
            </div>
          )}

          {/* 使い方 */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">📝 使い方:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>1列目の丸印は役員が設定した練習可能時間です</li>
              <li>
                2列目のチェックボックスで希望する優先順位を設定してください
              </li>
              <li>
                上部のボタンで優先順位レベル（第1〜第4）を切り替えられます
              </li>
              <li>
                「終日」をクリックすると、その曜日の全時間を一括設定できます
              </li>
              <li>最後に「練習希望を保存」ボタンを押してください</li>
            </ul>
          </div>
        </div>

        {/* 保存メッセージ */}
        {saveMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              saveMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <p className="text-sm font-medium">{saveMessage.text}</p>
            {saveMessage.type === "success" && (
              <p className="text-xs mt-1">3秒後にダッシュボードに戻ります...</p>
            )}
          </div>
        )}

        {/* テーブル */}
        <PracticeConfirmationTable
          selectedMatrix={selectedMatrix}
          onSubmit={handleSubmit}
          isSubmitting={isSaving}
          initialPriorityMatrix={priorityMatrix}
        />
      </div>
    </div>
  );
}
