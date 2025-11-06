-- =====================================================
-- Supabase Auth と members テーブルの自動同期
-- =====================================================
-- Supabase Auth でユーザーが作成されたら、自動的に members テーブルにもレコードを作成する
-- これにより、Dashboard から直接ユーザーを作成しても整合性が保たれる

-- 1. トリガー関数の作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.users に新規ユーザーが作成されたら、members テーブルにも挿入
  INSERT INTO public.members (
    user_id,
    email,
    name,
    executive,
    practice_available,
    grade
  )
  VALUES (
    NEW.id,                           -- auth.users.id → members.user_id
    NEW.email,                        -- メールアドレス
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- メタデータから名前取得、なければメールアドレス
    false,                            -- デフォルトは一般部員
    true,                             -- デフォルトは練習参加可能
    1                                 -- デフォルトは1年生
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. トリガーの作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. コメント
COMMENT ON FUNCTION public.handle_new_user() IS 
'Supabase Authでユーザーが作成されたら、自動的にmembersテーブルにレコードを作成する';
