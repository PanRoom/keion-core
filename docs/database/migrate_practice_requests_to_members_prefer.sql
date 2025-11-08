-- テーブル名を practice_requests から members_prefer に変更
-- requested_times カラムを削除

-- Step 1: 既存の members_prefer テーブルがあれば削除
DROP TABLE IF EXISTS members_prefer CASCADE;

-- Step 2: practice_requests テーブルの名前を変更
ALTER TABLE practice_requests RENAME TO members_prefer;

-- Step 3: requested_times カラムを削除
ALTER TABLE members_prefer DROP COLUMN IF EXISTS requested_times;

-- Step 4: インデックス名を変更
DROP INDEX IF EXISTS idx_practice_requests_member_id;
DROP INDEX IF EXISTS idx_practice_requests_week_id;
DROP INDEX IF EXISTS idx_practice_requests_created_at;

CREATE INDEX idx_members_prefer_member_id ON members_prefer(member_id);
CREATE INDEX idx_members_prefer_week_id ON members_prefer(week_id);
CREATE INDEX idx_members_prefer_created_at ON members_prefer(created_at DESC);

-- Step 5: トリガーとファンクションを更新
DROP TRIGGER IF EXISTS practice_requests_updated_at_trigger ON members_prefer;
DROP FUNCTION IF EXISTS update_practice_requests_updated_at();

CREATE OR REPLACE FUNCTION update_members_prefer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_prefer_updated_at_trigger
BEFORE UPDATE ON members_prefer
FOR EACH ROW
EXECUTE FUNCTION update_members_prefer_updated_at();

-- Step 6: RLS ポリシー名を変更
DROP POLICY IF EXISTS "Allow anonymous access for practice_requests" ON members_prefer;
DROP POLICY IF EXISTS "Users can manage own requests" ON members_prefer;

CREATE POLICY "Allow anonymous access for members_prefer"
ON members_prefer
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can manage own preferences"
ON members_prefer
FOR ALL
TO authenticated
USING (
  member_id IN (
    SELECT member_id FROM members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT member_id FROM members WHERE user_id = auth.uid()
  )
);

-- Step 7: コメントを更新
COMMENT ON TABLE members_prefer IS '部員の練習希望を保存するテーブル';
COMMENT ON COLUMN members_prefer.id IS 'プライマリキー（自動採番）';
COMMENT ON COLUMN members_prefer.member_id IS '部員ID（members テーブルへの外部キー）';
COMMENT ON COLUMN members_prefer.week_id IS '練習週ID（practice_session テーブルへの外部キー）';
COMMENT ON COLUMN members_prefer.priority IS '優先順位の6x12配列（JSON文字列）';
