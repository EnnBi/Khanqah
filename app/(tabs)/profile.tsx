import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';

// ── ProfileItem ────────────────────────────────────────────────────────────

interface ProfileItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}

function ProfileItem({ icon, label, value, onPress }: ProfileItemProps) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[itemStyles.row, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <Text style={itemStyles.icon}>{icon}</Text>
      <Text style={[itemStyles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={itemStyles.right}>
        {value ? (
          <Text style={[itemStyles.value, { color: theme.colors.textSecondary }]}>{value}</Text>
        ) : null}
        <Text style={[itemStyles.chevron, { color: theme.colors.textMuted }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: 18,
    width: 28,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
    marginLeft: 2,
  },
});

// ── Divider ────────────────────────────────────────────────────────────────

function Divider() {
  const { theme } = useTheme();
  return <View style={[dividerStyles.line, { backgroundColor: theme.colors.border }]} />;
}

const dividerStyles = StyleSheet.create({
  line: {
    height: 8,
    marginVertical: 8,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { theme, themePref, setThemePref } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Cycle system → light → dark
  function handleThemeToggle() {
    const cycle: Record<string, string> = { system: 'light', light: 'dark', dark: 'system' };
    setThemePref(cycle[themePref] ?? 'system');
  }

  // Toggle English ↔ Urdu
  function handleLanguageToggle() {
    setLanguage(language === 'en' ? 'ur' : 'en');
  }

  function handleSignOut() {
    Alert.alert(
      t('profile.signOutTitle') || 'Sign Out',
      t('profile.signOutMessage') || 'Are you sure you want to sign out?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('profile.signOut') || 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
    );
  }

  const themeLabel =
    themePref === 'system' ? 'System' : themePref === 'light' ? 'Light' : 'Dark';
  const languageLabel = language === 'en' ? 'English' : 'Urdu';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
        <Text style={styles.headerTitle}>{t('profile.title') || 'Profile'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card or Sign In prompt */}
        {user ? (
          <View style={[styles.userCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.avatar, { borderColor: theme.colors.gold }]}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: theme.colors.text }]}>
                {user.display_name || 'User'}
              </Text>
              <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
                {user.email}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.userCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: theme.colors.text }]}>
                {t('profile.guest') || 'Guest'}
              </Text>
              <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
                Sign in to sync playlists, downloads, and listening progress
              </Text>
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.signInText}>{t('auth.signIn') || 'Sign In'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings Group */}
        <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <ProfileItem
            icon="🌐"
            label={t('profile.language') || 'Language'}
            value={languageLabel}
            onPress={handleLanguageToggle}
          />
          <ProfileItem
            icon="🎨"
            label={t('profile.theme') || 'Theme'}
            value={themeLabel}
            onPress={handleThemeToggle}
          />
          <ProfileItem
            icon="▶"
            label={t('profile.playbackSpeed') || 'Playback Speed'}
            value="1.0x"
          />
          <ProfileItem
            icon="🔔"
            label={t('profile.notifications') || 'Notifications'}
            value={t('profile.on') || 'On'}
          />
          <ProfileItem
            icon="⏱"
            label={t('profile.skipInterval') || 'Skip Interval'}
            value="15s"
          />
        </View>

        <Divider />

        {/* Info Group */}
        <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <ProfileItem
            icon="🏛"
            label={t('profile.aboutKhanqah') || 'About the Khanqah'}
            onPress={() => {}}
          />
          <ProfileItem
            icon="📖"
            label={t('profile.muftiBio') || "Mufti Sahab's Bio"}
            onPress={() => {}}
          />
        </View>

        {/* Sign Out (only if logged in) */}
        {user && (
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: theme.colors.liveRed }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={[styles.signOutText, { color: theme.colors.liveRed }]}>
              {t('profile.signOut') || 'Sign Out'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Version */}
        <Text style={[styles.version, { color: theme.colors.textMuted }]}>v1.0.0</Text>

        <View style={styles.bottomPad} />
      </ScrollView>
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
    paddingTop: 16,
  },
  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
  },
  // Settings / info groups
  group: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Sign out
  signInBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  signInText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
  },
  bottomPad: {
    height: 32,
  },
});
