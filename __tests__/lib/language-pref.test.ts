import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStoredLanguage, saveStoredLanguage } from '../../lib/language-pref';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    removeItem: jest.fn(async (k: string) => { delete store[k]; }),
  };
});

describe('language-pref', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem('app.languagePref');
  });

  it('returns "en" when nothing stored', async () => {
    expect(await loadStoredLanguage()).toBe('en');
  });

  it('round-trips a saved language', async () => {
    await saveStoredLanguage('ur');
    expect(await loadStoredLanguage()).toBe('ur');
  });

  it('coerces unexpected values to "en"', async () => {
    await AsyncStorage.setItem('app.languagePref', 'fr');
    expect(await loadStoredLanguage()).toBe('en');
  });
});
