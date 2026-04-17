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
  const c = theme.colors;
  return (
    <TouchableOpacity
      style={[itemStyles.row, { borderBottomColor: c.hairline }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <Text style={[itemStyles.icon, { color: c.textMuted }]}>{icon}</Text>
      <Text style={[itemStyles.label, { color: c.text }]}>{label}</Text>
      <View style={itemStyles.right}>
        {value ? (
          <Text style={[itemStyles.value, { color: c.accent }]}>{value.toUpperCase()}</Text>
        ) : null}
        <Text style={[itemStyles.chevron, { color: c.textMuted }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: 16,
    width: 28,
  },
  label: {
    flex: 1,
    fontFamily: 'CrimsonPro',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
    marginLeft: 2,
  },
});

// ── Section label ──────────────────────────────────────────────────────────

interface SettingsSectionProps {
  counter: string;
  tag: string;
  subtitle: string;
}

function SettingsSection({ counter, tag, subtitle }: SettingsSectionProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={sectionStyles.wrap}>
      <Text style={[sectionStyles.label, { color: c.textMuted }]}>
        {counter} · {tag}
      </Text>
      <Text style={[sectionStyles.subtitle, { color: c.primary }]}>{subtitle}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 12,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { theme, themePref, setThemePref } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const c = theme.colors;

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

  // Derive user initial for avatar
  const initial = user?.display_name
    ? user.display_name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'G';

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

          <Text style={[styles.kicker, { color: c.accent }]}>YOUR ACCOUNT</Text>

          <Text style={styles.heroTitle}>
            Profile{' '}
            <Text style={[styles.heroTitleItalic, { color: c.accent }]}>{'& settings'}</Text>
          </Text>
        </View>

        {/* User card or sign-in prompt */}
        {user ? (
          <View style={[styles.userCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={[styles.avatarInitial, { color: c.onPrimary }]}>{initial}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: c.text }]}>
                {user.display_name || 'User'}
              </Text>
              <Text style={[styles.email, { color: c.textMuted }]}>{user.email}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.userCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={[styles.avatarInitial, { color: c.onPrimary }]}>G</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: c.text }]}>
                {t('profile.guest') || 'Guest'}
              </Text>
              <Text style={[styles.email, { color: c.textMuted }]}>
                Sign in to sync playlists, downloads, and progress
              </Text>
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: c.accent }]}
                onPress={() => {
                  console.log('[profile] navigating to /login');
                  router.push('/login' as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.signInText, { color: '#0f2e24' }]}>
                  {t('auth.signIn') || 'SIGN IN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Preferences group */}
        <SettingsSection counter="01" tag="PREFERENCES" subtitle="Personalise your experience" />
        <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ProfileItem
            icon="✦"
            label={t('profile.language') || 'Language'}
            value={languageLabel}
            onPress={handleLanguageToggle}
          />
          <ProfileItem
            icon="◐"
            label={t('profile.theme') || 'Appearance'}
            value={themeLabel}
            onPress={handleThemeToggle}
          />
          <ProfileItem
            icon="♪"
            label={t('profile.playbackSpeed') || 'Playback Speed'}
            value="1.0×"
          />
          <ProfileItem
            icon="⌖"
            label={t('profile.notifications') || 'Notifications'}
            value={t('profile.on') || 'On'}
          />
          <ProfileItem
            icon="⏭"
            label={t('profile.skipInterval') || 'Skip Interval'}
            value="15s"
          />
        </View>

        {/* About group */}
        <SettingsSection counter="02" tag="ABOUT" subtitle="The khanqah & its teacher" />
        <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ProfileItem
            icon="⌘"
            label={t('profile.aboutKhanqah') || 'About the Khanqah'}
            onPress={() => {}}
          />
          <ProfileItem
            icon="⊕"
            label={t('profile.muftiBio') || "Hazrat Mufti Abdur Rasheed Miftahi Sahab"}
            onPress={() => {}}
          />
        </View>

        {/* Sign Out */}
        {user && (
          <>
            <View style={styles.signOutWrap}>
              <TouchableOpacity
                style={[styles.signOutBtn, { borderColor: c.liveRed }]}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Text style={[styles.signOutText, { color: c.liveRed }]}>
                  {t('profile.signOut') || 'SIGN OUT'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Version */}
        <Text style={[styles.version, { color: c.textMuted }]}>v1.0.0</Text>

        <View style={styles.bottomPad} />
      </ScrollView>
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

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 28,
    marginTop: 24,
    marginBottom: 4,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: 'CrimsonPro-SemiBold',
    fontSize: 22,
    lineHeight: 26,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontFamily: 'CrimsonPro-SemiBold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  email: {
    fontFamily: 'DMSans',
    fontSize: 12,
    letterSpacing: 0.2,
    lineHeight: 17,
  },

  // Sign in button (guest state)
  signInBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  signInText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Settings / info groups
  group: {
    marginHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Sign out
  signOutWrap: {
    marginHorizontal: 28,
    marginTop: 28,
  },
  signOutBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Version
  version: {
    fontFamily: 'DMSans',
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 20,
  },
  bottomPad: {
    height: 80,
  },
});
