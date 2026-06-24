import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();

  const user = useAppStore(state => state.user);
  const isAuthInitialized = useAppStore(state => state.isAuthInitialized);
  const setUser = useAppStore(state => state.setUser);
  const setAuthInitialized = useAppStore(state => state.setAuthInitialized);
  const setRole = useAppStore(state => state.setRole);
  const setUnreadMessagesCount = useAppStore(state => state.setUnreadMessagesCount);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync Firestore doc
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.role) {
              setRole(data.role);
            } else {
              setRole('buyer'); // Default legacy users to buyer
            }
          } else {
             setRole('buyer'); // Default if no doc
          }
        } catch (e: any) {
          // Silently ignore offline errors to prevent Expo red screens
          if (e.code !== 'unavailable') {
            console.log("Firestore sync warning:", e.message);
          }
        }
      } else {
        setUser(null);
        setRole(null);
        setUnreadMessagesCount(0);
      }
      // CRITICAL: Only mark as initialized AFTER Firestore sync is done
      setAuthInitialized(true);
    });
    return unsubscribe;
  }, []);

  const setSavedItems = useAppStore(state => state.setSavedItems);
  const setOrders = useAppStore(state => state.setOrders);

  // Global Listeners for Notifications, Saved Items, and Orders
  useEffect(() => {
    if (!user) return;
    
    // Notifications Listener
    const qNotif = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      setUnreadMessagesCount(snapshot.size);
    }, (err) => {
      console.log("Notification listener error:", err.message);
    });

    // Orders Listener
    const qOrders = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid)
    );
    const unsubOrders = onSnapshot(qOrders, async (snapshot) => {
      const ordersDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const uniqueSellerIds = [...new Set(ordersDocs.map(o => o.sellerId).filter(Boolean))];
      const sellersMap: Record<string, any> = {};
      
      await Promise.all(
        uniqueSellerIds.map(async (sellerId) => {
          try {
            const sellerDoc = await getDoc(doc(db, 'users', sellerId as string));
            if (sellerDoc.exists()) {
              sellersMap[sellerId as string] = sellerDoc.data();
            }
          } catch (error) {
            console.error("Error fetching seller", sellerId, error);
          }
        })
      );
      
      const enrichedOrders = ordersDocs.map(o => ({
        ...o,
        sellerData: o.sellerId ? sellersMap[o.sellerId] : null
      }));
      
      setOrders(enrichedOrders);
    }, (err) => {
      console.log("Orders listener error:", err.message);
    });

    // User Profile Listener (for savedItems)
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.savedItems) {
          setSavedItems(data.savedItems);
        }
      }
    }, (err) => {
      console.log("User doc listener error:", err.message);
    });

    return () => {
      unsubNotif();
      unsubOrders();
      unsubUser();
    };
  }, [user]);

  const role = useAppStore(state => state.role);

  useEffect(() => {
    if (!isAuthInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSellerGroup = segments[0] === '(seller)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // Not logged in — send to login
      router.replace('/(auth)/login');
    } else if (user) {
      // Wait for role to be fetched from Firestore before routing
      if (!role) return;

      if (role === 'seller') {
        if (inAuthGroup || inTabsGroup) {
          router.replace('/(seller)');
        }
      } else if (role === 'buyer') {
        if (inAuthGroup || inSellerGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, isAuthInitialized, segments, role]);

  if (!isAuthInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#1B7A49" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(seller)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        <Stack.Screen
          name="listing/[id]"
          options={{
            presentation: 'transparentModal',
            headerShown: false,
            animation: 'fade'
          }}
        />

        <Stack.Screen
          name="order/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />

        <Stack.Screen
          name="chat/[orderId]"
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />

        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
