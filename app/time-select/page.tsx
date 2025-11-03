// ...existing code...
"use client";
import { useState } from "react";

// 曜日オプションの定義
const dayOptions = [
  { key: "tuesday", label: "火曜日" },
  { key: "wednesday", label: "水曜日" },
  { key: "thursday", label: "木曜日" },
  { key: "friday", label: "金曜日" },
  { key: "saturday", label: "土曜日" },
  { key: "monday", label: "月曜日" },
];

// 時間オプションの定義（09:00〜20:00）
const timeOptions = Array.from({ length: 12 }, (_, index) => {
  const hour = index + 9;
  return `${hour.toString().padStart(2, "0")}:00`;
});

const unavailableMatrix = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// メインコンポーネント
export default function TimeSelectPage() {
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<number[][]>(() =>
    dayOptions.map(() => Array(timeOptions.length).fill(0))
  );
  const [output, setOutput] = useState<number[][] | null>(null);

  const handleDaySelect = (index: number) => {
    setActiveDayIndex((current) => (current === index ? null : index));
  };

  const handleAllDayToggle = (dayIndex: number) => {
    setMatrix((previous) => {
      const next = previous.map((row) => [...row]);
      const disabledRow = unavailableMatrix[dayIndex];
      const shouldSelectAll = next[dayIndex].some(
        (value, timeIndex) => disabledRow[timeIndex] === 0 && value === 0
      );
      next[dayIndex] = next[dayIndex].map((_, timeIndex) =>
        disabledRow[timeIndex] === 1 ? 0 : shouldSelectAll ? 1 : 0
      );
      return next;
    });
  };

  const handleTimeToggle = (dayIndex: number, timeIndex: number) => {
    if (unavailableMatrix[dayIndex][timeIndex] === 1) {
      return;
    }
    setMatrix((previous) => {
      const next = previous.map((row) => [...row]);
      next[dayIndex][timeIndex] = next[dayIndex][timeIndex] === 1 ? 0 : 1;
      return next;
    });
  };

  const handleSubmit = () => {
    setOutput(matrix.map((row) => [...row]));
    // eslint-disable-next-line no-console
    console.log("Selected matrix", matrix);
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(360px, 100%)",
          gap: "1rem",
        }}
      >
        {dayOptions.map((day, index) => {
          const isActive = activeDayIndex === index;
          return (
            <div
              key={day.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={() => handleDaySelect(index)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid",
                  borderColor: isActive ? "#2563eb" : "#d1d5db",
                  backgroundColor: isActive ? "#e0f2fe" : "#ffffff",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {day.label}
              </button>

              {isActive && (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <label
                    htmlFor={`${day.key}-all-day`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: 600,
                    }}
                  >
                    <input
                      id={`${day.key}-all-day`}
                      type="checkbox"
                      checked={
                        unavailableMatrix[index].some((flag) => flag === 0) &&
                        matrix[index].every(
                          (value, timeIndex) =>
                            unavailableMatrix[index][timeIndex] === 1 ||
                            value === 1
                        )
                      }
                      onChange={() => handleAllDayToggle(index)}
                    />
                    終日
                  </label>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(96px, 1fr))",
                      gap: "0.75rem",
                    }}
                  >
                    {timeOptions.map((timeLabel, timeIndex) => {
                      const inputId = `${day.key}-${timeLabel}`;
                      const isDisabled =
                        unavailableMatrix[index][timeIndex] === 1;
                      return (
                        <label
                          key={inputId}
                          htmlFor={inputId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.5rem",
                            padding: "0.5rem 0.75rem",
                            backgroundColor: isDisabled ? "#f8fafc" : "#ffffff",
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            disabled={isDisabled}
                            checked={matrix[index][timeIndex] === 1}
                            onChange={() => handleTimeToggle(index, timeIndex)}
                          />
                          {timeLabel}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <button
        type="button"
        onClick={handleSubmit}
        style={{
          padding: "0.75rem 1.5rem",
          borderRadius: "9999px",
          border: "none",
          backgroundColor: "#2563eb",
          color: "#ffffff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        決定
      </button>

      {output && (
        <pre
          style={{
            width: "min(420px, 100%)",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            padding: "1rem",
            borderRadius: "0.75rem",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </main>
  );
}
// ...existing code...
