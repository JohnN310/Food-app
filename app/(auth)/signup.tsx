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
        <ScrollView className="flex-1 px-6 pt-4 pb-12" showsVerticalScrollIndicator={false}>

          <Pressable onPress={() => router.back()} className="mb-6 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
            <ArrowLeft size={20} color="#374151" />
          </Pressable>

          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
            <Text className="text-gray-500">Join the movement and start rescuing!</Text>
          </View>

          {/* Role Toggle */}
          <View className="mb-8">
            <Text className="text-gray-700 font-bold mb-3 ml-1">I want to...</Text>
            <View className="flex-row bg-white rounded-2xl border border-gray-200 p-1">
              <Pressable
                onPress={() => setSelectedRole('buyer')}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${selectedRole === 'buyer' ? 'bg-brandPrimary' : ''
                  }`}
              >
                <ShoppingBag size={18} color={selectedRole === 'buyer' ? 'white' : '#9CA3AF'} />
                <Text className={`font-bold text-sm ${selectedRole === 'buyer' ? 'text-white' : 'text-gray-400'
                  }`}>Buy Food</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedRole('seller')}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${selectedRole === 'seller' ? 'bg-brandPrimary' : ''
                  }`}
              >
                <Store size={18} color={selectedRole === 'seller' ? 'white' : '#9CA3AF'} />
                <Text className={`font-bold text-sm ${selectedRole === 'seller' ? 'text-white' : 'text-gray-400'
                  }`}>Sell Food</Text>
              </Pressable>
            </View>
          </View>

          {errorMsg ? (
            <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
              <Text className="text-red-600 text-sm font-medium">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="space-y-4">
            {/* NEW USERNAME INPUT */}
            <View >
              <Text className="text-gray-700 font-bold mb-2 ml-1">Username</Text>
              <TextInput
                className="bg-white px-4 py-4 rounded-2xl border border-gray-200 text-gray-900"
                placeholder="e.g. EcoWarrior99"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View className="mt-4">
              <Text className="text-gray-700 font-bold mb-2 ml-1">Email</Text>
              <TextInput
                className="bg-white px-4 py-4 rounded-2xl border border-gray-200 text-gray-900"
                placeholder="hello@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View className="mt-4">
              <Text className="text-gray-700 font-bold mb-2 ml-1">Password</Text>
              <TextInput
                className="bg-white px-4 py-4 rounded-2xl border border-gray-200 text-gray-900"
                placeholder="Create a strong password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View className="mt-4">
              <Text className="text-gray-700 font-bold mb-2 ml-1">Confirm Password</Text>
              <TextInput
                className="bg-white px-4 py-4 rounded-2xl border border-gray-200 text-gray-900"
                placeholder="Repeat password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            className={`mt-10 py-4 rounded-full items-center shadow-sm ${loading ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Sign Up</Text>}
          </Pressable>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-gray-400 font-medium mx-4">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <Pressable
            onPress={() => promptAsync()}
            disabled={!request || loading}
            className="py-4 rounded-full flex-row items-center justify-center bg-white border border-gray-200 shadow-sm active:bg-gray-50 mb-8"
          >
            <FontAwesome name="google" size={20} color="#DB4437" style={{ marginRight: 12 }} />
            <Text className="text-gray-700 font-bold text-lg">Continue with Google</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
