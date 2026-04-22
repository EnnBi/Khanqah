import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export function BrandBanner() {
  return (
    <View style={styles.banner}>
      <View style={[styles.circle, styles.circleA]} pointerEvents="none" />
      <View style={[styles.circle, styles.circleB]} pointerEvents="none" />
      <Image
        source={require('../assets/images/khanqah-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Khanqah Maseeh-ul-Ummah"
      />
      <View style={styles.subtitleRow}>
        <View style={styles.rule} />
        <Text style={styles.ornament}>◆</Text>
        <Text style={styles.subtitle} numberOfLines={1}>Khanqah Maseeh-ul-Ummah</Text>
        <Text style={styles.ornament}>◆</Text>
        <View style={styles.rule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 24,
    paddingHorizontal: 18,
    backgroundColor: '#0f2e24',
    borderRadius: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  circleA: {
    width: 180, height: 180, top: -60, right: -50,
    borderColor: 'rgba(212, 168, 83, 0.18)',
  },
  circleB: {
    width: 130, height: 130, top: -40, right: -30,
    borderColor: 'rgba(212, 168, 83, 0.28)',
  },
  logo: {
    width: 120,
    height: 170,
  },
  subtitleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  rule: {
    width: 18,
    height: 1,
    backgroundColor: '#d4a853',
    opacity: 0.6,
    marginHorizontal: 6,
  },
  ornament: {
    fontSize: 9,
    color: '#d4a853',
    opacity: 0.8,
    marginHorizontal: 2,
  },
  subtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 15,
    color: '#e8c672',
    letterSpacing: 0.2,
    marginHorizontal: 4,
  },
});
