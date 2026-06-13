import { create } from 'zustand';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';

interface AppState {
  role: 'buyer' | 'seller' | null;
  language: string;
  unreadMessagesCount: number;
  sellerVerificationStatus: 'pending' | 'verified' | 'unverified';
  savedItems: string[];
  orders: any[];
  user: any | null;
  isAuthInitialized: boolean;
  setRole: (role: 'buyer' | 'seller' | null) => void;
  setUnreadMessagesCount: (count: number) => void;
  setLanguage: (lang: string) => void;
  toggleSavedItem: (id: string) => void;
  setSavedItems: (items: string[]) => void;
  setOrders: (orders: any[]) => void;
  clearSavedItems: () => void;
  setUser: (user: any | null) => void;
  setAuthInitialized: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  role: null, // Start as null to prevent premature redirection
  language: 'en',
  unreadMessagesCount: 0,
  sellerVerificationStatus: 'unverified',
  savedItems: [],
  orders: [],
  setRole: (role) => set({ role }),
  setUnreadMessagesCount: (unreadMessagesCount) => set({ unreadMessagesCount }),
  setLanguage: (language) => set({ language }),
  toggleSavedItem: async (id) => {
    const state = get();
    const isSaved = state.savedItems.includes(id);
    
    // Optimistic update
    set({
      savedItems: isSaved 
        ? state.savedItems.filter(itemId => itemId !== id)
        : [...state.savedItems, id]
    });

    if (state.user) {
      try {
        const userRef = doc(db, 'users', state.user.uid);
        if (isSaved) {
          await updateDoc(userRef, { savedItems: arrayRemove(id) });
        } else {
          await updateDoc(userRef, { savedItems: arrayUnion(id) });
        }
      } catch (err) {
        console.error("Failed to sync saved item:", err);
      }
    }
  },
  setSavedItems: (items) => set({ savedItems: items }),
  setOrders: (orders) => set({ orders }),
  clearSavedItems: () => set({ savedItems: [] }),
  user: null,
  isAuthInitialized: false,
  setUser: (user) => set({ user }),
  setAuthInitialized: (val) => set({ isAuthInitialized: val }),
}));
