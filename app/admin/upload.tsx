import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ContentType, Category } from '../../lib/types';
import { type as typeP, font } from '../../lib/typography';

interface ContentTypeOption {
  value: ContentType;
  label: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { value: 'bayan', label: 'Bayan' },
  { value: 'clip', label: 'Clip' },
  { value: 'nazam', label: 'Nazam' },
  { value: 'quran', label: 'Quran' },
  { value: 'hamd_naat', label: 'Hamd & Naat' },
  { value: 'book', label: 'Book' },
];

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export default function UploadContentScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const c = theme.colors;

  // Form state
  const [selectedType, setSelectedType] = useState<ContentType>('bayan');
  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // Category picker state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories when content type changes
  useEffect(() => {
    setSelectedCategory(null);
    async function fetchCategories() {
      setCategoriesLoading(true);
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('type', selectedType)
        .order('sort_order', { ascending: true });
      setCategories(data ?? []);
      setCategoriesLoading(false);
    }
    fetchCategories();
  }, [selectedType]);

  async function handlePublish() {
    if (!titleEn.trim()) {
      Alert.alert('Validation', 'Please enter the English title.');
      return;
    }
    if (!titleUr.trim()) {
      Alert.alert('Validation', 'Please enter the Urdu title.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation', 'Please select a category.');
      return;
    }
    if (!mediaUrl.trim()) {
      Alert.alert('Validation', 'Please enter the media URL.');
      return;
    }

    setSubmitting(true);

    const isVideo = isYouTubeUrl(mediaUrl.trim()) || selectedType === 'clip';

    const { error } = await supabase.from('content').insert({
      title_en: titleEn.trim(),
      title_ur: titleUr.trim(),
      type: selectedType,
      category_id: selectedCategory.id,
      media_url: mediaUrl.trim(),
      thumbnail_url: thumbnailUrl.trim() || null,
      is_video: isVideo,
      duration: selectedType === 'book' ? null : null,
      uploaded_by: user?.id ?? '',
      description_en: null,
      description_ur: null,
      file_size: null,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Content published successfully!', [
      {
        text: 'OK',
        onPress: () => {
          // Reset form
          setSelectedType('bayan');
          setTitleEn('');
          setTitleUr('');
          setSelectedCategory(null);
          setMediaUrl('');
          setThumbnailUrl('');
        },
      },
    ]);
  }

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: c.background },

    // ── Header ───────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backBtn: { paddingRight: 16 },
    backBtnText: {
      fontFamily: font.serif,
      fontSize: 22,
      color: c.primary,
      lineHeight: 26,
    },
    headerSpacer: { flex: 1 },
    headerLabel: {
      ...typeP.label,
      color: c.textMuted,
    },

    // ── Hero ─────────────────────────────────────────────────
    hero: {
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    heroKicker: {
      ...typeP.label,
      color: c.textMuted,
      marginBottom: 8,
    },
    heroTitle: {
      fontFamily: font.serif,
      fontSize: 30,
      color: c.primary,
      letterSpacing: -0.3,
      lineHeight: 36,
    },
    heroTitleItalic: {
      fontFamily: font.serifItalic,
      color: c.primary,
    },

    // ── Form ─────────────────────────────────────────────────
    form: {
      paddingHorizontal: 20,
      paddingBottom: 60,
    },
    sectionLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 12,
      marginTop: 28,
    },

    // Content type pills
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pillLabel: {
      fontFamily: font.sansMedium,
      fontSize: 13,
      letterSpacing: 0.3,
      color: c.text,
    },
    pillLabelActive: {
      color: '#ffffff',
    },

    // Text inputs
    input: {
      backgroundColor: c.surface2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: font.serif,
      fontSize: 16,
      color: c.text,
    },
    inputRtl: {
      textAlign: 'right',
      writingDirection: 'rtl',
      fontFamily: font.urdu,
      fontSize: 18,
    },

    // Category picker row
    categoryPicker: {
      backgroundColor: c.surface2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryPickerText: {
      fontFamily: font.serif,
      fontSize: 16,
      color: c.textMuted,
    },
    categoryPickerTextSelected: {
      color: c.text,
    },
    categoryPickerChevron: {
      fontFamily: font.serif,
      fontSize: 20,
      color: c.textMuted,
    },

    // Thumbnail zone
    thumbnailZone: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
      padding: 16,
      alignItems: 'center',
      backgroundColor: c.surface2,
      marginBottom: 12,
    },
    thumbnailZoneText: {
      fontFamily: font.sans,
      fontSize: 13,
      color: c.textMuted,
      marginBottom: 12,
    },
    thumbnailInput: {
      backgroundColor: c.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: font.serif,
      fontSize: 14,
      color: c.text,
      width: '100%',
    },

    // Publish button
    publishButton: {
      backgroundColor: c.primary,
      borderRadius: 4,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 32,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    publishButtonText: {
      ...typeP.button,
      color: c.accent,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalHandle: {
      width: 36,
      height: 4,
      backgroundColor: c.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: font.serifItalic,
      fontSize: 20,
      color: c.primary,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    categoryItem: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryItemText: {
      fontFamily: font.serif,
      fontSize: 15,
      color: c.text,
    },
    categoryItemSelected: {
      color: c.primary,
      fontFamily: font.serifSemiBold,
    },
    checkmark: {
      fontFamily: font.sansMedium,
      fontSize: 16,
      color: c.primary,
    },
    modalCancelBtn: {
      marginHorizontal: 20,
      marginTop: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 8,
    },
    modalCancelText: {
      fontFamily: font.sansMedium,
      fontSize: 15,
      color: c.textMuted,
    },
    emptyCategoryText: {
      textAlign: 'center',
      fontFamily: font.serif,
      color: c.textMuted,
      fontSize: 14,
      paddingVertical: 24,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Minimal header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerLabel}>UPLOAD</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>NEW CONTENT</Text>
          <Text style={styles.heroTitle}>
            Add a{' '}
            <Text style={styles.heroTitleItalic}>bayan</Text>
          </Text>
        </View>

        <View style={styles.form}>
          {/* Content Type */}
          <Text style={styles.sectionLabel}>CONTENT TYPE</Text>
          <View style={styles.pillsRow}>
            {CONTENT_TYPES.map((ct) => {
              const isActive = selectedType === ct.value;
              return (
                <TouchableOpacity
                  key={ct.value}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => setSelectedType(ct.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title (English) */}
          <Text style={styles.sectionLabel}>TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter English title..."
            placeholderTextColor={c.textMuted}
            value={titleEn}
            onChangeText={setTitleEn}
            returnKeyType="next"
          />

          {/* Title (Urdu) */}
          <View style={{ marginTop: 10 }}>
            <TextInput
              style={[styles.input, styles.inputRtl]}
              placeholder="اردو عنوان درج کریں..."
              placeholderTextColor={c.textMuted}
              value={titleUr}
              onChangeText={setTitleUr}
              textAlign="right"
              returnKeyType="next"
            />
          </View>

          {/* Category */}
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <TouchableOpacity
            style={styles.categoryPicker}
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryPickerText,
                selectedCategory && styles.categoryPickerTextSelected,
              ]}
            >
              {selectedCategory ? selectedCategory.name_en : 'Select category'}
            </Text>
            <Text style={styles.categoryPickerChevron}>›</Text>
          </TouchableOpacity>

          {/* Media URL */}
          <Text style={styles.sectionLabel}>MEDIA URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://archive.org/download/... or YouTube URL"
            placeholderTextColor={c.textMuted}
            value={mediaUrl}
            onChangeText={setMediaUrl}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="next"
          />

          {/* Thumbnail */}
          <Text style={styles.sectionLabel}>THUMBNAIL (OPTIONAL)</Text>
          <View style={styles.thumbnailZone}>
            <Text style={styles.thumbnailZoneText}>Tap to upload or enter URL below</Text>
            <TextInput
              style={styles.thumbnailInput}
              placeholder="https://example.com/thumbnail.jpg"
              placeholderTextColor={c.textMuted}
              value={thumbnailUrl}
              onChangeText={setThumbnailUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Publish Button */}
          <TouchableOpacity
            style={styles.publishButton}
            onPress={handlePublish}
            activeOpacity={0.8}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={c.accent} />
            ) : (
              <Text style={styles.publishButtonText}>PUBLISH CONTENT</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>

            <ScrollView>
              {categoriesLoading ? (
                <ActivityIndicator color={c.primary} style={{ paddingVertical: 24 }} />
              ) : categories.length === 0 ? (
                <Text style={styles.emptyCategoryText}>No categories found for this type.</Text>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.categoryItem}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setCategoryModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryItemText,
                          isSelected && styles.categoryItemSelected,
                        ]}
                      >
                        {cat.name_en}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
