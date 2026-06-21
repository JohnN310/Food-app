import { auth } from '@/lib/firebaseLib';
import { moderateScale, scale, verticalScale } from '@/lib/responsive';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setSuccess(true);
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
        <ScrollView style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(16), paddingBottom: verticalScale(48) }} className="flex-1" showsVerticalScrollIndicator={false}>

          <Pressable onPress={() => router.back()} style={{ marginBottom: verticalScale(24), width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-white items-center justify-center shadow-sm">
            <ArrowLeft size={scale(20)} color="#374151" />
          </Pressable>

          <View style={{ marginBottom: verticalScale(32) }}>
            <Text style={{ fontSize: moderateScale(28), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">Reset Password</Text>
            <Text style={{ fontSize: moderateScale(15) }} className="text-gray-500">Enter the email associated with your account and we'll send you a link to reset your password.</Text>
          </View>

          {errorMsg ? (
            <View style={{ padding: scale(12), borderRadius: scale(12), marginBottom: verticalScale(16) }} className="bg-red-50 border border-red-100">
              <Text style={{ fontSize: moderateScale(13) }} className="text-red-600 font-medium">{errorMsg}</Text>
            </View>
          ) : null}

          {!success ? (
            <View>
              <View>
                <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Email</Text>
                <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16) }} className="bg-white border border-gray-200 flex-row items-center">
                  <Mail size={scale(20)} color="#9CA3AF" />
                  <TextInput
                    style={{ flex: 1, marginLeft: scale(12), fontSize: moderateScale(15), color: '#111827' }}
                    placeholder="hello@example.com"
                    placeholderTextColor="#9CA3AF"
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
                style={{ marginTop: verticalScale(24), paddingVertical: verticalScale(16), borderRadius: scale(9999) }}
                className={`items-center shadow-sm ${loading ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: moderateScale(16) }} className="text-white font-bold">Send Reset Link</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={{ padding: scale(24), borderRadius: scale(24), marginTop: verticalScale(16) }} className="bg-white items-center border border-gray-100 shadow-sm">
              <CheckCircle size={scale(64)} color="#10B981" style={{ marginBottom: verticalScale(16) }} />
              <Text style={{ fontSize: moderateScale(20), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">Check Your Email</Text>
              <Text style={{ fontSize: moderateScale(15), marginBottom: verticalScale(24) }} className="text-gray-500 text-center">
                We've sent password reset instructions to <Text className="font-bold text-gray-700">{email}</Text>. Please check your inbox and spam folder.
              </Text>

              <Pressable
                onPress={() => router.replace('/(auth)/login' as any)}
                style={{ width: '100%', paddingVertical: verticalScale(16), borderRadius: scale(9999) }}
                className="items-center bg-white border border-gray-200 shadow-sm"
              >
                <Text style={{ fontSize: moderateScale(16) }} className="text-gray-800 font-bold">Back to Login</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
