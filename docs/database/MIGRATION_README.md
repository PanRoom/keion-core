# データベース移行: practice_requests → members_prefer

## 概要

`practice_requests` テーブルを `members_prefer` に名前変更し、不要な `requested_times` カラムを削除しました。

## 変更内容

### データベース変更

- **テーブル名**: `practice_requests` → `members_prefer`
- **削除カラム**: `requested_times` (練習可能時間の 6x12 配列)
- **残るカラム**:
  - `id`: プライマリキー
  - `member_id`: 部員 ID (FK to members)
  - `week_id`: 週 ID (FK to practice_session)
  - `priority`: 優先順位の 6x12 配列 (0=未選択, 1-4=優先度レベル)
  - `created_at`, `updated_at`: タイムスタンプ

### 理由

- `requested_times`は`practice_session.available`から取得できるため冗長
- 部員が入力するのは優先順位のみで、選択可能時間は役員が設定する

## マイグレーション手順

### 1. Supabase でマイグレーションを実行

Supabase SQL Editor または CLI で以下のファイルを実行:

```bash
# ファイル: docs/database/migrate_practice_requests_to_members_prefer.sql
```

このスクリプトは以下を実行します:

1. 既存の`members_prefer`テーブルを削除（存在する場合）
2. `practice_requests`を`members_prefer`にリネーム
3. `requested_times`カラムを削除
4. インデックスを再作成
5. トリガーとファンクションを更新
6. RLS ポリシーを更新

### 2. データの確認

```sql
-- テーブル構造を確認
\d members_prefer

-- データが保持されているか確認
SELECT COUNT(*) FROM members_prefer;

-- サンプルデータを確認
SELECT * FROM members_prefer LIMIT 5;
```

### 3. アプリケーションをデプロイ

変更されたファイル:

- `app/api/practice-requests/route.ts` - テーブル名とカラムを更新
- `app/member/practice-request/page.tsx` - `requested_times`への参照を削除
- `docs/database/members_prefer_schema.sql` - 新しいスキーマ定義

## ロールバック手順

もし問題が発生した場合:

```sql
-- テーブル名を戻す
ALTER TABLE members_prefer RENAME TO practice_requests;

-- requested_times カラムを追加
ALTER TABLE practice_requests ADD COLUMN requested_times TEXT;

-- インデックスを再作成
CREATE INDEX idx_practice_requests_member_id ON practice_requests(member_id);
CREATE INDEX idx_practice_requests_week_id ON practice_requests(week_id);
CREATE INDEX idx_practice_requests_created_at ON practice_requests(created_at DESC);

-- トリガーを再作成 (practice_requests_schema.sql.old を参照)
```

## 注意事項

- **データの損失なし**: `requested_times`カラムは削除されますが、これは`practice_session.available`から再取得可能
- **既存データ**: `priority`データは保持されます
- **API エンドポイント**: `/api/practice-requests`は変更なし（内部のテーブル名のみ変更）
- **互換性**: フロントエンドは`requested_times`を`practice_session`から取得するため、機能に影響なし

## 確認事項

✅ マイグレーション実行前:

- [ ] 本番環境のバックアップを取得
- [ ] ステージング環境でテスト

✅ マイグレーション実行後:

- [ ] テーブル構造の確認
- [ ] 既存データの確認
- [ ] 練習希望提出機能のテスト
- [ ] 練習希望取得機能のテスト
