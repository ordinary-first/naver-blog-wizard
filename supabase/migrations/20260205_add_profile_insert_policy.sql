-- 이메일 사용자가 profiles 테이블에 자신의 프로필을 생성할 수 있도록 INSERT 정책 추가
-- 이 정책은 사용자가 회원가입 후 자동으로 profiles 레코드를 생성할 수 있게 합니다.

CREATE POLICY IF NOT EXISTS "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
