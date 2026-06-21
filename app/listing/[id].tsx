import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Clock, Heart, Info, MapPin, Share2, ShieldCheck, ShoppingBag, Store, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scale, verticalScale, moderateScale } from '@/lib/responsive';

const { width, height } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id, itemData } = useLocalSearchParams();
  const router = useRouter();

  const [item, setItem] = useState<any>(() => {
    if (itemData) {
      try { return JSON.parse(itemData as string); } catch (e) { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(!itemData);
  const sheetSlideAnim = useRef(new Animated.Value(height)).current;

  const savedItems = useAppStore(state => state.savedItems);
  const toggleSavedItem = useAppStore(state => state.toggleSavedItem);
  const user = useAppStore(state => state.user);
  const orders = useAppStore(state => state.orders) || [];

  const existingOrder = orders.find((o: any) => o.itemId === item?.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const openModal = () => {
    setModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const handleBuy = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to reserve an item.");
      return;
    }

    if ((item.quantity ?? 1) <= 0) {
      Alert.alert("Out of Stock", "This item is no longer available.");
      return;
    }

    try {
      const orderData = {
        buyerId: user.uid,
        sellerId: item.sellerId || '',
        itemId: item.id,
        itemData: item,
        status: 'ordered',
        quantity: purchaseQuantity,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Decrement the stock count and mark as sold if it reaches 0
      const newQuantity = Math.max(0, (item.quantity ?? 1) - purchaseQuantity);
      const updatePayload: any = { quantity: newQuantity };
      if (newQuantity === 0) {
        updatePayload.status = 'sold';
      }
      
      await updateDoc(doc(db, 'listings', item.id), updatePayload);

      closeModal();
      setTimeout(() => {
        router.dismiss();
        setTimeout(() => {
          router.push(`/order/${docRef.id}` as any);
        }, 100);
      }, 250);
    } catch (err) {
      Alert.alert("Error", "Could not place order. Please try again.");
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'listings', id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const listingData: any = { id: docSnap.id, ...docSnap.data() };
          
          if (listingData.sellerId) {
            try {
              const sellerSnap = await getDoc(doc(db, 'users', listingData.sellerId));
              if (sellerSnap.exists()) {
                listingData.sellerData = sellerSnap.data();
              }
            } catch (err) {
              console.error("Error fetching seller details:", err);
            }
          }
          
          setItem(listingData);
        } else {
          Alert.alert("Error", "This rescue listing could not be found.");
        }
      } catch (error) {
        console.error("Error fetching item details:", error);
        Alert.alert("Error", "Could not load item details. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  useEffect(() => {
    Animated.spring(sheetSlideAnim, {
      toValue: 0,
      tension: 50,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBack = () => {
    Animated.timing(sheetSlideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  };

  const isSaved = item ? savedItems.includes(item.id) : false;

  return (
    <View className="flex-1 justify-end bg-black/40">
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={handleBack} />
      <Animated.View style={{ height: '90%', transform: [{ translateY: sheetSlideAnim }] }} className="bg-background rounded-t-[32px] overflow-hidden shadow-2xl relative">
        {loading ? (
          <View className="flex-1 justify-center items-center bg-background">
            <ActivityIndicator size="large" color="#1B7A49" />
            <Text style={{ fontSize: moderateScale(14), marginTop: verticalScale(16) }} className="text-gray-500 font-medium">Fetching rescue details...</Text>
          </View>
        ) : !item ? (
          <View style={{ paddingHorizontal: scale(32) }} className="flex-1 justify-center items-center bg-background">
            <View style={{ width: scale(80), height: scale(80), marginBottom: verticalScale(16) }} className="bg-red-50 rounded-full items-center justify-center">
              <Info size={scale(40)} color="#E53935" />
            </View>
            <Text style={{ fontSize: moderateScale(20), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">Item Not Found</Text>
            <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(32) }} className="text-gray-500 text-center">This item may have been rescued already or removed by the seller.</Text>
            <Pressable
              onPress={handleBack}
              style={{ paddingHorizontal: scale(40), paddingVertical: verticalScale(16) }}
              className="bg-brandPrimary rounded-full shadow-sm"
            >
              <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold">Back to Home</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Floating Overlay Buttons */}
            <View style={{ top: verticalScale(20), paddingHorizontal: scale(20) }} className="absolute left-0 right-0 flex-row justify-between z-30">
              <Pressable
                onPress={handleBack}
                style={{ width: scale(44), height: scale(44), borderRadius: scale(14) }}
                className="bg-white/90 items-center justify-center shadow-lg"
              >
                <ArrowLeft size={scale(22)} color="#1F2937" strokeWidth={2.5} />
              </Pressable>
              <View style={{ gap: scale(10) }} className="flex-row">
                <Pressable style={{ width: scale(44), height: scale(44), borderRadius: scale(14) }} className="bg-white/90 items-center justify-center shadow-lg">
                  <Share2 size={scale(20)} color="#1F2937" />
                </Pressable>
                <Pressable
                  onPress={() => toggleSavedItem(item.id)}
                  style={{ width: scale(44), height: scale(44), borderRadius: scale(14) }}
                  className="bg-white/90 items-center justify-center shadow-lg"
                >
                  <Heart
                    size={scale(20)}
                    color={isSaved ? "#E53935" : "#1F2937"}
                    fill={isSaved ? "#E53935" : "transparent"}
                  />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* Header Hero Area */}
              <View className="relative">
                <Image
                  source={{ uri: item.image }}
                  style={{ width: width, height: 350 }}
                  resizeMode="cover"
                />

              </View>

              {/* Content Body */}
              <View style={{ marginTop: verticalScale(-28), paddingTop: verticalScale(20), paddingHorizontal: scale(20), paddingBottom: verticalScale(112), borderRadius: scale(28) }} className="bg-white rounded-t-[28px]">

                {/* Title & Rating */}
                <View style={{ marginBottom: verticalScale(6), paddingTop: verticalScale(6) }} className="flex-row justify-between items-start">
                  <Text style={{ fontSize: moderateScale(28), marginRight: scale(14) }} className="font-bold text-gray-900 flex-1">{item.title}</Text>
                  {item.sellerData?.averageRating && (
                    <View style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(5), marginTop: verticalScale(3), borderRadius: scale(7) }} className="flex-row items-center bg-gray-50 border border-gray-100">
                      <Text style={{ fontSize: moderateScale(13) }} className="text-gray-900 font-bold">⭐ {item.sellerData.averageRating}</Text>
                    </View>
                  )}
                </View>
                <View style={{ marginBottom: verticalScale(20) }} className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Store size={scale(15)} color="#4B5563" />
                    <Text style={{ fontSize: moderateScale(15), marginLeft: scale(7) }} className="text-gray-600 font-medium">{item.sellerData?.storeName || item.store}</Text>
                  </View>
                  <Text style={{ fontSize: moderateScale(13) }} className={`font-bold ${(item.quantity ?? 1) <= 0 ? 'text-red-500' : ((item.quantity ?? 1) <= 10 ? 'text-orange-600' : 'text-brandPrimary')}`}>
                    {(item.quantity ?? 1) <= 0 ? 'Out of stock' : ((item.quantity ?? 1) <= 10 ? `Only ${item.quantity ?? 1} left!` : 'In stock')}
                  </Text>
                </View>

                {/* Pricing Block */}
                <View style={{ padding: scale(20), marginBottom: verticalScale(26), borderRadius: scale(28) }} className="bg-gray-50 flex-row items-center justify-between border border-gray-100">
                  <View>
                    <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(3) }} className="text-gray-500 font-medium uppercase tracking-widest">Rescue Price</Text>
                    <View style={{ gap: scale(7) }} className="flex-row items-end">
                      <Text style={{ fontSize: moderateScale(28) }} className="font-bold text-brandPrimary leading-none">{item.price}</Text>
                      <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(3) }} className="text-gray-400 line-through">{item.oldPrice}</Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: scale(14), paddingVertical: verticalScale(7), borderRadius: scale(14) }} className="bg-brandPrimary shadow-sm shadow-brandPrimary/20">
                    <Text style={{ fontSize: moderateScale(13) }} className="text-white font-bold">{item.discount}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View style={{ marginBottom: verticalScale(26) }}>
                  <Text style={{ fontSize: moderateScale(18), marginBottom: verticalScale(10) }} className="font-bold text-gray-900">About this rescue</Text>
                  <Text style={{ fontSize: moderateScale(14) }} className="text-gray-600 leading-relaxed">
                    {item.description || 'A great surplus deal! Save money and help the environment by rescuing this perfectly good item before it goes to waste.'}
                  </Text>
                </View>

                {/* Expiry Date */}
                {item.expiryTimestamp && (
                  <View style={{ marginBottom: verticalScale(20), padding: scale(14), borderRadius: scale(14) }} className="bg-red-50 border border-red-100 flex-row items-center">
                    <Clock size={scale(18)} color="#DC2626" />
                    <Text style={{ fontSize: moderateScale(13), marginLeft: scale(10) }} className="text-red-900 font-medium">
                      Good until: <Text className="font-bold">{new Date(item.expiryTimestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    </Text>
                  </View>
                )}

                {/* Pickup Section */}
                <View style={{ padding: scale(20), marginBottom: verticalScale(20), borderRadius: scale(28) }} className="bg-brandAccent-yellow border border-yellow-100">
                  <Text style={{ fontSize: moderateScale(18), marginBottom: verticalScale(14) }} className="font-bold text-yellow-900">Pickup Window</Text>
                  <View style={{ marginBottom: verticalScale(16) }} className="flex-row items-center">
                    <View style={{ width: scale(36), height: scale(36), borderRadius: scale(10), marginRight: scale(14) }} className="bg-white/80 items-center justify-center">
                      <MapPin size={scale(18)} color="#78350F" />
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontSize: moderateScale(13) }} className="font-bold text-yellow-950">Store Location</Text>
                      <Text style={{ fontSize: moderateScale(13) }} className="text-yellow-800">{item.sellerData?.storeAddress || 'Address not provided'}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View style={{ width: scale(36), height: scale(36), borderRadius: scale(10), marginRight: scale(14) }} className="bg-white/80 items-center justify-center">
                      <Clock size={scale(18)} color="#78350F" />
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontSize: moderateScale(13) }} className="font-bold text-yellow-950">Time Frame</Text>
                      <Text style={{ fontSize: moderateScale(13) }} className="text-yellow-800">{item.time}</Text>
                    </View>
                  </View>
                </View>

                {/* Sustainability Badge */}
                <View style={{ padding: scale(16), borderRadius: scale(20), marginBottom: verticalScale(14) }} className="flex-row items-center bg-green-50 border border-green-100">
                  <ShieldCheck size={scale(22)} color="#1B7A49" />
                  <Text style={{ fontSize: moderateScale(13), marginLeft: scale(14) }} className="flex-1 text-brandPrimary font-medium leading-snug">
                    By rescuing this item, you're preventing roughly <Text className="font-bold">1.2kg of CO2</Text> emissions!
                  </Text>
                </View>

                {/* Bottom Spacer to prevent overlap with sticky footer */}
                <View style={{ height: verticalScale(70) }} />
              </View>
            </ScrollView>

            {/* Fixed Sticky Footer */}
            <SafeAreaView edges={['bottom']} className="absolute bottom-0 w-full bg-white border-t border-gray-100 shadow-2xl">
              <View style={{ paddingHorizontal: scale(20), paddingTop: verticalScale(14), paddingBottom: verticalScale(32) }}>
                <View style={{ marginBottom: verticalScale(14) }} className="flex-row justify-between items-center">
                  <View>
                    <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(2) }} className="text-gray-500 font-bold uppercase tracking-widest">Total Price</Text>
                    <Text style={{ fontSize: moderateScale(22) }} className="text-brandPrimary font-bold">
                      ${(parseFloat((item.price || '$0').replace('$', '')) * purchaseQuantity).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-gray-50 rounded-full border border-gray-100">
                    <Pressable 
                      onPress={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                      style={{ width: scale(36), height: scale(36) }}
                      className="items-center justify-center rounded-full"
                    >
                      <Text style={{ fontSize: moderateScale(18) }} className="text-gray-600 font-bold">-</Text>
                    </Pressable>
                    <Text style={{ fontSize: moderateScale(17), paddingHorizontal: scale(14) }} className="font-bold text-gray-900">{purchaseQuantity}</Text>
                    <Pressable 
                      onPress={() => {
                        const maxQty = item.quantity ?? 1;
                        if (purchaseQuantity < maxQty) {
                          setPurchaseQuantity(purchaseQuantity + 1);
                        } else {
                          Alert.alert("Stock Limit Reached", `You can only reserve up to ${maxQty} of this item.`);
                        }
                      }}
                      style={{ width: scale(36), height: scale(36) }}
                      className="items-center justify-center rounded-full bg-brandPrimary"
                    >
                      <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold">+</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    if ((item.quantity ?? 1) <= 0) return;
                    openModal();
                  }}
                  disabled={(item.quantity ?? 1) <= 0}
                  style={{ paddingVertical: verticalScale(18) }}
                  className={`w-full rounded-full items-center shadow-lg ${
                    (item.quantity ?? 1) <= 0 
                      ? 'bg-gray-300 shadow-none' 
                      : 'active:opacity-90 bg-brandPrimary shadow-brandPrimary/30'
                  }`}
                >
                  <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold tracking-tight">
                    {(item.quantity ?? 1) <= 0 ? 'Out of Stock' : 'Reserve Now'}
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>

            <Modal
              animationType="fade" // Background fades in seamlessly
              transparent={true}
              visible={modalVisible}
              onRequestClose={closeModal}
            >
              <View className="flex-1 justify-end">

                {/* Dark transparent backdrop */}
                <Pressable
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                  className="bg-black/40"
                  onPress={closeModal}
                />

                {/* The Animated Checkout Sheet */}
                <Animated.View
                  style={{ transform: [{ translateY: slideAnim }], paddingHorizontal: scale(20), paddingTop: verticalScale(28), paddingBottom: verticalScale(36) }}
                  className="bg-background rounded-t-[28px] shadow-2xl"
                >
                  <View style={{ marginBottom: verticalScale(22) }} className="flex-row justify-between items-center">
                    <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">Confirm Reservation</Text>
                    <Pressable onPress={closeModal} style={{ width: scale(36), height: scale(36) }} className="bg-gray-100 rounded-full items-center justify-center">
                      <X size={scale(18)} color="#374151" />
                    </Pressable>
                  </View>

                  {/* Order Summary Card */}
                  <View style={{ padding: scale(18), marginBottom: verticalScale(28), borderRadius: scale(22) }} className="bg-white border border-gray-100 shadow-sm">
                    <View style={{ marginBottom: verticalScale(14) }} className="flex-row items-center">
                      <View style={{ width: scale(44), height: scale(44), borderRadius: scale(10), marginRight: scale(14) }} className="bg-gray-100 overflow-hidden">
                        <Image source={{ uri: item.image }} style={{ width: scale(44), height: scale(44) }} />
                      </View>
                      <View className="flex-1">
                        <Text style={{ fontSize: moderateScale(17), marginBottom: verticalScale(2) }} className="font-bold text-gray-900">{item.title}</Text>
                        <Text style={{ fontSize: moderateScale(13) }} className="text-gray-500">{item.sellerData?.storeName || item.store}</Text>
                      </View>
                    </View>

                    <View style={{ padding: scale(12), marginBottom: verticalScale(14), borderRadius: scale(14) }} className="bg-brandAccent-yellow flex-row items-center">
                      <Clock size={scale(15)} color="#78350F" />
                      <Text style={{ fontSize: moderateScale(13), marginLeft: scale(7) }} className="text-yellow-900 font-medium">Pickup: {item.time}</Text>
                    </View>

                    <View style={{ paddingTop: verticalScale(14) }} className="flex-row justify-between items-center border-t border-gray-50">
                      <Text style={{ fontSize: moderateScale(15) }} className="text-gray-600 font-medium">Quantity</Text>
                      <Text style={{ fontSize: moderateScale(17) }} className="font-bold text-gray-900">x{purchaseQuantity}</Text>
                    </View>

                    <View style={{ paddingTop: verticalScale(8) }} className="flex-row justify-between items-center">
                      <Text style={{ fontSize: moderateScale(15) }} className="text-gray-600 font-medium">Total Price</Text>
                      <Text style={{ fontSize: moderateScale(22) }} className="text-brandPrimary font-bold">
                        ${(parseFloat((item.price || '$0').replace('$', '')) * purchaseQuantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Placeholder for the actual Firebase Transaction */}
                  <Pressable
                    onPress={handleBuy}
                    style={{ paddingVertical: verticalScale(18), borderRadius: scale(999) }}
                    className="bg-brandPrimary items-center shadow-lg shadow-brandPrimary/30 active:opacity-90"
                  >
                    <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold tracking-tight">Confirm</Text>
                  </Pressable>
                </Animated.View>
              </View>
            </Modal>
          </>
        )}
      </Animated.View>
    </View>
  );
}
