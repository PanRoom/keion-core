"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// 1. 定数の定義
// 曜日ヘッダー (i: 0-5 に対応)
const DAYS = ["火", "水", "木", "金", "土", "月"];

// 時間ラベル (j: 0-11 に対応)
const TIME_SLOTS = [
  "9:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

// 優先順位の定義
const PRIORITY_LEVELS = [
  { level: 1, label: "第1優先" },
  { level: 2, label: "第2優先" },
  { level: 3, label: "第3優先" },
  { level: 4, label: "第4優先" },
] as const;

interface PracticeConfirmationTableProps {
  // time-select で選択された時間の matrix (6日 x 12時間)
  selectedMatrix: number[][];
  // 保存処理のコールバック（オプション）
  onSubmit?: (priorityMatrix: number[][]) => void | Promise<void>;
  // 保存中フラグ（オプション）
  isSubmitting?: boolean;
  // 初期の優先順位マトリクス（オプション）
  initialPriorityMatrix?: number[][];
}

export function PracticeConfirmationTable({
  selectedMatrix,
  onSubmit,
  isSubmitting = false,
  initialPriorityMatrix,
}: PracticeConfirmationTableProps) {
  // 優先順位を管理する state (6日 x 12時間)
  // 0: 未選択, 1-4: 優先順位レベル
  const [priorityMatrix, setPriorityMatrix] = useState<number[][]>(
    initialPriorityMatrix ||
      Array(DAYS.length)
        .fill(0)
        .map(() => Array(TIME_SLOTS.length).fill(0))
  );

  // 現在選択中の優先順位レベル (デフォルト: 4 = 第4優先)
  const [selectedPriorityLevel, setSelectedPriorityLevel] = useState<number>(4);

  // 個別の優先順位設定・トグル
  const handlePriorityToggle = (dayIndex: number, timeIndex: number) => {
    // time-select で選択されていない時間は設定できない
    if (selectedMatrix[dayIndex][timeIndex] === 0) {
      return;
    }

    const newMatrix = priorityMatrix.map((row) => [...row]);
    const currentPriority = newMatrix[dayIndex][timeIndex];

    // 同じ優先順位が設定されている場合は解除、そうでなければ選択中の優先順位を設定
    if (currentPriority === selectedPriorityLevel) {
      newMatrix[dayIndex][timeIndex] = 0;
    } else {
      newMatrix[dayIndex][timeIndex] = selectedPriorityLevel;
    }

    setPriorityMatrix(newMatrix);
  };

  // 「終日」のトグル（その曜日で選択可能な全時間の優先順位を一括設定）
  const handleAllDayPriorityToggle = (dayIndex: number) => {
    // その曜日で time-select で選択されている時間を抽出
    const availableSlots = selectedMatrix[dayIndex];

    // 選択可能な時間が全て現在の優先順位で設定済みかチェック
    const allPrioritizedWithCurrentLevel = availableSlots.every(
      (isSelected, timeIndex) =>
        isSelected === 0 ||
        priorityMatrix[dayIndex][timeIndex] === selectedPriorityLevel
    );

    const newMatrix = priorityMatrix.map((row) => [...row]);

    // 全て設定済みなら解除、そうでなければ現在の優先順位で全て設定
    newMatrix[dayIndex] = availableSlots.map((isSelected) =>
      isSelected === 1
        ? allPrioritizedWithCurrentLevel
          ? 0
          : selectedPriorityLevel
        : 0
    );

    setPriorityMatrix(newMatrix);
  };

  // 優先順位ラベルを取得
  const getPriorityLabel = (priority: number): string => {
    if (priority === 0) return "";
    return `第${priority}優先`;
  };

  // データ送信
  const handleSubmit = () => {
    // 選択されているが優先順位が未設定のセルを第4優先として自動設定
    const finalMatrix = priorityMatrix.map((row, dayIndex) =>
      row.map((priority, timeIndex) => {
        // 選択されているが優先順位が未設定の場合、第4優先として設定
        if (selectedMatrix[dayIndex][timeIndex] === 1 && priority === 0) {
          return 4;
        }
        return priority;
      })
    );

    // 自動設定された値をstateにも反映
    setPriorityMatrix(finalMatrix);

    console.log("練習どり優先順位（2次元配列）:");
    console.log(JSON.stringify(finalMatrix, null, 2));

    // 外部から渡された onSubmit コールバックを実行
    if (onSubmit) {
      onSubmit(finalMatrix);
    }
  };

  return (
    <div className="p-4">
      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">時間</TableHead>
            {DAYS.map((day, dayIndex) => (
              <TableHead
                key={dayIndex}
                colSpan={2}
                className="text-center border-l"
              >
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* 「終日」行 */}
          <TableRow>
            <TableCell className="font-medium">終日</TableCell>
            {DAYS.map((_, dayIndex) => {
              // その曜日で選択可能な時間を抽出
              const availableSlots = selectedMatrix[dayIndex];

              // 選択可能な時間が存在するかチェック
              const hasAvailableSlots = availableSlots.some(
                (isSelected) => isSelected === 1
              );

              // 選択可能な時間が全て現在の優先順位で設定済みかチェック
              const allPrioritizedWithCurrentLevel =
                hasAvailableSlots &&
                availableSlots.every(
                  (isSelected, timeIndex) =>
                    isSelected === 0 ||
                    priorityMatrix[dayIndex][timeIndex] ===
                      selectedPriorityLevel
                );

              return (
                <TableCell
                  key={dayIndex}
                  colSpan={2}
                  className="text-center border-l"
                >
                  <Checkbox
                    checked={allPrioritizedWithCurrentLevel}
                    {...(!hasAvailableSlots && { disabled: true })}
                    onCheckedChange={() => handleAllDayPriorityToggle(dayIndex)}
                  />
                </TableCell>
              );
            })}
          </TableRow>

          {/* 時間ごとの行 */}
          {TIME_SLOTS.map((time, timeIndex) => (
            <TableRow key={timeIndex}>
              <TableCell className="font-medium">{time}</TableCell>
              {DAYS.map((_, dayIndex) => {
                const isSelected = selectedMatrix[dayIndex][timeIndex] === 1;
                const priority = priorityMatrix[dayIndex][timeIndex];

                return (
                  <React.Fragment key={`${dayIndex}-${timeIndex}`}>
                    {/* 1列目: time-select で選択された時間に丸印 */}
                    <TableCell className="text-center border-l">
                      {isSelected && (
                        <span className="inline-block w-4 h-4 rounded-full bg-primary" />
                      )}
                    </TableCell>
                    {/* 2列目: 優先順位表示 */}
                    <TableCell
                      className={`text-center text-xs ${
                        isSelected
                          ? "cursor-pointer hover:bg-muted"
                          : "text-muted-foreground"
                      }`}
                      onClick={() =>
                        isSelected && handlePriorityToggle(dayIndex, timeIndex)
                      }
                    >
                      {isSelected && priority > 0 ? (
                        getPriorityLabel(priority)
                      ) : isSelected ? (
                        <span className="text-muted-foreground/50">
                          優先順位を入力...
                        </span>
                      ) : null}
                    </TableCell>
                  </React.Fragment>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 優先順位選択ボタン */}
      <div className="mt-6 flex items-center gap-4">
        <span className="text-sm font-medium">優先順位選択:</span>
        <div className="flex gap-2">
          {PRIORITY_LEVELS.map(({ level, label }) => (
            <Button
              key={level}
              variant={selectedPriorityLevel === level ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPriorityLevel(level)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          現在: {getPriorityLabel(selectedPriorityLevel)}
        </span>
      </div>

      <div className="mt-4 text-right">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : onSubmit ? "練習希望を保存" : "決定"}
        </Button>
      </div>
    </div>
  );
}
