import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Clock, Heart, Info, MapPin, Share2, ShieldCheck, ShoppingBag, Store, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
            <Text className="mt-4 text-gray-500 font-medium">Fetching rescue details...</Text>
          </View>
        ) : !item ? (
          <View className="flex-1 justify-center items-center px-8 bg-background">
            <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-4">
              <Info size={40} color="#E53935" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">Item Not Found</Text>
            <Text className="text-gray-500 text-center mb-8">This item may have been rescued already or removed by the seller.</Text>
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

              </View>

              {/* Content Body */}
              <View className="bg-white -mt-8 pt-6 px-6 pb-32 rounded-t-[32px]">

                {/* Title & Rating */}
                <View className="flex-row justify-between items-start mb-2 pt-2">
                  <Text className="font-bold text-gray-900 text-3xl flex-1 mr-4">{item.title}</Text>
                  {item.sellerData?.averageRating && (
                    <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 mt-1">
                      <Text className="text-gray-900 font-bold text-sm">⭐ {item.sellerData.averageRating}</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center">
                    <Store size={16} color="#4B5563" />
                    <Text className="text-gray-600 font-medium ml-2 text-base">{item.sellerData?.storeName || item.store}</Text>
                  </View>
                  <Text className={`font-bold text-sm ${(item.quantity ?? 1) <= 0 ? 'text-red-500' : ((item.quantity ?? 1) <= 10 ? 'text-orange-600' : 'text-brandPrimary')}`}>
                    {(item.quantity ?? 1) <= 0 ? 'Out of stock' : ((item.quantity ?? 1) <= 10 ? `Only ${item.quantity ?? 1} left!` : 'In stock')}
                  </Text>
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

                {/* Seller Message 
                {item.message && (
                  <View className="bg-gray-50 rounded-[24px] p-5 mb-8 border border-gray-100">
                    <Text className="font-bold text-gray-900 text-[15px] mb-2 flex-row items-center">
                      Note from Seller
                    </Text>
                    <Text className="text-gray-600 text-[14px] leading-relaxed italic">
                      "{item.message}"
                    </Text>
                  </View>
                )}
                */}

                {/* Expiry Date */}
                {item.expiryTimestamp && (
                  <View className="mb-6 bg-red-50 p-4 rounded-2xl border border-red-100 flex-row items-center">
                    <Clock size={20} color="#DC2626" />
                    <Text className="ml-3 text-red-900 font-medium">
                      Good until: <Text className="font-bold">{new Date(item.expiryTimestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    </Text>
                  </View>
                )}

                {/* Pickup Section */}
                <View className="bg-brandAccent-yellow rounded-[32px] p-6 mb-8 border border-yellow-100">
                  <Text className="font-bold text-yellow-900 text-xl mb-4">Pickup Window</Text>
                  <View className="flex-row items-center mb-5">
                    <View className="w-10 h-10 bg-white/80 rounded-xl items-center justify-center mr-4">
                      <MapPin size={20} color="#78350F" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-yellow-950">Store Location</Text>
                      <Text className="text-yellow-800 text-sm">{item.sellerData?.storeAddress || 'Address not provided'}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-white/80 rounded-xl items-center justify-center mr-4">
                      <Clock size={20} color="#78350F" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-yellow-950">Time Frame</Text>
                      <Text className="text-yellow-800 text-sm">{item.time}</Text>
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
                    <Text className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-0.5">Total Price</Text>
                    <Text className="text-brandPrimary font-bold text-2xl">
                      ${(parseFloat((item.price || '$0').replace('$', '')) * purchaseQuantity).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-gray-50 rounded-full border border-gray-100">
                    <Pressable 
                      onPress={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                      className="w-10 h-10 items-center justify-center rounded-full"
                    >
                      <Text className="text-gray-600 font-bold text-xl">-</Text>
                    </Pressable>
                    <Text className="px-4 font-bold text-gray-900 text-lg">{purchaseQuantity}</Text>
                    <Pressable 
                      onPress={() => {
                        const maxQty = item.quantity ?? 1;
                        if (purchaseQuantity < maxQty) {
                          setPurchaseQuantity(purchaseQuantity + 1);
                        } else {
                          Alert.alert("Stock Limit Reached", `You can only reserve up to ${maxQty} of this item.`);
                        }
                      }}
                      className="w-10 h-10 items-center justify-center rounded-full bg-brandPrimary"
                    >
                      <Text className="text-white font-bold text-xl">+</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    if ((item.quantity ?? 1) <= 0) return;
                    openModal();
                  }}
                  disabled={(item.quantity ?? 1) <= 0}
                  className={`w-full py-5 rounded-full items-center shadow-lg ${
                    (item.quantity ?? 1) <= 0 
                      ? 'bg-gray-300 shadow-none' 
                      : 'active:opacity-90 bg-brandPrimary shadow-brandPrimary/30'
                  }`}
                >
                  <Text className="text-white font-bold text-xl tracking-tight">
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
                        <Text className="text-gray-500 text-sm">{item.sellerData?.storeName || item.store}</Text>
                      </View>
                    </View>

                    <View className="bg-brandAccent-yellow p-3 rounded-2xl flex-row items-center mb-4">
                      <Clock size={16} color="#78350F" />
                      <Text className="ml-2 text-yellow-900 font-medium text-sm">Pickup: {item.time}</Text>
                    </View>

                    <View className="flex-row justify-between items-center border-t border-gray-50 pt-4">
                      <Text className="text-gray-600 font-medium">Quantity</Text>
                      <Text className="font-bold text-gray-900 text-lg">x{purchaseQuantity}</Text>
                    </View>

                    <View className="flex-row justify-between items-center pt-2">
                      <Text className="text-gray-600 font-medium">Total Price</Text>
                      <Text className="text-brandPrimary font-bold text-2xl">
                        ${(parseFloat((item.price || '$0').replace('$', '')) * purchaseQuantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Placeholder for the actual Firebase Transaction */}
                  <Pressable
                    onPress={handleBuy}
                    className="bg-brandPrimary py-5 rounded-full items-center shadow-lg shadow-brandPrimary/30 active:opacity-90"
                  >
                    <Text className="text-white font-bold text-xl tracking-tight">Confirm</Text>
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
