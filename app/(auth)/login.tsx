import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseLib';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { FontAwesome } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '1078383812364-4q7gvb7aepmtc7ph6i789l8bi6dc5qgl.apps.googleusercontent.com',
    iosClientId: '1078383812364-4q7gvb7aepmtc7ph6i789l8bi6dc5qgl.apps.googleusercontent.com',
    androidClientId: '1078383812364-4q7gvb7aepmtc7ph6i789l8bi6dc5qgl.apps.googleusercontent.com',
    clientId: '1078383812364-4q7gvb7aepmtc7ph6i789l8bi6dc5qgl.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({
      scheme: 'foodapp'
    }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      setLoading(true);
      signInWithCredential(auth, credential).then(async (userCred) => {
        const userRef = doc(db, 'users', userCred.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: userCred.user.email,
            role: 'buyer',
            createdAt: new Date().toISOString()
          });
          useAppStore.getState().setRole('buyer');
        } else {
          const data = userSnap.data();
          if (data && data.role) {
            useAppStore.getState().setRole(data.role);
          }
        }
      }).catch(err => {
        setErrorMsg(err.message || "Failed to authenticate with Google.");
        setLoading(false);
      });
    } else if (response?.type === 'cancel') {
      console.log("User cancelled Google Auth");
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Layout trap will automatically route us away upon success!
    } catch (err: any) {
      let message = 'Failed to sign in. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View style={{ paddingHorizontal: scale(24) }} className="flex-1 justify-center">

          <View style={{ marginBottom: verticalScale(40) }} className="items-center">
            <Image
              source={require('../../assets/images/mascot_default_1776538504308.png')}
              style={{ width: scale(120), height: scale(120), marginBottom: verticalScale(20) }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: moderateScale(28), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">Welcome Back</Text>
            <Text style={{ fontSize: moderateScale(14) }} className="text-gray-500 text-center">Sign in to rescue more amazing food and fight waste!</Text>
          </View>

          {errorMsg ? (
            <View style={{ padding: scale(12), borderRadius: scale(12), marginBottom: verticalScale(16) }} className="bg-red-50 border border-red-100">
              <Text style={{ fontSize: moderateScale(13) }} className="text-red-600 font-medium">{errorMsg}</Text>
            </View>
          ) : null}

          <View>
            <View>
              <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Email</Text>
              <TextInput
                style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16), fontSize: moderateScale(15) }}
                className="bg-white border border-gray-200 text-gray-900"
                placeholder="hello@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ marginTop: verticalScale(16) }}>
              <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Password</Text>
              <TextInput
                style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16), fontSize: moderateScale(15) }}
                className="bg-white border border-gray-200 text-gray-900"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} style={{ marginTop: verticalScale(8) }} className="items-end">
              <Text style={{ fontSize: moderateScale(14) }} className="text-brandPrimary font-medium">Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{ marginTop: verticalScale(32), paddingVertical: verticalScale(16), borderRadius: scale(9999) }}
            className={`items-center shadow-sm ${loading ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: moderateScale(16) }} className="text-white font-bold">Sign In</Text>}
          </Pressable>

          <View style={{ marginVertical: verticalScale(24) }} className="flex-row items-center">
            <View className="flex-1 h-px bg-gray-200" />
            <Text style={{ fontSize: moderateScale(14), marginHorizontal: scale(16) }} className="text-gray-400 font-medium">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <Pressable
            onPress={() => promptAsync()}
            disabled={!request || loading}
            style={{ paddingVertical: verticalScale(16), borderRadius: scale(9999) }}
            className="flex-row items-center justify-center bg-white border border-gray-200 shadow-sm active:bg-gray-50"
          >
            <FontAwesome name="google" size={scale(20)} color="#DB4437" style={{ marginRight: scale(12) }} />
            <Text style={{ fontSize: moderateScale(16) }} className="text-gray-700 font-bold">Continue with Google</Text>
          </Pressable>

          <View style={{ marginTop: verticalScale(32) }} className="flex-row justify-center">
            <Text style={{ fontSize: moderateScale(14) }} className="text-gray-500">Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={{ fontSize: moderateScale(14) }} className="text-brandPrimary font-bold">Sign Up</Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
