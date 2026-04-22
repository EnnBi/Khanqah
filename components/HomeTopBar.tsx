import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useI18n } from '../providers/I18nProvider';
import { useAuth } from '../providers/AuthProvider';

export function HomeTopBar() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { language, setLanguage } = useI18n();
  const { user, isAdmin, isEditor } = useAuth();
  const showAdmin = !!user && (isAdmin || isEditor);

  const toggleLanguage = () => setLanguage(language === 'ur' ? 'en' : 'ur');

  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.left} onPress={toggleLanguage} activeOpacity={0.7}>
        <Ionicons name="globe-outline" size={16} color={c.text} />
        <Text style={[styles.langText, { color: c.text }]}>
          {language === 'ur' ? 'English' : 'اردو'}
        </Text>
      </TouchableOpacity>
      <View style={styles.right}>
        {showAdmin && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/admin')}
            activeOpacity={0.7}
            accessibilityLabel="Admin"
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
          accessibilityLabel="Profile"
        >
          <Ionicons name="person-outline" size={20} color={c.primary} />
          {user && <View style={[styles.dot, { backgroundColor: c.accent, borderColor: c.surface }]} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
});
