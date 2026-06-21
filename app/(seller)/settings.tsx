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

const { height } = Dimensions.get('window');


function MenuItem({ icon, title, subtitle, onPress, iconBgColor = 'bg-brandPrimary-soft', titleStyle = 'text-gray-900' }: any) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center p-4 active:bg-gray-50">
      <View className={`w-12 h-12 rounded-full items-center justify-center ${iconBgColor}`}>
        {icon}
      </View>
      <View className="flex-1 ml-4 justify-center">
        <Text className={`font-bold ${titleStyle}`}>{title}</Text>
        {subtitle && <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color="#D1D5DB" />
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
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-medium">Seller Portal</Text>
          <Text className="text-3xl font-bold text-gray-900">Settings</Text>
        </View>

        <Modal visible={isEditing} animationType="fade" transparent={true} onRequestClose={closeEditModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
            <Pressable
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              className="bg-black/40"
              onPress={closeEditModal}
            />
            <Animated.View
              style={{ transform: [{ translateY: slideAnim }], maxHeight: '90%' }}
              className="bg-background rounded-t-[32px] pt-4 pb-10 shadow-2xl"
            >
              <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-gray-100 mb-4">
                <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
                <Pressable onPress={closeEditModal} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                  <X size={20} color="#374151" />
                </Pressable>
              </View>
              <ScrollView className="px-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text className="text-gray-500 text-sm font-semibold mb-2">Display Name</Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
                  <User size={20} color="#9CA3AF" />
                  <TextInput value={username} onChangeText={setUsername} placeholder="Your Name" placeholderTextColor="#6B7280" className="flex-1 ml-3 text-gray-900 font-medium text-base" />
                </View>

                <Text className="text-gray-500 text-sm font-semibold mb-2">Phone Number</Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
                  <Phone size={20} color="#9CA3AF" />
                  <TextInput value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor="#6B7280" keyboardType="phone-pad" className="flex-1 ml-3 text-gray-900 font-medium text-base" />
                </View>

                <Text className="text-gray-500 text-sm font-semibold mb-2">Store Name</Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
                  <Store size={20} color="#9CA3AF" />
                  <TextInput value={storeName} onChangeText={setStoreName} placeholder="Store Name" placeholderTextColor="#6B7280" className="flex-1 ml-3 text-gray-900 font-medium text-base" />
                </View>

                <Text className="text-gray-500 text-sm font-semibold mb-2">Store Description</Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
                  <TextInput value={storeDescription} onChangeText={setStoreDescription} placeholder="Short description" placeholderTextColor="#6B7280" multiline className="flex-1 text-gray-900 font-medium text-base h-20" textAlignVertical="top" />
                </View>

                <Text className="text-gray-500 text-sm font-semibold mb-2">Merchant Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                  {['Restaurant', 'Café', 'Bakery', 'Beverage Shop', 'Food Stall', 'Grocery / Supermarket', 'Hotel / Catering', 'Other'].map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setMerchantType(type)}
                      className={`mr-3 px-4 py-2 rounded-xl flex-row items-center border ${merchantType === type ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-100'}`}
                    >
                      <Text className={`font-bold text-sm ${merchantType === type ? 'text-white' : 'text-gray-600'}`}>{type}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text className="text-gray-500 text-sm font-semibold mb-2">Store Address</Text>
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
                  <Pressable onPress={handleSaveProfile} disabled={isSaving} className={`flex-row items-center justify-center p-4 rounded-full mb-10 ${isSaving ? 'bg-brandPrimary-hover opacity-70' : 'bg-brandPrimary'}`}>
                    {isSaving ? <ActivityIndicator color="white" /> : <><Save size={20} color="white" /><Text className="text-white font-bold text-lg ml-2">Save Changes</Text></>}
                  </Pressable>
                ) : (
                  <View className="mb-10" />
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <View className="bg-white rounded-3xl p-5 mb-8 border border-gray-100 shadow-sm flex-row items-center">
          <View className="w-16 h-16 bg-brandPrimary-soft rounded-full items-center justify-center">
            <Store size={32} color="#1B7A49" />
          </View>
          <View className="flex-1 ml-4 justify-center">
            <Text className="font-bold text-gray-900 text-lg">{username}</Text>
            {/* <Text className="text-gray-400 text-xs mb-1">ID TSG-{user?.uid?.slice(0, 8).toUpperCase() || '8421'}</Text> */}
            <View className="bg-[#FFF4E5] self-start px-2 py-0.5 rounded-md mt-1">
              <Text className="text-[#78350F] text-[10px] font-bold">🏪 Seller mode</Text>
            </View>
          </View>
          <Pressable onPress={openEditModal} className="bg-brandPrimary px-4 py-2 rounded-full">
            <Text className="text-white font-bold">Edit</Text>
          </Pressable>
        </View>

        {/* Account */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-2 ml-1">ACCOUNT</Text>
        <View className="bg-white rounded-3xl mb-8 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<CreditCard size={20} color="#1B7A49" />}
            title="Payout methods"
            subtitle="Bank accounts & payment settings"
            onPress={() => router.push('/profile/payment-methods')}
          />
          <View className="h-px bg-gray-50 ml-16" />
          <MenuItem
            icon={<Bell size={20} color="#1B7A49" />}
            title="Notifications"
            subtitle="Order alerts, promotions & news"
            onPress={() => router.push('/profile/settings')}
          />
        </View>

        {/* Help & Policies */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-2 ml-1">HELP & POLICIES</Text>
        <View className="bg-white rounded-3xl mb-8 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<HelpCircle size={20} color="#1B7A49" />}
            title="Seller support"
            subtitle="Get help with orders and listings"
            onPress={() => router.push('/profile/support')}
          />
          <View className="h-px bg-gray-50 ml-16" />
          <MenuItem
            icon={<Shield size={20} color="#1B7A49" />}
            title="Policies & terms"
            subtitle="Seller agreement, data & privacy"
            onPress={() => router.push('/profile/policies')}
          />
          <View className="h-px bg-gray-50 ml-16" />
          <MenuItem
            icon={<Settings size={20} color="#1B7A49" />}
            title="App preferences"
            subtitle="Language, display & more"
            onPress={() => router.push('/profile/settings')}
          />
        </View>


        {/* Account Actions */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-2 ml-1">ACCOUNT ACTIONS</Text>
        <View className="bg-white rounded-3xl mb-8 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<LogOut size={20} color="#1B7A49" />}
            title="Sign out"
            onPress={handleSignOut}
          />
          <View className="h-px bg-gray-50 ml-16" />
          <MenuItem
            icon={<Trash2 size={20} color="#E53935" />}
            iconBgColor="bg-red-50"
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
