DROP INDEX IF EXISTS idx_qa_messages_reply_to;
ALTER TABLE qa_messages DROP COLUMN IF EXISTS reply_to;
