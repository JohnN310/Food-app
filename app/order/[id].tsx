import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { ArrowLeft, Clock, MapPin, MessageSquare, ShieldCheck, HelpCircle, Navigation, ShoppingBag, CheckCircle, XCircle } from 'lucide-react-native';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const orders = useAppStore(state => state.orders) || [];
  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <Text className="text-gray-500 font-medium">Order not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-brandPrimary px-6 py-2 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const item = order.itemData || {};

  // Mock timestamp display
  const orderDate = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
  const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Generate a mock pickup code based on the order ID
  const mockCode = (order.id || 'ABCDEF').toUpperCase().slice(0, 12).match(/.{1,4}/g)?.join('  ') || '7XK2  M9L8  P3Q1';

  const isCompleted = order.status === 'completed';
  const isReady = order.status === 'ready';
  const isOrdered = order.status === 'ordered';
  const isCancelled = order.status === 'cancelled';

  const badgeBg = isCompleted ? 'bg-brandPrimary-soft border-brandPrimary/20' : 
                 isCancelled ? 'bg-gray-100 border-gray-200' : 
                 isReady ? 'bg-brandPrimary-soft border-brandPrimary/20' : 
                 isOrdered ? 'bg-orange-50 border-orange-200' : 'bg-gray-100 border-gray-200';
                 
  const badgeTextCol = isCompleted ? 'text-brandPrimary' : 
                       isCancelled ? 'text-gray-500' : 
                       isReady ? 'text-brandPrimary' : 
                       isOrdered ? 'text-orange-600' : 'text-gray-500';
                       
  const statusText = isCompleted ? 'Completed' : 
                     isCancelled ? 'Cancelled' : 
                     isReady ? 'Ready for pickup' : 
                     isOrdered ? 'Ordered' : 'Unknown';
                     
  const StatusIcon = isCompleted ? CheckCircle :
                     isCancelled ? XCircle :
                     isReady ? ShoppingBag :
                     isOrdered ? Clock : HelpCircle;
                     
  const iconColor = isCompleted ? '#1B7A49' :
                    isCancelled ? '#6B7280' :
                    isReady ? '#1B7A49' :
                    isOrdered ? '#EA580C' : '#6B7280';

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 relative">
        <Pressable onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm z-10">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <View className="absolute left-0 right-0 items-center pointer-events-none">
          <Text className="text-xl font-bold text-gray-900">Order Details</Text>
        </View>
        <Pressable className="flex-row items-center p-2 mr-1 active:bg-gray-100 rounded-full z-10">
          <HelpCircle size={20} color="#1B7A49" />
          <Text className="text-brandPrimary font-medium ml-1">Help</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        
        {/* Main Status Card */}
        <View className="bg-white rounded-[24px] border border-gray-100 p-5 mb-4 shadow-sm">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="font-bold text-xl text-gray-900 mb-1">
                Order #{order.id ? order.id.substring(0, 8).toUpperCase() : 'TSG-2487'}
              </Text>
              <Text className="text-sm text-gray-500">Placed on {dateStr} at {timeStr}</Text>
            </View>
            <View className="items-end">
              <View className={`flex-row items-center px-3 py-1.5 rounded-lg border mb-2 ${badgeBg}`}>
                <StatusIcon size={14} color={iconColor} />
                <Text className={`${badgeTextCol} font-bold text-xs ml-1.5`}>{statusText}</Text>
              </View>
              <Text className="text-xs text-gray-500">Code expires in</Text>
              <Text className="text-brandPrimary font-bold text-base">23:45</Text>
            </View>
          </View>
          
          <View className="h-[1px] bg-gray-100 my-4" />

          {/* Store Info */}
          <View className="flex-row items-center">
            <Image source={require('../../assets/images/mascot_waving_1776538518453.png')} style={{ width: 48, height: 48 }} className="rounded-full bg-brandAccent-yellow" />
            <View className="flex-1 ml-3">
              <Text className="font-bold text-gray-900 text-base">{item.store}</Text>
              <View className="flex-row items-center mt-0.5">
                <MapPin size={12} color="#9CA3AF" />
                <Text className="text-gray-500 text-xs ml-1 mr-3">{item.distance}</Text>
                <Text className="text-yellow-500 text-xs font-bold">⭐ {item.rating}</Text>
              </View>
            </View>
            <Pressable className="flex-row items-center bg-white border border-gray-200 px-4 py-2 rounded-full">
              <MessageSquare size={16} color="#374151" />
              <Text className="text-gray-700 font-medium ml-2 text-sm">Message</Text>
            </Pressable>
          </View>

          {/* Impact Banner inside the card */}
          <View className="mt-5 bg-[#F1F8F4] rounded-2xl p-4 flex-row items-center border border-[#E1F0E8]">
            <ShieldCheck size={28} color="#1B7A49" />
            <View className="flex-1 ml-3">
              <Text className="text-brandPrimary font-medium text-xs leading-snug">
                Great choice! You're saving food and making a positive impact.
              </Text>
            </View>
            <View className="ml-4 items-end">
              <Text className="text-brandPrimary font-bold text-sm">🌿 1.2 kg</Text>
              <Text className="text-brandPrimary/70 text-[10px]">Food saved</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <Text className="font-bold text-gray-900 text-lg mb-3 px-1 mt-4">Order items</Text>
        <View className="bg-white rounded-[24px] border border-gray-100 p-5 mb-4 shadow-sm flex-row">
          <Image source={{ uri: item.image }} style={{ width: 80, height: 80 }} className="rounded-2xl bg-gray-100" />
          <View className="flex-1 ml-4 justify-between py-1">
            <View>
              <View className="flex-row items-center mb-0.5">
                {(order.quantity && order.quantity > 1) && (
                  <View className="bg-gray-100 px-2 py-0.5 rounded-md mr-2 border border-gray-200">
                    <Text className="text-gray-600 text-[10px] font-bold">Qty: {order.quantity}</Text>
                  </View>
                )}
                <Text className="font-bold text-gray-900 text-lg flex-1" numberOfLines={1}>{item.title}</Text>
              </View>
              <Text className="text-gray-500 text-xs leading-relaxed" numberOfLines={2}>
                {item.description || 'Assorted items and baked goods'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <View className="bg-brandPrimary-soft px-2 py-1 rounded-md">
                <Text className="text-brandPrimary text-[10px] font-bold">{item.discount}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-brandPrimary text-lg">{item.price}</Text>
                <Text className="text-gray-400 line-through text-[10px]">{item.oldPrice}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pickup Details */}
        <Text className="font-bold text-gray-900 text-lg mb-3 px-1 mt-4">Pickup details</Text>
        <View className="bg-white rounded-[24px] border border-gray-100 p-5 mb-4 shadow-sm">
          <View className="flex-row items-center mb-5">
            <View className="w-10 h-10 bg-[#FAFAF5] rounded-full items-center justify-center mr-4 border border-gray-100">
              <MapPin size={20} color="#1B7A49" />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-gray-500 text-xs mb-0.5">Pickup at</Text>
              <Text className="font-bold text-gray-900">{item.store}</Text>
              <Text className="text-gray-500 text-xs">123 Eco Street, Portland, OR</Text>
            </View>
            <Pressable className="flex-row items-center bg-white border border-brandPrimary/30 px-3 py-2 rounded-full">
              <Navigation size={14} color="#1B7A49" />
              <Text className="text-brandPrimary font-medium ml-1.5 text-xs">Get directions</Text>
            </Pressable>
          </View>
          
          <View className="h-[1px] bg-gray-100 mb-5 ml-14" />
          
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-[#FAFAF5] rounded-full items-center justify-center mr-4 border border-gray-100">
              <Clock size={20} color="#1B7A49" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 text-xs mb-0.5">Pickup time</Text>
              <Text className="font-bold text-gray-900">Today, {dateStr.split(',')[0]}</Text>
              <Text className="text-gray-800 text-sm mt-0.5 font-medium">{item.time || '10:00 AM - 10:30 AM'}</Text>
            </View>
            <View className="w-24">
              <Text className="text-gray-400 text-right text-[10px] leading-tight">Please pickup within the time window</Text>
            </View>
          </View>
        </View>

        {/* Pickup Code */}
        <View className="bg-[#F1F8F4] rounded-[24px] border border-brandPrimary/20 p-5 mb-8 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-bold text-gray-900 text-sm mb-1">Pickup code</Text>
            <Text className="text-gray-600 text-xs mb-3">Show this code to the store staff</Text>
            
            <View className="bg-brandPrimary-soft px-3 py-2 rounded-lg self-start border border-brandPrimary/20">
              <Text className="text-brandPrimary font-bold text-lg tracking-widest">{mockCode}</Text>
            </View>
            <View className="flex-row items-center mt-3">
              <ShieldCheck size={14} color="#1B7A49" />
              <Text className="text-brandPrimary text-xs font-medium ml-1">Secure code • Expires in 23:45</Text>
            </View>
          </View>
          
          <View className="w-24 h-24 bg-white rounded-xl items-center justify-center border border-gray-200">
            {/* Fake QR code using lucide icon */}
            <View className="w-20 h-20 bg-gray-900 rounded-lg opacity-80" />
          </View>
        </View>

        {/* Order Summary */}
        <Text className="font-bold text-gray-900 text-lg mb-3 px-1">Order summary</Text>
        <View className="bg-white rounded-[24px] border border-gray-100 p-5 mb-8 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-600">Item price</Text>
            <Text className="text-gray-900">{item.price}</Text>
          </View>
          {(order.quantity && order.quantity > 1) && (
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-600">Quantity</Text>
              <Text className="text-gray-900">x{order.quantity}</Text>
            </View>
          )}
          <View className="h-[1px] bg-gray-100 my-2" />
          <View className="flex-row justify-between items-center mt-1">
            <Text className="font-bold text-gray-900">Total Paid</Text>
            <Text className="font-bold text-brandPrimary text-xl">
              ${(parseFloat((item.price || '$0').replace('$', '')) * (order.quantity || 1)).toFixed(2)}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
