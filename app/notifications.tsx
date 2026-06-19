import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BellRing } from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 pt-4 pb-4 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="font-bold text-gray-900 text-xl">Notifications</Text>
        <View className="w-10 h-10" />
      </View>
      <View className="flex-1 items-center justify-center -mt-10 px-8">
        <View className="w-24 h-24 bg-brandPrimary-soft rounded-full items-center justify-center mb-6">
          <BellRing size={40} color="#1B7A49" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</Text>
        <Text className="text-gray-500 text-center">
          We'll notify you when new rescue deals pop up nearby.
        </Text>
      </View>
    </SafeAreaView>
  );
}
