import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';

type IconName = React.ComponentProps<typeof Feather>['name'];

// Map tab route names → icon + label config
const TAB_CONFIG: Record<string, { icon: IconName; iconActive?: IconName; label: string }> = {
  index:      { icon: 'home',     label: 'Home' },
  library:    { icon: 'grid',     label: 'Library' },
  collection: { icon: 'bookmark', label: 'Saved' },
  profile:    { icon: 'user',     label: 'Profile' },
};

// Admin tab uses a different icon
const ADMIN_CONFIG = { icon: 'sliders' as IconName, label: 'Admin' };

export function CustomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: c.surface,
          borderTopColor: c.hairline,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {/* Hairline gold accent at top */}
      <View style={[styles.topAccent, { backgroundColor: c.accent }]} />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Skip hidden routes (href === null means hidden from tab bar)
          if ((options as any).href === null) return null;

          const config = TAB_CONFIG[route.name] ?? { icon: 'circle' as IconName, label: route.name };

          // Profile tab becomes Admin for privileged users (detect by title override)
          const title = (options.title as string) || config.label;
          const isAdminTab = route.name === 'profile' && title.toLowerCase().includes('admin');
          const iconName = isAdminTab ? ADMIN_CONFIG.icon : config.icon;
          const displayLabel = isAdminTab ? ADMIN_CONFIG.label : config.label;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const activeColor = isAdminTab ? c.accent : c.primary;
          const inactiveColor = c.textMuted;
          const color = isFocused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              {/* Active indicator dot */}
              {isFocused && (
                <View style={[styles.activeDot, { backgroundColor: c.accent }]} />
              )}

              <View style={styles.iconWrap}>
                <Feather name={iconName} size={20} color={color} strokeWidth={isFocused ? 2 : 1.6} />
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color,
                    fontFamily: isFocused ? 'DMSans-SemiBold' : 'DMSans-Medium',
                  },
                ]}
                numberOfLines={1}
              >
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 8,
    // Subtle shadow lifting the bar
    shadowColor: '#0f2e24',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: '40%',
    right: '40%',
    height: 2,
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  iconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
