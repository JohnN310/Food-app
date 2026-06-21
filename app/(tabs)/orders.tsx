import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { ChevronRight, ShoppingBag, Store, Clock, CheckCircle, XCircle, Bell, MessageSquare, QrCode, CalendarPlus, Star, Navigation } from 'lucide-react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { openDirections } from '@/lib/utils';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

const TABS = [
  { id: 'all', label: 'All Orders', icon: ShoppingBag },
  { id: 'ordered', label: 'Ordered', icon: Clock },
  { id: 'ready', label: 'Ready for pickup', icon: ShoppingBag },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
];

export default function OrdersScreen() {
  const router = useRouter();
  const orders = useAppStore(state => state.orders) || [];
  const unreadMessagesCount = useAppStore(state => state.unreadMessagesCount);
  const [activeTab, setActiveTab] = useState('all');
  const [draftRatings, setDraftRatings] = useState<Record<string, number>>({});

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'ordered') return order.status === 'ordered';
    if (activeTab === 'ready') return order.status === 'ready';
    if (activeTab === 'completed') return order.status === 'completed';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return true;
  }).sort((a, b) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });

  const handleCancelOrder = (orderId: string) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This cannot be undone.",
      [
        { text: "No, keep it", style: "cancel" },
        { 
          text: "Yes, cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              if (orderId) {
                await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
              }
            } catch (error) {
              console.error("Error cancelling order:", error);
              Alert.alert("Error", "Could not cancel the order. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: scale(20), paddingTop: verticalScale(16), paddingBottom: verticalScale(20) }}>
        <View className="flex-row justify-between items-start mb-1">
          <Text style={{ fontSize: moderateScale(28) }} className="font-extrabold text-gray-900 tracking-tight">My Orders</Text>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={{ width: scale(40), height: scale(40), marginTop: verticalScale(4) }}
            className="bg-white rounded-full items-center justify-center relative shadow-sm border border-gray-100"
          >
            <Bell size={scale(20)} color="#374151" />
            {unreadMessagesCount > 0 && (
              <View style={{ width: scale(16), height: scale(16), top: verticalScale(-4), right: scale(-4) }} className="absolute bg-red-500 rounded-full border-2 border-white items-center justify-center">
                <Text style={{ fontSize: moderateScale(10) }} className="text-white font-bold">{unreadMessagesCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Text style={{ fontSize: moderateScale(15) }} className="text-gray-500 font-medium">Track and manage all your orders</Text>
      </View>

      {/* Tabs / Filter Chips */}
      {orders.length > 0 && (
        <View style={{ paddingHorizontal: scale(20), marginBottom: verticalScale(20) }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible" contentContainerStyle={{ paddingRight: scale(20) }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(14), marginRight: scale(12) }}
                  className={`flex-row items-center border shadow-sm ${
                    isActive 
                      ? 'bg-[#F1F8F4] border-[#1B7A49]/20' 
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <Icon size={scale(16)} color={isActive ? "#1B7A49" : "#6B7280"} />
                  <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className={`font-bold ${isActive ? 'text-brandPrimary' : 'text-gray-600'}`}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView style={{ paddingHorizontal: scale(20) }} className="flex-1" showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={{ paddingTop: verticalScale(80) }} className="items-center justify-center">
            <View style={{ width: scale(96), height: scale(96), marginBottom: verticalScale(24) }} className="bg-[#F1F8F4] rounded-full items-center justify-center">
              <ShoppingBag size={scale(40)} color="#1B7A49" />
            </View>
            <Text style={{ fontSize: moderateScale(20), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">No active orders</Text>
            <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(32), paddingHorizontal: scale(16) }} className="text-gray-500 text-center leading-relaxed">
              When you reserve food from nearby stores, your active and past orders will appear here.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              style={{ paddingHorizontal: scale(32), paddingVertical: verticalScale(16) }}
              className="bg-brandPrimary rounded-full shadow-md shadow-brandPrimary/30 active:opacity-90"
            >
              <Text style={{ fontSize: moderateScale(16) }} className="text-white font-bold">Start Exploring</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: verticalScale(20), paddingBottom: verticalScale(32) }}>
            {filteredOrders.map((order, idx) => {
              const item = order.itemData || {};
              const isCompleted = order.status === 'completed';
              const isReady = order.status === 'ready';
              const isOrdered = order.status === 'ordered';
              const isCancelled = order.status === 'cancelled';

              // Logic for display based on design
              const badgeBg = isCompleted ? 'bg-[#E1F0E8]' : isCancelled ? 'bg-gray-100' : isReady ? 'bg-[#E1F0E8]' : isOrdered ? 'bg-orange-50' : 'bg-gray-100';
              const badgeTextCol = isCompleted ? 'text-brandPrimary' : isCancelled ? 'text-gray-500' : isReady ? 'text-brandPrimary' : isOrdered ? 'text-orange-600' : 'text-gray-500';
              const statusText = isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : isReady ? 'Ready for pickup' : isOrdered ? 'Ordered' : 'Unknown';

              const orderDate = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
              const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              return (
                <Pressable
                  key={order.id || idx}
                  onPress={() => router.push(`/order/${order.id}` as any)}
                  style={{ borderRadius: scale(24), padding: scale(16) }}
                  className="bg-white border border-gray-100 shadow-sm active:opacity-90"
                >
                  {/* Header Row */}
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
                    <View style={{ paddingRight: scale(8), paddingTop: verticalScale(4) }} className="flex-1">
                      <Text style={{ fontSize: moderateScale(17), marginBottom: verticalScale(4) }} className="font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                      <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(6) }} className="text-gray-500" numberOfLines={2}>{item.description || 'No description provided'}</Text>
                      <View className="flex-row items-center">
                        <Clock size={scale(12)} color="#6B7280" />
                        <Text style={{ fontSize: moderateScale(11), marginLeft: scale(6) }} className="text-gray-500 font-medium">{item.time || 'Time not provided'}</Text>
                      </View>
                    </View>
                    <View style={{ paddingTop: verticalScale(4) }} className="items-end">
                      <View style={{ marginBottom: verticalScale(8) }} className="flex-row items-center">
                        {(order.quantity && order.quantity > 1) && (
                          <View style={{ paddingHorizontal: scale(10), paddingVertical: verticalScale(4), marginRight: scale(8) }} className="bg-gray-100 rounded-full border border-gray-200">
                            <Text style={{ fontSize: moderateScale(10) }} className="text-gray-600 font-bold">Qty: {order.quantity}</Text>
                          </View>
                        )}
                        <View style={{ paddingHorizontal: scale(10), paddingVertical: verticalScale(4) }} className={`${badgeBg} rounded-full`}>
                          <Text style={{ fontSize: moderateScale(10) }} className={`${badgeTextCol} font-bold`}>{statusText}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: moderateScale(10), marginBottom: verticalScale(6) }} className="text-gray-400 font-medium">
                        Order #{order.id ? order.id.substring(0, 8).toUpperCase() : 'N/A'}
                      </Text>
                      <View className="flex-row items-center">
                        <Text style={{ fontSize: moderateScale(17), marginRight: scale(4) }} className="font-bold text-brandPrimary">
                          ${(parseFloat((item.price || '$0').replace('$', '')) * (order.quantity || 1)).toFixed(2)}
                        </Text>
                        <ChevronRight size={scale(16)} color="#9CA3AF" />
                      </View>
                    </View>
                  </View>
                  
                  {/* Inner Card Content Row */}
                  <View style={{ padding: scale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="bg-[#FAFAF5] flex-row items-center border border-gray-50">
                    <View style={{ width: scale(40), height: scale(40), marginRight: scale(12) }} className="bg-white rounded-full items-center justify-center shadow-sm border border-gray-100">
                      <Store size={scale(20)} color="#1B7A49" />
                    </View>
                    <View style={{ paddingRight: scale(8) }} className="flex-1">
                      <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(2) }} className="font-bold text-gray-900" numberOfLines={1}>{order.sellerData?.storeName || item.store}</Text>
                      <Text style={{ fontSize: moderateScale(11) }} className="text-gray-500 leading-tight" numberOfLines={2}>
                        {order.sellerData?.storeAddress || 'Address not provided'}
                      </Text>
                    </View>
                  </View>

                  {/* Footer Action Area */}
                  {isCompleted ? (
                    <View style={{ paddingHorizontal: scale(4) }} className="flex-col">
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontSize: moderateScale(13) }} className="font-bold text-gray-800">
                          {order.rating ? 'Your rating' : 'Rate this order'}
                        </Text>
                        <View className="flex-row items-center ml-auto">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const currentRating = order.rating || (order.id ? draftRatings[order.id] : 0) || 0;
                            return (
                              <Pressable 
                                key={s} 
                                onPress={() => {
                                  if (order.id && !order.rating) setDraftRatings(prev => ({ ...prev, [order.id]: s }));
                                }}
                                disabled={!!order.rating}
                                style={{ padding: scale(4) }}
                              >
                                <Star 
                                  size={scale(18)} 
                                  color={currentRating >= s ? "#1B7A49" : "#D1D5DB"} 
                                  fill={currentRating >= s ? "#1B7A49" : "transparent"} 
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                      {order.id && draftRatings[order.id] > 0 && !order.rating && (
                        <View style={{ marginTop: verticalScale(12), marginBottom: verticalScale(4), paddingTop: verticalScale(12), gap: scale(8) }} className="flex-row items-center justify-between border-t border-gray-50">
                          <Pressable 
                            onPress={() => {
                              if (order.id) {
                                const newDrafts = { ...draftRatings };
                                delete newDrafts[order.id];
                                setDraftRatings(newDrafts);
                              }
                            }}
                            style={{ paddingVertical: verticalScale(12), borderRadius: scale(12) }}
                            className="flex-1 items-center justify-center bg-gray-100"
                          >
                            <Text style={{ fontSize: moderateScale(12) }} className="text-gray-600 font-bold">Cancel</Text>
                          </Pressable>
                          <Pressable 
                            onPress={async () => {
                              if (order.id) {
                                try {
                                  const ratingVal = draftRatings[order.id];
                                  await updateDoc(doc(db, 'orders', order.id), { rating: ratingVal });
                                  
                                  try {
                                    if (order.sellerId) {
                                      const sellerRef = doc(db, 'users', order.sellerId);
                                      const sellerDoc = await getDoc(sellerRef);
                                      if (sellerDoc.exists()) {
                                        const data = sellerDoc.data();
                                        const currentCount = data.ratingCount || 0;
                                        const currentSum = data.ratingSum || 0;
                                        await updateDoc(sellerRef, {
                                          ratingCount: currentCount + 1,
                                          ratingSum: currentSum + ratingVal,
                                          averageRating: ((currentSum + ratingVal) / (currentCount + 1)).toFixed(1)
                                        });
                                      }
                                    }
                                  } catch (sellerUpdateError) {
                                    console.log("Could not update seller average rating (likely Firebase rules):", sellerUpdateError);
                                  }

                                  const newDrafts = { ...draftRatings };
                                  delete newDrafts[order.id];
                                  setDraftRatings(newDrafts);
                                  Alert.alert("Success", "Thank you for your feedback!");
                                } catch (e) {
                                  Alert.alert("Error", "Failed to submit rating.");
                                }
                              }
                            }}
                            style={{ paddingVertical: verticalScale(12), borderRadius: scale(12) }}
                            className="flex-1 items-center justify-center bg-[#1B7A49]"
                          >
                            <Text style={{ fontSize: moderateScale(12) }} className="text-white font-bold">Confirm</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ) : isCancelled ? (
                    <View style={{ paddingHorizontal: scale(4) }} className="flex-row items-center justify-between">
                      <Text style={{ fontSize: moderateScale(13) }} className="font-bold text-gray-500">Order Cancelled</Text>
                    </View>
                  ) : (
                    <View className="flex-row justify-between">
                      <Pressable 
                        onPress={() => router.push(`/chat/${order.id}` as any)}
                        style={{ paddingVertical: verticalScale(12), paddingHorizontal: scale(8), borderRadius: scale(12), marginRight: scale(12) }}
                        className="flex-1 flex-row items-center justify-center border border-gray-200 bg-white"
                      >
                        <View className="relative">
                          <MessageSquare size={scale(16)} color="#4B5563" />
                          {order.hasUnreadBuyer && (
                            <View style={{ width: scale(10), height: scale(10), top: verticalScale(-4), right: scale(-4) }} className="absolute bg-red-500 rounded-full border border-white" />
                          )}
                        </View>
                        <Text style={{ fontSize: moderateScale(14), marginLeft: scale(8) }} className={`font-medium ${order.hasUnreadBuyer ? 'text-gray-900' : 'text-gray-600'}`}>Message store</Text>
                      </Pressable>
                      
                      {isReady ? (
                        <Pressable 
                          onPress={() => openDirections(order.sellerData?.storeAddress || '', order.sellerData?.storeName || item.store)}
                          style={{ paddingVertical: verticalScale(12), paddingHorizontal: scale(8), borderRadius: scale(12) }}
                          className="flex-1 flex-row items-center justify-center border border-brandPrimary/30 bg-white active:opacity-70"
                        >
                          <Navigation size={scale(16)} color="#1B7A49" />
                          <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className="text-brandPrimary font-bold">
                            Get directions
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable 
                          onPress={() => order.id && handleCancelOrder(order.id)}
                          style={{ paddingVertical: verticalScale(12), paddingHorizontal: scale(8), borderRadius: scale(12) }}
                          className="flex-1 flex-row items-center justify-center border border-gray-200 bg-white"
                        >
                          <XCircle size={scale(16)} color="#6B7280" />
                          <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className="text-gray-600 font-bold">
                            Cancel order
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
