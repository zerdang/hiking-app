import { View, Text, StyleSheet } from 'react-native';

export default function IdentifyResultScreen() {
  return (
    <View style={styles.container}>
      <Text>Identify Result screen</Text>
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
