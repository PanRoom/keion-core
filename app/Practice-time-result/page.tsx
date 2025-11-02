import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// 曜日と対応するラベルの定義
const DAY_COLUMNS = [
  { key: "tuesday", label: "火" },
  { key: "wednesday", label: "水" },
  { key: "thursday", label: "木" },
  { key: "friday", label: "金" },
  { key: "saturday", label: "土" },
  { key: "monday", label: "月" },
] as const

const LOCATIONS = ["310", "107"] as const

const TIME_SLOTS = Array.from({ length: 12 }, (_, index) => {
  const hour = index + 9
  return `${hour.toString().padStart(2, "0")}:00`
})

type ScheduleEntry = string | 0

// matrix[i][j][k] の定義:
// i: 曜日インデックス（0: 火曜, 1: 水曜, 2: 木曜, 3: 金曜, 4: 土曜, 5: 月曜）
// j: 時間インデックス（0: 9:00, 1: 10:00, ..., 11: 20:00）
// k: 練習場所インデックス（0: 310, 1: 107）
// dummyScheduleはダミーデータ
const dummySchedule: ScheduleEntry[][][] = (() => {
  const matrix = DAY_COLUMNS.map(() =>
    TIME_SLOTS.map(() => LOCATIONS.map(() => 0 as ScheduleEntry))
  )

  matrix[0][0][0] = "Blue Birds (2h)"
  matrix[0][1][0] = "Blue Birds (2h)"
  matrix[0][2][1] = "Swing Notes (1h)"
  matrix[0][4][0] = "Night Owls (1h)"
  matrix[0][6][1] = "Rhythm Roots (2h)"
  matrix[0][7][1] = "Rhythm Roots (2h)"
  matrix[0][9][0] = "Neon Beats (1h)"

  matrix[1][0][1] = "Morning Rays (1h)"
  matrix[1][1][0] = "City Lights (2h)"
  matrix[1][2][0] = "City Lights (2h)"
  matrix[1][3][1] = "Harbor Line (1h)"
  matrix[1][5][0] = "Velvet Waves (1h)"
  matrix[1][8][0] = "Skyline Crew (1h)"
  matrix[1][9][1] = "Nightfall Crew (2h)"
  matrix[1][10][1] = "Nightfall Crew (2h)"

  matrix[2][0][0] = "Aurora Set (1h)"
  matrix[2][1][1] = "Seaside Trio (2h)"
  matrix[2][2][1] = "Seaside Trio (2h)"
  matrix[2][4][0] = "Flux Ensemble (2h)"
  matrix[2][5][0] = "Flux Ensemble (2h)"
  matrix[2][7][1] = "Wave Circuit (1h)"
  matrix[2][9][0] = "Compass Band (1h)"
  matrix[2][10][1] = "Compass Band (1h)"

  matrix[3][0][0] = "Morning Pulse (2h)"
  matrix[3][1][0] = "Morning Pulse (2h)"
  matrix[3][2][1] = "Coda Collective (1h)"
  matrix[3][4][0] = "Harbor Lights (1h)"
  matrix[3][6][1] = "Echo Harbor (2h)"
  matrix[3][7][1] = "Echo Harbor (2h)"
  matrix[3][8][0] = "Silver Strings (1h)"
  matrix[3][10][1] = "Twilight Tune (1h)"

  matrix[4][0][1] = "Weekend Kickoff (1h)"
  matrix[4][1][0] = "Festival Prep (2h)"
  matrix[4][2][0] = "Festival Prep (2h)"
  matrix[4][4][1] = "Noon Chorus (1h)"
  matrix[4][6][0] = "Open Stage (2h)"
  matrix[4][7][0] = "Open Stage (2h)"
  matrix[4][9][1] = "Night Session (2h)"
  matrix[4][10][1] = "Night Session (2h)"

  matrix[5][0][0] = "Reset Crew (1h)"
  matrix[5][2][1] = "Studio Warmup (2h)"
  matrix[5][3][1] = "Studio Warmup (2h)"
  matrix[5][4][0] = "Groove Lab (2h)"
  matrix[5][5][0] = "Groove Lab (2h)"
  matrix[5][7][1] = "Pulse Practice (2h)"
  matrix[5][8][1] = "Pulse Practice (2h)"
  matrix[5][9][0] = "Evening Flow (1h)"
  matrix[5][11][1] = "Closing Set (1h)"

  return matrix
})()

export default function PracticeTimeResultPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">練習スケジュール一覧</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            練習場所（310 / 107）と練習バンド名を 1 時間刻みで表示しています。現在はダミーデータを使用しています。
          </p>
        </header>

        <Table className="border">
          <TableCaption>ダミーデータで構成した 3 次元配列の表示例</TableCaption>
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
                    const value = dummySchedule[dayIndex][timeIndex][locationIndex]
                    const isEmpty = value === 0

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
                    )
                  })
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}