// ...existing code...
'use client'

import React from 'react'

type PracticeMatrix = (string | 0)[][][]

// 曜日ヘッダーの定義
const dayHeaders = [
  { key: 'tuesday', label: '5/14(火)' },
  { key: 'wednesday', label: '5/15(水)' },
  { key: 'thursday', label: '5/16(木)' },
  { key: 'friday', label: '5/17(金)' },
  { key: 'saturday', label: '5/18(土)' },
  { key: 'monday', label: '5/19(月)' },
]

//場所の定義
const LOCATIONS = ['310', '107'] as const

const START_HOUR = 9
const END_HOUR = 20

//時間スロットの定義
const timeSlots = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, index) => `${String(START_HOUR + index).padStart(2, '0')}:00`
)


//ダミーデータ
const DUMMY_BANDS = [
  'バンドA',
  'バンドB',
  'バンドC',
  'バンドD',
  'バンドE',
  'バンドF',
  'バンドG',
  'バンドH',
  'バンドI',
  'バンドJ',
  'バンドK',
  'バンドL',
  'バンドM',
  'バンドN',
  'バンドO',
  'バンドP',
  'バンドQ',
  'バンドR',
  'バンドS',
  'バンドT',
  'バンドU',
  'バンドV',
  'バンドW',
  'バンドX',
  'バンドY',
  'バンドZ',
  'バンドAA',
  'バンドAB',
]

// 練習時間マトリックスの生成
const practiceMatrix: PracticeMatrix = dayHeaders.map((_, dayIndex) =>
  timeSlots.map((_, slotIndex) => {
    const baseIndex = dayIndex * timeSlots.length + slotIndex
    const primary =
      (baseIndex + dayIndex) % 5 === 0 ? 0 : DUMMY_BANDS[baseIndex % DUMMY_BANDS.length]
    const secondary =
      (baseIndex + slotIndex) % 4 === 0
        ? 0
        : DUMMY_BANDS[(baseIndex + 7) % DUMMY_BANDS.length]
    return [primary, secondary] as [string | 0, string | 0]
  })
)

type PracticeEvent = {
  dayKey: (typeof dayHeaders)[number]['key']
  location: (typeof LOCATIONS)[number]
  bandName: string
  startHour: number
  endHour: number | 'all-day'
}

const toMatrix = (events: PracticeEvent[]): PracticeMatrix => {
  const matrix = dayHeaders.map(() =>
    timeSlots.map(() => Array.from({ length: LOCATIONS.length }, () => 0 as string | 0))
  )

  events.forEach(({ dayKey, location, bandName, startHour, endHour }) => {
    const dayIndex = dayHeaders.findIndex((d) => d.key === dayKey)
    if (dayIndex === -1) return

    const locationIndex = LOCATIONS.findIndex((loc) => loc === location)
    if (locationIndex === -1) return

    const from = Math.max(startHour, START_HOUR)
    const to =
      endHour === 'all-day' ? END_HOUR : Math.min(endHour - 1, END_HOUR)

    for (let hour = from; hour <= to; hour += 1) {
      const slotIndex = hour - START_HOUR
      if (slotIndex < 0 || slotIndex >= timeSlots.length) continue
      matrix[dayIndex][slotIndex][locationIndex] = bandName
    }
  })

  return matrix
}

const practiceMatrix2: PracticeMatrix = toMatrix([
  { dayKey: 'tuesday', location: '310', bandName: '終日バンド', startHour: 9, endHour: 'all-day' },
  { dayKey: 'friday', location: '107', bandName: '午後バンド', startHour: 13, endHour: 17 },
])

const baseCellStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '0.75rem',
  textAlign: 'center',
  backgroundColor: '#ffffff',
}

const headerCellStyle: React.CSSProperties = {
  ...baseCellStyle,
  backgroundColor: '#f1f5f9',
  fontWeight: 700,
}

const subHeaderCellStyle: React.CSSProperties = {
  ...baseCellStyle,
  backgroundColor: '#e2e8f0',
  fontWeight: 600,
}

const timeCellStyle: React.CSSProperties = {
  ...baseCellStyle,
  textAlign: 'left',
  fontWeight: 600,
  backgroundColor: '#f8fafc',
}

const bodyCellStyle: React.CSSProperties = {
  ...baseCellStyle,
}

const formatBand = (value: string | 0 | undefined) =>
  typeof value === 'string' && value.trim().length > 0 ? value : '—'

export default function PracticeTimePage() {
  return (
    <main
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          overflowX: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: '720px',
            borderCollapse: 'collapse',
            backgroundColor: '#f8fafc',
          }}
        >
          <thead>
            <tr>
              <th style={headerCellStyle}>時間</th>
              {dayHeaders.map((day) => (
                <th
                  key={day.key}
                  colSpan={LOCATIONS.length}
                  style={headerCellStyle}
                >
                  {day.label}
                </th>
              ))}
            </tr>
            <tr>
              <th style={subHeaderCellStyle}></th>
              {dayHeaders.flatMap((day) =>
                LOCATIONS.map((location) => (
                  <th
                    key={`${day.key}-${location}`}
                    style={subHeaderCellStyle}
                  >
                    {location}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slotLabel, slotIndex) => (
              <tr key={slotLabel}>
                <td style={timeCellStyle}>{slotLabel}</td>
                {dayHeaders.map((_, dayIndex) =>
                  LOCATIONS.map((_, locationIndex) => (
                    <td
                      key={`${dayIndex}-${slotIndex}-${locationIndex}`}
                      style={bodyCellStyle}
                    >
                      {formatBand(
                        practiceMatrix[dayIndex]?.[slotIndex]?.[locationIndex]
                      )}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
// ...existing code...