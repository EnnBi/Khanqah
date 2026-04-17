import React, { useEffect, useState } from 'react';
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
import {
  installFetchPatch,
  setNetworkErrorCallback,
} from '../services/network-buffer';
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
  // Only redirect logged-in users away from the auth screens.
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
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

  const [fontsLoaded, fontError] = useFonts({
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

  // If fonts error out, still render — text falls back to system fonts.
  const fontsReady = fontsLoaded || !!fontError;

  // Safety net: don't block the app forever on fonts (web font loading can
  // stall in some browsers). If fonts haven't loaded after 3s, proceed anyway.
  const [fontTimeoutElapsed, setFontTimeoutElapsed] = useState(false);
  useEffect(() => {
    if (fontsReady) return;
    const t = setTimeout(() => setFontTimeoutElapsed(true), 3000);
    return () => clearTimeout(t);
  }, [fontsReady]);

  useEffect(() => {
    loadConfig()
      .then(() => {
        initSupabase();
        // Best-effort: propagate version to bug reporter
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
        setConfigError(err.message || 'Failed to load configuration');
      });
  }, []);

  // Install the bug reporter in dev only, once.
  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;
    (async () => {
      try {
        // Primary storage: Supabase (central DB, triage via admin UI).
        const { createSupabaseStorage } = require('../services/bug-reporter-supabase');
        setStorage(createSupabaseStorage());
        if (cancelled) return;

        setRouteProvider(() => currentPathname || '/');

        installConsolePatch();
        installFetchPatch();

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
        setNetworkErrorCallback((entry) => {
          reportBug({
            type: 'auto-network',
            error: {
              message: entry.error ?? `HTTP ${entry.status} ${entry.method} ${entry.url}`,
              source: 'fetch',
            },
          }).catch(() => {});
        });
      } catch (err) {
        // Bug reporter must never break the app
        // eslint-disable-next-line no-console
        console.warn('bug-reporter: install failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (!configLoaded || (!fontsReady && !fontTimeoutElapsed)) {
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
