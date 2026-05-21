DELETE FROM categories WHERE slug IS NOT NULL;
ALTER TABLE categories DROP COLUMN slug;
