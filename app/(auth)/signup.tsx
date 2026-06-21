import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseLib';
import { ArrowLeft, ShoppingBag, Store } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { FontAwesome } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');

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
            username: userCred.user.displayName || 'Google User',
            email: userCred.user.email,
            role: selectedRole,
            createdAt: new Date().toISOString()
          });
          useAppStore.getState().setRole(selectedRole);
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

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Authenticate with secure Firebase Hash
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Mirror into Firestore Database securely with selected role
      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        email: user.email,
        role: selectedRole,
        createdAt: new Date().toISOString(),
      });
      useAppStore.getState().setRole(selectedRole);

      // The layout hook automatically routes us away upon successful connection
    } catch (err: any) {
      let message = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'An account already exists with this email address. Try signing in instead.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
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
        <ScrollView style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(16), paddingBottom: verticalScale(48) }} className="flex-1" showsVerticalScrollIndicator={false}>

          <Pressable onPress={() => router.back()} style={{ marginBottom: verticalScale(24), width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-white items-center justify-center shadow-sm">
            <ArrowLeft size={scale(20)} color="#374151" />
          </Pressable>

          <View style={{ marginBottom: verticalScale(32) }}>
            <Text style={{ fontSize: moderateScale(28), marginBottom: verticalScale(8) }} className="font-bold text-gray-900">Create Account</Text>
            <Text style={{ fontSize: moderateScale(14) }} className="text-gray-500">Join the movement and start rescuing!</Text>
          </View>

          {/* Role Toggle */}
          <View style={{ marginBottom: verticalScale(32) }}>
            <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(12), marginLeft: scale(4) }} className="text-gray-700 font-bold">I want to...</Text>
            <View style={{ padding: scale(4), borderRadius: scale(16) }} className="flex-row bg-white border border-gray-200">
              <Pressable
                onPress={() => setSelectedRole('buyer')}
                style={{ paddingVertical: verticalScale(12), borderRadius: scale(12), gap: scale(8) }}
                className={`flex-1 flex-row items-center justify-center ${selectedRole === 'buyer' ? 'bg-brandPrimary' : ''}`}
              >
                <ShoppingBag size={scale(18)} color={selectedRole === 'buyer' ? 'white' : '#9CA3AF'} />
                <Text style={{ fontSize: moderateScale(13) }} className={`font-bold ${selectedRole === 'buyer' ? 'text-white' : 'text-gray-400'}`}>Buy Food</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedRole('seller')}
                style={{ paddingVertical: verticalScale(12), borderRadius: scale(12), gap: scale(8) }}
                className={`flex-1 flex-row items-center justify-center ${selectedRole === 'seller' ? 'bg-brandPrimary' : ''}`}
              >
                <Store size={scale(18)} color={selectedRole === 'seller' ? 'white' : '#9CA3AF'} />
                <Text style={{ fontSize: moderateScale(13) }} className={`font-bold ${selectedRole === 'seller' ? 'text-white' : 'text-gray-400'}`}>Sell Food</Text>
              </Pressable>
            </View>
          </View>

          {errorMsg ? (
            <View style={{ padding: scale(12), borderRadius: scale(12), marginBottom: verticalScale(16) }} className="bg-red-50 border border-red-100">
              <Text style={{ fontSize: moderateScale(13) }} className="text-red-600 font-medium">{errorMsg}</Text>
            </View>
          ) : null}

          <View>
            {/* NEW USERNAME INPUT */}
            <View>
              <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Username</Text>
              <TextInput
                style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16), fontSize: moderateScale(15) }}
                className="bg-white border border-gray-200 text-gray-900"
                placeholder="e.g. EcoWarrior99"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={{ marginTop: verticalScale(16) }}>
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
                placeholder="Create a strong password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={{ marginTop: verticalScale(16) }}>
              <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Confirm Password</Text>
              <TextInput
                style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16), fontSize: moderateScale(15) }}
                className="bg-white border border-gray-200 text-gray-900"
                placeholder="Repeat password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            style={{ marginTop: verticalScale(40), paddingVertical: verticalScale(16), borderRadius: scale(9999) }}
            className={`items-center shadow-sm ${loading ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: moderateScale(16) }} className="text-white font-bold">Sign Up</Text>}
          </Pressable>

          <View style={{ marginVertical: verticalScale(24) }} className="flex-row items-center">
            <View className="flex-1 h-px bg-gray-200" />
            <Text style={{ fontSize: moderateScale(14), marginHorizontal: scale(16) }} className="text-gray-400 font-medium">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <Pressable
            onPress={() => promptAsync()}
            disabled={!request || loading}
            style={{ paddingVertical: verticalScale(16), borderRadius: scale(9999), marginBottom: verticalScale(32) }}
            className="flex-row items-center justify-center bg-white border border-gray-200 shadow-sm active:bg-gray-50"
          >
            <FontAwesome name="google" size={scale(20)} color="#DB4437" style={{ marginRight: scale(12) }} />
            <Text style={{ fontSize: moderateScale(16) }} className="text-gray-700 font-bold">Continue with Google</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
