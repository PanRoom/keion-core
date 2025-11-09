# 🎸 ライブ タイムテーブル作成 - ユーザーフロー（修正版）

## 📋 全体フロー

### **フェーズ 1: イベント準備（役員）**

```
[役員] /event_create
  ↓
イベント作成（イベント名、開催日）
  ↓
events テーブルに保存
```

**実装状況:** ✅ 完了

---

### **フェーズ 2: 出演申し込み（バンドメンバー）** ⭐️ 修正版

```
[バンドメンバー] /entry_form
  ↓
1. ログイン認証（Supabase Auth）
2. 自分が所属するバンドを取得（band_members テーブル）
3. 既に申し込み済みかチェック（entry_table）
  ↓
【申し込み済みの場合】
  - ✅ 送信済みバッジ表示
  - フォーム入力欄を無効化（変更不可）
  - 送信内容を表示（希望時間、トリ希望有無、送信日時）
  ↓
【未申し込みの場合】
  - バンド名（自動表示・変更不可）
  - 希望出演時間を選択（15/20/25/30分）
  - ☑ トリ希望チェックボックス
  - 提出ボタン
  ↓
entry_table に保存
  {
    event_id,
    band_id,
    duration,
    wants_finale: boolean,  // トリ希望
    submitted_by: member_id, // 誰が送信したか
    submitted_at: timestamp  // 送信日時
  }
```

**実装状況:** ✅ 完了（今回実装）

**特徴:**

- バンドメンバーなら**誰でも**フォーム送信可能
- 一度送信されたら**変更不可**（送信済みバッジ表示）
- トリ（最後の演奏）希望を選択可能
- `UNIQUE(event_id, band_id)` 制約で重複送信を防止

---

### **フェーズ 3: メンバー出席可能時間の収集（部員）**

```
[部員] /timetable-request
  ↓
1. イベントの開催日程を表示
2. 各日の出席状況を入力
   - 終日出席可能
   - 出席不可
   - 時間指定（開始〜終了時間を複数設定可能）
  ↓
member_availability テーブルに保存
  {
    event_id,
    member_id,
    date,
    all_day: boolean,
    unavailable: boolean,
    time_slots: [{"start": "10:00", "end": "12:00"}, ...]
  }
```

**実装状況:** 🟡 フロントエンド完成、API 未実装

**次のタスク:**

- [ ] `POST /api/member-availability` API 作成
- [ ] timetable-request ページから DB 保存処理を追加

---

### **フェーズ 4: タイムテーブル自動生成 or 手動調整（役員）**

```
[役員] /admin/timetable-create（要実装）
  ↓
1. entry_table から出演バンド一覧取得
   - wants_finale = true のバンドを識別
2. member_availability から部員の出席状況取得
3. 自動スケジューリングアルゴリズム実行
   - バンドの希望時間を考慮
   - トリ希望バンドを最後に配置 ⭐️
   - 部員の出席可能時間を考慮
   - 休憩時間を自動挿入
  ↓
4. スロット案をプレビュー表示
5. 手動調整可能（ドラッグ&ドロップ）
  ↓
6. 確定ボタンで eventslots に保存
```

**実装状況:** ❌ 未実装

**自動スケジューリングロジック（案）:**

```typescript
function generateTimetable(entries, availability) {
  // 1. トリ希望バンドと通常バンドを分離
  const finaleEntries = entries.filter((e) => e.wants_finale);
  const normalEntries = entries.filter((e) => !e.wants_finale);

  // 2. 通常バンドを配置
  let currentTime = "13:00"; // 開始時間
  const slots = [];

  normalEntries.forEach((entry, index) => {
    slots.push({
      start_time: currentTime,
      end_time: addMinutes(currentTime, entry.duration),
      band_id: entry.band_id,
    });

    currentTime = addMinutes(currentTime, entry.duration);

    // 2バンドごとに休憩
    if ((index + 1) % 2 === 0) {
      slots.push({
        start_time: currentTime,
        end_time: addMinutes(currentTime, 10),
        band_id: null, // 休憩
      });
      currentTime = addMinutes(currentTime, 10);
    }
  });

  // 3. トリ希望バンドを最後に配置
  finaleEntries.forEach((entry) => {
    slots.push({
      start_time: currentTime,
      end_time: addMinutes(currentTime, entry.duration),
      band_id: entry.band_id,
    });
    currentTime = addMinutes(currentTime, entry.duration);
  });

  return slots;
}
```

