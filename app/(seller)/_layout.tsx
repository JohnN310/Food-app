import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Package, Settings, ShoppingBag } from 'lucide-react-native';
import { View, Platform, Text } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';

function TabBarIcon({ Icon, color, focused, badgeCount }: { Icon: any; color: string; focused: boolean; badgeCount?: number }) {
  return (
    <View className={`items-center justify-center rounded-full w-12 h-12 relative ${focused ? 'bg-brandPrimary-soft' : ''}`}>
      <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View className="absolute top-1 right-0 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center border border-white px-0.5">
          <Text className="text-[9px] text-white font-bold text-center">{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function SellerLayout() {
  const user = useAppStore(state => state.user);
  const [listingsCount, setListingsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const qListings = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
    const unsubListings = onSnapshot(qListings, (snapshot) => {
      const activeOrHidden = snapshot.docs.filter(d => {
        const status = d.data().status;
        return status === 'active' || status === 'hidden';
      });
      setListingsCount(activeOrHidden.length);
    });

    const qOrders = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const pending = snapshot.docs.filter(d => {
        const status = d.data().status;
        return status === 'ordered' || status === 'ready';
      });
      setOrdersCount(pending.length);
    });

    return () => {
      unsubListings();
      unsubOrders();
    };
  }, [user]);
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
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={Package} color={color} focused={focused} badgeCount={listingsCount} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={ShoppingBag} color={color} focused={focused} badgeCount={ordersCount} />,
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
