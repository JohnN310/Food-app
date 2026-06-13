import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, TrendingUp, ShoppingBag, Star } from 'lucide-react-native';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <View className="flex-1 bg-white rounded-3xl p-4 mx-1 border border-gray-100 shadow-sm items-center">
      <View className="w-10 h-10 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: `${color}18` }}>
        <Icon size={20} color={color} />
      </View>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-gray-400 text-xs mt-1 text-center">{label}</Text>
    </View>
  );
}

export default function SellerDashboard() {

  const user = useAppStore(state => state.user);
  // State for our dynamic metrics
  const [activeListingsCount, setActiveListingsCount] = useState<number | string>('—');

  // Real-time listener for Active Listings
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'listings'),
      where('sellerId', '==', user.uid),
      where('status', '==', 'active') // Only count active items
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Instantly updates whenever a listing is added, edited, or deleted
      setActiveListingsCount(snapshot.docs.length);
    }, (error) => {
      console.error("Error fetching dashboard stats:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="flex-row items-center mb-6">
          <View className="w-12 h-12 bg-brandPrimary rounded-2xl items-center justify-center mr-3">
            <Store size={24} color="white" />
          </View>
          <View>
            <Text className="text-gray-400 text-sm font-medium">Seller Portal</Text>
            <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
          </View>
        </View>

        {/* Welcome Banner */}
        <View className="bg-brandPrimary rounded-3xl p-5 mb-6">
          <Text className="text-white text-lg font-bold mb-1">Welcome back! 👋</Text>
          <Text className="text-green-100 text-sm">Your store is active and accepting orders.</Text>
        </View>

        {/* Stat Cards */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-3 ml-1">OVERVIEW</Text>
        <View className="flex-row mb-6">
          <StatCard label="Active Listings" value={activeListingsCount.toString()} icon={ShoppingBag} color="#1B7A49" />
          <StatCard label="This Month" value="—" icon={TrendingUp} color="#F59E0B" />
          <StatCard label="Rating" value="—" icon={Star} color="#8B5CF6" />
        </View>

        {/* Recent Activity Placeholder */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-3 ml-1">RECENT ACTIVITY</Text>
        <View className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm items-center">
          <ShoppingBag size={40} color="#D1FAE5" />
          <Text className="text-gray-900 font-bold text-base mt-3">No recent orders</Text>
          <Text className="text-gray-400 text-sm text-center mt-1">New orders from buyers will appear here.</Text>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}
