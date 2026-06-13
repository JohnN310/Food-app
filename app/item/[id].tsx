import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Clock, Heart, Info, MapPin, Share2, ShieldCheck, ShoppingBag, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ItemDetailScreen() {
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
    try {
      const orderData = {
        buyerId: user.uid,
        sellerId: item.sellerId || '',
        itemId: item.id,
        itemData: item,
        status: 'reserved',
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      closeModal();
      
      // Wait for swipe-to-buy modal to close, then dismiss the item/[id] transparentModal,
      // and finally push the order details screen onto the main stack.
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
          setItem({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert("Error", "This rescue item could not be found.");
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
            <Text className="mt-4 text-gray-500 font-medium">Fetching rescue details...</Text>
          </View>
        ) : !item ? (
          <View className="flex-1 justify-center items-center px-8 bg-background">
            <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-4">
              <Info size={40} color="#E53935" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">Item Not Found</Text>
            <Text className="text-gray-500 text-center mb-8">This listing may have been rescued already or removed by the seller.</Text>
            <Pressable
              onPress={handleBack}
              className="bg-brandPrimary px-10 py-4 rounded-full shadow-sm"
            >
              <Text className="text-white font-bold text-lg">Back to Home</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Floating Overlay Buttons */}
            <View className="absolute top-6 left-0 right-0 flex-row justify-between px-6 z-30">
              <Pressable
                onPress={handleBack}
                className="w-12 h-12 bg-white/90 rounded-2xl items-center justify-center shadow-lg"
              >
                <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
              </Pressable>
              <View className="flex-row gap-3">
                <Pressable className="w-12 h-12 bg-white/90 rounded-2xl items-center justify-center shadow-lg">
                  <Share2 size={22} color="#1F2937" />
                </Pressable>
                <Pressable
                  onPress={() => toggleSavedItem(item.id)}
                  className="w-12 h-12 bg-white/90 rounded-2xl items-center justify-center shadow-lg"
                >
                  <Heart
                    size={22}
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

                {/* Bottom Gradient Overlay (Mocked via colored container) */}
                <View className="absolute bottom-0 w-full h-16 bg-white rounded-t-[40px]" />
              </View>

              {/* Content Body */}
              <View className="bg-white -mt-4 px-6 pb-32">

                {/* Badges & Rating */}
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row gap-2">
                    {item.badges?.map((badge: any, bidx: number) => (
                      <View key={bidx} className={`py-1.5 px-3 rounded-lg ${badge.type === 'green' ? 'bg-brandPrimary-soft' : 'bg-red-50'}`}>
                        <Text className={`text-[11px] font-bold tracking-wider uppercase ${badge.type === 'green' ? 'text-brandPrimary' : 'text-red-500'}`}>
                          {badge.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Text className="text-gray-900 font-bold text-sm">⭐ {item.rating}</Text>
                  </View>
                </View>

                <Text className="font-bold text-gray-900 text-3xl mb-2">{item.title}</Text>
                <View className="flex-row items-center mb-6">
                  <ShoppingBag size={16} color="#4B5563" />
                  <Text className="text-gray-600 font-medium ml-2 text-base">{item.store}</Text>
                </View>

                {/* Pricing Block */}
                <View className="bg-gray-50 rounded-[32px] p-6 flex-row items-center justify-between mb-8 border border-gray-100">
                  <View>
                    <Text className="text-gray-500 font-medium text-xs uppercase tracking-widest mb-1">Rescue Price</Text>
                    <View className="flex-row items-end gap-2">
                      <Text className="font-bold text-brandPrimary text-4xl leading-none">{item.price}</Text>
                      <Text className="text-gray-400 line-through text-lg mb-1">{item.oldPrice}</Text>
                    </View>
                  </View>
                  <View className="bg-brandPrimary px-4 py-2 rounded-2xl shadow-sm shadow-brandPrimary/20">
                    <Text className="text-white font-bold text-sm">{item.discount}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View className="mb-8">
                  <Text className="font-bold text-gray-900 text-xl mb-3">About this rescue</Text>
                  <Text className="text-gray-600 text-[15px] leading-relaxed">
                    {item.description || 'A great surplus deal! Save money and help the environment by rescuing this perfectly good item before it goes to waste.'}
                  </Text>
                </View>

                {/* Pickup Section */}
                <View className="bg-brandAccent-yellow rounded-[32px] p-6 mb-8 border border-yellow-100">
                  <Text className="font-bold text-yellow-900 text-xl mb-4">Pickup Window</Text>
                  <View className="flex-row items-center mb-5">
                    <View className="w-10 h-10 bg-white/80 rounded-xl items-center justify-center mr-4">
                      <MapPin size={20} color="#78350F" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-yellow-950">Store Location</Text>
                      <Text className="text-yellow-800 text-sm">{item.distance} away · Open now</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-white/80 rounded-xl items-center justify-center mr-4">
                      <Clock size={20} color="#78350F" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-yellow-950">Time Frame</Text>
                      <Text className="text-yellow-800 text-sm">Today, {item.time}</Text>
                    </View>
                  </View>
                </View>

                {/* Sustainability Badge */}
                <View className="flex-row items-center bg-green-50 p-5 rounded-[24px] border border-green-100 mb-4">
                  <ShieldCheck size={24} color="#1B7A49" />
                  <Text className="flex-1 ml-4 text-brandPrimary font-medium text-sm leading-snug">
                    By rescuing this item, you're preventing roughly <Text className="font-bold">1.2kg of CO2</Text> emissions!
                  </Text>
                </View>

                {/* Bottom Spacer to prevent overlap with sticky footer */}
                <View className="h-20" />
              </View>
            </ScrollView>

            {/* Fixed Sticky Footer */}
            <SafeAreaView edges={['bottom']} className="absolute bottom-0 w-full bg-white border-t border-gray-100 shadow-2xl">
              <View className="px-6 pt-4 pb-10">
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-0.5">Remaining</Text>
                    <Text className="text-gray-900 font-bold text-lg">{item.quantity} items left</Text>
                  </View>
                  <Text className="text-brandPrimary font-bold text-2xl">{item.price}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (existingOrder) {
                      router.dismiss();
                      setTimeout(() => {
                        router.push(`/order/${existingOrder.id}` as any);
                      }, 100);
                    } else {
                      openModal();
                    }
                  }}
                  className={`w-full py-5 rounded-full items-center shadow-lg active:opacity-90 ${existingOrder ? 'bg-gray-900 shadow-gray-900/30' : 'bg-brandPrimary shadow-brandPrimary/30'}`}
                >
                  <Text className="text-white font-bold text-xl tracking-tight">
                    {existingOrder ? 'View Order Details' : 'Reserve Now'}
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
                  style={{ transform: [{ translateY: slideAnim }] }}
                  className="bg-background rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl"
                >
                  <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-2xl font-bold text-gray-900">Confirm Reservation</Text>
                    <Pressable onPress={closeModal} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                      <X size={20} color="#374151" />
                    </Pressable>
                  </View>

                  {/* Order Summary Card */}
                  <View className="bg-white p-5 rounded-3xl border border-gray-100 mb-8 shadow-sm">
                    <View className="flex-row items-center mb-4">
                      <View className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden mr-4">
                        <Image source={{ uri: item.image }} style={{ width: 48, height: 48 }} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-gray-900 text-lg mb-0.5">{item.title}</Text>
                        <Text className="text-gray-500 text-sm">{item.store}</Text>
                      </View>
                    </View>

                    <View className="bg-brandAccent-yellow p-3 rounded-2xl flex-row items-center mb-4">
                      <Clock size={16} color="#78350F" />
                      <Text className="ml-2 text-yellow-900 font-medium text-sm">Pickup today, {item.time}</Text>
                    </View>

                    <View className="flex-row justify-between items-center border-t border-gray-50 pt-4">
                      <Text className="text-gray-600 font-medium">Total Price</Text>
                      <Text className="text-brandPrimary font-bold text-2xl">{item.price}</Text>
                    </View>
                  </View>

                  {/* Placeholder for the actual Firebase Transaction */}
                  <Pressable
                    onPress={handleBuy}
                    className="bg-brandPrimary py-5 rounded-full items-center shadow-lg shadow-brandPrimary/30 active:opacity-90"
                  >
                    <Text className="text-white font-bold text-xl tracking-tight">Swipe to Buy ➔</Text>
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
