-- 006_live_sessions_category.sql — "Live Sessions" category
-- Auto-populated when record-and-upload.sh finishes a broadcast and
-- inserts a content row for it.

INSERT INTO public.categories (name_en, name_ur, type, sort_order)
VALUES ('Live Sessions', 'لائیو سیشن', 'bayan', 100)
ON CONFLICT DO NOTHING;
