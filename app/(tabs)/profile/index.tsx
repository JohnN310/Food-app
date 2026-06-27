import AddressAutocomplete from '@/components/AddressAutocomplete';
import { auth, db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { useRouter, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChevronRight, CreditCard, HelpCircle, LogOut, MessageCircle, Phone, RefreshCw, Save, Settings, Shield, Star, Trash2, User, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const setRole = useAppStore(state => state.setRole);
  const user = useAppStore(state => state.user);
  const [username, setUsername] = useState('Loading...');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const slideAnim = useRef(new Animated.Value(height)).current;

  const openEditModal = () => {
    setIsEditing(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14
    }).start();
  };

  const closeEditModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsEditing(false);
    });
  };

  const DIETARY_OPTIONS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal'];

  const unreadMessagesCount = useAppStore(state => state.unreadMessagesCount);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUsername(data.username || 'Valued User');
            setPhone(data.phone || '');
            setAddress(data.address || '');
            setLatitude(data.latitude || null);
            setLongitude(data.longitude || null);
            setDietaryPrefs(data.dietaryPreferences || []);
            setOriginalData(data);
          } else {
            setUsername('Valued User');
            setOriginalData({});
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUsername('Valued User');
        }
      };
      fetchUserData();
    }, [user?.uid])
  );

  const togglePreference = (pref: string) => {
    setDietaryPrefs(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]);
  };

  const hasChanges = originalData && (
    username.trim() !== (originalData.username || 'Valued User') ||
    phone.trim() !== (originalData.phone || '') ||
    address.trim() !== (originalData.address || '') ||
    latitude !== (originalData.latitude || null) ||
    longitude !== (originalData.longitude || null) ||
    JSON.stringify([...dietaryPrefs].sort()) !== JSON.stringify([...(originalData.dietaryPreferences || [])].sort())
  );

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    if (!username.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    setIsSaving(true);
    try {
      const updatePayload: any = {
        username: username.trim(),
        phone: phone.trim(),
        address: address.trim(),
        dietaryPreferences: dietaryPrefs
      };
      if (latitude !== null) updatePayload.latitude = latitude;
      if (longitude !== null) updatePayload.longitude = longitude;

      await updateDoc(doc(db, 'users', user.uid), updatePayload);
      setOriginalData({
        ...originalData,
        ...updatePayload
      });
      closeEditModal();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Sign Out Error', 'Failed to securely sign out.');
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      <ScrollView style={{ paddingHorizontal: scale(20), paddingTop: verticalScale(16) }} className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ marginBottom: verticalScale(20) }} className="flex-row justify-between items-center">
          <Text style={{ fontSize: moderateScale(28) }} className="font-extrabold text-gray-900 tracking-tight">Profile</Text>
        </View>

        {/* User Card */}
        <Modal visible={isEditing} animationType="fade" transparent={true} onRequestClose={closeEditModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
            <Pressable
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              className="bg-black/40"
              onPress={closeEditModal}
            />
            <Animated.View
              style={{ transform: [{ translateY: slideAnim }], maxHeight: '90%' }}
              className="bg-[#FAFAF5] rounded-t-[32px] pt-4 pb-10 shadow-2xl"
            >
              <View style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(16), paddingBottom: verticalScale(16), marginBottom: verticalScale(16) }} className="flex-row items-start justify-between border-b border-gray-100">
                <View className="flex-row items-center flex-1 pr-4">
                  <View style={{ width: scale(40), height: scale(40), borderRadius: scale(12) }} className="bg-[#F0FDF4] items-center justify-center mr-3">
                    <User size={scale(20)} color="#166534" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">Edit Profile</Text>
                    <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(2) }} className="text-gray-500">Update your personal details</Text>
                  </View>
                </View>
                <Pressable onPress={closeEditModal} style={{ width: scale(36), height: scale(36) }} className="bg-gray-100 rounded-full items-center justify-center">
                  <X size={scale(18)} color="#4B5563" />
                </Pressable>
              </View>
              <ScrollView style={{ paddingHorizontal: scale(24) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Display Name</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="flex-row items-center bg-white border border-gray-100 shadow-sm">
                  <User size={scale(20)} color="#9CA3AF" />
                  <TextInput value={username} onChangeText={setUsername} placeholder="Your Name" placeholderTextColor="#6B7280" style={{ fontSize: moderateScale(16), marginLeft: scale(12) }} className="flex-1 text-gray-900 font-medium" />
                </View>

                <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Phone Number</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="flex-row items-center bg-white border border-gray-100 shadow-sm">
                  <Phone size={scale(20)} color="#9CA3AF" />
                  <TextInput value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor="#6B7280" keyboardType="phone-pad" style={{ fontSize: moderateScale(16), marginLeft: scale(12) }} className="flex-1 text-gray-900 font-medium" />
                </View>

                <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Location</Text>
                <AddressAutocomplete
                  value={address}
                  onChangeAddress={(newAddress, lat, lon) => {
                    setAddress(newAddress);
                    if (lat !== undefined) setLatitude(lat);
                    if (lon !== undefined) setLongitude(lon);
                  }}
                  placeholder="e.g. 123 Main St, Portland"
                />

                <Text style={{ fontSize: moderateScale(12), marginBottom: verticalScale(12), marginTop: verticalScale(8) }} className="font-bold text-gray-400 tracking-wider">DIETARY PREFERENCES</Text>
                <View style={{ gap: scale(8), marginBottom: verticalScale(24) }} className="flex-row flex-wrap">
                  {DIETARY_OPTIONS.map((pref) => {
                    const isActive = dietaryPrefs.includes(pref);
                    return (
                      <Pressable
                        key={pref}
                        onPress={() => togglePreference(pref)}
                        style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(999) }}
                        className={`border ${isActive ? 'bg-[#E1F0E8] border-[#1B7A49]' : 'bg-white border-gray-200'}`}
                      >
                        <Text style={{ fontSize: moderateScale(14) }} className={`font-semibold ${isActive ? 'text-[#1B7A49]' : 'text-gray-500'}`}>{pref}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {hasChanges ? (
                  <Pressable onPress={handleSaveProfile} disabled={isSaving} style={{ padding: scale(16), marginBottom: verticalScale(40), borderRadius: scale(999) }} className={`flex-row items-center justify-center ${isSaving ? 'bg-[#1B7A49] opacity-70' : 'bg-[#1B7A49]'}`}>
                    {isSaving ? <ActivityIndicator color="white" /> : <><Save size={scale(20)} color="white" /><Text style={{ fontSize: moderateScale(18), marginLeft: scale(8) }} className="text-white font-bold">Save Changes</Text></>}
                  </Pressable>
                ) : (
                  <View style={{ marginBottom: verticalScale(40) }} />
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <View style={{ padding: scale(20), marginBottom: verticalScale(20), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm flex-row items-center active:opacity-90">
          <View style={{ width: scale(60), height: scale(60), borderRadius: scale(16) }} className="bg-[#FFF4E5] items-center justify-center border border-[#FFE4C4] overflow-hidden">
            <Image
              source={require('../../../assets/images/mascot_waving_1776538518453.png')}
              style={{ width: scale(44), height: scale(44) }}
              resizeMode="contain"
            />
          </View>
          <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
            <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900 tracking-tight">{username}</Text>
            <View style={{ paddingHorizontal: scale(10), paddingVertical: verticalScale(4), marginTop: verticalScale(4) }} className="bg-[#F1F8F4] self-start rounded-md border border-[#E1F0E8]">
              <Text style={{ fontSize: moderateScale(10) }} className="text-[#1B7A49] font-bold tracking-wider">BUYER MODE</Text>
            </View>
          </View>
          <Pressable onPress={openEditModal} style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(12) }} className="bg-white border border-gray-200">
            <Text style={{ fontSize: moderateScale(13) }} className="text-gray-700 font-bold">Edit</Text>
          </Pressable>
        </View>


        {/* Account Menu */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider">ACCOUNT</Text>
        <View style={{ marginBottom: verticalScale(24), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<CreditCard size={scale(18)} color="#1B7A49" />} title="Payment methods" subtitle="Cards, wallets & bank accounts" onPress={() => router.push('/profile/payment-methods')} />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          <MenuItem
            icon={<MessageCircle size={scale(18)} color="#1B7A49" />}
            title="Messages"
            subtitle="Chats with sellers"
            badge={unreadMessagesCount > 0 ? unreadMessagesCount.toString() : undefined}
            onPress={() => router.push('/profile/messages')}
          />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          {/* <MenuItem icon={<Gift size={scale(18)} color="#1B7A49" />} title="Promotions & rewards" subtitle="Vouchers, promo codes, referrals" onPress={() => router.push('/profile/promotions')} />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" /> */}
          <MenuItem icon={<Star size={scale(18)} color="#1B7A49" />} title="My feedback" subtitle="Send feedback to us" onPress={() => router.push('/profile/feedback')} />
        </View>

        {/* For Buyers Menu */}
        {/* <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider">FOR BUYERS</Text>
        <View style={{ marginBottom: verticalScale(24), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<Users size={scale(18)} color="#1B7A49" />} title="Invite friends" subtitle="Earn $1.99 voucher per friend" onPress={() => router.push('/profile/invite')} />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          <MenuItem icon={<Store size={scale(18)} color="#1B7A49" />} title="Recommend a store" subtitle="Help us bring more stores nearby" onPress={() => router.push('/profile/recommend')} />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          <MenuItem icon={<Key size={scale(18)} color="#1B7A49" />} title="Hidden stores" subtitle="Unlock private stores with a code" onPress={() => router.push('/profile/hidden-stores')} />
        </View> */}

        {/* Help & Policies */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider">HELP & POLICIES</Text>
        <View style={{ marginBottom: verticalScale(24), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<HelpCircle size={scale(20)} color="#1B7A49" />}
            title="Customer support"
            subtitle="AI assistant first, human if needed"
            onPress={() => router.push('/chat/support-buyer')}
          /><View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          <MenuItem icon={<Shield size={scale(18)} color="#1B7A49" />} title="Policies, terms & privacy" subtitle="Permissions, data, AI use" onPress={() => router.push('/profile/policies')} />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          <MenuItem icon={<Settings size={scale(18)} color="#1B7A49" />} title="Settings" subtitle="Language, notifications, app preferences" onPress={() => router.push('/profile/settings')} />
        </View>


        {/* Account Actions */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(8) }} className="font-bold text-gray-400 tracking-wider">ACCOUNT ACTIONS</Text>
        <View style={{ marginBottom: verticalScale(32), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<LogOut size={scale(18)} color="#1B7A49" />} title="Sign out" onPress={handleSignOut} />
          <View style={{ height: 1, marginLeft: scale(68) }} className="bg-gray-50" />
          <MenuItem
            icon={<Trash2 size={scale(18)} color="#E53935" />}
            iconBgColor="bg-red-50"
            iconBorderColor="border-red-100"
            title="Delete account"
            titleStyle="text-red-500"
            subtitle="Restorable within 7 days"
            onPress={() => Alert.alert('Action', 'Account marked for deletion')}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, subtitle, badge, onPress, iconBgColor = "bg-[#F1F8F4]", iconBorderColor = "border-[#E1F0E8]", titleStyle = "text-gray-900" }: any) {
  return (
    <Pressable onPress={onPress} style={{ padding: scale(16) }} className="flex-row items-center active:bg-gray-50">
      <View style={{ width: scale(44), height: scale(44), borderRadius: scale(14) }} className={`items-center justify-center ${iconBgColor} border ${iconBorderColor}`}>
        {icon}
      </View>
      <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
        <Text style={{ fontSize: moderateScale(15) }} className={`font-bold ${titleStyle}`}>{title}</Text>
        {subtitle && <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(2) }} className="text-gray-500">{subtitle}</Text>}
      </View>
      {badge && (
        <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), marginRight: scale(12) }} className="bg-red-500 rounded-full items-center justify-center border border-red-600">
          <Text style={{ fontSize: moderateScale(10) }} className="text-white font-bold">{badge}</Text>
        </View>
      )}
      <ChevronRight size={scale(18)} color="#D1D5DB" />
    </Pressable>
  );
}
