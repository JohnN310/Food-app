import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle, Clock, HelpCircle, MapPin, MessageSquare, Navigation, ShieldCheck, ShoppingBag, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { openDirections } from '@/lib/utils';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = useAppStore(state => state.user);

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
  const isSeller = user?.uid === order.sellerId;
  const hasUnread = isSeller ? order.hasUnreadSeller : order.hasUnreadBuyer;

  const [sellerData, setSellerData] = useState<any>(order?.sellerData || null);

  useEffect(() => {
    const fetchSeller = async () => {
      if (order?.sellerId) {
        try {
          const docSnap = await getDoc(doc(db, 'users', order.sellerId));
          if (docSnap.exists()) {
            setSellerData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching seller:", error);
        }
      }
    };
    fetchSeller();
  }, [order?.sellerId]);

  // Mock timestamp display
  const orderDate = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
  const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

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
      <View style={{ paddingHorizontal: scale(15), paddingVertical: verticalScale(15) }} className="flex-row items-center justify-between relative">
        <Pressable onPress={() => router.back()} style={{ width: scale(38), height: scale(38) }} className="bg-white rounded-full items-center justify-center shadow-sm z-10">
          <ArrowLeft size={scale(19)} color="#374151" />
        </Pressable>
        <View className="absolute left-0 right-0 items-center pointer-events-none">
          <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900">Order Details</Text>
        </View>
        <Pressable style={{ padding: scale(7), marginRight: scale(4) }} className="flex-row items-center active:bg-gray-100 rounded-full z-10">
          <HelpCircle size={scale(19)} color="#1B7A49" />
          <Text style={{ fontSize: moderateScale(14), marginLeft: scale(4) }} className="text-brandPrimary font-medium">Help</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: scale(15), paddingBottom: verticalScale(15), paddingTop: verticalScale(4) }} showsVerticalScrollIndicator={false}>

        {/* Main Status Card */}
        <View style={{ padding: scale(18), marginBottom: 0, borderRadius: scale(22) }} className="bg-white border border-gray-100 shadow-sm">
          <View style={{ marginBottom: verticalScale(7) }} className="flex-row justify-between items-start">
            <View>
              <Text style={{ fontSize: moderateScale(18), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">
                Order #{order.id ? order.id.substring(0, 8).toUpperCase() : 'TSG-2487'}
              </Text>
              <Text style={{ fontSize: moderateScale(14) }} className="text-gray-500">Placed on {dateStr} at {timeStr}</Text>
            </View>
            <View className="items-end">
              <View style={{ paddingHorizontal: scale(11), paddingVertical: verticalScale(5), borderRadius: scale(7) }} className={`flex-row items-center border ${badgeBg}`}>
                <StatusIcon size={scale(13)} color={iconColor} />
                <Text style={{ fontSize: moderateScale(12), marginLeft: scale(5) }} className={`${badgeTextCol} font-bold`}>{statusText}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 1, marginVertical: verticalScale(14) }} className="bg-gray-100" />

          {/* Store Info */}
          <View className="flex-row items-center">
            <Image source={require('../../assets/images/mascot_waving_1776538518453.png')} style={{ width: scale(44), height: scale(44) }} className="rounded-full bg-brandAccent-yellow" />
            <View style={{ marginLeft: scale(11) }} className="flex-1">
              <Text style={{ fontSize: moderateScale(16) }} className="font-bold text-gray-900">{sellerData?.storeName || item.store}</Text>
              <View style={{ marginTop: verticalScale(6) }} className="flex-row items-center">
                <Text style={{ fontSize: moderateScale(12), marginRight: scale(11) }} className="text-gray-500">{sellerData?.storeAddress || item.distance}</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => router.push(`/chat/${order.id}` as any)}
              style={{ paddingHorizontal: scale(14), paddingVertical: verticalScale(7) }}
              className="flex-row items-center bg-white border border-gray-200 rounded-full"
            >
              <View className="relative">
                <MessageSquare size={scale(15)} color="#374151" />
                {hasUnread && (
                  <View style={{ width: scale(9), height: scale(9), top: verticalScale(-3), right: scale(-3) }} className="absolute bg-red-500 rounded-full border border-white" />
                )}
              </View>
              <Text style={{ fontSize: moderateScale(14), marginLeft: scale(7) }} className={`font-medium ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>Message</Text>
            </Pressable>
          </View>
        </View>

        {/* Order Items */}
        <Text style={{ fontSize: moderateScale(17), marginBottom: verticalScale(16), paddingHorizontal: scale(4), marginTop: verticalScale(24) }} className="font-bold text-gray-900">Order items</Text>
        <View style={{ padding: scale(18), marginBottom: 0, borderRadius: scale(22) }} className="bg-white border border-gray-100 shadow-sm flex-row">
          <Image source={{ uri: item.image }} style={{ width: scale(72), height: scale(72), borderRadius: scale(14) }} className="bg-gray-100" />
          <View style={{ marginLeft: scale(14), paddingVertical: verticalScale(3) }} className="flex-1 justify-between">
            <View>
              <View style={{ marginBottom: verticalScale(2) }} className="flex-row items-center">
                {(order.quantity && order.quantity > 1) && (
                  <View style={{ paddingHorizontal: scale(7), paddingVertical: verticalScale(2), marginRight: scale(7), borderRadius: scale(6) }} className="bg-gray-100 border border-gray-200">
                    <Text style={{ fontSize: moderateScale(10) }} className="text-gray-600 font-bold">Qty: {order.quantity}</Text>
                  </View>
                )}
                <Text style={{ fontSize: moderateScale(17) }} className="font-bold text-gray-900 flex-1" numberOfLines={1}>{item.title}</Text>
                <View style={{ paddingHorizontal: scale(7), paddingVertical: verticalScale(3), marginLeft: scale(7), borderRadius: scale(6) }} className="bg-brandPrimary-soft">
                  <Text style={{ fontSize: moderateScale(10) }} className="text-brandPrimary font-bold">{item.discount}</Text>
                </View>
              </View>
              <Text style={{ fontSize: moderateScale(12) }} className="text-gray-500 leading-relaxed" numberOfLines={2}>
                {item.description || 'Assorted items and baked goods'}
              </Text>
            </View>
            <View style={{ marginTop: verticalScale(7) }} className="flex-row items-end justify-between">
              {item.expiryTimestamp ? (
                <View style={{ marginBottom: verticalScale(3) }} className="flex-row items-center">
                  <Clock size={scale(11)} color="#DC2626" />
                  <Text style={{ fontSize: moderateScale(10), marginLeft: scale(4) }} className="text-red-600 font-bold">
                    Good until: {new Date(item.expiryTimestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <View className="flex-row items-baseline">
                <Text style={{ fontSize: moderateScale(10), marginRight: scale(4) }} className="text-gray-400 line-through">{item.oldPrice}</Text>
                <Text style={{ fontSize: moderateScale(17) }} className="font-bold text-brandPrimary">{item.price}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pickup Details */}
        <Text style={{ fontSize: moderateScale(17), marginBottom: verticalScale(16), paddingHorizontal: scale(4), marginTop: verticalScale(24) }} className="font-bold text-gray-900">Pickup details</Text>
        <View style={{ padding: scale(18), marginBottom: 0, borderRadius: scale(22) }} className="bg-white border border-gray-100 shadow-sm">
          <View style={{ marginBottom: verticalScale(18) }} className="flex-row items-center">
            <View style={{ width: scale(36), height: scale(36), marginRight: scale(14) }} className="bg-[#FAFAF5] rounded-full items-center justify-center border border-gray-100">
              <MapPin size={scale(18)} color="#1B7A49" />
            </View>
            <View style={{ marginRight: scale(8) }} className="flex-1">
              <Text style={{ fontSize: moderateScale(12), marginBottom: verticalScale(2) }} className="text-gray-500">Pickup at</Text>
              <Text style={{ fontSize: moderateScale(16) }} className="font-bold text-gray-900">{sellerData?.storeName || item.store}</Text>
              <Text style={{ fontSize: moderateScale(12) }} className="text-gray-500">{sellerData?.storeAddress || 'Address not provided'}</Text>
            </View>
            <Pressable 
              onPress={() => openDirections(sellerData?.storeAddress || '', sellerData?.storeName || item.store)}
              style={{ paddingHorizontal: scale(11), paddingVertical: verticalScale(7) }}
              className="flex-row items-center bg-white border border-brandPrimary/30 rounded-full active:opacity-70"
            >
              <Navigation size={scale(13)} color="#1B7A49" />
              <Text style={{ fontSize: moderateScale(12), marginLeft: scale(5) }} className="text-brandPrimary font-medium">Get directions</Text>
            </Pressable>
          </View>

          <View style={{ height: 1, marginBottom: verticalScale(18), marginLeft: scale(50) }} className="bg-gray-100" />

          <View className="flex-row items-center">
            <View style={{ width: scale(36), height: scale(36), marginRight: scale(14) }} className="bg-[#FAFAF5] rounded-full items-center justify-center border border-gray-100">
              <Clock size={scale(18)} color="#1B7A49" />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: moderateScale(12), marginBottom: verticalScale(2) }} className="text-gray-500">Pickup time</Text>
              <Text style={{ fontSize: moderateScale(16) }} className="font-bold text-gray-900">{item.time || '10:00 AM - 10:30 AM'}</Text>
            </View>

          </View>
        </View>

        {/* Order Summary */}
        <Text style={{ fontSize: moderateScale(17), marginBottom: verticalScale(16), paddingHorizontal: scale(4), marginTop: verticalScale(24) }} className="font-bold text-gray-900">Order summary</Text>
        <View style={{ padding: scale(18), marginBottom: verticalScale(28), borderRadius: scale(22) }} className="bg-white border border-gray-100 shadow-sm">
          <View style={{ marginBottom: verticalScale(10) }} className="flex-row justify-between items-center">
            <Text style={{ fontSize: moderateScale(14) }} className="text-gray-600">Item price</Text>
            <Text style={{ fontSize: moderateScale(14) }} className="text-gray-900">{item.price}</Text>
          </View>
          {(order.quantity && order.quantity > 1) && (
            <View style={{ marginBottom: verticalScale(10) }} className="flex-row justify-between items-center">
              <Text style={{ fontSize: moderateScale(14) }} className="text-gray-600">Quantity</Text>
              <Text style={{ fontSize: moderateScale(14) }} className="text-gray-900">x{order.quantity}</Text>
            </View>
          )}
          <View style={{ height: 1, marginVertical: verticalScale(7) }} className="bg-gray-100" />
          <View style={{ marginTop: verticalScale(4) }} className="flex-row justify-between items-center">
            <Text style={{ fontSize: moderateScale(16) }} className="font-bold text-gray-900">Total Paid</Text>
            <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-brandPrimary">
              ${(parseFloat((item.price || '$0').replace('$', '')) * (order.quantity || 1)).toFixed(2)}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
