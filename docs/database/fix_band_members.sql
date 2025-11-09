-- ==========================================
-- band_members テーブルの修正
-- ==========================================

-- 既存のテーブルがある場合は削除（データがある場合は注意！）
DROP TABLE IF EXISTS band_members CASCADE;

-- 正しい型で再作成
CREATE TABLE band_members (
  id BIGSERIAL PRIMARY KEY,
  band_id INTEGER NOT NULL REFERENCES bands(band_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(band_id, member_id)
);

-- インデックス作成
CREATE INDEX idx_band_members_band_id ON band_members(band_id);
CREATE INDEX idx_band_members_member_id ON band_members(member_id);

-- RLS 有効化
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
CREATE POLICY "band_members_select_all" ON band_members
FOR SELECT USING (true);

CREATE POLICY "band_members_insert_authenticated" ON band_members
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ==========================================
-- テストデータ挿入（例）
-- ==========================================

-- 自分の member_id を確認
-- SELECT member_id, name, email FROM members WHERE user_id = auth.uid();

-- 例: member_id が 1 の人を band_id 1 に追加
-- INSERT INTO band_members (band_id, member_id, role) VALUES (1, 1, 'leader');

-- ==========================================
-- 確認クエリ
-- ==========================================

-- 全バンドメンバーを確認
-- SELECT 
--   bm.id,
--   bm.band_id,
--   b.band_name,
--   bm.member_id,
--   m.name as member_name,
--   bm.role
-- FROM band_members bm
-- JOIN bands b ON bm.band_id = b.band_id
-- JOIN members m ON bm.member_id = m.member_id;
