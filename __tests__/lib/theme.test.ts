import { lightTheme, darkTheme } from '../../lib/theme';

describe('theme', () => {
  it('light theme has correct primary color', () => {
    expect(lightTheme.colors.primary).toBe('#047857');
  });
  it('dark theme has correct primary color', () => {
    expect(darkTheme.colors.primary).toBe('#047857');
  });
  it('light theme has white-ish background', () => {
    expect(lightTheme.colors.background).toBe('#fafafa');
  });
  it('dark theme has dark background', () => {
    expect(darkTheme.colors.background).toBe('#09090b');
  });
  it('both themes have all required color keys', () => {
    const requiredKeys = [
      'primary', 'primaryLight', 'primaryDark', 'gold', 'liveRed',
      'background', 'surface', 'surface2', 'surface3',
      'text', 'textSecondary', 'textMuted', 'border',
    ];
    for (const key of requiredKeys) {
      expect(lightTheme.colors).toHaveProperty(key);
      expect(darkTheme.colors).toHaveProperty(key);
    }
  });
});
