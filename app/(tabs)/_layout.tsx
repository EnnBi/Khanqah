import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';

import { useAuth } from '../../providers/AuthProvider';
import { useI18n } from '../../providers/I18nProvider';
import { MiniPlayer } from '../../components/MiniPlayer';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  const { user, isAdmin, isEditor } = useAuth();
  const { t } = useI18n();

  const isPrivileged = isAdmin || isEditor;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t('tabs.home') || 'Home' }}
        />
        <Tabs.Screen
          name="library"
          options={{ title: t('tabs.library') || 'Library' }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: t('tabs.collection') || 'Saved',
            href: user ? '/collection' : null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: isPrivileged ? (t('tabs.admin') || 'Admin') : (t('tabs.profile') || 'Profile'),
            href: isPrivileged ? '/admin' : '/profile',
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
