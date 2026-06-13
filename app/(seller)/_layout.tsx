import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Package, Settings } from 'lucide-react-native';
import { View, Platform } from 'react-native';

function TabBarIcon({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) {
  return (
    <View className={`items-center justify-center rounded-full w-12 h-12 ${focused ? 'bg-brandPrimary-soft' : ''}`}>
      <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

export default function SellerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B7A49',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FAFAF5',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 4,
          fontFamily: 'Inter-Medium',
        },
        tabBarShowLabel: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={LayoutDashboard} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={Package} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={Settings} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
