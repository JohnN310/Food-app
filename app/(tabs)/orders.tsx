import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { ChevronRight, ShoppingBag, Clock, CheckCircle, XCircle, Bell, MessageSquare, QrCode, CalendarPlus, Star } from 'lucide-react-native';

const TABS = [
  { id: 'all', label: 'All Orders', icon: ShoppingBag },
  { id: 'upcoming', label: 'Upcoming', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
];

export default function OrdersScreen() {
  const router = useRouter();
  const orders = useAppStore(state => state.orders) || [];
  const [activeTab, setActiveTab] = useState('all');

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-5">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">My Orders</Text>
          <Pressable className="relative mt-1">
            <Bell size={24} color="#374151" />
            <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center border-2 border-[#FAFAF5]">
              <Text className="text-white text-[9px] font-bold">2</Text>
            </View>
          </Pressable>
        </View>
        <Text className="text-gray-500 font-medium text-[15px]">Track and manage all your orders</Text>
      </View>

      {/* Tabs / Filter Chips */}
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

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {orders.length === 0 ? (
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
            {orders.map((order, idx) => {
              const item = order.itemData || {};
              const isCompleted = order.status === 'completed';
              const isUpcoming = order.status === 'upcoming';
              const isReserved = order.status === 'reserved';

              // Mock logic for display based on design
              const badgeBg = isCompleted ? 'bg-[#E1F0E8]' : isUpcoming ? 'bg-orange-50' : 'bg-[#E1F0E8]';
              const badgeTextCol = isCompleted ? 'text-brandPrimary' : isUpcoming ? 'text-orange-600' : 'text-brandPrimary';
              const statusText = isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Ready for pickup';

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
                      <ShoppingBag size={20} color={isUpcoming ? "#D97706" : "#1B7A49"} />
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
                  ) : (
                    <View className="flex-row justify-between">
                      <Pressable className="flex-1 flex-row items-center justify-center py-3 px-2 border border-brandPrimary/30 rounded-xl mr-3 bg-white">
                        {isUpcoming ? <CalendarPlus size={16} color="#1B7A49" /> : <QrCode size={16} color="#1B7A49" />}
                        <Text className="text-brandPrimary font-bold text-[13px] ml-2">
                          {isUpcoming ? 'Add to calendar' : 'View pickup code'}
                        </Text>
                      </Pressable>
                      <Pressable className="flex-1 flex-row items-center justify-center py-3 px-2 border border-gray-200 rounded-xl bg-white">
                        <MessageSquare size={16} color="#374151" />
                        <Text className="text-gray-700 font-bold text-[13px] ml-2">Message store</Text>
                      </Pressable>
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
