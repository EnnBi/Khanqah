import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ContentType, Category } from '../../lib/types';
import type { MirrorFormat } from '../../lib/types';
import { type as typeP, font } from '../../lib/typography';
import { isYouTubeUrl, isDirectVideoUrl } from '../../components/YouTubeEmbed';
import { showMessage } from '../../lib/alert';

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

export default function UploadContentScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
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

  const [mirrorFormat, setMirrorFormat] = useState<MirrorFormat>('audio');

  // Derive whether the pasted media URL is a YouTube link
  const isYouTube = isYouTubeUrl(mediaUrl.trim());

  // Default the toggle whenever the content type changes so clips prefer Video
  // and everything else prefers Audio. Users can still override.
  useEffect(() => {
    setMirrorFormat(selectedType === 'clip' ? 'video' : 'audio');
  }, [selectedType]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);

  // Edit mode: loading state
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Fetch existing content when in edit mode
  useEffect(() => {
    if (!editId) return;
    async function fetchContent() {
      setLoadingEdit(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', editId)
        .single();
      if (error || !data) {
        showMessage('Error', 'Could not load content for editing.');
        setLoadingEdit(false);
        return;
      }
      setSelectedType(data.type as ContentType);
      setTitleEn(data.title_en ?? '');
      setTitleUr(data.title_ur ?? '');
      setMediaUrl(data.media_url ?? '');
      setThumbnailUrl(data.thumbnail_url ?? '');
      // category will be resolved once categories load
      setPendingCategoryId(data.category_id ?? null);
      setLoadingEdit(false);
    }
    fetchContent();
  }, [editId]);

  // Holds the category_id to match after categories are loaded in edit mode
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);

  // Fetch categories when content type changes
  useEffect(() => {
    // Only reset selected category when the type changes outside of the initial edit load
    if (!pendingCategoryId) {
      setSelectedCategory(null);
    }
    async function fetchCategories() {
      setCategoriesLoading(true);
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('type', selectedType)
        .order('sort_order', { ascending: true });
      const loaded = data ?? [];
      setCategories(loaded);
      // Resolve pending category from edit mode
      if (pendingCategoryId) {
        const match = loaded.find((cat) => cat.id === pendingCategoryId);
        if (match) setSelectedCategory(match);
        setPendingCategoryId(null);
      } else if (loaded.length >= 1) {
        // Default to the first category so the admin doesn't have to pick
        // one when there's only one sensible option for this type.
        setSelectedCategory(loaded[0]);
      }
      setCategoriesLoading(false);
    }
    fetchCategories();
  }, [selectedType]);

  async function handlePublish() {
    if (!titleEn.trim()) {
      showMessage('Validation', 'Please enter the English title.');
      return;
    }
    if (!titleUr.trim()) {
      showMessage('Validation', 'Please enter the Urdu title.');
      return;
    }
    if (!selectedCategory) {
      showMessage('Validation', 'Please select a category.');
      return;
    }
    if (!mediaUrl.trim()) {
      showMessage('Validation', 'Please enter the media URL.');
      return;
    }

    setSubmitting(true);

    const isYouTubeSubmit = isYouTubeUrl(mediaUrl.trim());

    let error;

    if (editId) {
      const isVideo =
        isYouTubeSubmit ||
        isDirectVideoUrl(mediaUrl.trim()) ||
        selectedType === 'clip';
      ({ error } = await supabase.from('content').update({
        title_en: titleEn.trim(),
        title_ur: titleUr.trim(),
        type: selectedType,
        category_id: selectedCategory.id,
        media_url: mediaUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        is_video: isVideo,
      }).eq('id', editId));
    } else {
      const payload: Record<string, any> = {
        title_en: titleEn.trim(),
        title_ur: titleUr.trim(),
        type: selectedType,
        category_id: selectedCategory.id,
        thumbnail_url: thumbnailUrl.trim() || null,
        description_en: null,
        description_ur: null,
        duration: null,
        file_size: null,
        uploaded_by: user?.id ?? '',
      };

      if (isYouTubeSubmit) {
        payload.media_url         = '';
        payload.mirror_source_url = mediaUrl.trim();
        payload.mirror_status     = 'pending';
        payload.mirror_format     = mirrorFormat;
        payload.is_video          = mirrorFormat === 'video';
      } else {
        payload.media_url         = mediaUrl.trim();
        payload.mirror_status     = 'not_applicable';
        // Detect video from the file extension first (.mp4/.mov/etc.);
        // fall back to the content-type convention for URL shapes we
        // can't sniff (e.g. bare archive.org HLS manifests).
        payload.is_video          =
          isDirectVideoUrl(mediaUrl.trim()) || selectedType === 'clip';
      }

      ({ error } = await supabase.from('content').insert(payload));
    }

    setSubmitting(false);

    if (error) {
      showMessage('Error', error.message);
      return;
    }

    // Navigate directly on success — Alert.alert buttons don't fire their
    // onPress reliably on React Native Web, so an alert-gated callback is
    // an invisible-cliff UX. For YouTube mirrors, jump to manage-content
    // so the admin can watch the QUEUED → MIRRORING → READY chip live.
    if (editId) {
      router.back();
    } else if (isYouTubeSubmit) {
      router.replace('/admin/manage-content');
    } else {
      router.replace('/admin/manage-content');
    }
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
      color: c.onPrimary,
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

    // Format toggle (YouTube mirror)
    formatToggleRow: {
      marginTop: 20,
      gap: 8,
    },
    formatLabel: {
      fontFamily: 'DMSans-Medium',
      fontSize: 10,
      letterSpacing: 1.5,
      color: '#8a7d66',
    },
    formatPills: {
      flexDirection: 'row',
      gap: 8,
    },
    formatPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 100,
      borderWidth: 1,
    },
    formatPillLabel: {
      fontFamily: 'DMSans-SemiBold',
      fontSize: 11,
      letterSpacing: 1,
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
          <Text style={styles.headerLabel}>{editId ? 'EDIT' : 'UPLOAD'}</Text>
        </View>

        {/* Hero */}
        {loadingEdit ? (
          <View style={[styles.hero, { alignItems: 'center' }]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>{editId ? 'EDIT CONTENT' : 'NEW CONTENT'}</Text>
            <Text style={styles.heroTitle}>
              {editId ? 'Edit ' : 'Add a '}
              <Text style={styles.heroTitleItalic}>bayan</Text>
            </Text>
          </View>
        )}

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

          {/* Category — only shown when there are sub-categories to choose
              from. For a single category the content-type pill already covers
              it and we auto-select on fetch. */}
          {categories.length > 1 && (
            <>
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
            </>
          )}

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

          {isYouTube && (
            <View style={styles.formatToggleRow}>
              <Text style={styles.formatLabel}>SAVE AS</Text>
              <View style={styles.formatPills}>
                {(['audio', 'video'] as MirrorFormat[]).map((f) => {
                  const isActive = mirrorFormat === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setMirrorFormat(f)}
                      style={[
                        styles.formatPill,
                        { borderColor: c.border, backgroundColor: isActive ? c.primary : 'transparent' },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.formatPillLabel,
                          { color: isActive ? c.onPrimary : c.textMuted },
                        ]}
                      >
                        {f.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

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
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={styles.publishButtonText}>{editId ? 'UPDATE CONTENT' : 'PUBLISH CONTENT'}</Text>
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
