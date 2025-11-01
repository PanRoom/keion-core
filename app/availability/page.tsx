import { AvailabilityTable } from "@/components/availability-table";

export default function AvailabilityPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">シフト希望入力</h1>
          <p className="text-muted-foreground mt-2">
            希望する曜日と時間を選択してください。「終日」をクリックすると、その日の全時間を一括選択できます。
          </p>
        </div>
        <AvailabilityTable />
      </div>
    </div>
  );
}
