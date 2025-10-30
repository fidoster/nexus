-- Create conversations table to group queries into chat sessions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add conversation_id to queries table
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_queries_conversation_id ON queries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

-- Allow users to manage their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Update existing queries to have a conversation_id
-- Group existing queries by user and create a conversation for each query
DO $$
DECLARE
  query_record RECORD;
  new_conversation_id UUID;
BEGIN
  FOR query_record IN
    SELECT id, user_id, created_at
    FROM queries
    WHERE conversation_id IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Create a new conversation for each existing query
    INSERT INTO conversations (user_id, title, created_at, updated_at)
    VALUES (
      query_record.user_id,
      'Chat',
      query_record.created_at,
      query_record.created_at
    )
    RETURNING id INTO new_conversation_id;

    -- Link the query to the conversation
    UPDATE queries
    SET conversation_id = new_conversation_id
    WHERE id = query_record.id;
  END LOOP;
END $$;
