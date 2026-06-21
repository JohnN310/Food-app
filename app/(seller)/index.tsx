import { CheckCircle, QrCode, ShoppingBag, Star, Store, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/lib/firebaseLib';
import { moderateScale, scale, verticalScale } from '@/lib/responsive';
import { useAppStore } from '@/store/app-store';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <View style={{ padding: scale(16), marginHorizontal: scale(4), borderRadius: scale(24) }} className="flex-1 bg-white border border-gray-100 shadow-sm items-center">
      <View style={{ width: scale(40), height: scale(40), borderRadius: scale(16), marginBottom: verticalScale(8), backgroundColor: `${color}18` }} className="items-center justify-center">
        <Icon size={scale(20)} color={color} />
      </View>
      <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">{value}</Text>
      <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(4) }} className="text-gray-400 text-center">{label}</Text>
    </View>
  );
}

export default function SellerDashboard() {

  const user = useAppStore(state => state.user);
  // State for our dynamic metrics
  const [activeListingsCount, setActiveListingsCount] = useState<number | string>('—');
  const [averageRating, setAverageRating] = useState<string>('—');
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

    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.averageRating) {
          setAverageRating(data.averageRating.toString());
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeOrders();
      unsubscribeUser();
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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: scale(16), paddingTop: verticalScale(24) }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ marginBottom: verticalScale(24) }} className="flex-row items-center">
          <View style={{ width: scale(48), height: scale(48), borderRadius: scale(16), marginRight: scale(12) }} className="bg-brandPrimary items-center justify-center">
            <Store size={scale(24)} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: moderateScale(13) }} className="text-gray-400 font-medium">Seller Portal</Text>
            <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">Dashboard</Text>
          </View>
        </View>

        {/* Welcome Banner */}
        <View style={{ padding: scale(20), marginBottom: verticalScale(24), borderRadius: scale(24) }} className="bg-brandPrimary">
          <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(4) }} className="text-white font-bold">Welcome back! 👋</Text>
          <Text style={{ fontSize: moderateScale(13) }} className="text-green-100">Your store is active and accepting orders.</Text>
        </View>

        {/* Stat Cards */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(12), marginLeft: scale(4), letterSpacing: 0.5 }} className="font-bold text-gray-400 tracking-wider">OVERVIEW</Text>
        <View style={{ marginBottom: verticalScale(24) }} className="flex-row">
          <StatCard label="Active Listings" value={activeListingsCount.toString()} icon={ShoppingBag} color="#1B7A49" />
          <StatCard label="This Month" value="—" icon={TrendingUp} color="#F59E0B" />
          <StatCard label="Rating" value={averageRating} icon={Star} color="#8B5CF6" />
        </View>

        {/* Recent Activity */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(12), marginLeft: scale(4), letterSpacing: 0.5 }} className="font-bold text-gray-400 tracking-wider">RECENT ACTIVITY</Text>

        {orders.length === 0 ? (
          <View style={{ padding: scale(24), marginBottom: verticalScale(24), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm items-center">
            <ShoppingBag size={scale(40)} color="#D1FAE5" />
            <Text style={{ fontSize: moderateScale(15), marginTop: verticalScale(12) }} className="text-gray-900 font-bold">No recent orders</Text>
            <Text style={{ fontSize: moderateScale(13), marginTop: verticalScale(4) }} className="text-gray-400 text-center">New orders from buyers will appear here.</Text>
          </View>
        ) : (
          <View style={{ marginBottom: verticalScale(24) }}>
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
                <View key={order.id} style={{ padding: scale(16), marginBottom: verticalScale(16), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm">
                  <View style={{ marginBottom: verticalScale(16) }} className="flex-row items-start">
                    <View style={{ width: scale(68), height: scale(68), borderRadius: scale(16), marginRight: scale(12) }} className="bg-gray-100 overflow-hidden">
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={{ width: scale(68), height: scale(68) }} />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <ShoppingBag size={scale(24)} color="#9CA3AF" />
                        </View>
                      )}
                    </View>
                    <View style={{ paddingTop: verticalScale(4) }} className="flex-1">
                      <Text style={{ fontSize: moderateScale(17), marginBottom: verticalScale(4) }} className="font-bold text-gray-900">{item.title}</Text>
                      <Text style={{ fontSize: moderateScale(10), marginBottom: verticalScale(8) }} className="text-gray-500" numberOfLines={2}>
                        Order #{order.id.substring(0, 8).toUpperCase()}
                      </Text>
                      <View style={{ paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(9999) }} className={`${badgeBg} self-start`}>
                        <Text style={{ fontSize: moderateScale(10) }} className={`${badgeTextCol} font-bold`}>{statusText}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions for Seller */}
                  {isOrdered && (
                    <Pressable
                      onPress={() => handleUpdateOrderStatus(order.id, 'ready')}
                      style={{ paddingVertical: verticalScale(10), borderRadius: scale(12) }}
                      className="bg-brandPrimary flex-row items-center justify-center w-full"
                    >
                      <QrCode size={scale(16)} color="white" style={{ marginRight: scale(6) }} />
                      <Text style={{ fontSize: moderateScale(13) }} className="text-white font-bold">Mark as Ready for Pickup</Text>
                    </Pressable>
                  )}
                  {isReady && (
                    <Pressable
                      onPress={() => handleUpdateOrderStatus(order.id, 'completed')}
                      style={{ paddingVertical: verticalScale(10), borderRadius: scale(12) }}
                      className="bg-brandPrimary flex-row items-center justify-center w-full"
                    >
                      <CheckCircle size={scale(16)} color="white" style={{ marginRight: scale(6) }} />
                      <Text style={{ fontSize: moderateScale(13) }} className="text-white font-bold">Mark as Completed</Text>
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
