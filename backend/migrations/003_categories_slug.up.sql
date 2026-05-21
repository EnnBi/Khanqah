ALTER TABLE categories ADD COLUMN slug TEXT UNIQUE;

INSERT INTO categories (name_en, name_ur, type, slug, sort_order) VALUES
  ('Bayan',         'بیان',      'bayan',    'bayan',         1),
  ('Clips',         'کلپس',      'clip',     'clips',         2),
  ('Munajaat',      'مناجات',    'nazam',    'munajaat',      3),
  ('Mamulaat',      'معمولات',   'mamulat',  'mamulaat',      4),
  ('Naats',         'نعت',       'hamd_naat','naats',         5),
  ('Books',         'کتب',       'book',     'books',         6),
  ('Quran',         'قرآن',      'quran',    'quran',         7),
  ('Live Sessions', 'لائیو',     'bayan',    'live_sessions', 8)
ON CONFLICT (slug) DO NOTHING;
