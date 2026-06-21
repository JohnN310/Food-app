import AddressAutocomplete from '@/components/AddressAutocomplete';
import { auth, db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  ArrowLeftRight, Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  Phone,
  Save,
  Settings,
  Shield,
  Store,
  Trash2,
  User,
  X
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

const { height } = Dimensions.get('window');


function MenuItem({ icon, title, subtitle, onPress, iconBgColor = 'bg-brandPrimary-soft', titleStyle = 'text-gray-900' }: any) {
  return (
    <Pressable onPress={onPress} style={{ padding: scale(16) }} className="flex-row items-center active:bg-gray-50">
      <View style={{ width: scale(48), height: scale(48), borderRadius: scale(24) }} className={`items-center justify-center ${iconBgColor}`}>
        {icon}
      </View>
      <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
        <Text style={{ fontSize: moderateScale(15) }} className={`font-bold ${titleStyle}`}>{title}</Text>
        {subtitle && <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(2) }} className="text-gray-400">{subtitle}</Text>}
      </View>
      <ChevronRight size={scale(20)} color="#D1D5DB" />
    </Pressable>
  );
}

export default function SellerSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Pull BOTH setRole and user from Zustand
  const setRole = useAppStore(state => state.setRole);
  const user = useAppStore(state => state.user);

  const [username, setUsername] = useState('Loading...');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [merchantType, setMerchantType] = useState('Restaurant');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
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

  // Fetch the username
  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || 'Store Owner');
          setPhone(data.phone || '');
          setStoreName(data.storeName || '');
          setStoreDescription(data.storeDescription || '');
          setStoreAddress(data.storeAddress || '');
          setMerchantType(data.merchantType || 'Restaurant');
          setLatitude(data.latitude || null);
          setLongitude(data.longitude || null);
          setOriginalData(data);
        } else {
          setUsername('Store Owner');
          setOriginalData({});
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUsername('Store Owner');
      }
    };
    fetchUserData();
  }, [user?.uid]);

  const hasChanges = originalData && (
    username.trim() !== (originalData.username || 'Store Owner') ||
    phone.trim() !== (originalData.phone || '') ||
    storeName.trim() !== (originalData.storeName || '') ||
    storeDescription.trim() !== (originalData.storeDescription || '') ||
    storeAddress.trim() !== (originalData.storeAddress || '') ||
    merchantType !== (originalData.merchantType || 'Restaurant') ||
    latitude !== (originalData.latitude || null) ||
    longitude !== (originalData.longitude || null)
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
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        storeAddress: storeAddress.trim(),
        merchantType: merchantType,
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView style={{ paddingHorizontal: scale(16), paddingTop: verticalScale(24) }} className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ marginBottom: verticalScale(24) }}>
          <Text style={{ fontSize: moderateScale(13) }} className="text-gray-400 font-medium">Seller Portal</Text>
          <Text style={{ fontSize: moderateScale(28) }} className="font-bold text-gray-900">Settings</Text>
        </View>

        <Modal visible={isEditing} animationType="fade" transparent={true} onRequestClose={closeEditModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
            <Pressable
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              className="bg-black/40"
              onPress={closeEditModal}
            />
            <Animated.View
              style={{ transform: [{ translateY: slideAnim }], maxHeight: '90%', paddingTop: verticalScale(16), paddingBottom: verticalScale(40), borderTopLeftRadius: scale(32), borderTopRightRadius: scale(32) }}
              className="bg-background shadow-2xl"
            >
              <View style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(16), paddingBottom: verticalScale(16), marginBottom: verticalScale(16) }} className="flex-row items-center justify-between border-b border-gray-100">
                <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">Edit Profile</Text>
                <Pressable onPress={closeEditModal} style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-gray-100 items-center justify-center">
                  <X size={scale(20)} color="#374151" />
                </Pressable>
              </View>
              <ScrollView style={{ paddingHorizontal: scale(24) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Display Name</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="flex-row items-center bg-white border border-gray-100 shadow-sm">
                  <User size={scale(20)} color="#9CA3AF" />
                  <TextInput value={username} onChangeText={setUsername} placeholder="Your Name" placeholderTextColor="#6B7280" style={{ fontSize: moderateScale(15), marginLeft: scale(12) }} className="flex-1 text-gray-900 font-medium" />
                </View>

                <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Phone Number</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="flex-row items-center bg-white border border-gray-100 shadow-sm">
                  <Phone size={scale(20)} color="#9CA3AF" />
                  <TextInput value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor="#6B7280" keyboardType="phone-pad" style={{ fontSize: moderateScale(15), marginLeft: scale(12) }} className="flex-1 text-gray-900 font-medium" />
                </View>

                <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Store Name</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="flex-row items-center bg-white border border-gray-100 shadow-sm">
                  <Store size={scale(20)} color="#9CA3AF" />
                  <TextInput value={storeName} onChangeText={setStoreName} placeholder="Store Name" placeholderTextColor="#6B7280" style={{ fontSize: moderateScale(15), marginLeft: scale(12) }} className="flex-1 text-gray-900 font-medium" />
                </View>

                <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Store Description</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginBottom: verticalScale(16), borderRadius: scale(16) }} className="flex-row items-center bg-white border border-gray-100 shadow-sm">
                  <TextInput value={storeDescription} onChangeText={setStoreDescription} placeholder="Short description" placeholderTextColor="#6B7280" multiline style={{ fontSize: moderateScale(15), height: verticalScale(80) }} className="flex-1 text-gray-900 font-medium" textAlignVertical="top" />
                </View>

                <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Merchant Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: verticalScale(16) }} className="flex-row">
                  {['Restaurant', 'Café', 'Bakery', 'Beverage Shop', 'Food Stall', 'Grocery / Supermarket', 'Hotel / Catering', 'Other'].map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setMerchantType(type)}
                      style={{ marginRight: scale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(12) }}
                      className={`flex-row items-center border ${merchantType === type ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-100'}`}
                    >
                      <Text style={{ fontSize: moderateScale(13) }} className={`font-bold ${merchantType === type ? 'text-white' : 'text-gray-600'}`}>{type}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Store Address</Text>
                <AddressAutocomplete
                  value={storeAddress}
                  onChangeAddress={(address, lat, lon) => {
                    setStoreAddress(address);
                    if (lat !== undefined) setLatitude(lat);
                    if (lon !== undefined) setLongitude(lon);
                  }}
                  placeholder="123 Bakery St, City"
                />

                {hasChanges ? (
                  <Pressable onPress={handleSaveProfile} disabled={isSaving} style={{ padding: scale(16), borderRadius: scale(9999), marginBottom: verticalScale(40) }} className={`flex-row items-center justify-center ${isSaving ? 'bg-brandPrimary-hover opacity-70' : 'bg-brandPrimary'}`}>
                    {isSaving ? <ActivityIndicator color="white" /> : <><Save size={scale(20)} color="white" /><Text style={{ fontSize: moderateScale(16), marginLeft: scale(8) }} className="text-white font-bold">Save Changes</Text></>}
                  </Pressable>
                ) : (
                  <View style={{ marginBottom: verticalScale(40) }} />
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <View style={{ padding: scale(20), marginBottom: verticalScale(32), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm flex-row items-center">
          <View style={{ width: scale(64), height: scale(64), borderRadius: scale(32) }} className="bg-brandPrimary-soft items-center justify-center">
            <Store size={scale(32)} color="#1B7A49" />
          </View>
          <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
            <Text style={{ fontSize: moderateScale(16) }} className="font-bold text-gray-900">{username}</Text>
            {/* <Text className="text-gray-400 text-xs mb-1">ID TSG-{user?.uid?.slice(0, 8).toUpperCase() || '8421'}</Text> */}
            <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(6), marginTop: verticalScale(4) }} className="bg-[#FFF4E5] self-start">
              <Text style={{ fontSize: moderateScale(10) }} className="text-[#78350F] font-bold">🏪 Seller mode</Text>
            </View>
          </View>
          <Pressable onPress={openEditModal} style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(9999) }} className="bg-brandPrimary">
            <Text style={{ fontSize: moderateScale(13) }} className="text-white font-bold">Edit</Text>
          </Pressable>
        </View>

        {/* Account */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(4), letterSpacing: 1 }} className="font-bold text-gray-400 uppercase">ACCOUNT</Text>
        <View style={{ marginBottom: verticalScale(32), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<CreditCard size={scale(20)} color="#1B7A49" />}
            title="Payout methods"
            subtitle="Bank accounts & payment settings"
            onPress={() => router.push('/profile/payment-methods' as any)}
          />
          <View style={{ height: 1, marginLeft: scale(64) }} className="bg-gray-50" />
          <MenuItem
            icon={<Bell size={scale(20)} color="#1B7A49" />}
            title="Notifications"
            subtitle="Order alerts, promotions & news"
            onPress={() => router.push('/profile/settings' as any)}
          />
        </View>

        {/* Help & Policies */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(4), letterSpacing: 1 }} className="font-bold text-gray-400 uppercase">HELP & POLICIES</Text>
        <View style={{ marginBottom: verticalScale(32), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<HelpCircle size={scale(20)} color="#1B7A49" />}
            title="Seller support"
            subtitle="Get help with orders and listings"
            onPress={() => router.push('/profile/support' as any)}
          />
          <View style={{ height: 1, marginLeft: scale(64) }} className="bg-gray-50" />
          <MenuItem
            icon={<Shield size={scale(20)} color="#1B7A49" />}
            title="Policies & terms"
            subtitle="Seller agreement, data & privacy"
            onPress={() => router.push('/profile/policies' as any)}
          />
          <View style={{ height: 1, marginLeft: scale(64) }} className="bg-gray-50" />
          <MenuItem
            icon={<Settings size={scale(20)} color="#1B7A49" />}
            title="App preferences"
            subtitle="Language, display & more"
            onPress={() => router.push('/profile/settings' as any)}
          />
        </View>


        {/* Account Actions */}
        <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(8), marginLeft: scale(4), letterSpacing: 1 }} className="font-bold text-gray-400 uppercase">ACCOUNT ACTIONS</Text>
        <View style={{ marginBottom: verticalScale(32), borderRadius: scale(24) }} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<LogOut size={scale(20)} color="#1B7A49" />}
            title="Sign out"
            onPress={handleSignOut}
          />
          <View style={{ height: 1, marginLeft: scale(64) }} className="bg-gray-50" />
          <MenuItem
            icon={<Trash2 size={scale(20)} color="#E53935" />}
            iconBgColor="bg-red-50"
            title="Delete account"
            titleStyle="text-red-500"
            subtitle="Restorable within 7 days"
            onPress={() => Alert.alert('Action', 'Account marked for deletion')}
          />
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}
