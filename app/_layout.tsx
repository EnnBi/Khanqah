import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

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
    console.log('[bootstrap] loadConfig starting…');
    loadConfig()
      .then((cfg) => {
        console.log('[bootstrap] loadConfig resolved:', cfg.supabaseUrl ? 'OK' : 'EMPTY');
        try {
          initSupabase();
          console.log('[bootstrap] initSupabase OK');
        } catch (e) {
          console.error('[bootstrap] initSupabase threw:', e);
          throw e;
        }
        if (__DEV__) {
          try {
            setAppVersion(getConfig().appVersion || '0.0.0');
          } catch {
            /* config not ready — keeps default */
          }
        }
        setConfigLoaded(true);
        console.log('[bootstrap] configLoaded = true');
      })
      .catch((err) => {
        console.error('[bootstrap] bootstrap failed:', err);
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
        <Text style={{ color: '#71717a', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
          Please check your internet connection and restart the app.
        </Text>
      </View>
    );
  }

  if (!configLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator size="large" color="#047857" />
      </View>
    );
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
