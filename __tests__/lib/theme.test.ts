import { lightTheme, darkTheme } from '../../lib/theme';

describe('theme', () => {
  it('light theme primary is deep forest green', () => {
    expect(lightTheme.colors.primary).toBe('#0f2e24');
  });
  it('dark theme primary is gold (leads in dark mode)', () => {
    expect(darkTheme.colors.primary).toBe('#d4a853');
  });
  it('light theme has cream paper background', () => {
    expect(lightTheme.colors.background).toBe('#f7f5f0');
  });
  it('dark theme has deep forest ink background', () => {
    expect(darkTheme.colors.background).toBe('#081a15');
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
