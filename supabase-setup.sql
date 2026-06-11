-- 在 Supabase SQL Editor 里运行这段 SQL

CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  current_round INTEGER DEFAULT 0,
  current_phase TEXT,
  current_turn_player_id TEXT,
  current_question JSONB,
  players JSONB NOT NULL DEFAULT '[]',
  game_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 启用 Realtime（必须执行！）
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- 开发期关闭 RLS，上线再开
ALTER TABLE game_rooms DISABLE ROW LEVEL SECURITY;
