import { CATEGORY_ICONS } from '@/lib/constants';
import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Bell, Clock, Heart, MapPin, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1) + " mi";
}

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [sellersMap, setSellersMap] = useState<Record<string, any>>({});
  const [buyerLocation, setBuyerLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState(5);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Sort/Filter State
  const [isSortFilterModalVisible, setIsSortFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Recommended');
  const [filterMerchantType, setFilterMerchantType] = useState<string[]>([]);
  const [filterMinReview, setFilterMinReview] = useState<number | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(100);
  const [filterExpiryDays, setFilterExpiryDays] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openSortFilterModal = () => {
    setIsSortFilterModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  };

  const closeSortFilterModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsSortFilterModalVisible(false);
    });
  };

  // Store Data
  const user = useAppStore(state => state.user);
  const savedItems = useAppStore(state => state.savedItems) || [];
  const toggleSavedItem = useAppStore(state => state.toggleSavedItem);
  const unreadMessagesCount = useAppStore(state => state.unreadMessagesCount);

  const handleOpenMap = async () => {
    setIsMapVisible(true);
    if (buyerLocation) {
      setTempLocation(buyerLocation);
      setMapRegion({
        latitude: buyerLocation.lat,
        longitude: buyerLocation.lon,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } else {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required to set your pin automatically.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setTempLocation({ lat: location.coords.latitude, lon: location.coords.longitude });
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  const handleSaveLocation = async () => {
    if (tempLocation && user) {
      try {
        let addressStr = '';
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: tempLocation.lat,
            longitude: tempLocation.lon
          });

          if (reverseGeocode && reverseGeocode.length > 0) {
            const addr = reverseGeocode[0];
            const streetName = addr.street || addr.name || '';
            const streetNum = addr.streetNumber || '';
            const city = addr.city || addr.subregion || '';
            const region = addr.region || '';

            const parts = [];
            if (streetNum) parts.push(streetNum);
            if (streetName) parts.push(streetName);
            const streetString = parts.join(' ');

            const fullParts = [];
            if (streetString) fullParts.push(streetString);
            if (city) fullParts.push(city);
            if (region) fullParts.push(region);

            addressStr = fullParts.join(', ');
          }
        } catch (e) {
          console.log("Reverse geocode error:", e);
        }

        const updatePayload: any = {
          latitude: tempLocation.lat,
          longitude: tempLocation.lon,
          searchRadius: searchRadius,
        };

        if (addressStr) {
          updatePayload.address = addressStr;
        }

        await updateDoc(doc(db, 'users', user.uid), updatePayload);
        setBuyerLocation(tempLocation);
        setIsMapVisible(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to save location.');
      }
    }
  };

  // 1. Real-time Firebase Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'listings'), where('status', 'in', ['active', 'sold']));
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
        if (data.searchRadius !== undefined) {
          setSearchRadius(data.searchRadius);
        } else {
          setSearchRadius(5);
        }
      }
    });

    return () => {
      unsubscribeListings();
      unsubscribeSellers();
      unsubscribeUser();
    };
  }, [user]);

  useEffect(() => {
    if (tempLocation && mapRef.current && isMapVisible) {
      const radiusInMeters = searchRadius * 1609.34;
      const latDelta = (radiusInMeters * 2.2) / 111320;
      const lonDelta = latDelta;

      mapRef.current.animateToRegion({
        latitude: tempLocation.lat,
        longitude: tempLocation.lon,
        latitudeDelta: latDelta,
        longitudeDelta: lonDelta,
      }, 500);
    }
  }, [searchRadius, tempLocation, isMapVisible]);

  // 2. Unified Filtering Logic (Category + Search + Radius)
  const mapDeals = useMemo(() => {
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
  }, [listings, activeCategory, searchQuery, savedItems, sellersMap]);

  const filteredDeals = useMemo(() => {
    let result = mapDeals.filter(deal => {
      // 1. Radius
      let matchesRadius = true;
      if (buyerLocation) {
        const itemLat = deal.latitude !== undefined ? deal.latitude : sellersMap[deal.sellerId]?.latitude;
        const itemLon = deal.longitude !== undefined ? deal.longitude : sellersMap[deal.sellerId]?.longitude;
        if (itemLat !== undefined && itemLon !== undefined) {
          const distanceMiles = parseFloat(calculateDistance(buyerLocation.lat, buyerLocation.lon, itemLat, itemLon));
          if (distanceMiles > searchRadius) {
            matchesRadius = false;
          }
        }
      }
      if (!matchesRadius) return false;

      // 2. Merchant Type
      if (filterMerchantType.length > 0) {
        const type = sellersMap[deal.sellerId]?.merchantType || 'Other';
        if (!filterMerchantType.includes(type)) return false;
      }

      // 3. Customer Review
      if (filterMinReview !== null) {
        const rating = sellersMap[deal.sellerId]?.averageRating || 0;
        if (rating < filterMinReview) return false;
      }

      // 4. Max Price
      if (filterMaxPrice < 100) {
        const priceNum = parseFloat((deal.price || '$0').replace('$', ''));
        if (priceNum > filterMaxPrice) return false;
      }

      // 5. Expiry Limit
      if (filterExpiryDays !== null && deal.expiryTimestamp) {
        const expiryDate = new Date(deal.expiryTimestamp);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > filterExpiryDays) return false;
      } else if (filterExpiryDays !== null && !deal.expiryTimestamp) {
        return false;
      }

      return true;
    });

    // Sort logic
    result.sort((a, b) => {
      if (sortBy === 'Price (Low to High)') {
        const priceA = parseFloat((a.price || '$0').replace('$', ''));
        const priceB = parseFloat((b.price || '$0').replace('$', ''));
        return priceA - priceB;
      } else if (sortBy === 'Price (High to Low)') {
        const priceA = parseFloat((a.price || '$0').replace('$', ''));
        const priceB = parseFloat((b.price || '$0').replace('$', ''));
        return priceB - priceA;
      } else if (sortBy === 'Quantity Available') {
        const qA = a.quantity ?? 1;
        const qB = b.quantity ?? 1;
        return qB - qA;
      } else if (sortBy === 'Distance' && buyerLocation) {
        const latA = a.latitude !== undefined ? a.latitude : sellersMap[a.sellerId]?.latitude;
        const lonA = a.longitude !== undefined ? a.longitude : sellersMap[a.sellerId]?.longitude;
        const latB = b.latitude !== undefined ? b.latitude : sellersMap[b.sellerId]?.latitude;
        const lonB = b.longitude !== undefined ? b.longitude : sellersMap[b.sellerId]?.longitude;

        let distA = Infinity;
        let distB = Infinity;

        if (latA !== undefined && lonA !== undefined) {
          distA = parseFloat(calculateDistance(buyerLocation.lat, buyerLocation.lon, latA, lonA));
        }
        if (latB !== undefined && lonB !== undefined) {
          distB = parseFloat(calculateDistance(buyerLocation.lat, buyerLocation.lon, latB, lonB));
        }
        return distA - distB;
      }
      return 0;
    });

    return result;
  }, [mapDeals, buyerLocation, searchRadius, sellersMap, filterMerchantType, filterMinReview, filterMaxPrice, filterExpiryDays, sortBy]);

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
              <Text className="text-2xl font-extrabold text-gray-900 tracking-tight">Day of Taste</Text>
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
            <Pressable onPress={handleOpenMap}>
              <MapPin size={20} color="#1B7A49" strokeWidth={2} />
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
              <Pressable
                onPress={openSortFilterModal}
                className="flex-row items-center px-4 py-2.5 rounded-[14px] bg-white border border-gray-200 shadow-sm"
              >
                <SlidersHorizontal size={16} color="#374151" />
                {/* <Text className="font-bold text-[13px] text-gray-700 ml-2">Sort & Filter</Text> */}
                {(filterMerchantType.length > 0 || filterMinReview !== null || filterMaxPrice < 100 || filterExpiryDays !== null || sortBy !== 'Recommended') && (
                  <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-brandPrimary rounded-full border border-white" />
                )}
              </Pressable>

              {dynamicCategories.map((cat, idx) => {
                const isActive = activeCategory === cat.label;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setActiveCategory(cat.label)}
                    className={`flex-row items-center px-4 py-2.5 rounded-[14px] border shadow-sm ${isActive
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

          const isOutOfStock = (item.quantity !== undefined && item.quantity <= 0) || item.status === 'sold';

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
              className={`bg-white rounded-[24px] border border-gray-100 p-4 mb-4 shadow-sm active:opacity-90 ${isOutOfStock ? 'opacity-60' : ''}`}
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
                  <View className="flex-row items-center mb-1">
                    <Text className="font-bold text-gray-900 text-[17px] flex-1" numberOfLines={1}>{item.title}</Text>
                  </View>
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
                  <View className="flex-row items-center">
                    {isOutOfStock ? (
                      <View className="bg-red-50 px-2 py-0.5 rounded border border-red-100 mr-2">
                        <Text className="text-red-500 font-bold text-[10px]">Sold Out</Text>
                      </View>
                    ) : (item.quantity !== undefined && item.quantity <= 10) ? (
                      <Text className="text-orange-600 font-bold text-[10px] mr-2">Only {item.quantity} left!</Text>
                    ) : null}
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); toggleSavedItem(item.id.toString()); }}
                      className="p-1 mb-1 bg-gray-50 rounded-full border border-gray-100"
                    >
                      <Heart size={16} color={isSaved ? "#E53935" : "#9CA3AF"} fill={isSaved ? "#E53935" : "transparent"} />
                    </Pressable>
                  </View>
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

        {/* Map Modal */}
        <Modal visible={isMapVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsMapVisible(false)}>
          <View className="flex-1 bg-[#FAFAF5]">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100 bg-white shadow-sm relative">
              <View className="w-10 h-10" />
              <View className="absolute left-0 right-0 items-center pointer-events-none">
                <Text className="text-xl font-bold text-gray-900">Select Location</Text>
              </View>
              <Pressable onPress={() => setIsMapVisible(false)} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center z-10">
                <X size={20} color="#374151" />
              </Pressable>
            </View>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              region={mapRegion}
              onPress={(e) => {
                setTempLocation({
                  lat: e.nativeEvent.coordinate.latitude,
                  lon: e.nativeEvent.coordinate.longitude
                });
              }}
            >
              {tempLocation && (
                <>
                  <Circle
                    center={{ latitude: tempLocation.lat, longitude: tempLocation.lon }}
                    radius={searchRadius * 1609.34}
                    fillColor="rgba(59, 130, 246, 0.15)"
                    strokeColor="rgba(59, 130, 246, 0.6)"
                    strokeWidth={2}
                  />
                  <Marker
                    coordinate={{ latitude: tempLocation.lat, longitude: tempLocation.lon }}
                    title="Your Location"
                    description="Deals will be shown near here."
                    tracksViewChanges={false}
                  >
                    <View className="w-6 h-6 bg-[#1B7A49] rounded-full border-2 border-white shadow-sm items-center justify-center" />
                  </Marker>
                </>
              )}
              {mapDeals.map((item) => {
                const itemLat = item.latitude !== undefined ? item.latitude : sellersMap[item.sellerId]?.latitude;
                const itemLon = item.longitude !== undefined ? item.longitude : sellersMap[item.sellerId]?.longitude;
                if (itemLat !== undefined && itemLon !== undefined) {
                  return (
                    <Marker
                      key={item.id}
                      coordinate={{ latitude: itemLat, longitude: itemLon }}
                      tracksViewChanges={false}
                    >
                      <View className="w-8 h-8 rounded-full border-2 border-white shadow-sm items-center justify-center bg-[#E53935]">
                        <Text className="text-white text-xs font-bold">🏪</Text>
                      </View>
                      <Callout onPress={() => {
                        setIsMapVisible(false);
                        router.push({
                          pathname: "/listing/[id]",
                          params: {
                            id: item.id,
                            itemData: JSON.stringify({
                              ...item,
                              sellerData: sellersMap[item.sellerId]
                            })
                          }
                        });
                      }}>
                        <View className="p-2 max-w-[200px]">
                          <Text className="font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                          <Text className="text-[#1B7A49] font-bold mt-1">{item.price}</Text>
                          <Text className="text-[10px] font-bold text-gray-400 tracking-wider mt-1 uppercase">Tap to view deal</Text>
                        </View>
                      </Callout>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapView>
            <View className="p-5 bg-white border-t border-gray-100 shadow-sm pb-10">
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-bold text-gray-700">Search Radius</Text>
                  <Text className="text-[#1B7A49] font-bold">{searchRadius} miles</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={1}
                  maximumValue={50}
                  step={1}
                  value={searchRadius}
                  onValueChange={setSearchRadius}
                  minimumTrackTintColor="#1B7A49"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#1B7A49"
                />
              </View>
              <Pressable
                onPress={handleSaveLocation}
                className="bg-[#1B7A49] py-4 rounded-full items-center active:opacity-90 shadow-sm"
              >
                <Text className="text-white font-bold text-lg tracking-wide">Save Location</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View className="h-24" />
      </ScrollView>
      {/* Sort & Filter Modal */}
      <Modal visible={isSortFilterModalVisible} animationType="fade" transparent>
        <View className="flex-1 justify-end">
          <Pressable className="absolute top-0 bottom-0 left-0 right-0 bg-black/40" onPress={closeSortFilterModal} />
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }], maxHeight: '90%' }}
            className="bg-white rounded-t-[32px] pt-6 px-6 pb-10 shadow-2xl"
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">Sort & Filter</Text>
              <Pressable onPress={closeSortFilterModal} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                <X size={20} color="#374151" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {/* Sort By */}
              <Text className="font-bold text-gray-900 text-lg mb-3">Sort By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 overflow-visible">
                {['Recommended', 'Distance', 'Price (Low to High)', 'Price (High to Low)', 'Quantity Available'].map(opt => (
                  <Pressable
                    key={opt}
                    onPress={() => setSortBy(opt)}
                    className={`mr-3 px-4 py-2.5 rounded-full border ${sortBy === opt ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`font-medium ${sortBy === opt ? 'text-white' : 'text-gray-700'}`}>{opt}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Merchant Type */}
              <Text className="font-bold text-gray-900 text-lg mb-3">Merchant Type</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {['Restaurant', 'Café', 'Bakery', 'Beverage Shop', 'Food Stall', 'Grocery / Supermarket', 'Hotel / Catering', 'Other'].map(type => {
                  const isActive = filterMerchantType.includes(type);
                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        if (isActive) {
                          setFilterMerchantType(prev => prev.filter(t => t !== type));
                        } else {
                          setFilterMerchantType(prev => [...prev, type]);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl border ${isActive ? 'bg-brandPrimary-soft border-brandPrimary/30' : 'bg-white border-gray-200'}`}
                    >
                      <Text className={`font-medium text-sm ${isActive ? 'text-brandPrimary' : 'text-gray-600'}`}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Review Score */}
              <Text className="font-bold text-gray-900 text-lg mb-3">Customer Review</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 overflow-visible">
                {[
                  { label: 'Any', val: null },
                  { label: '⭐ 4.5 & up', val: 4.5 },
                  { label: '⭐ 4.0 & up', val: 4.0 },
                  { label: '⭐ 3.0 & up', val: 3.0 },
                ].map(opt => (
                  <Pressable
                    key={opt.label}
                    onPress={() => setFilterMinReview(opt.val)}
                    className={`mr-3 px-4 py-2 rounded-full border ${filterMinReview === opt.val ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`font-medium ${filterMinReview === opt.val ? 'text-white' : 'text-gray-700'}`}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Price Range */}
              <View className="mb-6">
                <View className="flex-row justify-between items-end mb-2">
                  <Text className="font-bold text-gray-900 text-lg">Max Price</Text>
                  <Text className="text-brandPrimary font-bold text-base">
                    {filterMaxPrice === 100 ? 'Any Price' : `Under $${filterMaxPrice}`}
                  </Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={5}
                  maximumValue={100}
                  step={5}
                  value={filterMaxPrice}
                  onValueChange={setFilterMaxPrice}
                  minimumTrackTintColor="#1B7A49"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#1B7A49"
                />
              </View>

              {/* Expiry Limit */}
              <Text className="font-bold text-gray-900 text-lg mb-3">Expires within</Text>
              <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 mb-4 px-4 py-3 justify-between">
                <Text className="text-gray-700 font-medium">Days from today</Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setFilterExpiryDays(prev => prev === null ? null : (prev === 0 ? null : prev - 1))}
                    className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold text-xl">-</Text>
                  </Pressable>
                  <Text className="w-12 text-center font-bold text-gray-900 text-lg">
                    {filterExpiryDays === null ? 'Any' : filterExpiryDays}
                  </Text>
                  <Pressable
                    onPress={() => setFilterExpiryDays(prev => prev === null ? 0 : prev + 1)}
                    className="w-10 h-10 bg-brandPrimary rounded-full items-center justify-center"
                  >
                    <Text className="text-white font-bold text-xl">+</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View className="flex-row gap-4 border-t border-gray-100 pt-4">
              <Pressable
                onPress={() => {
                  setSortBy('Recommended');
                  setFilterMerchantType([]);
                  setFilterMinReview(null);
                  setFilterMaxPrice(100);
                  setFilterExpiryDays(null);
                }}
                className="flex-1 py-4 items-center justify-center rounded-full bg-gray-100"
              >
                <Text className="font-bold text-gray-700">Clear All</Text>
              </Pressable>
              <Pressable
                onPress={closeSortFilterModal}
                className="flex-[2] py-4 items-center justify-center rounded-full bg-brandPrimary shadow-sm shadow-brandPrimary/30"
              >
                <Text className="font-bold text-white text-lg">Apply</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}