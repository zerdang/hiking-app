import { View, Text, StyleSheet } from 'react-native';

export default function LogScreen() {
  return (
    <View style={styles.container}>
      <Text>Log screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});