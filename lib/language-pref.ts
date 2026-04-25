import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'app.languagePref';
export type Language = 'en' | 'ur';

export async function loadStoredLanguage(): Promise<Language> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'ur' ? 'ur' : 'en';
}

export async function saveStoredLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(KEY, lang);
}
