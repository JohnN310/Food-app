import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Home, Search, Map, ShoppingBag, User } from 'lucide-react-native';
import { View, Platform } from 'react-native';

function TabBarIcon({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) {
  return (
    <View className={`items-center justify-center rounded-full w-12 h-12 ${focused ? 'bg-brandPrimary-soft' : ''}`}>
      <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B7A49', // Brand Green
        tabBarInactiveTintColor: '#9CA3AF', // Gray-400
        tabBarStyle: {
          backgroundColor: '#FAFAF5',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 0, // Removes shadow on Android
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 4,
          fontFamily: 'Inter-Medium', // we can swap later if font is different
        },
        tabBarShowLabel: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={Home} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={Map} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={ShoppingBag} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={User} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
