import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useSafeBack } from '../hooks/useSafeBack';

export default function Modal() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const goBack = useSafeBack();

  useEffect(() => {
    if (params.type === 'live') {
      router.replace('/player/live');
    } else if (params.type === 'content' && params.id) {
      router.replace(`/player/${params.id}`);
    } else {
      goBack();
    }
  }, [params.type, params.id]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
