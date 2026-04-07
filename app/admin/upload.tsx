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

interface ContentTypeOption {
  value: ContentType;
  label: string;
  emoji: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { value: 'bayan', label: 'Bayan', emoji: '🎙' },
  { value: 'clip', label: 'Clip', emoji: '🎥' },
  { value: 'nazam', label: 'Nazam', emoji: '🎶' },
  { value: 'quran', label: 'Quran', emoji: '📖' },
  { value: 'hamd_naat', label: 'Hamd & Naat', emoji: '🙌' },
  { value: 'book', label: 'Book', emoji: '📕' },
];

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export default function UploadContentScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const colors = theme.colors;

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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      gap: 12,
    },
    backButton: {
      padding: 4,
      marginRight: 4,
    },
    backButtonText: {
      fontSize: 22,
      color: colors.primary,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    adminBadge: {
      backgroundColor: colors.gold,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    adminBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 1,
    },
    form: {
      paddingHorizontal: 20,
      paddingBottom: 60,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 24,
    },
    // Content type pills
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillEmoji: {
      fontSize: 14,
    },
    pillLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    pillLabelActive: {
      color: '#ffffff',
    },
    // Text inputs
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    inputRtl: {
      textAlign: 'right',
    },
    // Category picker
    categoryPicker: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryPickerText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    categoryPickerTextSelected: {
      color: colors.text,
    },
    categoryPickerChevron: {
      fontSize: 18,
      color: colors.textMuted,
    },
    // Thumbnail upload zone
    thumbnailZone: {
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    thumbnailIcon: {
      fontSize: 28,
      marginBottom: 6,
    },
    thumbnailZoneText: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 10,
    },
    thumbnailInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.text,
      width: '100%',
    },
    // Publish button
    publishButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 32,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    publishButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    categoryItem: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryItemText: {
      fontSize: 15,
      color: colors.text,
    },
    categoryItemSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    checkmark: {
      fontSize: 16,
      color: colors.primary,
    },
    modalCancelBtn: {
      marginHorizontal: 20,
      marginTop: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    emptyCategoryText: {
      textAlign: 'center',
      color: colors.textMuted,
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('admin.upload') || 'Upload'}</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Content Type */}
          <Text style={styles.sectionLabel}>{t('admin.contentType') || 'Content Type'}</Text>
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
                  <Text style={styles.pillEmoji}>{ct.emoji}</Text>
                  <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title (English) */}
          <Text style={styles.sectionLabel}>{t('admin.titleEn') || 'Title (English)'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter title..."
            placeholderTextColor={colors.textMuted}
            value={titleEn}
            onChangeText={setTitleEn}
            returnKeyType="next"
          />

          {/* Title (Urdu) */}
          <Text style={styles.sectionLabel}>{t('admin.titleUr') || 'Title (Urdu)'}</Text>
          <TextInput
            style={[styles.input, styles.inputRtl]}
            placeholder="عنوان درج کریں..."
            placeholderTextColor={colors.textMuted}
            value={titleUr}
            onChangeText={setTitleUr}
            textAlign="right"
            returnKeyType="next"
          />

          {/* Category */}
          <Text style={styles.sectionLabel}>{t('admin.category') || 'Category'}</Text>
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
          <Text style={styles.sectionLabel}>{t('admin.mediaUrl') || 'Media URL'}</Text>
          <TextInput
            style={styles.input}
            placeholder="https://archive.org/download/... or YouTube URL"
            placeholderTextColor={colors.textMuted}
            value={mediaUrl}
            onChangeText={setMediaUrl}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="next"
          />

          {/* Thumbnail */}
          <Text style={styles.sectionLabel}>{t('admin.thumbnail') || 'Thumbnail (optional)'}</Text>
          <View style={styles.thumbnailZone}>
            <Text style={styles.thumbnailIcon}>📷</Text>
            <Text style={styles.thumbnailZoneText}>Tap to upload (or enter URL below)</Text>
            <TextInput
              style={styles.thumbnailInput}
              placeholder="https://example.com/thumbnail.jpg"
              placeholderTextColor={colors.textMuted}
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
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.publishButtonText}>
                {t('admin.publishContent') || 'Publish Content'}
              </Text>
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
                <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
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
