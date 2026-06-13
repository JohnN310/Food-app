import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Layers, MapPin, Navigation } from 'lucide-react-native';

export default function MapScreen() {
  const [region] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  return (
    <View className="flex-1 bg-background relative">
      <MapView 
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        customMapStyle={mapStyle}
      >
        {/* Markers will be rendered here dynamically */}
      </MapView>

      {/* Floating Search Bar */}
      <View className="absolute top-14 left-4 right-4 bg-white rounded-full flex-row items-center px-4 py-3 shadow-md border border-gray-100">
        <MapPin size={20} color="#1B7A49" />
        <Text className="flex-1 ml-3 font-medium text-gray-900">Your neighborhood</Text>
        <Layers size={20} color="#9CA3AF" />
      </View>

      {/* Map Controls */}
      <View className="absolute bottom-24 right-4 gap-3">
        <Pressable className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-md">
          <Text className="text-gray-600 text-xl font-bold">+</Text>
        </Pressable>
        <Pressable className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-md">
          <Text className="text-gray-600 text-xl font-bold">-</Text>
        </Pressable>
        <Pressable className="w-12 h-12 bg-brandPrimary rounded-full items-center justify-center shadow-md mt-2">
          <Navigation size={20} color="white" fill="white" />
        </Pressable>
      </View>

      {/* Bottom Filters */}
      <View className="absolute bottom-6 left-0 right-0 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable className="bg-white px-5 py-2 rounded-full border border-gray-200">
            <Text className="text-gray-700 font-medium">All</Text>
          </Pressable>
          <Pressable className="bg-brandAccent-DEFAULT px-5 py-2 rounded-full border border-orange-100">
            <Text className="text-yellow-900 font-medium">Bakery</Text>
          </Pressable>
          <Pressable className="bg-white px-5 py-2 rounded-full border border-gray-200">
            <Text className="text-gray-700 font-medium">Produce</Text>
          </Pressable>
          <Pressable className="bg-white px-5 py-2 rounded-full border border-gray-200">
            <Text className="text-gray-700 font-medium">Free</Text>
          </Pressable>
          <Pressable className="bg-white px-5 py-2 rounded-full border border-gray-200">
            <Text className="text-gray-700 font-medium">Expiring</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#E9F5ED"}] // soft green tint for map matching mockup
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#523735"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#f5f1e6"}]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#c9b2a6"}]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{"color": "#E9F5ED"}]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{"color": "#dfd2ae"}]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#93817c"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#C8E6D2"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#f5f1e6"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{"color": "#f8c967"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#d9e3f0"}] // light blue/grey
  }
];
