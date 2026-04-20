-- 008_muamulaat.sql — add 'muamulaat' content type + starter category.
-- "Muamulaat" / معاملات is Islamic content about dealings/transactions,
-- ethics, and social conduct. Extends the content_type enum and seeds a
-- default category so admins can file uploads immediately.
--
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction block on
-- Postgres < 12.10, so run each statement independently (Supabase SQL
-- Editor does this by default; do not wrap in BEGIN/COMMIT).

ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'muamulaat';

INSERT INTO public.categories (name_en, name_ur, type, sort_order)
VALUES ('Muamulaat', 'معاملات', 'muamulaat', 70)
ON CONFLICT DO NOTHING;
