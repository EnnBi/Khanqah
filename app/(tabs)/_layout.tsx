import React from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';

import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useI18n } from '../../providers/I18nProvider';
import { MiniPlayer } from '../../components/MiniPlayer';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { user, isAdmin, isEditor } = useAuth();
  const { t } = useI18n();
  const colors = theme.colors;

  const isPrivileged = isAdmin || isEditor;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'DMSans-Medium',
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home') || 'Home',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tabs.library') || 'Library',
          tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: t('tabs.collection') || 'Collection',
          tabBarIcon: ({ color }) => <TabIcon emoji="❤" color={color} />,
          href: user ? '/collection' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isPrivileged ? (t('tabs.admin') || 'Admin') : (t('tabs.profile') || 'Profile'),
          tabBarIcon: ({ color }) => (
            <TabIcon
              emoji={isPrivileged ? '⚙' : '👤'}
              color={isPrivileged ? colors.gold : color}
            />
          ),
          tabBarActiveTintColor: isPrivileged ? colors.gold : colors.primaryLight,
          href: isPrivileged ? '/admin' : '/profile',
        }}
      />
    </Tabs>
    <MiniPlayer />
    </View>
  );
}
