import { auth, db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { ChevronRight, CreditCard, Gift, HelpCircle, Key, LogOut, MessageCircle, Phone, RefreshCw, Save, Settings, Shield, Star, Store, Trash2, User, Users, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const setRole = useAppStore(state => state.setRole);
  const user = useAppStore(state => state.user);
  const [username, setUsername] = useState('Loading...');
  const [phone, setPhone] = useState('');
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

  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || 'Valued User');
          setPhone(data.phone || '');
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
  }, [user?.uid]);

  const togglePreference = (pref: string) => {
    setDietaryPrefs(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]);
  };

  const hasChanges = originalData && (
    username.trim() !== (originalData.username || 'Valued User') ||
    phone.trim() !== (originalData.phone || '') ||
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
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        phone: phone.trim(),
        dietaryPreferences: dietaryPrefs
      });
      setOriginalData({
        ...originalData,
        username: username.trim(),
        phone: phone.trim(),
        dietaryPreferences: dietaryPrefs
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

  const handleSwitchToSeller = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'seller' });
      setRole('seller');
      router.replace('/(seller)');
    } catch (error) {
      console.error("Error switching roles:", error);
      Alert.alert('Error', 'Could not switch to seller mode. Please check your connection.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">Profile</Text>
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
                  <TextInput value={username} onChangeText={setUsername} placeholder="Your Name" className="flex-1 ml-3 text-gray-900 font-medium text-base" />
                </View>

                <Text className="text-gray-500 text-sm font-semibold mb-2">Phone Number</Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
                  <Phone size={20} color="#9CA3AF" />
                  <TextInput value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" keyboardType="phone-pad" className="flex-1 ml-3 text-gray-900 font-medium text-base" />
                </View>

                <Text className="font-bold text-gray-400 text-xs tracking-wider mb-3 mt-2">DIETARY PREFERENCES</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {DIETARY_OPTIONS.map((pref) => {
                    const isActive = dietaryPrefs.includes(pref);
                    return (
                      <Pressable
                        key={pref}
                        onPress={() => togglePreference(pref)}
                        className={`px-4 py-2 rounded-full border ${isActive ? 'bg-[#E1F0E8] border-[#1B7A49]' : 'bg-white border-gray-200'}`}
                      >
                        <Text className={`font-semibold ${isActive ? 'text-[#1B7A49]' : 'text-gray-500'}`}>{pref}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {hasChanges ? (
                  <Pressable onPress={handleSaveProfile} disabled={isSaving} className={`flex-row items-center justify-center p-4 rounded-full mb-10 ${isSaving ? 'bg-[#1B7A49] opacity-70' : 'bg-[#1B7A49]'}`}>
                    {isSaving ? <ActivityIndicator color="white" /> : <><Save size={20} color="white" /><Text className="text-white font-bold text-lg ml-2">Save Changes</Text></>}
                  </Pressable>
                ) : (
                  <View className="mb-10" />
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <View className="bg-white rounded-[24px] p-5 mb-5 border border-gray-100 shadow-sm flex-row items-center active:opacity-90">
          <View className="w-[60px] h-[60px] bg-[#FFF4E5] rounded-[16px] items-center justify-center border border-[#FFE4C4] overflow-hidden">
            <Image
              source={require('../../assets/images/mascot_waving_1776538518453.png')}
              style={{ width: 44, height: 44 }}
              resizeMode="contain"
            />
          </View>
          <View className="flex-1 ml-4 justify-center">
            <Text className="font-bold text-gray-900 text-[18px] tracking-tight">{username}</Text>
            <View className="bg-[#F1F8F4] self-start px-2.5 py-1 rounded-md mt-1 border border-[#E1F0E8]">
              <Text className="text-[#1B7A49] text-[10px] font-bold tracking-wider">BUYER MODE</Text>
            </View>
          </View>
          <Pressable onPress={openEditModal} className="bg-white border border-gray-200 px-4 py-2 rounded-xl">
            <Text className="text-gray-700 font-bold text-[13px]">Edit</Text>
          </Pressable>
        </View>


        {/* Account Menu */}
        <Text className="font-bold text-gray-400 text-[11px] tracking-wider mb-2 ml-2">ACCOUNT</Text>
        <View className="bg-white rounded-[24px] mb-6 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<CreditCard size={18} color="#1B7A49" />} title="Payment methods" subtitle="Cards, wallets & bank accounts" onPress={() => router.push('/profile/payment-methods')} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem
            icon={<MessageCircle size={18} color="#1B7A49" />}
            title="Messages"
            subtitle="Chats with sellers & friends"
            badge={unreadMessagesCount > 0 ? unreadMessagesCount.toString() : undefined}
            onPress={() => router.push('/profile/messages')}
          />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem icon={<Gift size={18} color="#1B7A49" />} title="Promotions & rewards" subtitle="Vouchers, promo codes, referrals" onPress={() => router.push('/profile/promotions')} />
        </View>

        {/* For Buyers Menu */}
        <Text className="font-bold text-gray-400 text-[11px] tracking-wider mb-2 ml-2">FOR BUYERS</Text>
        <View className="bg-white rounded-[24px] mb-6 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<Users size={18} color="#1B7A49" />} title="Invite friends" subtitle="Earn $1.99 voucher per friend" onPress={() => router.push('/profile/invite')} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem icon={<Store size={18} color="#1B7A49" />} title="Recommend a store" subtitle="Help us bring more stores nearby" onPress={() => router.push('/profile/recommend')} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem icon={<Key size={18} color="#1B7A49" />} title="Hidden stores" subtitle="Unlock private stores with a code" onPress={() => router.push('/profile/hidden-stores')} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem icon={<Star size={18} color="#1B7A49" />} title="My feedback" subtitle="Reviews you've left for stores" onPress={() => router.push('/profile/feedback')} />
        </View>

        {/* Help & Policies */}
        <Text className="font-bold text-gray-400 text-[11px] tracking-wider mb-2 ml-2">HELP & POLICIES</Text>
        <View className="bg-white rounded-[24px] mb-6 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<HelpCircle size={18} color="#1B7A49" />} title="Customer support" subtitle="AI assistant first, human if needed" onPress={() => router.push('/profile/support')} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem icon={<Shield size={18} color="#1B7A49" />} title="Policies, terms & privacy" subtitle="Permissions, data, AI use" onPress={() => router.push('/profile/policies')} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem icon={<Settings size={18} color="#1B7A49" />} title="Settings" subtitle="Language, notifications, app preferences" onPress={() => router.push('/profile/settings')} />
        </View>

        {/* Switch to Seller Mode */}
        <View className="bg-white rounded-[24px] mb-6 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<RefreshCw size={18} color="#D97706" />}
            iconBgColor="bg-[#FFF4E5]"
            iconBorderColor="border-[#FFE4C4]"
            title="Switch to Seller mode"
            subtitle="Manage your store and listings"
            onPress={handleSwitchToSeller}
          />
        </View>

        {/* Account Actions */}
        <Text className="font-bold text-gray-400 text-[11px] tracking-wider mb-2 ml-2">ACCOUNT ACTIONS</Text>
        <View className="bg-white rounded-[24px] mb-8 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem icon={<LogOut size={18} color="#1B7A49" />} title="Sign out" onPress={handleSignOut} />
          <View className="h-px bg-gray-50 ml-[68px]" />
          <MenuItem
            icon={<Trash2 size={18} color="#E53935" />}
            iconBgColor="bg-red-50"
            iconBorderColor="border-red-100"
            title="Delete account"
            titleStyle="text-red-500"
            subtitle="Restorable within 7 days"
            onPress={() => Alert.alert('Action', 'Account marked for deletion')}
          />
        </View>

        {/* Footer */}
        <View className="items-center justify-center mb-10 pb-4">
          <Text className="text-gray-400 text-[11px] font-medium tracking-wide">Things Still Good · v1.0.0</Text>
          <Text className="text-gray-400 text-[11px] font-medium mt-0.5">Made with 💚 in Portland</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, subtitle, badge, onPress, iconBgColor = "bg-[#F1F8F4]", iconBorderColor = "border-[#E1F0E8]", titleStyle = "text-gray-900" }: any) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center p-4 active:bg-gray-50">
      <View className={`w-[44px] h-[44px] rounded-[14px] items-center justify-center ${iconBgColor} border ${iconBorderColor}`}>
        {icon}
      </View>
      <View className="flex-1 ml-4 justify-center">
        <Text className={`font-bold text-[15px] ${titleStyle}`}>{title}</Text>
        {subtitle && <Text className="text-gray-500 text-[11px] mt-0.5">{subtitle}</Text>}
      </View>
      {badge && (
        <View className="bg-red-500 px-2 py-0.5 rounded-full items-center justify-center mr-3 border border-red-600">
          <Text className="text-white text-[10px] font-bold">{badge}</Text>
        </View>
      )}
      <ChevronRight size={18} color="#D1D5DB" />
    </Pressable>
  );
}
