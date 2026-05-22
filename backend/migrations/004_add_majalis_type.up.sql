ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'majalis';

UPDATE categories
SET name_en = 'Majalis', name_ur = 'مجالس', type = 'majalis'
WHERE name_en = 'Live Sessions';
