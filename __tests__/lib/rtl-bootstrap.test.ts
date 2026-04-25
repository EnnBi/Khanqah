import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { rtlBootstrap } from '../../lib/rtl-bootstrap';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    removeItem: jest.fn(async (k: string) => { delete store[k]; }),
  };
});

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(),
}));

describe('rtlBootstrap', () => {
  beforeEach(() => {
    (I18nManager as any).isRTL = false;
    (I18nManager.forceRTL as jest.Mock | undefined) = jest.fn() as any;
    (Updates.reloadAsync as jest.Mock).mockClear();
    require('@react-native-async-storage/async-storage').removeItem('app.languagePref');
  });

  it('no-op when stored language matches current direction', async () => {
    (I18nManager as any).isRTL = false;
    require('@react-native-async-storage/async-storage').setItem('app.languagePref', 'en');
    await rtlBootstrap();
    expect(I18nManager.forceRTL).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('forces RTL + reloads when stored=ur but I18nManager LTR', async () => {
    (I18nManager as any).isRTL = false;
    require('@react-native-async-storage/async-storage').setItem('app.languagePref', 'ur');
    await rtlBootstrap();
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    if (Platform.OS !== 'web') {
      expect(Updates.reloadAsync).toHaveBeenCalled();
    }
  });

  it('no-op when nothing stored (defaults to en, current is LTR)', async () => {
    (I18nManager as any).isRTL = false;
    await rtlBootstrap();
    expect(I18nManager.forceRTL).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });
});
