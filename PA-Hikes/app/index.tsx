import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { usePackState } from '@/hooks/use-pack-state';

export default function Index() {
  const { packState } = usePackState();

  if (packState === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (packState === 'ready') {
    return <Redirect href="/(tabs)/identify" />;
  }

  return <Redirect href="/onboarding" />;
}
