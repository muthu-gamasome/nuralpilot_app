import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import AppNavigator from '@/navigation/AppNavigator';

export default function App() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <SocketProvider>
            <StatusBar barStyle="light-content" backgroundColor="#212227" translucent={false} />
            <AppNavigator />
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1E2025',
  },
});
