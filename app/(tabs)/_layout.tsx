import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useI18n } from '../../providers/I18nProvider';
import { MiniPlayer } from '../../components/MiniPlayer';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  const { t } = useI18n();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home') || 'Home' }} />
        <Tabs.Screen name="bayanaat" options={{ title: 'Bayanaat' }} />
        <Tabs.Screen name="clips" options={{ title: 'Clips' }} />
        <Tabs.Screen name="ashaar" options={{ title: 'Ashaar' }} />
        <Tabs.Screen name="books" options={{ title: 'Books' }} />
        <Tabs.Screen name="library" options={{ href: null }} />
        <Tabs.Screen name="collection" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
