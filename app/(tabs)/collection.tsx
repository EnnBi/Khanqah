import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../hooks/useAuth';
import { usePlaylists, createPlaylist } from '../../hooks/usePlaylists';
import { useDownloads } from '../../hooks/useDownloads';
import { ContentCard } from '../../components/ContentCard';
import { useContinueListening, useHistory } from '../../hooks/useListeningProgress';
import { isBookContent } from '../../lib/types';
import { showMessage } from '../../lib/alert';

// ── Section header (Calm Architecture style) ──────────────────────────────

interface SectionHeaderProps {
  counter: string;  // e.g. "01"
  tag: string;      // e.g. "CONTINUE"
  subtitle: string; // e.g. "Recent bayans"
  actionLabel?: string;
  onAction?: () => void;
}

function SectionHeader({ counter, tag, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={sectionHeaderStyles.wrap}>
      <View style={sectionHeaderStyles.labelRow}>
        <Text style={[sectionHeaderStyles.label, { color: c.textMuted }]}>
          {counter} · {tag}
        </Text>
        {actionLabel ? (
          <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
            <Text style={[sectionHeaderStyles.action, { color: c.accent }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[sectionHeaderStyles.subtitle, { color: c.primary }]}>{subtitle}</Text>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  action: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
});

// ── Empty state ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        emptyStyles.card,
        { borderColor: c.border, backgroundColor: c.surface },
      ]}
    >
      <Text style={[emptyStyles.text, { color: c.textMuted }]}>{message}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  card: {
    marginHorizontal: 28,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 15,
    textAlign: 'center',
  },
});

// ── Playlist card ──────────────────────────────────────────────────────────

interface PlaylistCardProps {
  name: string;
  itemCount: number;
}

function PlaylistCard({ name, itemCount }: PlaylistCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        playlistCardStyles.card,
        { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <View style={[playlistCardStyles.icon, { backgroundColor: c.primary }]}>
        <Text style={playlistCardStyles.iconGlyph}>♪</Text>
      </View>
      <View style={playlistCardStyles.info}>
        <Text style={[playlistCardStyles.name, { color: c.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[playlistCardStyles.count, { color: c.textMuted }]}>
          {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
        </Text>
      </View>
      <Text style={[playlistCardStyles.chevron, { color: c.textMuted }]}>›</Text>
    </View>
  );
}

const playlistCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 28,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    color: '#d4a853',
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'CrimsonPro',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  count: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
  },
});

// ── New Playlist button ────────────────────────────────────────────────────

interface NewPlaylistButtonProps {
  onPress: () => void;
}

function NewPlaylistButton({ onPress }: NewPlaylistButtonProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <TouchableOpacity
      style={[newBtnStyles.btn, { borderColor: c.accent }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[newBtnStyles.label, { color: c.accent }]}>+ NEW PLAYLIST</Text>
    </TouchableOpacity>
  );
}

