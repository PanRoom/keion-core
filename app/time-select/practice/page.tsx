"use client";

import { useState } from "react";
import { PracticeConfirmationTable } from "@/components/practice-confirmation-table";

const DEFAULT_MATRIX = Array(6)
  .fill(0)
  .map(() => Array(12).fill(0));

export default function PracticePage() {
  const [selectedMatrix] = useState<number[][]>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MATRIX;
    }
    
    try {
      const savedData = localStorage.getItem("timeSelectMatrix");
      return savedData ? JSON.parse(savedData) : DEFAULT_MATRIX;
    } catch (error) {
      console.error("Failed to parse saved matrix:", error);
      return DEFAULT_MATRIX;
    }
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            練習どり確認入力
          </h1>
          <p className="text-muted-foreground mt-2">
            time-select
            で選択した時間（1列目に丸印）をもとに、練習どり希望の優先順位を設定してください（2列目のチェックボックス）。
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">📝 使い方:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>1列目の丸印は time-select で選択した時間を表示</li>
              <li>2列目のチェックボックスで優先順位を設定</li>
              <li>
                「終日」をクリックすると、その曜日の選択可能な全時間の優先順位を一括設定
              </li>
            </ul>
          </div>
        </div>

        <PracticeConfirmationTable selectedMatrix={selectedMatrix} />

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">🔍 デバッグ情報:</p>
          <p className="text-xs text-muted-foreground mb-2">
            time-select で選択された時間（サンプル）:
          </p>
          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
            {JSON.stringify(selectedMatrix, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
