import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, Platform, Image, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash visible until we've mounted our own branded
// JS splash. On Android 12+ MIUI doesn't paint the native splash
// window with the configured backgroundColor beyond the status bar,
// so our JS-rendered forest-green splash is the primary brand moment.
SplashScreen.preventAutoHideAsync().catch(() => {});

import { rtlBootstrap } from '../lib/rtl-bootstrap';
import { applyTextDefaults } from '../lib/text-defaults';

// Reapply persisted RTL state on every launch BEFORE any UI renders.
// If a previous toggle saved Urdu but the current process started LTR,
// this triggers Updates.reloadAsync() once so the rest of the app sees
// a consistent direction. Subsequent boots are no-ops.
rtlBootstrap().catch((err) => {
  console.warn('[rtl-bootstrap] failed:', err);
});

// Set the default Text font to JameelNooriNastaleeq when current
// layout is RTL (Urdu), so every <Text> renders in Nastaleeq without
// per-component changes. Synchronous so it runs BEFORE the first render.
applyTextDefaults();

import { loadConfig, getConfig } from '../lib/remote-config';
import { initSupabase } from '../lib/supabase';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { I18nProvider } from '../providers/I18nProvider';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { PlayerProvider } from '../providers/PlayerProvider';
import { initNotifications, registerDevice } from '../services/notifications';

import { BugReporterButton } from '../components/BugReporterButton';

// Bug reporter (dev-only)
import {
  installConsolePatch,
  setErrorCallback,
  setWarnCallback,
} from '../services/log-buffer';
// Network patch intentionally not used — it interferes with Supabase token refresh on web.
// import { installFetchPatch, setNetworkErrorCallback } from '../services/network-buffer';
import {
  setStorage,
  setRouteProvider,
  setAppVersion,
  reportBug,
} from '../services/bug-reporter';

// Tracks current pathname for bug reports. Updated by BugReporterPathnameTracker below.
let currentPathname = '';

function BugReporterPathnameTracker() {
  const pathname = usePathname();
  useEffect(() => {
    currentPathname = pathname ?? '';
  }, [pathname]);
  return null;
}

/**
 * Clear local caches that can get into a bad state (stale auth token,
 * stale remote config) and reload the page/app.
 */
async function clearCachedDataAndReload() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
      window.sessionStorage?.clear();
    }
    if (typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase) {
      try { indexedDB.deleteDatabase('khanqah-bug-reports'); } catch {}
    }
  } catch (err) {
    console.warn('Could not clear storage:', err);
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
  }
}

/** Branded boot splash — full-screen forest green with the Khanqah
 *  logo + subtitle that matches the BrandBanner on the home page.
 *  Shown while config loads; after 8s an escape hatch appears.
 */
