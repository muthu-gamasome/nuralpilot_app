import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import FleetOverviewScreen from '@/screens/FleetOverviewScreen';
import AddRobotScreen from '@/screens/AddRobotScreen';
import { Colors } from '@/lib/colors';

export type RootStackParamList = {
  Login: undefined;
  FleetOverview: undefined;
  AddRobot: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.sidebar,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="FleetOverview" component={FleetOverviewScreen} />
            <Stack.Screen name="AddRobot" component={AddRobotScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
