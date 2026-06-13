import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, User, CreditCard, MessageCircle, Gift, Users, Store, ChevronRight, Key, Star, HelpCircle, Shield, LogOut, Trash2, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';

export default function ProfileScreen() {
  const router = useRouter();

  const setRole = useAppStore(state => state.setRole);
  const user = useAppStore(state => state.user);
  const [username, setUsername] = useState('Loading...');

  const unreadMessagesCount = useAppStore(state => state.unreadMessagesCount);
  const [impact, setImpact] = useState({ orders: 0, saved: 0, waste: 0 });

  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().username) {
          setUsername(userDoc.data().username);
        } else {
          setUsername('Valued User');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUsername('Valued User');
      }
    };
    fetchUserData();
  }, [user?.uid]);

  // Real-time listener for the user's completed orders
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalOrders = snapshot.docs.length;
      let totalSaved = 0;
      let totalWaste = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        totalSaved += (data.originalPrice || 0) - (data.price || 0);
        totalWaste += (data.weightSaved || 0.5);
      });

      setImpact({
        orders: totalOrders,
        saved: totalSaved,
        waste: totalWaste
      });
    }, (error) => {
      console.error("Error fetching impact data:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

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
          <Pressable onPress={() => router.push('/profile/edit')} className="bg-white border border-gray-200 px-4 py-2 rounded-xl">
            <Text className="text-gray-700 font-bold text-[13px]">Edit</Text>
          </Pressable>
        </View>

        {/* Impact Dashboard */}
        <View className="bg-[#F1F8F4] rounded-[24px] p-5 mb-6 shadow-sm border border-[#E1F0E8]">
          <View className="flex-row justify-between flex-1 mb-5">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-white rounded-full items-center justify-center mr-2 shadow-sm border border-[#E1F0E8]">
                <Image source={require('../../assets/images/mascot_celebrating_1776538614033.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
              </View>
              <View>
                <Text className="font-bold text-gray-900 text-[15px]">My Impact</Text>
                <Text className="text-gray-600 text-[11px] mt-0.5">Tap to see full dashboard</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9CA3AF" className="mt-2" />
          </View>
          <View className="flex-row justify-between px-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <View className="items-center flex-1 border-r border-gray-100">
              <Text className="font-bold text-[#1B7A49] text-[18px] mb-0.5">📦 {impact.orders}</Text>
              <Text className="text-gray-500 text-[11px] font-medium">Orders</Text>
            </View>
            <View className="items-center flex-1 border-r border-gray-100">
              <Text className="font-bold text-[#1B7A49] text-[18px] mb-0.5">${impact.saved.toFixed(2)}</Text>
              <Text className="text-gray-500 text-[11px] font-medium">Saved</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="font-bold text-[#1B7A49] text-[18px] mb-0.5">🌿 {impact.waste.toFixed(1)}kg</Text>
              <Text className="text-gray-500 text-[11px] font-medium">Waste cut</Text>
            </View>
          </View>
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
