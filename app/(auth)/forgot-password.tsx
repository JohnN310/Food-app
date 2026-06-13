import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebaseLib';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // console.log(`[DEBUG] Attempting to send reset email to: ${email}`);
      await sendPasswordResetEmail(auth, email);
      // console.log(`[DEBUG] SUCCESS! Firebase successfully sent the reset email to ${email}`);
      setIsSubmitted(true);
    } catch (err: any) {
      // console.log(`[DEBUG] FIREBASE ERROR CAUGHT: ${err.code} - ${err.message}`);
      // Security: Silently succeed if the email is not found to prevent enumeration
      if (err.code === 'auth/user-not-found') {
        // console.log(`[DEBUG] SECURITY TRIGGERED: Email ${email} does not exist in Firebase. Faking success screen.`);
        setIsSubmitted(true);
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else {
        setErrorMsg('Failed to send reset email. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-6 pt-4 pb-12" showsVerticalScrollIndicator={false}>

          <Pressable onPress={() => router.back()} className="mb-6 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mt-2">
            <ArrowLeft size={20} color="#374151" />
          </Pressable>

          {!isSubmitted ? (
            <View className="flex-1 mt-10">
              <View className="mb-8">
                <Text className="text-3xl font-bold text-gray-900 mb-2">Reset Password</Text>
                <Text className="text-gray-500">Enter your email and we'll send you a link to reset your password.</Text>
              </View>

              {errorMsg ? (
                <View className="bg-red-50 p-3 rounded-xl mb-6 border border-red-100">
                  <Text className="text-red-600 text-sm font-medium">{errorMsg}</Text>
                </View>
              ) : null}

              <View>
                <Text className="text-gray-700 font-bold mb-2 ml-1">Email</Text>
                <View className="flex-row items-center bg-white px-4 py-4 rounded-2xl border border-gray-200">
                  <Mail size={20} color="#9CA3AF" className="mr-3" />
                  <TextInput
                    className="flex-1 text-gray-900"
                    placeholder="hello@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <Pressable
                onPress={handleResetPassword}
                disabled={loading}
                className={`mt-10 py-4 rounded-full items-center shadow-sm ${loading ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Send Reset Link</Text>}
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center mt-10">
              <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6">
                <CheckCircle2 size={40} color="#15803d" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">Check your inbox</Text>
              <Text className="text-gray-500 text-center mb-10 px-4">
                We've sent password reset instructions to <Text className="font-bold text-gray-700">{email}</Text>.
              </Text>

              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                className="w-full py-4 rounded-full items-center bg-white border border-gray-200 shadow-sm"
              >
                <Text className="text-gray-800 font-bold text-lg">Back to Login</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