const newBtnStyles = StyleSheet.create({
  btn: {
    marginHorizontal: 28,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

// ── New Playlist Modal (Android / web fallback) ────────────────────────────

interface NewPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

function NewPlaylistModal({ visible, onClose, onCreate }: NewPlaylistModalProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState('');

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.box, { backgroundColor: c.surface }]}>
          <Text style={[modalStyles.title, { color: c.text }]}>New Playlist</Text>
          <TextInput
            style={[
              modalStyles.input,
              { color: c.text, borderColor: c.border },
            ]}
            placeholder="Playlist name"
            placeholderTextColor={c.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={modalStyles.buttons}>
            <TouchableOpacity onPress={onClose} style={modalStyles.btn} activeOpacity={0.7}>
              <Text style={[modalStyles.btnText, { color: c.textMuted }]}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} style={modalStyles.btn} activeOpacity={0.7}>
              <Text style={[modalStyles.btnText, { color: c.accent }]}>CREATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  box: {
    width: '100%',
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontFamily: 'CrimsonPro',
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  input: {
    fontFamily: 'DMSans',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  btn: {
    paddingVertical: 4,
  },
  btnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

// ── Continue Listening card ────────────────────────────────────────────────

interface ContinueListeningCardProps {
  title: string;
  position: number;
  duration: number;
  onPlay: () => void;
}

function ContinueListeningCard({ title, position, duration, onPlay }: ContinueListeningCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const remaining = Math.max(0, duration - position);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const remainingText = `${minutes}:${seconds.toString().padStart(2, '0')} REMAINING`;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View
      style={[
        clStyles.card,
        { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <View style={clStyles.row}>
        <View style={clStyles.info}>
          <Text style={[clStyles.title, { color: c.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[clStyles.remaining, { color: c.textMuted }]}>
            {remainingText}
          </Text>
          {/* Progress bar */}
          <View style={[clStyles.barBg, { backgroundColor: c.border }]}>
            <View style={[clStyles.barFill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onPlay} activeOpacity={0.7} style={[clStyles.playBtn, { backgroundColor: c.accent }]}>
          <Text style={clStyles.playIcon}>{'▶'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const clStyles = StyleSheet.create({
  card: {
    marginHorizontal: 28,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 14,
  },
  title: {
    fontFamily: 'CrimsonPro',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  remaining: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  barBg: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#0f2e24',
    fontSize: 14,
    marginLeft: 2,
  },
});

// ── Download item ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function CollectionScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const c = theme.colors;
  const { playlists, loading: playlistsLoading, refetch: refetchPlaylists } = usePlaylists();
  const { downloads, loading: downloadsLoading, totalSize } = useDownloads();
  const continueListening = useContinueListening();
  const { items: historyItems, loading: historyLoading } = useHistory(20);
  const [showModal, setShowModal] = useState(false);

  async function handleNewPlaylist(name: string) {
    setShowModal(false);
    if (!user?.id) return;
    try {
      await createPlaylist(user.id, name);
      refetchPlaylists();
    } catch (e) {
      showMessage('Error', 'Could not create playlist.');
    }
  }

  function onPressNew() {
    // Always use the inline modal — Alert.prompt is iOS-only and the
    // modal already exists, so we keep the code path consistent.
    setShowModal(true);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: c.headerBg }]}>
          <View style={[styles.circleA, { borderColor: 'rgba(212, 168, 83, 0.2)' }]} />
          <View style={[styles.circleB, { borderColor: 'rgba(212, 168, 83, 0.15)' }]} />
          <View style={[styles.circleC, { borderColor: 'rgba(212, 168, 83, 0.08)' }]} />

          <Text style={[styles.kicker, { color: c.accent }]}>MY LIBRARY</Text>

          <Text style={styles.heroTitle}>
            Your curated{' '}
            <Text style={[styles.heroTitleItalic, { color: c.accent }]}>journey</Text>
          </Text>
        </View>

        {/* Continue Listening */}
        <SectionHeader
          counter="01"
          tag="CONTINUE"
          subtitle={t('collection.continueListening') || 'Resume listening'}
        />
        {continueListening ? (
          <ContinueListeningCard
            title={
              user?.language_pref === 'ur'
                ? continueListening.content.title_ur
                : continueListening.content.title_en
            }
            position={continueListening.position}
            duration={continueListening.duration}
            onPlay={() => router.push(`/player/${continueListening.content.id}`)}
          />
        ) : (
          <EmptyState message={t('collection.nothingPlaying') || 'Nothing playing yet'} />
        )}

        {/* Playlists */}
        <SectionHeader
          counter="02"
          tag="PLAYLISTS"
          subtitle={t('collection.playlists') || 'Your playlists'}
        />
        {playlistsLoading ? (
          <ActivityIndicator style={styles.loader} color={c.accent} />
        ) : playlists.length === 0 ? (
          <EmptyState message={t('collection.noPlaylists') || 'No playlists yet'} />
        ) : (
          playlists.map((pl) => (
            <PlaylistCard key={pl.id} name={pl.name} itemCount={0} />
          ))
        )}
        <NewPlaylistButton onPress={onPressNew} />

        {/* Downloads */}
        <SectionHeader
          counter="03"
          tag="DOWNLOADS"
          subtitle={
            downloads.length > 0
              ? `${downloads.length} saved · ${formatBytes(totalSize)}`
              : (t('collection.downloads') || 'Offline content')
          }
        />
        {downloadsLoading ? (
          <ActivityIndicator style={styles.loader} color={c.accent} />
        ) : downloads.length === 0 ? (
          <EmptyState message={t('collection.noDownloads') || 'No downloads yet'} />
        ) : (
          downloads.map(({ content }) => (
            <ContentCard
              key={content.id}
              content={content}
              onPress={() =>
                isBookContent(content)
                  ? router.push(`/book/${content.id}`)
                  : router.push(`/player/${content.id}`)
              }
              language={user?.language_pref ?? 'en'}
            />
          ))
        )}

        {/* History */}
        <SectionHeader
          counter="04"
          tag="HISTORY"
          subtitle={t('collection.history') || 'Recently heard'}
        />
        {historyLoading ? (
          <ActivityIndicator style={styles.loader} color={c.accent} />
        ) : historyItems.length === 0 ? (
          <EmptyState message={t('collection.noHistory') || 'No listening history'} />
        ) : (
          historyItems.map(({ content }) => (
            <ContentCard
              key={content.id}
              content={content}
              onPress={() =>
                isBookContent(content)
                  ? router.push(`/book/${content.id}`)
                  : router.push(`/player/${content.id}`)
              }
              language={user?.language_pref ?? 'en'}
            />
          ))
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Android / web new-playlist modal */}
      <NewPlaylistModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleNewPlaylist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Hero
  hero: {
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  circleA: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
  },
  circleB: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
  },
  circleC: {
    position: 'absolute',
    top: 10,
    right: 30,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
  },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  heroTitle: {
    fontFamily: 'CrimsonPro',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: '#f7f5f0',
  },
  heroTitleItalic: {
    fontFamily: 'CrimsonPro-Italic',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  loader: {
    marginVertical: 16,
    marginHorizontal: 28,
  },
  bottomPad: {
    height: 80,
  },
});
