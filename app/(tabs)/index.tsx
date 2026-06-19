import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Bell, Heart, MapPin, ShoppingBag, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { CATEGORY_ICONS } from '@/lib/constants';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return (R * c).toFixed(1) + " mi";
}

export default function HomeScreen() {
  const router = useRouter();

  // State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [sellersMap, setSellersMap] = useState<Record<string, any>>({});
  const [buyerLocation, setBuyerLocation] = useState<{lat: number, lon: number} | null>(null);

  // Store Data
  const user = useAppStore(state => state.user);
  const savedItems = useAppStore(state => state.savedItems) || [];
  const toggleSavedItem = useAppStore(state => state.toggleSavedItem);
  const unreadMessagesCount = useAppStore(state => state.unreadMessagesCount);

  // 1. Real-time Firebase Listener
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'listings'), where('status', '==', 'active'));
    const unsubscribeListings = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setListings(docs);
    }, (error) => {
      console.log("Listing listener error:", error.message);
    });

    const qSellers = query(collection(db, 'users'), where('role', '==', 'seller'));
    const unsubscribeSellers = onSnapshot(qSellers, (snapshot) => {
      const sMap: Record<string, any> = {};
      snapshot.forEach(doc => {
        sMap[doc.id] = doc.data();
      });
      setSellersMap(sMap);
    }, (error) => {
      console.log("Sellers listener error:", error.message);
    });

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.latitude !== undefined && data.longitude !== undefined) {
          setBuyerLocation({ lat: data.latitude, lon: data.longitude });
        } else {
          setBuyerLocation(null);
        }
      }
    });

    return () => {
      unsubscribeListings();
      unsubscribeSellers();
      unsubscribeUser();
    };
  }, [user]);

  // 2. Unified Filtering Logic (Category + Search)
  const filteredDeals = useMemo(() => {
    return listings.filter(deal => {
      // Category Match
      let matchesCategory = false;
      if (activeCategory === 'All') {
        matchesCategory = true;
      } else if (activeCategory === 'Saved') {
        matchesCategory = savedItems.includes(deal.id.toString());
      } else {
        matchesCategory = deal.category === activeCategory;
      }

      // Search Match (Title or Store)
      const search = searchQuery.toLowerCase();
      const actualStoreName = sellersMap[deal.sellerId]?.storeName || deal.store;
      const matchesSearch = deal.title.toLowerCase().includes(search) ||
        actualStoreName.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [listings, activeCategory, searchQuery, savedItems]);

  // 3. Dynamic Categories from Live Data
  const dynamicCategories = useMemo(() => {
    const unique = Array.from(new Set(listings.map(l => l.category))).filter(Boolean);
    const categories = [
      { label: 'All', icon: '🌟' }
    ];
    
    if (savedItems.length > 0) {
      categories.push({ label: 'Saved', icon: '❤️' });
    }
    
    return [
      ...categories,
      ...unique.map(cat => ({
        label: cat as string,
        icon: CATEGORY_ICONS[cat as string] || '🏷️'
      }))
    ];
  }, [listings, savedItems]);

  // Reset active category if 'Saved' is selected but no items are saved
  useEffect(() => {
    if (activeCategory === 'Saved' && savedItems.length === 0) {
      setActiveCategory('All');
    }
  }, [savedItems, activeCategory]);

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Identity & Notifications */}
        <View className="flex-row justify-between items-start mb-6">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-[16px] bg-[#F1F8F4] border border-[#E1F0E8] overflow-hidden justify-center items-center">
              <Image
                source={require('../../assets/images/mascot_waving_1776538518453.png')}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </View>
            <View className="mt-1">
              <Text className="text-gray-500 font-medium text-[13px]">Good afternoon 👋</Text>
              <Text className="text-2xl font-extrabold text-gray-900 tracking-tight">Things Still Good</Text>
            </View>
          </View>
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

        {/* Search Bar */}
        <View className="mb-5">
          <View className="flex-row items-center bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100">
            <Search size={20} color="#1B7A49" strokeWidth={2.5} />
            <TextInput
              className="flex-1 ml-3 text-gray-900 text-[15px] font-medium"
              placeholder="Search rescue items nearby..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            <View className="h-6 w-[1px] bg-gray-100 mx-3" />
            <Pressable onPress={() => Alert.alert('Filters', 'Open filter panel')}>
              <SlidersHorizontal size={20} color="#1B7A49" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Categories: Horizontal Scroll with active state */}
        {listings.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
            className="mb-5 overflow-visible"
          >
            <View className="flex-row gap-3">
              {dynamicCategories.map((cat, idx) => {
                const isActive = activeCategory === cat.label;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setActiveCategory(cat.label)}
                    className={`flex-row items-center px-4 py-2.5 rounded-[14px] border shadow-sm ${
                      isActive 
                        ? 'bg-[#F1F8F4] border-[#1B7A49]/20' 
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <Text className="text-sm mr-2">{cat.icon}</Text>
                    <Text className={`font-bold text-[13px] ${isActive ? 'text-brandPrimary' : 'text-gray-600'}`}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Impact Banner */}
        <View className="bg-[#F1F8F4] rounded-[24px] p-5 mb-6 flex-row items-center border border-[#E1F0E8]">
          <View className="w-[52px] h-[52px] bg-[#E1F0E8] rounded-full items-center justify-center mr-4 overflow-hidden relative">
            <Text className="text-3xl relative top-0.5 right-0.5">🌍</Text>
            <Text className="text-base absolute -top-1 -right-1">🌿</Text>
            <Text className="text-sm absolute bottom-0 left-0">🌱</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-[15px] mb-0.5">Today's Impact 🌿</Text>
            <Text className="text-gray-600 text-xs">
              {listings.length > 0
                ? `${listings.length} items available for rescue right now!`
                : "Be the first to rescue food in your area today!"}
            </Text>
          </View>
        </View>

        {/* Results List */}
        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="text-[20px] font-bold text-gray-900 tracking-tight">
            {searchQuery ? 'Search Results' : 'Nearby Rescue Deals'}
          </Text>
          <Pressable onPress={() => Alert.alert('Navigation', 'See all deals.')}>
            <Text className="text-brandPrimary font-semibold text-[13px]">See all</Text>
          </Pressable>
        </View>

        {filteredDeals.length > 0 ? filteredDeals.map((item) => {
          const isSaved = savedItems.includes(item.id.toString());
          
          let computedDistance = null;
          if (buyerLocation) {
            const itemLat = item.latitude !== undefined ? item.latitude : sellersMap[item.sellerId]?.latitude;
            const itemLon = item.longitude !== undefined ? item.longitude : sellersMap[item.sellerId]?.longitude;
            if (itemLat !== undefined && itemLon !== undefined) {
              computedDistance = calculateDistance(buyerLocation.lat, buyerLocation.lon, itemLat, itemLon);
            }
          }

          return (
            <Pressable
              key={item.id}
              onPress={() => router.push({
                pathname: "/listing/[id]",
                params: {
                  id: item.id,
                  itemData: JSON.stringify({
                    ...item,
                    sellerData: sellersMap[item.sellerId]
                  })
                }
              })}
              className="bg-white rounded-[24px] border border-gray-100 p-4 mb-4 shadow-sm active:opacity-90"
            >
              {/* Header Row */}
              <View className="flex-row items-start mb-4">
                <View className="w-[68px] h-[68px] bg-gray-100 rounded-[16px] overflow-hidden mr-3">
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: 68, height: 68 }} />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-[#F1F8F4]">
                      <ShoppingBag size={24} color="#1B7A49" />
                    </View>
                  )}
                  <View className="absolute bottom-0 left-0 right-0 bg-[#1B7A49]/90 items-center py-0.5">
                    <Text className="text-white text-[9px] font-bold tracking-wider">{item.discount}</Text>
                  </View>
                </View>
                
                <View className="flex-1 pr-2 pt-1">
                  <Text className="font-bold text-gray-900 text-[17px] mb-1" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-gray-500 text-[11px] mb-1.5">{sellersMap[item.sellerId]?.storeName || item.store}</Text>
                  <View className="flex-row items-center flex-wrap">
                    <View className="flex-row items-center mr-3 mt-0.5">
                      <Clock size={12} color="#6B7280" />
                      <Text className="text-gray-500 text-[11px] ml-1.5 font-medium">{item.time || "Time not set"}</Text>
                    </View>
                    {computedDistance && (
                      <View className="flex-row items-center mt-0.5">
                        <MapPin size={12} color="#6B7280" />
                        <Text className="text-gray-500 text-[11px] ml-1.5 font-medium">{computedDistance}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View className="items-end pt-1">
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); toggleSavedItem(item.id.toString()); }}
                    className="p-1 mb-1 bg-gray-50 rounded-full border border-gray-100"
                  >
                    <Heart size={16} color={isSaved ? "#E53935" : "#9CA3AF"} fill={isSaved ? "#E53935" : "transparent"} />
                  </Pressable>
                  <View className="flex-row items-end gap-1 mt-1">
                    <Text className="font-bold text-brandPrimary text-[17px]">{item.price}</Text>
                  </View>
                  <Text className="text-gray-400 line-through text-[10px] mt-0.5">{item.oldPrice}</Text>
                </View>
              </View>

              {/* Inner Card Content Row */}
              <View className="bg-[#FAFAF5] rounded-2xl p-3 flex-row items-center border border-gray-50">
                 <View className="flex-1">
                   <Text className="text-gray-500 text-[11px] leading-tight pr-4" numberOfLines={2}>
                     {item.description || 'A delicious surprise bag containing assorted items and baked goods.'}
                   </Text>
                 </View>
                 {sellersMap[item.sellerId]?.averageRating && (
                   <View className="flex-row items-center bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                      <Text className="font-bold text-yellow-500 text-[12px]">⭐ {sellersMap[item.sellerId].averageRating}</Text>
                   </View>
                 )}
              </View>
            </Pressable>
          )
        }) : (
          <View className="bg-white rounded-3xl p-10 items-center justify-center border border-gray-100">
            <Text className="text-gray-500 font-medium text-center">
              No deals match your search or category choice.
            </Text>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}