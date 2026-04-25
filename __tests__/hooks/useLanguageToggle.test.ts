import { Alert, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { renderHook, act } from '@testing-library/react-native';
import { useLanguageToggle } from '../../hooks/useLanguageToggle';
import { loadStoredLanguage } from '../../lib/language-pref';

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

interface UpdateChain {
  update: jest.Mock<UpdateChain>;
  eq: jest.Mock<Promise<{ error: null }>>;
}

const mockUpdateChain: UpdateChain = {
  update: jest.fn((): UpdateChain => mockUpdateChain),
  eq: jest.fn((): Promise<{ error: null }> => Promise.resolve({ error: null })),
};

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockUpdateChain),
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
  },
}));

describe('useLanguageToggle', () => {
  beforeEach(() => {
    (I18nManager as any).isRTL = false;
    (I18nManager.forceRTL as jest.Mock | undefined) = jest.fn() as any;
    (Updates.reloadAsync as jest.Mock).mockClear();
    mockUpdateChain.update.mockClear();
    mockUpdateChain.eq.mockClear();
  });

  it('persists pref to AsyncStorage even if user cancels', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const cancel = buttons?.[0];
      if (cancel?.onPress) cancel.onPress();
    });
    const { result } = renderHook(() => useLanguageToggle());
    await act(async () => { await result.current('ur'); });
    expect(await loadStoredLanguage()).toBe('ur');
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('forces RTL + reloads on confirm', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const confirm = buttons?.[buttons.length - 1];
      if (confirm?.onPress) confirm.onPress();
    });
    const { result } = renderHook(() => useLanguageToggle());
    await act(async () => { await result.current('ur'); });
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    if (Platform.OS !== 'web') {
      expect(Updates.reloadAsync).toHaveBeenCalled();
    }
  });

  it('writes language_pref to Supabase users when signed in', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const confirm = buttons?.[buttons.length - 1];
      if (confirm?.onPress) confirm.onPress();
    });
    const { result } = renderHook(() => useLanguageToggle());
    await act(async () => { await result.current('ur'); });
    expect(mockUpdateChain.update).toHaveBeenCalledWith({ language_pref: 'ur' });
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
