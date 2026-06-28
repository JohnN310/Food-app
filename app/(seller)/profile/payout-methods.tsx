import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, Info, CheckCircle2, DollarSign } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions, auth } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

export default function PayoutMethodsScreen() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

  // Fetch the user's stripeAccountId
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.stripeAccountId) {
            setStripeAccountId(data.stripeAccountId);
            // Check actual status via cloud function
            const idToken = await auth.currentUser?.getIdToken(true);
            const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
            const response = await checkStatus({ token: idToken });
            const statusData = response.data as { isSetup: boolean };
            setIsSetup(statusData.isSetup);
          }
        }
      } catch (e) {
        console.error("Error fetching payout status:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, [user?.uid]);

  const handleSetupPayouts = async () => {
    setIsProcessing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const createConnectAccount = httpsCallable(functions, 'createConnectAccount');
      // For returnUrl, we can use an Expo Linking URL (e.g. foodapp://)
      // or a simple web URL if handled by backend.
      // Stripe requires https links for return_url in production.
      const returnUrl = "https://example.com/return"; 

      const response = await createConnectAccount({ 
        token: idToken,
        returnUrl: returnUrl 
      });
      const data = response.data as { url: string };
      
      if (data?.url) {
        // Open the Stripe onboarding URL in the in-app browser
        const result = await WebBrowser.openBrowserAsync(data.url);
        
        // After they close it, we should verify their status via the API
        setIsLoading(true);
        const idToken = await auth.currentUser?.getIdToken(true);
        const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
        const statusResponse = await checkStatus({ token: idToken });
        const statusData = statusResponse.data as { isSetup: boolean };
        
        if (statusData.isSetup) {
            setIsSetup(true);
        } else {
            setIsSetup(false);
            // Optionally tell the user they didn't finish
        }
        setIsLoading(false);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to set up payouts.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDashboard = async () => {
    setIsProcessing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const createStripeDashboardLink = httpsCallable(functions, 'createStripeDashboardLink');
      const response = await createStripeDashboardLink({ token: idToken });
      const data = response.data as { url: string };
      
      if (data?.url) {
        await WebBrowser.openBrowserAsync(data.url);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to open dashboard.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#FAFAF5]">
      {/* Header */}
      <View 
        style={{ height: verticalScale(56), paddingHorizontal: scale(20) }} 
        className="flex-row items-center justify-between"
      >
        <Pressable 
          onPress={() => router.back()}
          style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }}
          className="bg-white items-center justify-center shadow-sm"
        >
          <ArrowLeft size={scale(20)} color="#374151" />
        </Pressable>

        <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900">
          Payout Methods
        </Text>

        <View style={{ width: scale(40), height: scale(40) }} /> 
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B7A49" />
        </View>
      ) : (
        <ScrollView style={{ paddingHorizontal: scale(20), paddingTop: verticalScale(16) }}>
          
          <View style={{ padding: scale(20), borderRadius: scale(24), marginBottom: verticalScale(24) }} className="bg-white shadow-sm border border-gray-100">
            <View className="items-center mb-6">
              <View style={{ width: scale(80), height: scale(80), borderRadius: scale(40), marginBottom: verticalScale(16) }} className="bg-green-50 items-center justify-center">
                <DollarSign size={scale(40)} color="#1B7A49" />
              </View>
              <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900 text-center mb-2">
                {isSetup ? "Payouts Enabled" : "Get Paid with Stripe"}
              </Text>
              <Text style={{ fontSize: moderateScale(14) }} className="text-gray-500 text-center">
                {isSetup 
                  ? "Your earnings are automatically transferred to your bank account." 
                  : "Set up a Stripe Connect account to securely receive your earnings from sales. It only takes a few minutes."}
              </Text>
            </View>

            {isSetup ? (
              <View style={{ marginBottom: verticalScale(16) }} className="bg-green-50 rounded-xl p-4 flex-row items-center">
                <CheckCircle2 size={scale(24)} color="#1B7A49" />
                <View style={{ marginLeft: scale(12) }} className="flex-1">
                  <Text style={{ fontSize: moderateScale(15) }} className="font-bold text-gray-900">Account Connected</Text>
                  <Text style={{ fontSize: moderateScale(12) }} className="text-gray-600 mt-1">Automatic payouts are active.</Text>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: verticalScale(24) }} className="bg-blue-50 rounded-xl p-4 flex-row items-start">
                <Info size={scale(20)} color="#2563EB" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: moderateScale(13), marginLeft: scale(10) }} className="text-blue-800 flex-1 leading-5">
                  We partner with Stripe for secure payments and financial services. You will be redirected to a secure Stripe portal to verify your identity and link your bank account. (Sandbox/Test Mode)
                </Text>
              </View>
            )}

            <Pressable 
              onPress={isSetup ? handleViewDashboard : handleSetupPayouts}
              disabled={isProcessing}
              style={{ paddingVertical: verticalScale(16), borderRadius: scale(16) }}
              className={`flex-row items-center justify-center ${isProcessing ? 'bg-[#1B7A49]/70' : 'bg-[#1B7A49]'}`}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={{ fontSize: moderateScale(16), marginRight: scale(8) }} className="font-bold text-white">
                    {isSetup ? "View Stripe Dashboard" : "Set Up Payouts"}
                  </Text>
                  {isSetup && <ExternalLink size={scale(18)} color="white" />}
                </>
              )}
            </Pressable>
          </View>
          
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
