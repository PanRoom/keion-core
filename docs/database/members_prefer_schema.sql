-- 部員の練習希望テーブル
-- 部員が週ごとに練習可能な優先順位を申請するためのテーブル

CREATE TABLE IF NOT EXISTS members_prefer (
  -- プライマリキー
  id BIGSERIAL PRIMARY KEY,
  
  -- 部員ID（外部キー: members テーブル）
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- 週ID（外部キー: practice_session テーブル）
  week_id BIGINT NOT NULL REFERENCES practice_session(week_id) ON DELETE CASCADE,
  
  -- 優先順位（6x12のJSON配列: 0=未選択, 1=第1優先, 2=第2優先, 3=第3優先, 4=第4優先）
  -- 例: [[0,2,1,0,...], [...], ...]
  priority TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユニーク制約（同じ部員が同じ週に複数申請できないようにする）
  UNIQUE(member_id, week_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_members_prefer_member_id ON members_prefer(member_id);
CREATE INDEX IF NOT EXISTS idx_members_prefer_week_id ON members_prefer(week_id);
CREATE INDEX IF NOT EXISTS idx_members_prefer_created_at ON members_prefer(created_at DESC);

-- RLS (Row Level Security) ポリシー
ALTER TABLE members_prefer ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーでもアクセス可能（開発用）
CREATE POLICY "Allow anonymous access for members_prefer"
ON members_prefer
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 認証済みユーザーは自分のリクエストのみ読み書き可能
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

-- updated_at 自動更新のトリガー
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

-- コメント
COMMENT ON TABLE members_prefer IS '部員の練習希望を保存するテーブル';
COMMENT ON COLUMN members_prefer.id IS 'プライマリキー（自動採番）';
COMMENT ON COLUMN members_prefer.member_id IS '部員ID（members テーブルへの外部キー）';
COMMENT ON COLUMN members_prefer.week_id IS '練習週ID（practice_session テーブルへの外部キー）';
COMMENT ON COLUMN members_prefer.priority IS '優先順位の6x12配列（JSON文字列）';
