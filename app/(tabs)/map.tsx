import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, Dimensions, PanResponder, TextInput, Keyboard } from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { useAppStore } from '@/store/app-store';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { Clock, Heart, ShoppingBag, X, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapScreen() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const savedItems = useAppStore(state => state.savedItems) || [];
  const toggleSavedItem = useAppStore(state => state.toggleSavedItem);
  
  const [buyerLocation, setBuyerLocation] = useState<{lat: number, lon: number} | null>(null);
  const [sellersList, setSellersList] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const initialized = useRef(false);

  // Bottom Sheet Dimensions & Animation
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const MAX_HEIGHT = SCREEN_HEIGHT * 0.85; 
  const MIN_HEIGHT = SCREEN_HEIGHT * 0.40;
  const COLLAPSED_OFFSET = MAX_HEIGHT - MIN_HEIGHT;
  const EXPANDED_OFFSET = 0;
  const HIDDEN_OFFSET = MAX_HEIGHT + 100;

  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const currentOffset = useRef(HIDDEN_OFFSET);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      currentOffset.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        translateY.setOffset(currentOffset.current);
        translateY.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: translateY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        
        if (currentOffset.current < EXPANDED_OFFSET) {
           Animated.spring(translateY, {
             toValue: EXPANDED_OFFSET,
             useNativeDriver: false,
             friction: 8,
           }).start();
           return;
        }

        if (gestureState.vy < -0.5 || currentOffset.current < COLLAPSED_OFFSET * 0.6) {
          Animated.spring(translateY, {
            toValue: EXPANDED_OFFSET,
            useNativeDriver: false,
            friction: 8,
          }).start();
        } else if (gestureState.vy > 1.5 || currentOffset.current > COLLAPSED_OFFSET + 80) {
          setIsDismissed(true);
        } else {
          Animated.spring(translateY, {
            toValue: COLLAPSED_OFFSET,
            useNativeDriver: false,
            friction: 8,
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    if (!user) return;
    
    // Fetch sellers
    const qSellers = query(collection(db, 'users'), where('role', '==', 'seller'));
    const unsubscribeSellers = onSnapshot(qSellers, (snapshot) => {
      const sList: any[] = [];
      snapshot.forEach(docSnap => {
        sList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSellersList(sList);
    });

    // Fetch active listings
    const qListings = query(collection(db, 'listings'), where('status', '==', 'active'));
    const unsubscribeListings = onSnapshot(qListings, (snapshot) => {
      const lList: any[] = [];
      snapshot.forEach(docSnap => {
        lList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setListings(lList);
    });

    // Fetch buyer location
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.latitude !== undefined && data.longitude !== undefined) {
          const newLoc = { lat: data.latitude, lon: data.longitude };
          setBuyerLocation(newLoc);
          
          if (!initialized.current) {
            initialized.current = true;
            mapRef.current?.animateToRegion({
              latitude: newLoc.lat,
              longitude: newLoc.lon,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }, 1000);
          }
        }
      }
    });

    return () => {
      unsubscribeSellers();
      unsubscribeListings();
      unsubscribeUser();
    };
  }, [user]);

  // Compute visible listings based on current map region
  const visibleListings = useMemo(() => {
    if (!currentRegion) return [];
    
    const minLat = currentRegion.latitude - currentRegion.latitudeDelta / 2;
    const maxLat = currentRegion.latitude + currentRegion.latitudeDelta / 2;
    const minLon = currentRegion.longitude - currentRegion.longitudeDelta / 2;
    const maxLon = currentRegion.longitude + currentRegion.longitudeDelta / 2;

    const visibleSellers = sellersList.filter(seller => {
      const lat = Number(seller.latitude);
      const lon = Number(seller.longitude);
      return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    });

    const visibleSellerIds = new Set(visibleSellers.map(s => s.id));
    
    if (selectedSellerId) {
      return listings.filter(item => item.sellerId === selectedSellerId);
    }
    
    return listings.filter(item => visibleSellerIds.has(item.sellerId));
  }, [currentRegion, sellersList, listings, selectedSellerId]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { stores: [], items: [] };
    
    const query = searchQuery.toLowerCase();
    const matchedStores = sellersList.filter(s => s.storeName?.toLowerCase().includes(query));
    const matchedItems = listings.filter(l => l.title?.toLowerCase().includes(query));
    
    return { stores: matchedStores, items: matchedItems };
  }, [searchQuery, sellersList, listings]);

  const handleSelectSearchResult = (sellerId: string, lat: number, lon: number) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearching(false);
    
    if (mapRef.current && lat && lon) {
      mapRef.current.animateToRegion({
        latitude: Number(lat),
        longitude: Number(lon),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    setSelectedSellerId(sellerId);
    setIsDismissed(false);
  };

  // Animate bottom sheet
  useEffect(() => {
    if (visibleListings.length > 0 && !isDismissed) {
      Animated.spring(translateY, {
        toValue: COLLAPSED_OFFSET,
        useNativeDriver: false,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: HIDDEN_OFFSET,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [visibleListings.length, isDismissed, translateY, COLLAPSED_OFFSET, HIDDEN_OFFSET]);

  const innerHeight = translateY.interpolate({
    inputRange: [-100, 0, MAX_HEIGHT],
    outputRange: [MAX_HEIGHT + 100, MAX_HEIGHT, 0],
    extrapolateRight: 'clamp',
  });

  const searchBarOpacity = translateY.interpolate({
    inputRange: [0, COLLAPSED_OFFSET * 0.5, COLLAPSED_OFFSET],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const searchBarTranslateY = translateY.interpolate({
    inputRange: [0, COLLAPSED_OFFSET],
    outputRange: [-150, 0],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1 bg-white">
      <MapView 
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 37.78825, // default fallback
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
        }}
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') {
            setSelectedSellerId(null);
          }
        }}
      >
        {buyerLocation && (
          <Marker
            identifier="buyer-location"
            coordinate={{ latitude: Number(buyerLocation.lat), longitude: Number(buyerLocation.lon) }}
            title="Home"
            description="Your home location"
            tracksViewChanges={false}
          >
            <View className="w-6 h-6 bg-[#1B7A49] rounded-full border-2 border-white shadow-sm items-center justify-center" />
          </Marker>
        )}
        
        {sellersList.map((seller: any) => {
          if (seller.latitude && seller.longitude) {
            return (
              <Marker
                key={seller.id}
                identifier={seller.id}
                coordinate={{ latitude: Number(seller.latitude), longitude: Number(seller.longitude) }}
                title={seller.storeName || 'Store'}
                description={seller.storeAddress || 'Address not provided'}
                tracksViewChanges={false}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedSellerId(seller.id);
                  setIsDismissed(false);
                }}
              >
                <View className={`w-8 h-8 rounded-full border-2 border-white shadow-sm items-center justify-center ${selectedSellerId === seller.id ? 'bg-[#1B7A49]' : 'bg-[#E53935]'}`}>
                  <Text className="text-white text-xs font-bold">🏪</Text>
                </View>
                <Callout>
                  <View className="p-2 w-48">
                    <Text className="font-bold text-gray-900 mb-1">{seller.storeName || 'Store'}</Text>
                    <Text className="text-gray-500 text-xs">{seller.storeAddress || 'No address provided'}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          }
          return null;
        })}
      </MapView>

      {/* Search Bar Overlay */}
      <Animated.View 
        style={{ 
          paddingTop: Math.max(insets.top, 16),
          opacity: searchBarOpacity,
          transform: [{ translateY: searchBarTranslateY }]
        }} 
        className="absolute top-0 left-0 right-0 z-20 px-4" 
        pointerEvents="box-none"
      >
        <View className="bg-white flex-row items-center rounded-full px-4 py-3 shadow-md border border-gray-100" style={{ elevation: 5 }}>
          <Search size={20} color="#6B7280" />
          <TextInput
            placeholder="Search stores or deals..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearching(true)}
            className="flex-1 ml-3 text-[15px] text-gray-900"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setIsSearching(false); Keyboard.dismiss(); }} className="p-1">
              <X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* Search Results Dropdown */}
        {isSearching && searchQuery.trim().length > 0 && (
          <View className="bg-white rounded-2xl mt-2 max-h-80 shadow-lg overflow-hidden border border-gray-100" style={{ elevation: 5 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {searchResults.stores.length === 0 && searchResults.items.length === 0 ? (
                <View className="p-5 items-center">
                  <Text className="text-gray-500">No results found</Text>
                </View>
              ) : (
                <>
                  {searchResults.stores.length > 0 && (
                    <View>
                      <Text className="px-4 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50">Stores</Text>
                      {searchResults.stores.map((store: any) => (
                        <Pressable 
                          key={`store-${store.id}`}
                          className="px-4 py-3 border-b border-gray-100 flex-row items-center bg-white"
                          onPress={() => handleSelectSearchResult(store.id, store.latitude, store.longitude)}
                        >
                          <View className="w-8 h-8 bg-[#F1F8F4] rounded-full items-center justify-center mr-3">
                            <Text className="text-xs">🏪</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="font-bold text-gray-900">{store.storeName}</Text>
                            <Text className="text-xs text-gray-500" numberOfLines={1}>{store.storeAddress}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {searchResults.items.length > 0 && (
                    <View>
                      <Text className="px-4 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50">Deals</Text>
                      {searchResults.items.map((item: any) => {
                        const store = sellersList.find(s => s.id === item.sellerId);
                        if (!store) return null;
                        return (
                          <Pressable 
                            key={`item-${item.id}`}
                            className="px-4 py-3 border-b border-gray-100 flex-row items-center bg-white"
                            onPress={() => handleSelectSearchResult(store.id, store.latitude, store.longitude)}
                          >
                            {item.image ? (
                              <Image source={{ uri: item.image }} className="w-8 h-8 rounded-md mr-3" />
                            ) : (
                              <View className="w-8 h-8 bg-[#F1F8F4] rounded-md items-center justify-center mr-3">
                                <ShoppingBag size={14} color="#1B7A49" />
                              </View>
                            )}
                            <View className="flex-1">
                              <Text className="font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                              <Text className="text-xs text-gray-500">at {store.storeName}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Floating Reopen Button */}
      {isDismissed && visibleListings.length > 0 && (
        <View className="absolute bottom-6 left-0 right-0 items-center">
          <Pressable 
            onPress={() => setIsDismissed(false)}
            className="bg-[#1B7A49] px-5 py-3 rounded-full shadow-lg flex-row items-center"
            style={{ elevation: 5 }}
          >
            <ShoppingBag size={16} color="white" />
            <Text className="text-white font-bold ml-2">Show {visibleListings.length} deals</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom List of Visible Items */}
      <Animated.View 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: MAX_HEIGHT,
          transform: [{ translateY: translateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <Animated.View 
          style={{ 
            height: innerHeight,
            backgroundColor: '#FAFAF5',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            width: '100%',
          }}
        >
          <View {...panResponder.panHandlers} className="w-full bg-transparent z-10">
            <View className="w-full pt-4 pb-2">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center" />
            </View>
            <View className="px-5 pb-3 flex-row justify-between items-center pointer-events-auto">
              <Text className="text-lg font-bold text-gray-900" numberOfLines={1} style={{ flex: 1, paddingRight: 10 }}>
                {visibleListings.length} {visibleListings.length === 1 ? 'deal' : 'deals'} {selectedSellerId ? `from ${sellersList.find(s => s.id === selectedSellerId)?.storeName || 'Store'}` : 'in this area'}
              </Text>
              <Pressable 
                onPress={() => {
                  setIsDismissed(true);
                  setSelectedSellerId(null);
                }}
                className="p-1.5 bg-gray-100 rounded-full"
              >
                <X size={18} color="#6B7280" />
              </Pressable>
            </View>
          </View>
        
        <ScrollView 
          className="px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {visibleListings.map(item => {
            const seller = sellersList.find(s => s.id === item.sellerId);
            const isSaved = savedItems.includes(item.id.toString());
            
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push({
                  pathname: "/listing/[id]",
                  params: {
                    id: item.id,
                    itemData: JSON.stringify({
                      ...item,
                      sellerData: seller
                    })
                  }
                })}
                className="bg-white rounded-[20px] border border-gray-100 p-4 mb-4 shadow-sm flex-row items-center"
              >
                <View className="w-[72px] h-[72px] bg-gray-100 rounded-xl overflow-hidden mr-4">
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: 72, height: 72 }} />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-[#F1F8F4]">
                      <ShoppingBag size={24} color="#1B7A49" />
                    </View>
                  )}
                </View>
                
                <View className="flex-1 justify-center py-1">
                  <Text className="font-bold text-gray-900 text-[17px] mb-1" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-gray-500 text-[12px] mb-1.5">{seller?.storeName || item.store}</Text>
                  
                  <View className="flex-row items-center justify-between mt-1">
                    <View className="flex-row items-center">
                      <Clock size={12} color="#6B7280" />
                      <Text className="text-gray-500 text-[11px] ml-1.5 font-medium">{item.time || "Time not set"}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="items-end">
                        <Text className="font-bold text-brandPrimary text-[15px]">{item.price}</Text>
                        <Text className="text-gray-400 line-through text-[10px]">{item.oldPrice}</Text>
                      </View>
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); toggleSavedItem(item.id.toString()); }}
                        className="p-1.5 bg-gray-50 rounded-full border border-gray-100"
                      >
                        <Heart size={16} color={isSaved ? "#E53935" : "#9CA3AF"} fill={isSaved ? "#E53935" : "transparent"} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