---

### **フェーズ 5: タイムテーブル公開（全員）**

```
[全員] /timetable
  ↓
完成したタイムテーブルを閲覧
```

**実装状況:** ✅ 完了

---

## 🗄️ データベーススキーマ

### 既存テーブル

- `events` - イベント情報
- `bands` - バンド情報
- `entry_table` - 出演申し込み ⭐️ 更新済み
- `eventslots` - タイムテーブルスロット

### 新規テーブル

- `band_members` - バンドとメンバーの所属関係 ⭐️ 新規
- `member_availability` - 部員の出席可能時間 ⭐️ 新規

### スキーマファイル

- `/docs/database/timetable_schema.sql`

---

## 📊 データフロー図

```
events (イベント情報)
  ↓
entry_table (バンド出演申し込み)
  - wants_finale (トリ希望) ⭐️
  - submitted_by (申し込み者) ⭐️
  +
member_availability (部員出席可能時間)
  ↓
[自動スケジューリング or 手動調整]
  - トリ希望バンドを最後に配置 ⭐️
  ↓
eventslots (確定タイムテーブル)
  ↓
/timetable (公開タイムテーブル表示)
```

---

## 🎯 次のステップ（優先順位順）

### **ステップ 1: timetable-request の完成** 🔜

- [x] `member_availability` テーブル作成（スキーマ完成）
- [ ] `POST /api/member-availability` API 実装
- [ ] timetable-request ページから DB へ保存する機能追加
- [ ] 送信済みの場合は履歴表示（practice-request と同様）

### **ステップ 2: タイムテーブル作成画面の実装**

- [ ] `/admin/timetable-create` ページ作成
- [ ] 出演バンド一覧表示（トリ希望マーク付き）
- [ ] 部員出席状況サマリー表示
- [ ] 自動スケジューリングアルゴリズム実装
  - トリ希望バンドを最後に配置 ⭐️
- [ ] タイムテーブルプレビュー表示

### **ステップ 3: 手動調整機能（オプション）**

- [ ] スロット編集 UI
- [ ] ドラッグ&ドロップ対応

### **ステップ 4: 確定・公開**

- [ ] `POST /api/timetable/finalize` API 実装
- [ ] eventslots への保存処理

---

## 💡 補足

### トリ希望の扱い

- 複数のバンドがトリを希望した場合
  - オプション 1: 自動スケジューリング時に警告を表示し、役員が手動で選択
  - オプション 2: 申し込み順や希望時間の長さで自動決定
  - オプション 3: 役員がタイムテーブル作成画面で調整

### 申し込み後の変更

- 現在の仕様: **変更不可**
- 変更が必要な場合は役員に連絡
- 将来的に「変更リクエスト機能」を追加する可能性あり

---

## 🔧 実装済みファイル

### 今回更新したファイル

- ✅ `/app/entry_form/page.tsx` - バンド出演申し込みフォーム

  - ログイン認証追加
  - 自分のバンド自動取得
  - 送信済み判定・表示
  - トリ希望チェックボックス追加
  - 変更不可ロジック実装

- ✅ `/docs/database/timetable_schema.sql` - データベーススキーマ
  - entry_table にカラム追加
  - band_members テーブル作成
  - member_availability テーブル作成
  - RLS ポリシー設定

### 次に実装するファイル

- 🔜 `/app/api/member-availability/route.ts` - 出席可能時間 API
- 🔜 `/app/timetable-request/page.tsx` - DB 保存処理追加
- 🔜 `/app/admin/timetable-create/page.tsx` - タイムテーブル作成画面

---

**最終更新:** 2025 年 11 月 8 日
