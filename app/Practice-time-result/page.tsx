"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// 曜日と対応するラベルの定義
const DAY_COLUMNS = [
  { key: "tuesday", label: "火" },
  { key: "wednesday", label: "水" },
  { key: "thursday", label: "木" },
  { key: "friday", label: "金" },
  { key: "saturday", label: "土" },
  { key: "monday", label: "月" },
] as const;

const LOCATIONS = ["310", "107"] as const;

const TIME_SLOTS = Array.from({ length: 12 }, (_, index) => {
  const hour = index + 9;
  return `${hour.toString().padStart(2, "0")}:00`;
});

type ScheduleEntry = string | 0;
type ScheduleMatrix = ScheduleEntry[][][];

interface PracticeSessionRow {
  week_id: number;
  start_date: string | null;
  result: unknown;
}

const DAY_COUNT = DAY_COLUMNS.length;
const HOURS_PER_DAY = TIME_SLOTS.length;
const LOCATION_COUNT = LOCATIONS.length;

// 状態管理とUI描画を近くに置き、読み手が迷子にならないようにする。
export default function PracticeTimeResultPage() {
  const [sessions, setSessions] = useState<PracticeSessionRow[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleMatrix>(() =>
    createEmptySchedule()
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Supabaseから最新順で週一覧を取得して初期表示を決める。
    const loadPracticeSessions = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("practice_session")
        .select("week_id, start_date, result")
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("week_id", { ascending: false });

      if (error) {
        console.error("練習結果の取得に失敗しました:", error);
        setSessions([]);
        setSchedule(createEmptySchedule());
        setErrorMessage("練習結果の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      const safeData = data ?? [];
      setSessions(safeData);

      const latestSession =
        safeData.find((session) => session.start_date !== null) ?? safeData[0];

      if (latestSession) {
        setSelectedWeekId(latestSession.week_id);
      } else {
        setSchedule(createEmptySchedule());
      }

      setIsLoading(false);
    };

    loadPracticeSessions();
  }, []);

  useEffect(() => {
    // 選択中の週を検出し、表に描画するための配列を整形する。
    if (selectedWeekId === null) {
      return;
    }

    const selectedSession = sessions.find(
      (session) => session.week_id === selectedWeekId
    );

    setSchedule(parseResult(selectedSession?.result ?? null));
  }, [selectedWeekId, sessions]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.week_id === selectedWeekId) ?? null,
    [selectedWeekId, sessions]
  );

  const caption = useMemo(() => {
    if (!selectedSession) {
      return "表示できるスケジュールがありません。";
    }

    const formattedStartDate = formatStartDate(selectedSession.start_date);
    return `週ID ${selectedSession.week_id}${
      formattedStartDate ? `（開始日: ${formattedStartDate}）` : ""
    }`;
  }, [selectedSession]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">練習スケジュール一覧</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Supabase に保存された練習取り結果から、練習場所（310 / 107）とバンド名を時間帯ごとに表示します。
          </p>
        </header>

        <section className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            週を選択
          </label>
          <select
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedWeekId ?? ""}
            onChange={(event) => {
              const nextWeekId = Number(event.target.value);
              setSelectedWeekId(Number.isNaN(nextWeekId) ? null : nextWeekId);
            }}
            disabled={isLoading || sessions.length === 0}
          >
            {sessions.length === 0 && <option value="">データなし</option>}
            {sessions.map((session) => {
              // 開始日が取得できたときは日付を優先して表示する。
              const label =
                formatStartDate(session.start_date) || `週ID ${session.week_id}`;

              return (
                <option key={session.week_id} value={session.week_id}>
                  {label}
                </option>
              );
            })}
          </select>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          {isLoading && (
            <p className="text-sm text-muted-foreground">読み込み中です…</p>
          )}
        </section>

        <Table className="border">
          <TableCaption>{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[96px] text-center">時間</TableHead>
              {DAY_COLUMNS.map((day) => (
                <TableHead
                  key={day.key}
                  colSpan={LOCATIONS.length}
                  className="border-l text-center"
                >
                  {day.label}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead />
              {DAY_COLUMNS.map((day) =>
                LOCATIONS.map((location) => (
                  <TableHead
                    key={`${day.key}-${location}`}
                    className="border-l text-center"
                  >
                    {location}
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIME_SLOTS.map((slot, timeIndex) => (
              <TableRow key={slot}>
                <TableCell className="font-medium">{slot}</TableCell>
                {DAY_COLUMNS.map((day, dayIndex) =>
                  LOCATIONS.map((_, locationIndex) => {
                    const value =
                      schedule[dayIndex]?.[timeIndex]?.[locationIndex] ?? 0;
                    const isEmpty = value === 0;

                    return (
                      <TableCell
                        key={`${day.key}-${slot}-${locationIndex}`}
                        className={cn(
                          "border-l text-center align-middle text-sm",
                          isEmpty
                            ? "text-muted-foreground/50 italic"
                            : "font-medium"
                        )}
                      >
                        {isEmpty ? "—" : value}
                      </TableCell>
                    );
                  })
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function createEmptySchedule(): ScheduleMatrix {
  // 表示を壊さない初期値を生成するユーティリティ。
  return Array.from({ length: DAY_COUNT }, () =>
    Array.from({ length: HOURS_PER_DAY }, () =>
      Array.from({ length: LOCATION_COUNT }, () => 0 as ScheduleEntry)
    )
  );
}

function parseResult(rawResult: unknown): ScheduleMatrix {
  // 文字列と配列の両方を受け取れるようにして、異常値の影響を局所化する。
  if (rawResult == null) {
    return createEmptySchedule();
  }

  if (typeof rawResult === "string") {
    try {
      const parsed = JSON.parse(rawResult);
      return normalizeSchedule(parsed);
    } catch (error) {
      console.error("練習結果のパースに失敗しました:", error);
      return createEmptySchedule();
    }
  }

  return normalizeSchedule(rawResult);
}

function normalizeSchedule(matrix: unknown): ScheduleMatrix {
  // ネスト構造を段階的に検証し、欠損時は安全なデフォルトに差し替える。
  if (!Array.isArray(matrix)) {
    return createEmptySchedule();
  }

  return Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
    const day = Array.isArray(matrix[dayIndex]) ? matrix[dayIndex] : [];

    return Array.from({ length: HOURS_PER_DAY }, (_, timeIndex) => {
      const timeSlot = Array.isArray(day[timeIndex]) ? day[timeIndex] : [];

      return Array.from({ length: LOCATION_COUNT }, (_, locationIndex) => {
        const value = timeSlot[locationIndex];
        return typeof value === "string" || value === 0 ? value : 0;
      });
    });
  });
}

function formatStartDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}