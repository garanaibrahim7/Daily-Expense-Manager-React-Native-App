import { Tabs } from "expo-router";
import { BarChart3, History, Home, Wallet } from "lucide-react-native";
import React from "react";

import { useThemeColor } from '@/hooks/use-theme-color';

export default function TabLayout() {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'surface');
  const borderTopColor = useThemeColor({}, 'textSecondary') + '20'; // Transparent border

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: backgroundColor,
          borderTopWidth: 1,
          borderTopColor: borderTopColor,
          height: 80,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: "Index"
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Note: in Expo Router's deep linking model, navigating to the "params-less" route
            // might be better achieved by explicitly navigating to the route name with merged params nullified
            // But navigation.navigate('transactions', { ... }) works in standard React Navigation context inside Expo
            e.preventDefault();
            navigation.navigate('transactions', { showChart: 'false' }); // Explicitly set false to clear
          },
        })}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
