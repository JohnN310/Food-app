import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useAppStore } from '@/store/app-store';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';

export default function MapScreen() {
  const user = useAppStore(state => state.user);
  const [buyerLocation, setBuyerLocation] = useState<{lat: number, lon: number} | null>(null);
  const [sellersList, setSellersList] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);
  const initialized = useRef(false);

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
      unsubscribeUser();
    };
  }, [user]);

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
              >
                <View className="w-8 h-8 bg-[#E53935] rounded-full border-2 border-white shadow-sm items-center justify-center">
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
    </View>
  );
}
