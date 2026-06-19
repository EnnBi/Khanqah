-- Link an answer to the specific question it replies to, so each question in a
-- thread is answered independently (multiple follow-ups no longer collapse into
-- one thread-level answer) and the UI can show a WhatsApp-style "replied to".
ALTER TABLE qa_messages ADD COLUMN reply_to UUID REFERENCES qa_messages(id);
CREATE INDEX idx_qa_messages_reply_to ON qa_messages (reply_to);
