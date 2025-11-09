"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PracticeConfirmationTable } from "@/components/practice-confirmation-table";
import { Button } from "@/components/ui/button";

const DEFAULT_MATRIX = Array(6)
  .fill(0)
  .map(() => Array(12).fill(0));

type RecruitmentState = "loading" | "active" | "inactive";

export default function MemberPracticeRequestPage() {
  const router = useRouter();
  const { member, isLoading: isAuthLoading } = useAuth();

  const [recruitmentState, setRecruitmentState] =
    useState<RecruitmentState>("loading");
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
    priority: number[][] | null;
    updated_at?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 認証とデータ読み込みを管理するメインのuseEffect
  useEffect(() => {
    // 認証が終わるまで何もしない
    if (isAuthLoading) {
      return;
    }

    // 認証済みでない場合はログインページへ
    if (!member) {
      router.push("/login");
      return;
    }

    // 1. localStorageから選択時間を読み込み
    try {
      const savedData = localStorage.getItem("timeSelectMatrix");
      if (savedData) {
        setSelectedMatrix(JSON.parse(savedData));
      } else {
        alert("希望時間が選択されていません。選択ページに戻ります。");
        router.push("/time-select");
        return;
      }
    } catch (error) {
      console.error("Failed to parse saved matrix:", error);
      alert("希望時間の読み込みに失敗しました。選択ページに戻ります。");
      router.push("/time-select");
      return;
    }

    // 2. 現在の練習週を取得
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
            setRecruitmentState("active");
          } else {
            setRecruitmentState("inactive");
          }
        } else if (response.status === 404) {
          setRecruitmentState("inactive");
        } else {
          console.error("練習週取得エラー:", await response.text());
          setRecruitmentState("inactive");
        }
      } catch (error) {
        console.error("練習週取得エラー:", error);
        setRecruitmentState("inactive");
      }
    };

    fetchCurrentWeek();
  }, [isAuthLoading, member, router]);

  // 既存の申請データを取得
  useEffect(() => {
    if (!member || !currentWeek) return;

    const fetchExistingRequest = async () => {
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
          priority: priority,
        }),
      });

      if (response.ok) {
        setSaveMessage({
          type: "success",
          text: "練習希望を保存しました!",
        });

        // localStorageのデータをクリア
        localStorage.removeItem("timeSelectMatrix");

        // 3秒後にダッシュボードに戻る（役員と部員で分岐）
        setTimeout(() => {
          const redirectPath = member.executive
            ? "/admin/dashboard"
            : "/member/dashboard";
          router.push(redirectPath);
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

  const handleBackToDashboard = () => {
    if (!member) return;
    const redirectPath = member.executive
      ? "/admin/dashboard"
      : "/member/dashboard";
    router.push(redirectPath);
  };

  // ローディング中
  if (isAuthLoading || recruitmentState === "loading") {
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

  // 募集期間外
  if (recruitmentState === "inactive") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 bg-card border rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-4">現在募集中ではありません</h1>
          <p className="text-muted-foreground mb-6">
            新しい練習希望の募集が開始されるまで、しばらくお待ちください。
          </p>
          <Button onClick={handleBackToDashboard}>ダッシュボードに戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                練習希望の優先順位設定
              </h1>
              <p className="text-muted-foreground mt-2">
                {member.name}さん、選択した希望時間の優先順位を設定してください。
              </p>
            </div>
            <Button variant="outline" onClick={handleBackToDashboard}>
              ダッシュボードに戻る
            </Button>
          </div>

          {/* 練習週情報 */}
          {currentWeek && (
            <div
              className={`p-4 rounded-lg border ${
                existingRequest
                  ? "bg-amber-50 border-amber-300"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      existingRequest ? "text-amber-900" : "text-blue-900"
                    }`}
                  >
                    📅 対象週:{" "}
                    {new Date(currentWeek.start_date).toLocaleDateString(
                      "ja-JP"
                    )}{" "}
                    の週
                  </p>
                  {existingRequest && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                        申請済み（編集モード）
                      </p>
                      {existingRequest.updated_at && (
                        <p className="text-xs text-amber-700">
                          最終更新:{" "}
                          {new Date(existingRequest.updated_at).toLocaleString(
                            "ja-JP",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      )}
                      <p className="text-xs text-amber-700">
                        💡 内容を変更して再保存できます
                      </p>
                    </div>
                  )}
                  {!existingRequest && (
                    <p className="text-xs text-blue-700 mt-1">
                      ℹ️ 新規申請を作成します
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 使い方 */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">📝 使い方:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>
                1列目の丸印は、前のページで選択した「希望時間」です。
              </li>
              <li>
                希望する時間帯のチェックボックスをクリックして、優先順位（第1〜第4）を設定してください。
              </li>
              <li>
                上部のボタンで優先順位レベルを切り替えて入力できます。
              </li>
              <li>最後に「練習希望を保存」ボタンを押してください。</li>
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
          submitButtonText={
            existingRequest ? "練習希望を更新" : "練習希望を保存"
          }
        />
      </div>
    </div>
  );
}
