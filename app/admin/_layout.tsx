import { Stack } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';

export default function AdminLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
