-- ==========================================
-- ライブ タイムテーブル関連のテーブル定義
-- ==========================================

-- 1. entry_table の更新（トリ希望、申し込み者情報を追加）
ALTER TABLE entry_table
ADD COLUMN IF NOT EXISTS wants_finale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- 同じバンドが複数回申し込めないように制約追加（既存の場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_event_band'
  ) THEN
    ALTER TABLE entry_table
    ADD CONSTRAINT unique_event_band UNIQUE (event_id, band_id);
  END IF;
END $$;

-- 2. band_members テーブル（バンドとメンバーの所属関係）
CREATE TABLE IF NOT EXISTS band_members (
  id BIGSERIAL PRIMARY KEY,
  band_id INTEGER NOT NULL REFERENCES bands(band_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader', 'member' など
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(band_id, member_id)
);

-- band_members のインデックス
CREATE INDEX IF NOT EXISTS idx_band_members_band_id ON band_members(band_id);
CREATE INDEX IF NOT EXISTS idx_band_members_member_id ON band_members(member_id);

-- 3. member_availability テーブル（部員の出席可能時間）
CREATE TABLE IF NOT EXISTS member_availability (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  unavailable BOOLEAN DEFAULT false,
  time_slots JSONB, -- [{"start": "10:00", "end": "12:00"}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id, date)
);

-- member_availability のインデックス
CREATE INDEX IF NOT EXISTS idx_member_availability_event_id ON member_availability(event_id);
CREATE INDEX IF NOT EXISTS idx_member_availability_member_id ON member_availability(member_id);

-- 4. updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_member_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_availability_updated_at ON member_availability;
CREATE TRIGGER trigger_update_member_availability_updated_at
BEFORE UPDATE ON member_availability
FOR EACH ROW
EXECUTE FUNCTION update_member_availability_updated_at();

-- ==========================================
-- RLS (Row Level Security) ポリシー
-- ==========================================

-- entry_table のRLS
ALTER TABLE entry_table ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "entry_table_select_all" ON entry_table
FOR SELECT USING (true);

-- 認証済みユーザーが挿入可能
CREATE POLICY "entry_table_insert_authenticated" ON entry_table
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 自分が送信したエントリーのみ更新可能（オプション）
CREATE POLICY "entry_table_update_own" ON entry_table
FOR UPDATE USING (auth.uid() = submitted_by);

-- band_members のRLS
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "band_members_select_all" ON band_members
FOR SELECT USING (true);

-- 認証済みユーザーが挿入可能（役員のみに制限する場合は条件を追加）
CREATE POLICY "band_members_insert_authenticated" ON band_members
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- member_availability のRLS
ALTER TABLE member_availability ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "member_availability_select_all" ON member_availability
FOR SELECT USING (true);

-- 自分の出席情報のみ挿入可能
-- member_id は INTEGER なので、members テーブル経由で確認
CREATE POLICY "member_availability_insert_own" ON member_availability
FOR INSERT WITH CHECK (
  member_id IN (
    SELECT member_id FROM members WHERE user_id = auth.uid()
  )
);

-- 自分の出席情報のみ更新可能
CREATE POLICY "member_availability_update_own" ON member_availability
FOR UPDATE USING (
  member_id IN (
    SELECT member_id FROM members WHERE user_id = auth.uid()
  )
);

-- 自分の出席情報のみ削除可能
CREATE POLICY "member_availability_delete_own" ON member_availability
FOR DELETE USING (
  member_id IN (
    SELECT member_id FROM members WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- サンプルデータ（テスト用）
-- ==========================================

-- バンドメンバーの所属関係を追加（実際のmember_idに置き換えてください）
-- INSERT INTO band_members (band_id, member_id, role) VALUES
-- (1, 1, 'leader'),
-- (1, 2, 'member'),
-- (2, 3, 'leader');
