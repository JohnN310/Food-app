import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, TrendingUp, ShoppingBag, Star, QrCode, CheckCircle } from 'lucide-react-native';

import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
  const [orders, setOrders] = useState<any[]>([]);

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

    // Real-time listener for Orders
    const qOrders = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid)
    );

    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort newest first
      ordersData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(ordersData);
    });

    return () => {
      unsubscribe();
      unsubscribeOrders();
    };
  }, [user?.uid]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      Alert.alert("Success", `Order marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating order:", error);
      Alert.alert("Error", "Could not update order status.");
    }
  };

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

        {/* Recent Activity */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-3 ml-1">RECENT ACTIVITY</Text>
        
        {orders.length === 0 ? (
          <View className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm items-center">
            <ShoppingBag size={40} color="#D1FAE5" />
            <Text className="text-gray-900 font-bold text-base mt-3">No recent orders</Text>
            <Text className="text-gray-400 text-sm text-center mt-1">New orders from buyers will appear here.</Text>
          </View>
        ) : (
          <View className="mb-6">
            {orders.map((order) => {
              const item = order.itemData || {};
              const isOrdered = order.status === 'ordered';
              const isReady = order.status === 'ready';
              const isCompleted = order.status === 'completed';
              const isCancelled = order.status === 'cancelled';

              const badgeBg = isCompleted ? 'bg-[#E1F0E8]' : isCancelled ? 'bg-gray-100' : isReady ? 'bg-[#E1F0E8]' : isOrdered ? 'bg-orange-50' : 'bg-gray-100';
              const badgeTextCol = isCompleted ? 'text-brandPrimary' : isCancelled ? 'text-gray-500' : isReady ? 'text-brandPrimary' : isOrdered ? 'text-orange-600' : 'text-gray-500';
              const statusText = isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : isReady ? 'Ready for pickup' : isOrdered ? 'Ordered' : 'Unknown';

              return (
                <View key={order.id} className="bg-white rounded-[24px] border border-gray-100 p-4 shadow-sm mb-4">
                  <View className="flex-row items-start mb-4">
                    <View className="w-[68px] h-[68px] bg-gray-100 rounded-[16px] overflow-hidden mr-3">
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={{ width: 68, height: 68 }} />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <ShoppingBag size={24} color="#9CA3AF" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 pt-1">
                      <Text className="font-bold text-gray-900 text-[17px] mb-1">{item.title}</Text>
                      <Text className="text-gray-500 text-[11px] mb-2" numberOfLines={2}>
                        Order #{order.id.substring(0, 8).toUpperCase()}
                      </Text>
                      <View className={`${badgeBg} self-start px-2.5 py-1 rounded-full`}>
                        <Text className={`${badgeTextCol} text-[10px] font-bold`}>{statusText}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions for Seller */}
                  {isOrdered && (
                    <Pressable 
                      onPress={() => handleUpdateOrderStatus(order.id, 'ready')}
                      className="bg-brandPrimary py-3 rounded-xl items-center flex-row justify-center mt-2"
                    >
                      <QrCode size={16} color="white" className="mr-2" />
                      <Text className="text-white font-bold text-sm">Mark as Ready for Pickup</Text>
                    </Pressable>
                  )}
                  {isReady && (
                    <Pressable 
                      onPress={() => handleUpdateOrderStatus(order.id, 'completed')}
                      className="bg-[#1B7A49] py-3 rounded-xl items-center flex-row justify-center mt-2"
                    >
                      <CheckCircle size={16} color="white" className="mr-2" />
                      <Text className="text-white font-bold text-sm">Mark as Completed</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}


      </ScrollView>
    </SafeAreaView>
  );
}