function BootLoader() {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const t = setTimeout(() => setStuck(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={bootStyles.root}>
      <Image
        source={require('../assets/images/khanqah-logo.png')}
        style={bootStyles.logo}
        resizeMode="contain"
      />
      <View style={bootStyles.subtitleRow}>
        <View style={bootStyles.rule} />
        <Text style={bootStyles.diamond}>◆</Text>
        <Text style={bootStyles.subtitle}>Khanqah Maseeh-ul-Ummah</Text>
        <Text style={bootStyles.diamond}>◆</Text>
        <View style={bootStyles.rule} />
      </View>
      <ActivityIndicator size="small" color="#d4a853" style={{ marginTop: 48 }} />
      {stuck && (
        <>
          <Text style={bootStyles.stuckText}>Taking longer than usual…</Text>
          <TouchableOpacity onPress={clearCachedDataAndReload} style={bootStyles.reloadBtn}>
            <Text style={bootStyles.reloadBtnText}>Clear Data & Reload</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const bootStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f2e24',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 200,
    height: 280,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    maxWidth: '100%',
  },
  rule: {
    width: 22,
    height: 1,
    backgroundColor: '#d4a853',
    opacity: 0.7,
    marginHorizontal: 8,
  },
  diamond: {
    fontSize: 10,
    color: '#d4a853',
    marginHorizontal: 4,
  },
  subtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 17,
    color: '#e8c672',
    letterSpacing: 0.3,
    marginHorizontal: 4,
  },
  stuckText: {
    color: '#e8c672',
    opacity: 0.7,
    fontSize: 13,
    marginTop: 28,
    textAlign: 'center',
    fontFamily: 'CrimsonPro-Italic',
  },
  reloadBtn: {
    marginTop: 14,
    backgroundColor: '#d4a853',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reloadBtnText: {
    color: '#0f2e24',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },
});

function AuthGate() {
  const { session, user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  // Initialise OneSignal once when the component mounts
  useEffect(() => {
    initNotifications();
  }, []);

  // Register device token in Supabase whenever a user session becomes available
  useEffect(() => {
    if (user?.id) {
      registerDevice(user.id);
    }
  }, [user?.id]);

  // App is public by default — no forced login redirect.
  // Only redirect to tabs after a FRESH sign-in, not on every session detection.
  // If the user is intentionally on the login screen, leave them alone.
  const wasLoading = useRef(loading);
  useEffect(() => {
    if (loading) {
      wasLoading.current = true;
      return;
    }

    // Only redirect if we just finished loading AND they're on an auth screen
    // AND they have a fresh session. Don't fight the user's navigation later.
    const inAuthGroup = segments[0] === '(auth)';
    if (wasLoading.current && session && inAuthGroup) {
      router.replace('/(tabs)');
    }
    wasLoading.current = false;
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

function RootLayoutInner() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <AuthGate />
      <BugReporterPathnameTracker />
      <BugReporterButton />
    </>
  );
}

export default function RootLayout() {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load fonts in the background. Don't block the app — text falls back to
  // system fonts until the real ones load.
  useFonts({
    'NastaleeqUrdu': require('../assets/fonts/JameelNooriNastaleeq.ttf'),
    'CrimsonPro': require('@expo-google-fonts/crimson-pro/400Regular/CrimsonPro_400Regular.ttf'),
    'CrimsonPro-Italic': require('@expo-google-fonts/crimson-pro/400Regular_Italic/CrimsonPro_400Regular_Italic.ttf'),
    'CrimsonPro-Medium': require('@expo-google-fonts/crimson-pro/500Medium/CrimsonPro_500Medium.ttf'),
    'CrimsonPro-SemiBold': require('@expo-google-fonts/crimson-pro/600SemiBold/CrimsonPro_600SemiBold.ttf'),
    'DMSans': require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    'DMSans-Medium': require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    'DMSans-SemiBold': require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
    'DMSans-Bold': require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
  });

  useEffect(() => {
    loadConfig()
      .then(() => {
        initSupabase();
        if (__DEV__) {
          try {
            setAppVersion(getConfig().appVersion || '0.0.0');
          } catch {
            /* config not ready — keeps default */
          }
        }
        setConfigLoaded(true);
      })
      .catch((err) => {
        console.error('[bootstrap] failed:', err);
        setConfigError(err?.message || String(err) || 'Failed to load configuration');
      });
  }, []);

  // Install the bug reporter in dev only, once — AFTER config loads so we
  // don't patch fetch before Supabase's initial calls.
  useEffect(() => {
    if (!__DEV__) return;
    if (!configLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const { createSupabaseStorage } = require('../services/bug-reporter-supabase');
        setStorage(createSupabaseStorage());
        if (cancelled) return;

        setRouteProvider(() => currentPathname || '/');

        // Patch console only — the fetch patch interferes with Supabase's
        // internal retry/refresh paths on web. Network capture is omitted for now.
        installConsolePatch();

        setErrorCallback((message) => {
          reportBug({
            type: 'auto-error',
            error: { message, source: 'console.error' },
          }).catch(() => {});
        });
        setWarnCallback((message) => {
          reportBug({
            type: 'auto-warn',
            error: { message, source: 'console.warn' },
          }).catch(() => {});
        });
      } catch (err) {
        console.warn('bug-reporter: install failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configLoaded]);

  if (configError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b', padding: 24 }}>
        <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          {configError}
        </Text>
        <Text style={{ color: '#71717a', fontSize: 13, marginTop: 8, marginBottom: 20, textAlign: 'center' }}>
          If this keeps happening, try clearing cached data.
        </Text>
        <TouchableOpacity
          onPress={clearCachedDataAndReload}
          style={{
            backgroundColor: '#d4a853',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: '#0f2e24', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>
            Clear Data & Reload
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!configLoaded) {
    return <BootLoader />;
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <PlayerProvider>
            <RootLayoutInner />
          </PlayerProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
