import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { LiveSession } from '../lib/types';
import { BilingualText } from './BilingualText';

interface LiveBannerProps {
  session: LiveSession;
  onPress: () => void;
}

export function LiveBanner({ session, onPress }: LiveBannerProps) {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const bgColor = theme.dark ? '#7f1d1d' : '#fef2f2';

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <View style={styles.left}>
        <View style={styles.liveLabel}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>LIVE NOW</Text>
        </View>
        <BilingualText
          en={session.title_en}
          ur={session.title_ur}
          style={[styles.title, { color: theme.dark ? '#fecaca' : '#991b1b' }]}
          numberOfLines={2}
        />
      </View>
      <TouchableOpacity
        style={styles.joinBtn}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.joinText}>Join</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 14,
  },
  left: {
    flex: 1,
  },
  liveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  joinBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginLeft: 12,
  },
  joinText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
