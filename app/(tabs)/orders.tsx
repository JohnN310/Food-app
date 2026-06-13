import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { ChevronRight, ShoppingBag, Clock, CheckCircle, XCircle, Bell, MessageSquare, QrCode, CalendarPlus, Star } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';

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
      <View className="px-5 pt-4 pb-5">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">My Orders</Text>
          <Pressable
            onPress={() => router.push('/notifications')}
            className="w-10 h-10 bg-white rounded-full items-center justify-center relative shadow-sm border border-gray-100 mt-1"
          >
            <Bell size={20} color="#374151" />
            {unreadMessagesCount > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white items-center justify-center">
                <Text className="text-[8px] text-white font-bold">{unreadMessagesCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Text className="text-gray-500 font-medium text-[15px]">Track and manage all your orders</Text>
      </View>

      {/* Tabs / Filter Chips */}
      {orders.length > 0 && (
        <View className="px-5 mb-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible" contentContainerStyle={{ paddingRight: 20 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`flex-row items-center px-4 py-2.5 rounded-[14px] mr-3 border shadow-sm ${
                    isActive 
                      ? 'bg-[#F1F8F4] border-[#1B7A49]/20' 
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <Icon size={16} color={isActive ? "#1B7A49" : "#6B7280"} />
                  <Text className={`ml-2 font-bold text-[13px] ${isActive ? 'text-brandPrimary' : 'text-gray-600'}`}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View className="items-center justify-center pt-20">
            <View className="w-24 h-24 bg-[#F1F8F4] rounded-full items-center justify-center mb-6">
              <ShoppingBag size={40} color="#1B7A49" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">No active orders</Text>
            <Text className="text-gray-500 text-center mb-8 px-4 leading-relaxed">
              When you reserve food from nearby stores, your active and past orders will appear here.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              className="bg-brandPrimary px-8 py-4 rounded-full shadow-md shadow-brandPrimary/30 active:opacity-90"
            >
              <Text className="text-white font-bold text-base">Start Exploring</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-5 pb-8">
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
                  className="bg-white rounded-[24px] border border-gray-100 p-4 shadow-sm active:opacity-90"
                >
                  {/* Header Row */}
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
                    <View className="flex-1 pr-2 pt-1">
                      <Text className="font-bold text-gray-900 text-[17px] mb-1">{item.store}</Text>
                      <Text className="text-gray-500 text-[11px] mb-1.5">123 Eco Street, Portland, OR</Text>
                      <View className="flex-row items-center">
                        <Clock size={12} color="#6B7280" />
                        <Text className="text-gray-500 text-[11px] ml-1.5 font-medium">{dateStr}, {item.time || '10:00 AM – 10:30 AM'}</Text>
                      </View>
                    </View>
                    <View className="items-end pt-1">
                      <View className={`${badgeBg} px-2.5 py-1 rounded-full mb-2`}>
                        <Text className={`${badgeTextCol} text-[10px] font-bold`}>{statusText}</Text>
                      </View>
                      <Text className="text-gray-400 text-[10px] font-medium mb-1.5">
                        Order #{order.id ? order.id.substring(0, 8).toUpperCase() : 'TSG-2487'}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="font-bold text-brandPrimary text-[17px] mr-1">{item.price}</Text>
                        <ChevronRight size={16} color="#9CA3AF" />
                      </View>
                    </View>
                  </View>
                  
                  {/* Inner Card Content Row */}
                  <View className="bg-[#FAFAF5] rounded-2xl p-3 flex-row items-center mb-4 border border-gray-50">
                    <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 shadow-sm border border-gray-100">
                      <ShoppingBag size={20} color={isOrdered ? "#D97706" : "#1B7A49"} />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="font-bold text-gray-900 text-[14px] mb-0.5">{item.title}</Text>
                      <Text className="text-gray-500 text-[11px] leading-tight" numberOfLines={2}>
                        {item.description || 'Assorted bread, pastries and baked goods'}
                      </Text>
                    </View>
                    <View className="ml-1 items-center px-1">
                      <Text className="font-bold text-gray-900 text-[13px]">🌿 1.2 kg</Text>
                      <Text className="text-gray-500 text-[9px] mt-0.5">Food saved</Text>
                    </View>
                    <View className="items-center pl-2 pr-1">
                      <Text className="font-bold text-gray-900 text-[13px]">☁️ 2.3 kg</Text>
                      <Text className="text-gray-500 text-[9px] mt-0.5">CO₂ saved</Text>
                    </View>
                  </View>

                  {/* Footer Action Area */}
                  {isCompleted ? (
                    <View className="flex-row items-center justify-between px-1">
                      <Text className="font-bold text-gray-800 text-[13px]">Rate this order</Text>
                      <View className="flex-row items-center ml-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={16} color="#1B7A49" fill="#1B7A49" className="mr-1" />
                        ))}
                      </View>
                      <ChevronRight size={16} color="#9CA3AF" className="ml-auto" />
                    </View>
                  ) : isCancelled ? (
                    <View className="flex-row items-center justify-between px-1">
                      <Text className="font-bold text-gray-500 text-[13px]">Order Cancelled</Text>
                    </View>
                  ) : (
                    <View className="flex-row justify-between">
                      <Pressable className="flex-1 flex-row items-center justify-center py-3 px-2 border border-gray-200 rounded-xl mr-3 bg-white">
                        <MessageSquare size={16} color="#374151" />
                        <Text className="text-gray-700 font-bold text-[13px] ml-2">Message store</Text>
                      </Pressable>
                      
                      {isReady ? (
                        <Pressable className="flex-1 flex-row items-center justify-center py-3 px-2 border border-brandPrimary/30 rounded-xl bg-white">
                          <QrCode size={16} color="#1B7A49" />
                          <Text className="text-brandPrimary font-bold text-[13px] ml-2">
                            View pickup code
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable 
                          onPress={() => order.id && handleCancelOrder(order.id)}
                          className="flex-1 flex-row items-center justify-center py-3 px-2 border border-gray-200 rounded-xl bg-white"
                        >
                          <XCircle size={16} color="#6B7280" />
                          <Text className="text-gray-600 font-bold text-[13px] ml-2">
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
