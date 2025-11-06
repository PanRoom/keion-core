-- 練習希望申請テーブル
-- 部員が週ごとに練習可能な時間を申請するためのテーブル

CREATE TABLE IF NOT EXISTS practice_requests (
  -- プライマリキー
  id BIGSERIAL PRIMARY KEY,
  
  -- 部員ID（外部キー: members テーブル）
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- 週ID（外部キー: practice_session テーブル）
  week_id BIGINT NOT NULL REFERENCES practice_session(week_id) ON DELETE CASCADE,
  
  -- 希望時間（6x12のJSON配列: 0=不可, 1=可能）
  -- 例: [[0,1,1,0,...], [...], ...]
  requested_times TEXT NOT NULL,
  
  -- 優先順位（6x12のJSON配列: 0=優先度なし, 1=優先度高, 2=優先度中, 3=優先度低）
  -- 例: [[0,2,1,0,...], [...], ...]
  priority TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユニーク制約（同じ部員が同じ週に複数申請できないようにする）
  UNIQUE(member_id, week_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_practice_requests_member_id ON practice_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_practice_requests_week_id ON practice_requests(week_id);
CREATE INDEX IF NOT EXISTS idx_practice_requests_created_at ON practice_requests(created_at DESC);

-- RLS (Row Level Security) ポリシー
ALTER TABLE practice_requests ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーでもアクセス可能（開発用）
CREATE POLICY "Allow anonymous access for practice_requests"
ON practice_requests
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 認証済みユーザーは自分のリクエストのみ読み書き可能
CREATE POLICY "Users can manage own requests"
ON practice_requests
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
CREATE OR REPLACE FUNCTION update_practice_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER practice_requests_updated_at_trigger
BEFORE UPDATE ON practice_requests
FOR EACH ROW
EXECUTE FUNCTION update_practice_requests_updated_at();

-- コメント
COMMENT ON TABLE practice_requests IS '部員の練習希望申請を保存するテーブル';
COMMENT ON COLUMN practice_requests.id IS 'プライマリキー（自動採番）';
COMMENT ON COLUMN practice_requests.member_id IS '部員ID（members テーブルへの外部キー）';
COMMENT ON COLUMN practice_requests.week_id IS '練習週ID（practice_session テーブルへの外部キー）';
COMMENT ON COLUMN practice_requests.requested_times IS '希望時間の6x12配列（JSON文字列）';
COMMENT ON COLUMN practice_requests.priority IS '優先順位の6x12配列（JSON文字列、オプション）';
