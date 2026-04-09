-- ============================================================
-- seed_content.sql
-- Khanqah Maseeh-ul-Ummah — sample content seed data
--
-- Uses real, publicly accessible URLs from archive.org (audio/PDF)
-- and YouTube (video clips).
--
-- Prerequisites:
--   • Categories must already exist (see seed.sql).
--   • Replace the uploaded_by UUID below with a real user ID if
--     different from the one used here.
--
-- Admin user used as content uploader:
--   ID : 213e0be7-e3d2-4508-a7cf-bb505a5573f7
--   Email: nadym.baba@gmail.com
--
-- Run via Supabase SQL editor or psql as the service role so that
-- RLS is bypassed.
-- ============================================================

-- Convenience variable – change this to your admin user's UUID
-- if you run this script manually.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '213e0be7-e3d2-4508-a7cf-bb505a5573f7') THEN
    RAISE EXCEPTION 'User 213e0be7-e3d2-4508-a7cf-bb505a5573f7 not found. '
      'Please sign up first and replace the uploaded_by UUID in this file.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- BAYANS  (category: a1000000-0000-0000-0000-000000000001)
-- Source: archive.org — "Durus-e-Zindagi" & "Hanif Dar Archive"
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.content
  (id, title_en, title_ur, description_en, description_ur,
   type, category_id, media_url, duration, file_size,
   is_video, uploaded_by)
VALUES

