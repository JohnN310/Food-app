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
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

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
            <View 
              style={{ width: scale(48), height: scale(48), borderRadius: scale(16) }}
              className="bg-[#F1F8F4] border border-[#E1F0E8] overflow-hidden justify-center items-center"
            >
              <Image
                source={require('../../assets/images/mascot_waving_1776538518453.png')}
                style={{ width: scale(40), height: scale(40) }}
                resizeMode="contain"
              />
            </View>
            <View className="mt-1">
              <Text style={{ fontSize: moderateScale(13) }} className="text-gray-500 font-medium">Good afternoon 👋</Text>
              <Text style={{ fontSize: moderateScale(22) }} className="font-extrabold text-gray-900 tracking-tight">Day of Taste</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={{ width: scale(40), height: scale(40) }}
            className="bg-white rounded-full items-center justify-center relative shadow-sm border border-gray-100 mt-1"
          >
            <Bell size={scale(20)} color="#374151" />
            {unreadMessagesCount > 0 && (
              <View 
                style={{ width: scale(16), height: scale(16) }}
                className="absolute -top-1 -right-1 bg-red-500 rounded-full border-2 border-white items-center justify-center"
              >
                <Text style={{ fontSize: moderateScale(10) }} className="text-white font-bold">{unreadMessagesCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="mb-5">
          <View 
            style={{ paddingHorizontal: scale(20), paddingVertical: verticalScale(14) }}
            className="flex-row items-center bg-white rounded-2xl shadow-sm border border-gray-100"
          >
            <Search size={scale(20)} color="#1B7A49" strokeWidth={2.5} />
            <TextInput
              style={{ fontSize: moderateScale(15) }}
              className="flex-1 ml-3 text-gray-900 font-medium"
              placeholder="Search rescue items nearby..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            <View className="h-6 w-[1px] bg-gray-100 mx-3" />
            <Pressable onPress={handleOpenMap}>
              <MapPin size={scale(20)} color="#1B7A49" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Categories: Horizontal Scroll with active state */}
        {listings.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: scale(20) }}
            className="mb-5 overflow-visible"
          >
            <View className="flex-row gap-3">
              <Pressable
                onPress={openSortFilterModal}
                style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(14) }}
                className="flex-row items-center bg-white border border-gray-200 shadow-sm"
              >
                <SlidersHorizontal size={scale(16)} color="#374151" />
                {(filterMerchantType.length > 0 || filterMinReview !== null || filterMaxPrice < 100 || filterExpiryDays !== null || sortBy !== 'Recommended') && (
                  <View 
                    style={{ width: scale(10), height: scale(10) }}
                    className="absolute top-1 right-1 bg-brandPrimary rounded-full border border-white" 
                  />
                )}
              </Pressable>

              {dynamicCategories.map((cat, idx) => {
                const isActive = activeCategory === cat.label;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setActiveCategory(cat.label)}
                    style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(14) }}
                    className={`flex-row items-center border shadow-sm ${isActive
                        ? 'bg-[#F1F8F4] border-[#1B7A49]/20'
                        : 'bg-white border-gray-100'
                      }`}
                  >
                    <Text className="text-sm mr-2">{cat.icon}</Text>
                    <Text style={{ fontSize: moderateScale(13) }} className={`font-bold ${isActive ? 'text-brandPrimary' : 'text-gray-600'}`}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Impact Banner */}
        <View style={{ borderRadius: scale(24), padding: scale(20) }} className="bg-[#F1F8F4] mb-6 flex-row items-center border border-[#E1F0E8]">
          <View style={{ width: scale(52), height: scale(52) }} className="bg-[#E1F0E8] rounded-full items-center justify-center mr-4 overflow-hidden relative">
            <Text style={{ fontSize: moderateScale(28) }} className="relative top-0.5 right-0.5">🌍</Text>
            <Text style={{ fontSize: moderateScale(16) }} className="absolute -top-1 -right-1">🌿</Text>
            <Text style={{ fontSize: moderateScale(14) }} className="absolute bottom-0 left-0">🌱</Text>
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: moderateScale(15) }} className="text-gray-900 font-bold mb-0.5">Today's Impact 🌿</Text>
            <Text style={{ fontSize: moderateScale(12) }} className="text-gray-600">
              {listings.length > 0
                ? `${listings.length} items available for rescue right now!`
                : "Be the first to rescue food in your area today!"}
            </Text>
          </View>
        </View>

        {/* Results List */}
        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text style={{ fontSize: moderateScale(20) }} className="font-bold text-gray-900 tracking-tight">
            {searchQuery ? 'Search Results' : 'Nearby Rescue Deals'}
          </Text>
          <Pressable onPress={() => Alert.alert('Navigation', 'See all deals.')}>
            <Text style={{ fontSize: moderateScale(13) }} className="text-brandPrimary font-semibold">See all</Text>
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
              style={{ borderRadius: scale(24), padding: scale(16), marginBottom: verticalScale(16) }}
              className={`bg-white border border-gray-100 shadow-sm active:opacity-90 ${isOutOfStock ? 'opacity-60' : ''}`}
            >
              {/* Header Row */}
              <View style={{ marginBottom: verticalScale(16) }} className="flex-row items-start">
                <View style={{ width: scale(68), height: scale(68), borderRadius: scale(16), marginRight: scale(12) }} className="bg-gray-100 overflow-hidden">
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: scale(68), height: scale(68) }} />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-[#F1F8F4]">
                      <ShoppingBag size={scale(24)} color="#1B7A49" />
                    </View>
                  )}
                  <View className="absolute bottom-0 left-0 right-0 bg-[#1B7A49]/90 items-center py-0.5">
                    <Text style={{ fontSize: moderateScale(10) }} className="text-white font-bold tracking-wider">{item.discount}</Text>
                  </View>
                </View>

                <View className="flex-1 pr-2 pt-1">
                  <View className="flex-row items-center mb-1">
                    <Text style={{ fontSize: moderateScale(17) }} className="font-bold text-gray-900 flex-1" numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Text style={{ fontSize: moderateScale(11) }} className="text-gray-500 mb-1.5">{sellersMap[item.sellerId]?.storeName || item.store}</Text>
                  <View className="flex-row items-center flex-wrap">
                    <View className="flex-row items-center mr-3 mt-0.5">
                      <Clock size={scale(12)} color="#6B7280" />
                      <Text style={{ fontSize: moderateScale(11) }} className="text-gray-500 ml-1.5 font-medium">{item.time || "Time not set"}</Text>
                    </View>
                    {computedDistance && (
                      <View className="flex-row items-center mt-0.5">
                        <MapPin size={scale(12)} color="#6B7280" />
                        <Text style={{ fontSize: moderateScale(11) }} className="text-gray-500 ml-1.5 font-medium">{computedDistance}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="items-end pt-1">
                  <View className="flex-row items-center">
                    {isOutOfStock ? (
                      <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), marginRight: scale(8) }} className="bg-red-50 rounded border border-red-100">
                        <Text style={{ fontSize: moderateScale(10) }} className="text-red-500 font-bold">Sold Out</Text>
                      </View>
                    ) : (item.quantity !== undefined && item.quantity <= 10) ? (
                      <Text style={{ fontSize: moderateScale(10) }} className="text-orange-600 font-bold mr-2">Only {item.quantity} left!</Text>
                    ) : null}
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); toggleSavedItem(item.id.toString()); }}
                      style={{ padding: scale(4), marginBottom: verticalScale(4) }}
                      className="bg-gray-50 rounded-full border border-gray-100"
                    >
                      <Heart size={scale(16)} color={isSaved ? "#E53935" : "#9CA3AF"} fill={isSaved ? "#E53935" : "transparent"} />
                    </Pressable>
                  </View>
                  <View className="flex-row items-end gap-1 mt-1">
                    <Text style={{ fontSize: moderateScale(17) }} className="font-bold text-brandPrimary">{item.price}</Text>
                  </View>
                  <Text style={{ fontSize: moderateScale(10) }} className="text-gray-400 line-through mt-0.5">{item.oldPrice}</Text>
                </View>
              </View>

              {/* Inner Card Content Row */}
              <View style={{ borderRadius: scale(16), padding: scale(12) }} className="bg-[#FAFAF5] flex-row items-center border border-gray-50">
                <View className="flex-1">
                  <Text style={{ fontSize: moderateScale(11) }} className="text-gray-500 leading-tight pr-4" numberOfLines={2}>
                    {item.description || 'A delicious surprise bag containing assorted items and baked goods.'}
                  </Text>
                </View>
                {sellersMap[item.sellerId]?.averageRating && (
                  <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(4) }} className="flex-row items-center bg-white rounded-lg border border-gray-100 shadow-sm">
                    <Text style={{ fontSize: moderateScale(12) }} className="font-bold text-yellow-500">⭐ {sellersMap[item.sellerId].averageRating}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )
        }) : (
          <View style={{ borderRadius: scale(24), padding: scale(40) }} className="bg-white items-center justify-center border border-gray-100">
            <Text style={{ fontSize: moderateScale(14) }} className="text-gray-500 font-medium text-center">
              No deals match your search or category choice.
            </Text>
          </View>
        )}

        {/* Map Modal */}
        <Modal visible={isMapVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsMapVisible(false)}>
          <View className="flex-1 bg-[#FAFAF5]">
            <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16) }} className="flex-row items-center justify-between border-b border-gray-100 bg-white shadow-sm relative">
              <View style={{ width: scale(40), height: scale(40) }} />
              <View className="absolute left-0 right-0 items-center pointer-events-none">
                <Text style={{ fontSize: moderateScale(20) }} className="font-bold text-gray-900">Select Location</Text>
              </View>
              <Pressable onPress={() => setIsMapVisible(false)} style={{ width: scale(40), height: scale(40) }} className="bg-gray-100 rounded-full items-center justify-center z-10">
                <X size={scale(20)} color="#374151" />
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
                    <View style={{ width: scale(24), height: scale(24) }} className="bg-[#1B7A49] rounded-full border-2 border-white shadow-sm items-center justify-center" />
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
                      <View style={{ width: scale(32), height: scale(32) }} className="rounded-full border-2 border-white shadow-sm items-center justify-center bg-[#E53935]">
                        <Text style={{ fontSize: moderateScale(12) }} className="text-white font-bold">🏪</Text>
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
                        <View style={{ padding: scale(8), maxWidth: scale(200) }}>
                          <Text style={{ fontSize: moderateScale(14) }} className="font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                          <Text style={{ fontSize: moderateScale(14) }} className="text-[#1B7A49] font-bold mt-1">{item.price}</Text>
                          <Text style={{ fontSize: moderateScale(10) }} className="font-bold text-gray-400 tracking-wider mt-1 uppercase">Tap to view deal</Text>
                        </View>
                      </Callout>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapView>
            <View style={{ padding: scale(20), paddingBottom: verticalScale(40) }} className="bg-white border-t border-gray-100 shadow-sm">
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text style={{ fontSize: moderateScale(14) }} className="font-bold text-gray-700">Search Radius</Text>
                  <Text style={{ fontSize: moderateScale(14) }} className="text-[#1B7A49] font-bold">{searchRadius} miles</Text>
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
                style={{ paddingVertical: verticalScale(16) }}
                className="bg-[#1B7A49] rounded-full items-center active:opacity-90 shadow-sm"
              >
                <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold tracking-wide">Save Location</Text>
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
            style={{ transform: [{ translateY: slideAnim }], maxHeight: '90%', borderTopLeftRadius: scale(32), borderTopRightRadius: scale(32), paddingTop: verticalScale(24), paddingHorizontal: scale(24), paddingBottom: verticalScale(40) }}
            className="bg-white shadow-2xl"
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">Sort & Filter</Text>
              <Pressable onPress={closeSortFilterModal} style={{ width: scale(40), height: scale(40) }} className="bg-gray-100 rounded-full items-center justify-center">
                <X size={scale(20)} color="#374151" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {/* Sort By */}
              <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900 mb-3">Sort By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 overflow-visible">
                {['Recommended', 'Distance', 'Price (Low to High)', 'Price (High to Low)', 'Quantity Available'].map(opt => (
                  <Pressable
                    key={opt}
                    onPress={() => setSortBy(opt)}
                    style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(10) }}
                    className={`mr-3 rounded-full border ${sortBy === opt ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-200'}`}
                  >
                    <Text style={{ fontSize: moderateScale(14) }} className={`font-medium ${sortBy === opt ? 'text-white' : 'text-gray-700'}`}>{opt}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Merchant Type */}
              <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900 mb-3">Merchant Type</Text>
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
                      style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(12) }}
                      className={`border ${isActive ? 'bg-brandPrimary-soft border-brandPrimary/30' : 'bg-white border-gray-200'}`}
                    >
                      <Text style={{ fontSize: moderateScale(14) }} className={`font-medium ${isActive ? 'text-brandPrimary' : 'text-gray-600'}`}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Review Score */}
              <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900 mb-3">Customer Review</Text>
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
                    style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(8) }}
                    className={`mr-3 rounded-full border ${filterMinReview === opt.val ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-200'}`}
                  >
                    <Text style={{ fontSize: moderateScale(14) }} className={`font-medium ${filterMinReview === opt.val ? 'text-white' : 'text-gray-700'}`}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Price Range */}
              <View className="mb-6">
                <View className="flex-row justify-between items-end mb-2">
                  <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900">Max Price</Text>
                  <Text style={{ fontSize: moderateScale(16) }} className="text-brandPrimary font-bold">
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
              <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900 mb-3">Expires within</Text>
              <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderRadius: scale(16) }} className="flex-row items-center bg-gray-50 border border-gray-100 mb-4 justify-between">
                <Text style={{ fontSize: moderateScale(14) }} className="text-gray-700 font-medium">Days from today</Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setFilterExpiryDays(prev => prev === null ? null : (prev === 0 ? null : prev - 1))}
                    style={{ width: scale(40), height: scale(40) }}
                    className="bg-white border border-gray-200 rounded-full items-center justify-center"
                  >
                    <Text style={{ fontSize: moderateScale(20) }} className="text-gray-600 font-bold">-</Text>
                  </Pressable>
                  <Text style={{ width: scale(48), fontSize: moderateScale(18) }} className="text-center font-bold text-gray-900">
                    {filterExpiryDays === null ? 'Any' : filterExpiryDays}
                  </Text>
                  <Pressable
                    onPress={() => setFilterExpiryDays(prev => prev === null ? 0 : prev + 1)}
                    style={{ width: scale(40), height: scale(40) }}
                    className="bg-brandPrimary rounded-full items-center justify-center"
                  >
                    <Text style={{ fontSize: moderateScale(20) }} className="text-white font-bold">+</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={{ paddingTop: verticalScale(16) }} className="flex-row gap-4 border-t border-gray-100">
              <Pressable
                onPress={() => {
                  setSortBy('Recommended');
                  setFilterMerchantType([]);
                  setFilterMinReview(null);
                  setFilterMaxPrice(100);
                  setFilterExpiryDays(null);
                }}
                style={{ paddingVertical: verticalScale(16) }}
                className="flex-1 items-center justify-center rounded-full bg-gray-100"
              >
                <Text style={{ fontSize: moderateScale(14) }} className="font-bold text-gray-700">Clear All</Text>
              </Pressable>
              <Pressable
                onPress={closeSortFilterModal}
                style={{ paddingVertical: verticalScale(16) }}
                className="flex-[2] items-center justify-center rounded-full bg-brandPrimary shadow-sm shadow-brandPrimary/30"
              >
                <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-white">Apply</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}