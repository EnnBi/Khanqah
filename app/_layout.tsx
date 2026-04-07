import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { loadConfig } from '../lib/remote-config';
import { initSupabase } from '../lib/supabase';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { I18nProvider } from '../providers/I18nProvider';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { PlayerProvider } from '../providers/PlayerProvider';
import { initNotifications, registerDevice } from '../services/notifications';

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
    </>
  );
}

export default function RootLayout() {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig()
      .then(() => {
        initSupabase();
        setConfigLoaded(true);
      })
      .catch((err) => {
        setConfigError(err.message || 'Failed to load configuration');
      });
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
