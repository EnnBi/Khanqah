import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../hooks/useAuth';
import { usePlaylists, createPlaylist } from '../../hooks/usePlaylists';

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

// ── Main Screen ────────────────────────────────────────────────────────────

export default function CollectionScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { playlists, loading: playlistsLoading, refetch: refetchPlaylists } = usePlaylists();
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
          <EmptyState message={t('collection.nothingPlaying') || 'Nothing playing yet'} />
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
          <SectionHeader title={t('collection.downloads') || 'Downloads'} />
          <EmptyState message={t('collection.noDownloads') || 'No downloads yet'} />
        </View>

        {/* History */}
        <View style={styles.section}>
          <SectionHeader
            title={t('collection.history') || 'History'}
            actionLabel={t('collection.seeAll') || 'See all'}
            onAction={() => {}}
          />
          <EmptyState message={t('collection.noHistory') || 'No listening history'} />
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
