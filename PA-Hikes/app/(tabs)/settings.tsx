import { View, Text, Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { usePackState } from '@/hooks/use-pack-state';

export default function SettingsScreen() {
  const { resetPackState } = usePackState();

  const handleReset = async () => {
    await resetPackState();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Settings</Text>
      <Button title="[DEBUG] Reset pack state → onboarding" onPress={handleReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
});
