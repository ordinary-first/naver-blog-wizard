-- Fix RLS violations when using upsert() on chat_messages.
-- upsert performs INSERT ... ON CONFLICT DO UPDATE, so UPDATE permission is required.

drop policy if exists "Users can update own messages" on chat_messages;
create policy "Users can update own messages" on chat_messages
for update
using (
  exists (
    select 1 from chat_sessions
    where id = chat_messages.session_id
      and user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own messages" on chat_messages;
create policy "Users can delete own messages" on chat_messages
for delete
using (
  exists (
    select 1 from chat_sessions
    where id = chat_messages.session_id
      and user_id = auth.uid()
  )
);
