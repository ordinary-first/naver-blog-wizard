-- 🚨 강력 초기화: 모든 세션을 "작성 중" 상태로 리셋
-- Supabase SQL Editor에서 실행하세요

-- 1. 모든 세션의 published_at을 NULL로 초기화
UPDATE chat_sessions
SET published_at = NULL;

-- 2. 모든 세션의 status를 'active'로 설정
UPDATE chat_sessions
SET status = 'active';

-- 3. 확인용 쿼리 (결과를 보고 싶으면 실행)
SELECT
    id,
    title,
    status,
    published_at,
    created_at
FROM chat_sessions
ORDER BY created_at DESC
LIMIT 10;
