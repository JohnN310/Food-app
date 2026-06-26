import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

function PolicyItem({ title, subtitle, isLast, onPress }: { title: string, subtitle: string, isLast?: boolean, onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ padding: scale(16) }} className={`flex-row items-center justify-between bg-white active:bg-gray-50 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <View className="flex-1 mr-4">
        <Text style={{ fontSize: moderateScale(15) }} className="font-bold text-gray-900">{title}</Text>
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(2) }} className="text-gray-500">{subtitle}</Text>
      </View>
      <ChevronRight size={scale(18)} color="#D1D5DB" />
    </Pressable>
  );
}

export default function PoliciesScreen() {
  const router = useRouter();

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
        <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900">Policies</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: scale(20) }} showsVerticalScrollIndicator={false}>
        
        {/* POLICIES SECTION */}
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(24), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider uppercase">SELLER POLICIES</Text>
        <View style={{ borderRadius: scale(24), overflow: 'hidden' }} className="bg-white border border-gray-100 shadow-sm mb-6">
          <PolicyItem title="Merchant Agreement" subtitle="Rules for selling on DayofTaste" />
          <PolicyItem title="Payout & Refunds" subtitle="Handling disputes, refunds, and earnings" />
          <PolicyItem title="Food Safety & Hygiene" subtitle="Preparation and packaging guidelines" />
          <PolicyItem title="Privacy Policy" subtitle="How we collect and use your store data" isLast />
        </View>

        {/* APP & DATA SECTION */}
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(8), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider uppercase">APP & DATA</Text>
        <View style={{ borderRadius: scale(24), overflow: 'hidden' }} className="bg-white border border-gray-100 shadow-sm mb-12">
          <PolicyItem title="AI Use Policy" subtitle="How AI assists with store support" />
          <PolicyItem title="Permissions" subtitle="Location, notifications & camera access" />
          <PolicyItem title="Store Deletion Policy" subtitle="What happens when you close your store" isLast />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
