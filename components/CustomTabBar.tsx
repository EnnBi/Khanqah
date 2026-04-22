import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  bayanaat: 'mic-outline',
  clips: 'play-circle-outline',
  ashaar: 'musical-notes-outline',
  books: 'book-outline',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  bayanaat: 'Bayanaat',
  clips: 'Clips',
  ashaar: 'Ashaar',
  books: 'Books',
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const order = ['index', 'bayanaat', 'clips', 'ashaar', 'books'];
  const visible = state.routes
    .map((r) => ({ route: r, index: state.routes.indexOf(r) }))
    .filter(({ route }) => order.includes(route.name))
    .sort((a, b) => order.indexOf(a.route.name) - order.indexOf(b.route.name));

  return (
    <View style={[styles.wrap, { bottom: 12 + insets.bottom / 2 }]} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: c.primary }]}>
        {visible.map(({ route, index }) => {
          const focused = state.index === index;
          const color = focused ? c.accent : 'rgba(247,245,240,0.55)';
          const icon = ICONS[route.name] || 'ellipse-outline';
          const label = LABELS[route.name] || route.name;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              }}
              style={styles.tab}
              activeOpacity={0.8}
            >
              <Ionicons name={icon} size={20} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 28,
    gap: 2,
    shadowColor: '#0f2e24',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    minWidth: 320,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 22,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    marginTop: 2,
  },
});
