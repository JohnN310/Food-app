import { useAppStore } from '@/store/app-store';
import { MOCK_DEALS } from '@/store/mockData';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Heart, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const { q } = useLocalSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(q ? String(q) : '');

  const savedItems = useAppStore(state => state.savedItems);
  const toggleSavedItem = useAppStore(state => state.toggleSavedItem);

  const performSearch = (term: string) => {
    return MOCK_DEALS.filter(deal =>
      deal.title.toLowerCase().includes(term.toLowerCase()) ||
      deal.category.toLowerCase().includes(term.toLowerCase())
    );
  };

  const results = performSearch(searchQuery);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 pt-4 mb-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <View className="flex-1 flex-row items-center bg-white ml-4 rounded-full px-4 py-2 border border-brandPrimary">
          <Search size={18} color="#1B7A49" />
          <TextInput
            className="flex-1 ml-3 text-gray-900 font-medium"
            placeholder="Search rescue items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="flex-row justify-between items-end mb-6 mt-4">
          <Text className="font-bold text-gray-900 text-lg">Results for "{searchQuery}"</Text>
          <Text className="text-gray-500 font-medium">{results.length} found</Text>
        </View>

        {results.length > 0 ? results.map((item) => {
          const isSaved = savedItems.includes(item.id.toString());
          return (
            <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}` as any)} className="bg-white rounded-3xl p-4 flex-row mb-4 shadow-sm border border-gray-100 relative">
              <View className="w-24 h-24 bg-gray-200 rounded-2xl relative overflow-hidden">
                <View className="absolute top-2 left-2 bg-brandPrimary px-2 py-1 rounded-md z-10">
                  <Text className="text-white text-xs font-bold">{item.discount}</Text>
                </View>
              </View>
              <View className="flex-1 ml-4 justify-between py-1">
                <View className="pr-6">
                  <Text className="font-bold text-gray-900 text-lg" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-gray-500 text-xs mt-1">⭐ {item.rating} · {item.store}</Text>
                </View>
                <View className="flex-row items-end justify-between mt-auto pt-2">
                  <View className="flex-row items-end gap-2">
                    <Text className="font-bold text-brandPrimary text-lg">{item.price}</Text>
                    <Text className="text-gray-400 line-through text-xs mb-1">{item.oldPrice}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => toggleSavedItem(item.id.toString())}
                className="absolute top-4 right-4 z-20 bg-white/80 rounded-full p-1.5"
              >
                <Heart size={20} color={isSaved ? "#E53935" : "#9CA3AF"} fill={isSaved ? "#E53935" : "transparent"} />
              </Pressable>
            </Pressable>
          )
        }) : (
          <View className="bg-white rounded-3xl p-8 items-center justify-center border border-gray-100 py-20 mt-8">
            <Search size={48} color="#D1D5DB" className="mb-4" />
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">No matching deals</Text>
            <Text className="text-gray-500 text-center">Try searching for generic terms like "Bread" or "Fruits".</Text>
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
