"use client";

import { useState } from "react";
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

// 2. Stateの初期化 (ご希望の 6x12 の2次元配列)
// 6日 (i) x 12時間 (j) の配列を 0 で初期化
const initialMatrix = Array(DAYS.length)
  .fill(0)
  .map(() => Array(TIME_SLOTS.length).fill(0));

export function AvailabilityTable() {
  const [matrix, setMatrix] = useState(initialMatrix);

  // 3. イベントハンドラ: 個別の時間スロット
  const handleTimeSlotToggle = (dayIndex: number, timeIndex: number) => {
    // stateの不変性 (immutability) を保つためにディープコピーを作成
    const newMatrix = matrix.map((row) => [...row]);

    // 該当するセルの値を 0 <-> 1 で反転
    newMatrix[dayIndex][timeIndex] =
      newMatrix[dayIndex][timeIndex] === 1 ? 0 : 1;

    setMatrix(newMatrix);
  };

  // 4. イベントハンドラ: 「終日」
  const handleAllDayToggle = (dayIndex: number) => {
    // まず、現在その日が「全てチェックされているか」を判定
    const isAllChecked = matrix[dayIndex].every((slot) => slot === 1);

    // ディープコピーを作成
    const newMatrix = matrix.map((row) => [...row]);

    // もし「全てチェック済み」なら、全て 0 にする
    // そうでなければ（一つでも 0 があれば）、全て 1 にする
    const newValue = isAllChecked ? 0 : 1;
    newMatrix[dayIndex] = Array(TIME_SLOTS.length).fill(newValue);

    setMatrix(newMatrix);
  };

  // 5. データ確認用（デバッグ・送信）
  const handleSubmit = () => {
    console.log("現在のシフト希望（2次元配列）:");
    // 最終的な 6x12 の 2次元配列
    console.log(JSON.stringify(matrix, null, 2));
    // ここでAPIへの送信処理などを行う
  };

  return (
    <div className="p-4">
      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">時間</TableHead>
            {DAYS.map((day, dayIndex) => (
              <TableHead key={dayIndex} className="text-center">
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* 「終日」行 (仕様の2行目) */}
          <TableRow>
            <TableCell className="font-medium">終日</TableCell>
            {DAYS.map((_, dayIndex) => {
              // 6. 「終日」のチェック状態を state (matrix) から "派生" させる
              // 該当する日のスロット (12個) が全て 1 なら true
              const isAllDayChecked = matrix[dayIndex].every(
                (slot) => slot === 1
              );

              return (
                <TableCell key={dayIndex} className="text-center">
                  <Checkbox
                    checked={isAllDayChecked}
                    onCheckedChange={() => handleAllDayToggle(dayIndex)}
                  />
                </TableCell>
              );
            })}
          </TableRow>

          {/* 時間ごとの行 (仕様の3行目以降) */}
          {TIME_SLOTS.map((time, timeIndex) => (
            <TableRow key={timeIndex}>
              <TableCell className="font-medium">{time}</TableCell>
              {DAYS.map((_, dayIndex) => (
                <TableCell key={dayIndex} className="text-center">
                  <Checkbox
                    checked={matrix[dayIndex][timeIndex] === 1}
                    onCheckedChange={() =>
                      handleTimeSlotToggle(dayIndex, timeIndex)
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 text-right">
        <Button onClick={handleSubmit}>シフト希望を送信</Button>
      </div>
    </div>
  );
}
