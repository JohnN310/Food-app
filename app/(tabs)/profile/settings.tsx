import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

function SettingsItem({ 
  title, 
  subtitle, 
  isLast, 
  onPress,
  type = 'chevron',
  value = false,
  onValueChange
}: { 
  title: string, 
  subtitle: string, 
  isLast?: boolean, 
  onPress?: () => void,
  type?: 'chevron' | 'switch',
  value?: boolean,
  onValueChange?: (val: boolean) => void
}) {
  return (
    <Pressable 
      onPress={type === 'switch' ? undefined : onPress} 
      style={{ padding: scale(16) }} 
      className={`flex-row items-center justify-between bg-white ${type === 'chevron' ? 'active:bg-gray-50' : ''} ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      <View className="flex-1 mr-4">
        <Text style={{ fontSize: moderateScale(15) }} className="font-bold text-gray-900">{title}</Text>
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(2) }} className="text-gray-500">{subtitle}</Text>
      </View>
      {type === 'chevron' ? (
        <ChevronRight size={scale(18)} color="#D1D5DB" />
      ) : (
        <Switch 
          value={value} 
          onValueChange={onValueChange} 
          trackColor={{ false: '#E5E7EB', true: '#1B7A49' }}
          thumbColor="#FFFFFF"
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [location, setLocation] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      {/* Header */}
      <View style={{ height: verticalScale(56), paddingHorizontal: scale(20) }} className="flex-row items-center justify-center relative">
        <Pressable 
          onPress={() => router.back()} 
          style={{ 
            width: scale(40), 
            height: scale(40),
            borderRadius: scale(20),
            position: 'absolute',
            left: scale(20),
          }} 
          className="bg-white items-center justify-center shadow-sm z-10"
        >
          <ArrowLeft size={scale(20)} color="#374151" />
        </Pressable>
        <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: scale(20) }} showsVerticalScrollIndicator={false}>
        
        {/* NOTIFICATIONS */}
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(24), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider uppercase">NOTIFICATIONS & ALERTS</Text>
        <View style={{ borderRadius: scale(24), overflow: 'hidden' }} className="bg-white border border-gray-100 shadow-sm mb-6">
          <SettingsItem 
            title="Push Notifications" 
            subtitle="Order status, delivery updates, and messages" 
            type="switch"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingsItem 
            title="Promotions & Offers" 
            subtitle="Emails and alerts about vouchers and new stores" 
            type="switch"
            value={marketing}
            onValueChange={setMarketing}
            isLast
          />
        </View>

        {/* PREFERENCES */}
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(8), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider uppercase">APP PREFERENCES</Text>
        <View style={{ borderRadius: scale(24), overflow: 'hidden' }} className="bg-white border border-gray-100 shadow-sm mb-6">
          <SettingsItem 
            title="Language" 
            subtitle="English (US)" 
            onPress={() => {}} 
          />
          <SettingsItem 
            title="Dark Mode" 
            subtitle="Switch between light and dark themes" 
            type="switch"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <SettingsItem 
            title="Precise Location" 
            subtitle="Used to show stores nearest to you" 
            type="switch"
            value={location}
            onValueChange={setLocation}
            isLast
          />
        </View>

        {/* SECURITY */}
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(8), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider uppercase">SECURITY</Text>
        <View style={{ borderRadius: scale(24), overflow: 'hidden' }} className="bg-white border border-gray-100 shadow-sm mb-12">
          <SettingsItem 
            title="Change Password" 
            subtitle="Update your account password" 
            onPress={() => {}} 
          />
          <SettingsItem 
            title="Two-Factor Authentication" 
            subtitle="Add an extra layer of security" 
            onPress={() => {}} 
            isLast
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