-- Bayan 1 ─ Sabr aur Meetha Bol (Patience and Kind Speech)
( 'c1000001-0000-0000-0000-000000000001',
  'Patience and Kind Speech',
  'صبر اور میٹھا بول',
  'A beautiful bayan on the virtues of patience and speaking kindly to others.',
  'صبر اور دوسروں سے خوش اخلاقی سے بات کرنے کی فضیلت پر خوبصورت بیان۔',
  'bayan',
  'a1000000-0000-0000-0000-000000000001',
  'https://archive.org/download/durusezindagi/sabraurmeethabol-12-7-09_1.mp3',
  2521, 5041424,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Bayan 2 ─ Achi Namaz (How to Perform Salah Correctly)
( 'c1000001-0000-0000-0000-000000000002',
  'How to Perform Salah Correctly',
  'اچھی نماز',
  'Detailed guidance on performing Salah with proper focus and devotion.',
  'خشوع و خضوع کے ساتھ نماز ادا کرنے کی تفصیلی رہنمائی۔',
  'bayan',
  'a1000000-0000-0000-0000-000000000001',
  'https://archive.org/download/durusezindagi/achinamaz-15-7-09_1.mp3',
  2408, 4815488,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Bayan 3 ─ Insan ki Shakhsiyat (Human Personality in Islam)
( 'c1000001-0000-0000-0000-000000000003',
  'Human Personality in Islam',
  'انسان کی شخصیت',
  'An exploration of Islamic teachings on developing a noble character.',
  'اسلامی تعلیمات کی روشنی میں اعلیٰ کردار بنانے پر گفتگو۔',
  'bayan',
  'a1000000-0000-0000-0000-000000000001',
  'https://archive.org/download/durusezindagi/insaankishakhsiyat-20-7-09_1.mp3',
  2311, 4621232,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Bayan 4 ─ Tableegh Ki Azmat (The Greatness of Dawah)
( 'c1000001-0000-0000-0000-000000000004',
  'The Greatness of Dawah & Tableegh',
  'تبلیغ کی عظمت',
  'The importance and reward of spreading the message of Islam.',
  'اسلام کا پیغام پھیلانے کی اہمیت اور اجر پر بیان۔',
  'bayan',
  'a1000000-0000-0000-0000-000000000001',
  'https://archive.org/download/durusezindagi/tableeghkiazmat-27-7-09.mp3',
  6150, 12299549,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Bayan 5 ─ Hanif Dar QMH-361 (Weekly Islamic Lecture)
( 'c1000001-0000-0000-0000-000000000005',
  'Weekly Islamic Lecture – QMH 361',
  'ہفتہ وار اسلامی بیان – QMH 361',
  'Weekly Islamic lecture from the Hanif Dar Archive covering matters of faith and practice.',
  'ہنیف دار آرکائیو سے ہفتہ وار اسلامی بیان جس میں عقیدہ اور عمل کے مسائل بیان کیے گئے ہیں۔',
  'bayan',
  'a1000000-0000-0000-0000-000000000001',
  'https://archive.org/download/hanifdars15/QMH-361.mp3',
  3694, 14775717,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- ─────────────────────────────────────────────────────────────
-- VIDEO CLIPS  (category: a1000000-0000-0000-0000-000000000002)
-- Source: YouTube (publicly accessible Islamic lectures)
-- ─────────────────────────────────────────────────────────────

-- Video 1 ─ Dr. Israr Ahmed – Quran aur Insaan
( 'c1000002-0000-0000-0000-000000000001',
  'The Quran and Humanity – Dr. Israr Ahmed',
  'قرآن اور انسان – ڈاکٹر اسرار احمد',
  'Dr. Israr Ahmed explains the profound relationship between the Quran and mankind.',
  'ڈاکٹر اسرار احمد قرآن اور انسانیت کے درمیان گہرے تعلق کی وضاحت کرتے ہیں۔',
  'clip',
  'a1000000-0000-0000-0000-000000000002',
  'https://www.youtube.com/watch?v=JlAGFsaqhak',
  NULL, NULL,
  TRUE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Video 2 ─ Maulana Tariq Jameel – Tawbah (Repentance)
( 'c1000002-0000-0000-0000-000000000002',
  'The Path of Repentance – Maulana Tariq Jameel',
  'توبہ کا راستہ – مولانا طارق جمیل',
  'A moving lecture by Maulana Tariq Jameel on seeking forgiveness and turning back to Allah.',
  'مولانا طارق جمیل کا توبہ اور اللہ کی طرف رجوع کرنے پر پُرتاثیر بیان۔',
  'clip',
  'a1000000-0000-0000-0000-000000000002',
  'https://www.youtube.com/watch?v=_dMzRz9H5d8',
  NULL, NULL,
  TRUE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Video 3 ─ Nouman Ali Khan – Understanding the Quran
( 'c1000002-0000-0000-0000-000000000003',
  'Understanding the Quran in Daily Life – Nouman Ali Khan',
  'روزمرہ زندگی میں قرآن کو سمجھنا – نعمان علی خان',
  'Nouman Ali Khan explains practical ways to connect with the Quran in everyday life.',
  'نعمان علی خان روزمرہ زندگی میں قرآن سے جڑنے کے عملی طریقے بیان کرتے ہیں۔',
  'clip',
  'a1000000-0000-0000-0000-000000000002',
  'https://www.youtube.com/watch?v=pPCPXt3WLRg',
  NULL, NULL,
  TRUE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- ─────────────────────────────────────────────────────────────
-- NAZAMS  (category: a1000000-0000-0000-0000-000000000003)
-- Source: archive.org — "Urdu Nasheeds, Nazams, Tarany"
-- ─────────────────────────────────────────────────────────────

-- Nazam 1 ─ Allah Ka Liye Larne Wale
( 'c1000003-0000-0000-0000-000000000001',
  'Those Who Strive in the Way of Allah',
  'اللہ کے لیے لڑنے والے',
  'A spirited Urdu nazam about dedication and sacrifice in the path of Allah.',
  'اللہ کی راہ میں لگن اور قربانی کے بارے میں ایک پُرجوش اردو نظم۔',
  'nazam',
  'a1000000-0000-0000-0000-000000000003',
  'https://archive.org/download/UrduAudioNasheeds/AllahKLieyLarnyWaly.mp3',
  282, NULL,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Nazam 2 ─ Apni Eeman Ki Aabiyari Krain
( 'c1000003-0000-0000-0000-000000000002',
  'Nourish Your Iman',
  'اپنے ایمان کی آبیاری کریں',
  'An inspiring Urdu nazam calling believers to strengthen and nurture their faith.',
  'ایمان کو مضبوط کرنے اور پروان چڑھانے کی دعوت دیتی ایک متاثر کن اردو نظم۔',
  'nazam',
  'a1000000-0000-0000-0000-000000000003',
  'https://archive.org/download/UrduAudioNasheeds/ApnyEemanKiAabyariKrain.mp3',
  409, NULL,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- ─────────────────────────────────────────────────────────────
-- QURAN RECITATIONS  (category: a1000000-0000-0000-0000-000000000004)
-- Source: archive.org — Mishary Rashid Alafasy CD collection
-- ─────────────────────────────────────────────────────────────

-- Quran 1 ─ Surah Al-Fatiha
( 'c1000004-0000-0000-0000-000000000001',
  'Surah Al-Fatiha – Mishary Rashid Alafasy',
  'سورۃ الفاتحہ – مشاری راشد العفاسی',
  'Recitation of Surah Al-Fatiha (The Opening) by Mishary Rashid Alafasy.',
  'مشاری راشد العفاسی کی تلاوتِ سورۃ الفاتحہ (افتتاحی سورت)۔',
  'quran',
  'a1000000-0000-0000-0000-000000000004',
  'https://archive.org/download/Al_Quran_Arabic_Only_Mishary_bin_Rashid_Alafasy_CD_ISO_Image/01%20Al-Fatiha.mp3',
  52, 382465,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Quran 2 ─ Surah Aal-e-Imran
( 'c1000004-0000-0000-0000-000000000002',
  'Surah Aal-e-Imran – Mishary Rashid Alafasy',
  'سورۃ آل عمران – مشاری راشد العفاسی',
  'Full recitation of Surah Aal-e-Imran (The Family of Imran) by Mishary Rashid Alafasy.',
  'مشاری راشد العفاسی کی مکمل تلاوتِ سورۃ آل عمران۔',
  'quran',
  'a1000000-0000-0000-0000-000000000004',
  'https://archive.org/download/Al_Quran_Arabic_Only_Mishary_bin_Rashid_Alafasy_CD_ISO_Image/03%20Aal-E-Imran.mp3',
  4726, 30288307,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- ─────────────────────────────────────────────────────────────
-- HAMD & NAAT  (category: a1000000-0000-0000-0000-000000000005)
-- Source: archive.org — "meray-khawja-pia-tahir" naat collection
-- ─────────────────────────────────────────────────────────────

-- Hamd/Naat 1 ─ Bhar Do Jholi Meri (Owais Qadri)
( 'c1000005-0000-0000-0000-000000000001',
  'Bhar Do Jholi Meri – Owais Raza Qadri',
  'بھر دو جھولی میری – اویس رضا قادری',
  'The beloved naat "Bhar Do Jholi Meri" recited by Owais Raza Qadri, a supplication at the court of the Prophet ﷺ.',
  'اویس رضا قادری کا پُراثر کلام "بھر دو جھولی میری"، درِ نبوی ﷺ پر عرضِ حال۔',
  'hamd_naat',
  'a1000000-0000-0000-0000-000000000005',
  'https://archive.org/download/meray-khawja-pia-tahir/Bhar%20Do%20Jholi%20Meri%20%28Owais%29.mp3',
  529, NULL,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Hamd/Naat 2 ─ Woh Jo Na They To Kuch Bhi Na Tha (Owais Qadri)
( 'c1000005-0000-0000-0000-000000000002',
  'Woh Jo Na They To Kuch Bhi Na Tha – Owais Raza Qadri',
  'وہ جو نہ تھے تو کچھ بھی نہ تھا – اویس رضا قادری',
  'A deeply moving naat in praise of the Prophet Muhammad ﷺ by Owais Raza Qadri.',
  'نبی کریم ﷺ کی مدح میں اویس رضا قادری کا انتہائی پُرسوز کلام۔',
  'hamd_naat',
  'a1000000-0000-0000-0000-000000000005',
  'https://archive.org/download/meray-khawja-pia-tahir/Woh%20Jo%20Na%20They%20ToKuchBhiNaTha%20%28Owais%29.mp3',
  175, NULL,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- ─────────────────────────────────────────────────────────────
-- BOOKS  (category: a1000000-0000-0000-0000-000000000006)
-- Source: archive.org — PDF books
-- ─────────────────────────────────────────────────────────────

-- Book 1 ─ Fazail-e-Amaal (Urdu) by Shaykh Muhammad Zakariyya Kandhelvi
( 'c1000006-0000-0000-0000-000000000001',
  'Fazail-e-Amaal (Virtues of Deeds)',
  'فضائلِ اعمال',
  'The classic collection of virtuous deeds in Islam by Shaykh Muhammad Zakariyya Kandhelvi (r.a), covering Salah, Quran, Dhikr, Tableegh and more.',
  'شیخ محمد زکریا کاندھلوی رحمہ اللہ کی فضائلِ اعمال — نماز، قرآن، ذکر اور تبلیغ کے فضائل پر مشتمل کلاسیک کتاب۔',
  'book',
  'a1000000-0000-0000-0000-000000000006',
  'https://archive.org/download/FazailEAmaalVolume1UrduByShaykhMuhammadZakariyyaKandhelvir.a/Fazail%20e%20Amaal%20Volume%201%20%5BUrdu%5D%20By%20Shaykh%20Muhammad%20Zakariyya%20Kandhelvi%20%28r.a%29.pdf',
  NULL, 55264119,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7'),

-- Book 2 ─ Ihya Uloom-ud-Din (Urdu) by Imam Ghazali
( 'c1000006-0000-0000-0000-000000000002',
  'Ihya Uloom-ud-Din – Revival of the Religious Sciences',
  'احیاء علوم الدین',
  'Imam Al-Ghazali''s masterpiece on reviving the sciences of religion. Urdu translation by Allama Hazarvi.',
  'امام الغزالی کا شاہکار — علومِ دین کو زندہ کرنے پر۔ علامہ حضروی کا اردو ترجمہ۔',
  'book',
  'a1000000-0000-0000-0000-000000000006',
  'https://archive.org/download/IhyaUloom-ud-din-UrduTranslationByAllamaHazarvi/00318_IHYA-UL-ULOOM-UR-1.pdf',
  NULL, 136708261,
  FALSE,
  '213e0be7-e3d2-4508-a7cf-bb505a5573f7');

-- ─────────────────────────────────────────────────────────────
-- Sample TOPICS for the first bayan (Patience & Kind Speech)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.topics
  (content_id, title_en, title_ur, timestamp_seconds, sort_order)
VALUES
  ('c1000001-0000-0000-0000-000000000001', 'Introduction',            'تعارف',                    0,    1),
  ('c1000001-0000-0000-0000-000000000001', 'Meaning of Sabr',         'صبر کا مفہوم',             180,  2),
  ('c1000001-0000-0000-0000-000000000001', 'Quranic verses on Sabr',  'صبر کے بارے قرآنی آیات',  540,  3),
  ('c1000001-0000-0000-0000-000000000001', 'Virtues of Kind Speech',  'میٹھے بول کے فضائل',      1080, 4),
  ('c1000001-0000-0000-0000-000000000001', 'Practical Examples',      'عملی مثالیں',              1800, 5),
  ('c1000001-0000-0000-0000-000000000001', 'Dua & Conclusion',        'دعا اور اختتام',           2300, 6);

-- ─────────────────────────────────────────────────────────────
-- Sample TOPICS for Surah Al-Fatiha recitation
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.topics
  (content_id, title_en, title_ur, timestamp_seconds, sort_order)
VALUES
  ('c1000004-0000-0000-0000-000000000001', 'Bismillah',         'بسم اللہ',      0,  1),
  ('c1000004-0000-0000-0000-000000000001', 'Verse 1-2',         'آیت ۱-۲',       5,  2),
  ('c1000004-0000-0000-0000-000000000001', 'Verse 3-7',         'آیت ۳-۷',       20, 3);
