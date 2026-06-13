import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save, User as UserIcon, Phone, Leaf } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';

const DIETARY_OPTIONS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal'];

export default function EditProfileScreen() {
    const router = useRouter();
    const user = useAppStore(state => state.user);

    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUsername(data.username || '');
                    setPhone(data.phone || '');
                    setDietaryPrefs(data.dietaryPreferences || []);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                Alert.alert('Error', 'Could not load your profile data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [user?.uid]);

    const togglePreference = (pref: string) => {
        setDietaryPrefs(prev =>
            prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
        );
    };

    const handleSave = async () => {
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
            Alert.alert('Success', 'Profile updated!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert('Error', 'Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#1B7A49" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm"
                >
                    <ChevronLeft size={24} color="#374151" />
                </Pressable>
                <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
                <Text className="font-bold text-gray-400 text-xs tracking-wider mb-3 ml-1">BASIC INFO</Text>
                <View className="bg-white rounded-3xl p-5 mb-8 border border-gray-100 shadow-sm">
                    <Text className="text-gray-500 text-sm font-semibold mb-2">Display Name</Text>
                    <View className="flex-row items-center bg-background rounded-2xl px-4 py-3 border border-gray-100 mb-4">
                        <UserIcon size={20} color="#9CA3AF" />
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Your Name"
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 ml-3 text-gray-900 font-medium text-base"
                        />
                    </View>
                    <Text className="text-gray-500 text-sm font-semibold mb-2">Phone Number</Text>
                    <View className="flex-row items-center bg-background rounded-2xl px-4 py-3 border border-gray-100">
                        <Phone size={20} color="#9CA3AF" />
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="(555) 000-0000"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                            className="flex-1 ml-3 text-gray-900 font-medium text-base"
                        />
                    </View>
                </View>
                <Text className="font-bold text-gray-400 text-xs tracking-wider mb-3 ml-1">DIETARY PREFERENCES</Text>
                <View className="bg-white rounded-3xl p-5 mb-8 border border-gray-100 shadow-sm">
                    <View className="flex-row items-center mb-4">
                        <Leaf size={18} color="#1B7A49" />
                        <Text className="text-gray-500 text-sm font-medium ml-2">Select all that apply</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {DIETARY_OPTIONS.map((pref) => {
                            const isActive = dietaryPrefs.includes(pref);
                            return (
                                <Pressable
                                    key={pref}
                                    onPress={() => togglePreference(pref)}
                                    className={`px-4 py-2 rounded-full border ${isActive ? 'bg-brandPrimary-soft border-brandPrimary' : 'bg-background border-gray-200'}`}
                                >
                                    <Text className={`font-semibold ${isActive ? 'text-brandPrimary' : 'text-gray-500'}`}>{pref}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            <View className="p-4 bg-background border-t border-gray-100">
                <Pressable
                    onPress={handleSave}
                    disabled={isSaving}
                    className={`flex-row items-center justify-center p-4 rounded-full ${isSaving ? 'bg-brandPrimary-hover opacity-70' : 'bg-brandPrimary'}`}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-2">Save Changes</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}