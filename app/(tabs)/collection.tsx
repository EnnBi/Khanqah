import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../hooks/useAuth';
import { usePlaylists, createPlaylist } from '../../hooks/usePlaylists';
import { useDownloads } from '../../hooks/useDownloads';
import { ContentCard } from '../../components/ContentCard';
import { useContinueListening, useHistory } from '../../hooks/useListeningProgress';

// ── Inline sub-components ──────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={sectionHeaderStyles.row}>
      <Text style={[sectionHeaderStyles.title, { color: theme.colors.text }]}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[sectionHeaderStyles.action, { color: theme.colors.primaryLight }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  action: {
    fontSize: 14,
    fontWeight: '500',
  },
});

// ── Empty state card ───────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        emptyStyles.card,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text style={[emptyStyles.text, { color: theme.colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
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
  return (
    <View
      style={[
        playlistCardStyles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[playlistCardStyles.name, { color: theme.colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[playlistCardStyles.count, { color: theme.colors.textMuted }]}>
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </Text>
    </View>
  );
}

const playlistCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  count: {
    fontSize: 13,
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
        <View style={[modalStyles.box, { backgroundColor: theme.colors.surface }]}>
          <Text style={[modalStyles.title, { color: theme.colors.text }]}>New Playlist</Text>
          <TextInput
            style={[
              modalStyles.input,
              { color: theme.colors.text, borderColor: theme.colors.border },
            ]}
            placeholder="Playlist name"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={modalStyles.buttons}>
            <TouchableOpacity onPress={onClose} style={modalStyles.btn} activeOpacity={0.7}>
              <Text style={{ color: theme.colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} style={modalStyles.btn} activeOpacity={0.7}>
              <Text style={{ color: theme.colors.primaryLight, fontWeight: '600' }}>Create</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  btn: {
    paddingVertical: 4,
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
  const remaining = Math.max(0, duration - position);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const remainingText = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View
      style={[
        clStyles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={clStyles.row}>
        <View style={clStyles.info}>
          <Text style={[clStyles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[clStyles.remaining, { color: theme.colors.textMuted }]}>
            {remainingText}
          </Text>
          {/* Progress bar */}
          <View style={[clStyles.barBg, { backgroundColor: theme.colors.border }]}>
            <View style={[clStyles.barFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onPlay} activeOpacity={0.7} style={clStyles.playBtn}>
          <Text style={clStyles.playIcon}>{'▶'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const clStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  remaining: {
    fontSize: 12,
    marginBottom: 8,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C', // gold
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────

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
      Alert.alert('Error', 'Could not create playlist.');
    }
  }

  function onPressNew() {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'New Playlist',
        'Enter a name for your playlist',
        (name) => { if (name?.trim()) handleNewPlaylist(name.trim()); },
        'plain-text',
      );
    } else {
      setShowModal(true);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
        <Text style={styles.headerTitle}>{t('collection.title') || 'My Collection'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Continue Listening */}
        <View style={styles.section}>
          <SectionHeader title={t('collection.continueListening') || 'Continue Listening'} />
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
        </View>

        {/* Playlists */}
        <View style={styles.section}>
          <SectionHeader
            title={t('collection.playlists') || 'Playlists'}
            actionLabel={t('collection.newPlaylist') || '+ New'}
            onAction={onPressNew}
          />
          {playlistsLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primaryLight} />
          ) : playlists.length === 0 ? (
            <EmptyState message={t('collection.noPlaylists') || 'No playlists yet'} />
          ) : (
            playlists.map((pl) => (
              <PlaylistCard key={pl.id} name={pl.name} itemCount={0} />
            ))
          )}
        </View>

        {/* Downloads */}
        <View style={styles.section}>
          <SectionHeader
            title={t('collection.downloads') || 'Downloads'}
            actionLabel={
              downloads.length > 0
                ? `${downloads.length} ${downloads.length === 1 ? 'item' : 'items'} \u2022 ${formatBytes(totalSize)}`
                : undefined
            }
          />
          {downloadsLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primaryLight} />
          ) : downloads.length === 0 ? (
            <EmptyState message={t('collection.noDownloads') || 'No downloads yet'} />
          ) : (
            downloads.map(({ content }) => (
              <ContentCard
                key={content.id}
                content={content}
                onPress={() => {}}
                language={user?.language_pref ?? 'en'}
              />
            ))
          )}
        </View>

        {/* History */}
        <View style={styles.section}>
          <SectionHeader
            title={t('collection.history') || 'History'}
            actionLabel={t('collection.seeAll') || 'See all'}
            onAction={() => {}}
          />
          {historyLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primaryLight} />
          ) : historyItems.length === 0 ? (
            <EmptyState message={t('collection.noHistory') || 'No listening history'} />
          ) : (
            historyItems.map(({ content }) => (
              <ContentCard
                key={content.id}
                content={content}
                onPress={() => router.push(`/player/${content.id}`)}
                language={user?.language_pref ?? 'en'}
              />
            ))
          )}
        </View>

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
  header: {
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  section: {
    marginTop: 20,
  },
  bottomPad: {
    height: 32,
  },
});
