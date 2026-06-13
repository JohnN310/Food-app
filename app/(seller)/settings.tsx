import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import {
  User, ChevronRight, HelpCircle, Shield, Settings,
  LogOut, Trash2, ArrowLeftRight, Bell, CreditCard, Store
} from 'lucide-react-native';


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

  // Pull BOTH setRole and user from Zustand
  const setRole = useAppStore(state => state.setRole);
  const user = useAppStore(state => state.user);

  const [username, setUsername] = useState('Loading...');

  // Fetch the username
  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().username) {
          setUsername(userDoc.data().username);
        } else {
          setUsername('Store Owner');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUsername('Store Owner');
      }
    };
    fetchUserData();
  }, [user?.uid]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Sign Out Error', 'Failed to securely sign out.');
    }
  };

  const handleSwitchToBuyer = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'buyer' });
      setRole('buyer');
      router.replace('/(tabs)');
    } catch (error) {
      console.error("Error switching roles:", error);
      Alert.alert('Error', 'Could not switch to buyer mode. Please check your connection.');
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
          <Pressable onPress={() => router.push('/profile/edit')} className="bg-brandPrimary px-4 py-2 rounded-full">
            <Text className="text-white font-bold">Edit</Text>
          </Pressable>
        </View>

        {/* Account */}
        <Text className="font-bold text-gray-400 text-xs tracking-wider mb-2 ml-1">ACCOUNT</Text>
        <View className="bg-white rounded-3xl mb-8 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<User size={20} color="#1B7A49" />}
            title="Edit profile"
            subtitle="Name, contact, store details"
            onPress={() => router.push('/profile/edit')}
          />
          <View className="h-px bg-gray-50 ml-16" />
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

        {/* Switch to Buyer Mode */}
        <View className="bg-white rounded-3xl mb-8 border border-gray-100 shadow-sm overflow-hidden">
          <MenuItem
            icon={<ArrowLeftRight size={20} color="#D97706" />}
            iconBgColor="bg-[#FFF4E5]"
            title="Switch to Buyer mode"
            subtitle="Browse and buy rescued items"
            onPress={handleSwitchToBuyer}
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

        {/* Footer */}
        <View className="items-center justify-center mb-8">
          <Text className="text-gray-500 text-xs">Things Still Good · v1.0 · Made with 💚</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
