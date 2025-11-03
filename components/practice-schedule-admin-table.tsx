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

// 定数の定義
const DAYS = ["火", "水", "木", "金", "土", "月"];

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

interface PracticeScheduleAdminTableProps {
  initialMatrix?: number[][];
  onScheduleChange?: (matrix: number[][]) => void;
  isEditable?: boolean;
}

export function PracticeScheduleAdminTable({
  initialMatrix,
  onScheduleChange,
  isEditable = false,
}: PracticeScheduleAdminTableProps) {
  // スケジュールマトリックス (6曜日 x 12時間)
  // 1: 練習可能, 0: 練習不可
  const [scheduleMatrix, setScheduleMatrix] = useState<number[][]>(
    initialMatrix ||
      Array(DAYS.length)
        .fill(0)
        .map(() => Array(TIME_SLOTS.length).fill(0))
  );

  // 個別の時間スロットをトグル
  const handleTimeSlotToggle = (dayIndex: number, timeIndex: number) => {
    if (!isEditable) return;

    const newMatrix = scheduleMatrix.map((row) => [...row]);
    newMatrix[dayIndex][timeIndex] =
      newMatrix[dayIndex][timeIndex] === 1 ? 0 : 1;

    setScheduleMatrix(newMatrix);
    onScheduleChange?.(newMatrix);
  };

  // 「終日」のトグル
  const handleAllDayToggle = (dayIndex: number) => {
    if (!isEditable) return;

    const currentDaySlots = scheduleMatrix[dayIndex];

    // 全て選択されているかチェック
    const allSelected = currentDaySlots.every((slot) => slot === 1);

    const newMatrix = scheduleMatrix.map((row) => [...row]);

    // 全て選択されている場合は全て解除、そうでなければ全て選択
    newMatrix[dayIndex] = Array(TIME_SLOTS.length).fill(allSelected ? 0 : 1);

    setScheduleMatrix(newMatrix);
    onScheduleChange?.(newMatrix);
  };

  // その曜日の全ての時間が選択されているかチェック
  const isAllDaySelected = (dayIndex: number): boolean => {
    return scheduleMatrix[dayIndex].every((slot) => slot === 1);
  };

  return (
    <div className="w-full">
      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">時間</TableHead>
            {DAYS.map((day, dayIndex) => (
              <TableHead key={dayIndex} className="text-center border-l">
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* 「終日」行 */}
          <TableRow>
            <TableCell className="font-medium">終日</TableCell>
            {DAYS.map((_, dayIndex) => (
              <TableCell key={dayIndex} className="text-center border-l">
                <Checkbox
                  checked={isAllDaySelected(dayIndex)}
                  {...(!isEditable && { disabled: true })}
                  onCheckedChange={() => handleAllDayToggle(dayIndex)}
                />
              </TableCell>
            ))}
          </TableRow>

          {/* 時間ごとの行 */}
          {TIME_SLOTS.map((time, timeIndex) => (
            <TableRow key={timeIndex}>
              <TableCell className="font-medium">{time}</TableCell>
              {DAYS.map((_, dayIndex) => {
                const isSelected = scheduleMatrix[dayIndex][timeIndex] === 1;

                return (
                  <TableCell key={dayIndex} className="text-center border-l">
                    <Checkbox
                      checked={isSelected}
                      {...(!isEditable && { disabled: true })}
                      onCheckedChange={() =>
                        handleTimeSlotToggle(dayIndex, timeIndex)
                      }
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
