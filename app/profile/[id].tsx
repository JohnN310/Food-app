import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings } from 'lucide-react-native';

export default function GenericProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Make the ID readable (e.g. 'payment-methods' -> 'Payment Methods')
  const titleStr = typeof id === 'string' 
    ? id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Profile Menu';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 pt-4 pb-4 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="font-bold text-gray-900 text-xl">{titleStr}</Text>
        <View className="w-10" />
      </View>
      <View className="flex-1 items-center justify-center px-8 pb-20">
        <View className="w-20 h-20 bg-brandAccent rounded-full items-center justify-center mb-6">
          <Settings size={32} color="#78350F" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">Under Construction</Text>
        <Text className="text-gray-500 text-center">
          The {titleStr} section is currently an empty placeholder screen.
        </Text>
      </View>
    </SafeAreaView>
  );
}
