DROP TABLE IF EXISTS qa_audit_log;
DROP TABLE IF EXISTS qa_messages;
DROP TABLE IF EXISTS qa_threads;
DROP TABLE IF EXISTS device_keys;
-- Note: Postgres cannot drop a value from an enum; 'shaykh' remains on the enum.
-- This is harmless and the down migration is otherwise complete.
