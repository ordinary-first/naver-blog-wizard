-- 1. Profiles Table (사용자 정보)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  naver_id TEXT UNIQUE,
  username TEXT,
  avatar_url TEXT,
  blog_title TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Chat Sessions Table (일기/대화 세션)
CREATE TABLE chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'published'
  is_representative BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 3. Chat Messages Table (세션 내 메시지)
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT, -- 'user' | 'assistant'
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Row Level Security (RLS) 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (본인 데이터만 접근 가능)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON chat_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid()));
