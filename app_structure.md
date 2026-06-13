# Things Still Good 🍏 — Application Context & Architecture Blueprint

> **ATTENTION AI ASSISTANTS:** This document is the definitive master context file for the "Things Still Good" project. Read this **completely** before making any architectural, UI, or logic changes. Every section below reflects the live, verified state of the codebase as of **April 23, 2026**.

---

## 1. App Identity & Purpose

- **Name:** Things Still Good
- **Core Purpose:** A premium "rescue marketplace" mobile app connecting buyers with sellers offering surplus or imperfect food (baked goods, produce, meals) at discounted prices to fight food waste.
- **Aesthetic:** "Luxury Sustainability" — ivory backgrounds, deep greens, warm amber accents, rounded corners, and a chibi house mascot used as an emotional anchor throughout the UI.

---

## 2. Technology Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Framework** | Expo (React Native) | SDK 54 (`expo@~54.0.33`, `react-native@0.81.5`) |
| **Navigation** | Expo Router | `expo-router@~6.0.23` — file-based routing via the `app/` directory |
| **Styling** | NativeWind v4 + Tailwind CSS 3 | `nativewind@^4.2.3`, `tailwindcss@^3.4.19`. Configured in `babel.config.js` as a preset. |
| **State Management** | Zustand | `zustand@^5.0.12` — single store at `store/app-store.ts` |
| **Backend (BaaS)** | Firebase | `firebase@^12.12.0` — Auth, Firestore, Storage |
| **Auth Persistence** | AsyncStorage | `@react-native-async-storage/async-storage@2.2.0` (pinned for SDK 54) |
| **Icons** | lucide-react-native | `^1.8.0` — primary icon library for all screens |
| **Icons (Auth brands)** | @expo/vector-icons | `^15.0.3` — FontAwesome for Google/social login buttons |
| **Maps** | react-native-maps | `1.20.1` |
| **OAuth/Crypto** | expo-auth-session, expo-crypto | For Expo Go–compatible Google login flow |
| **Animations** | react-native-reanimated + RN Animated API | `~4.1.1` — used for modal transitions in inventory |

### Key Configuration Files

- **`app.json`**: `scheme: "foodapp"` for deep-linking. `newArchEnabled: true`. Portrait-only orientation.
- **`babel.config.js`**: Includes `nativewind/babel` in presets array.
- **`metro.config.js`**: Configured for NativeWind CSS support.
- **`tailwind.config.js`**: Custom brand color tokens (see Section 3).
- **`tsconfig.json`**: Path alias `@/*` maps to project root.

---

## 3. Design System

### Color Palette (Tailwind tokens in `tailwind.config.js`)

| Token | Hex | Usage |
|---|---|---|
| `background` | `#FAFAF5` | Global page background (soft ivory). **Never use pure white or black.** |
| `brandPrimary` | `#1B7A49` | Primary buttons, active tab icons, accent text |
| `brandPrimary-soft` | `#E8F5E9` | Soft green backgrounds, active tab pill, badge backgrounds |
| `brandPrimary-hover` | `#145D36` | Button hover/press states |
| `brandAccent` | `#FFF2E5` | Warm peach for subtle card backgrounds |
| `brandAccent-yellow` | `#FFF9C4` | Pickup info cards, amber highlights |
| `urgency` | `#E53935` | Expiring items, red badges, notification dots |
| `urgency-soft` | `#FFEBEE` | Light red background for urgency badges |

### Mascot Assets (`assets/images/`)

Three variants of a chibi house character used for empty states and branding:
- `mascot_default_1776538504308.png` — neutral pose (used in Impact Banner on Home)
- `mascot_waving_1776538518453.png` — greeting pose (used in Home header avatar)
- `mascot_celebrating_1776538614033.png` — celebration pose (used in success states)

### Styling Rules

- **Always use NativeWind utility classes** (e.g., `rounded-3xl`, `shadow-sm`, `bg-brandPrimary-soft`).
- **Do NOT use `StyleSheet.create()`** unless strictly required (e.g., react-native-maps).
- Theme is forced to `DefaultTheme` in `_layout.tsx`. Dark mode is implicitly disabled.
- Tab bar uses a custom `TabBarIcon` component with a `bg-brandPrimary-soft` pill for the active state. No top-border indicator.

---

## 4. File Directory (Complete)

```
Food-app/
├── app/                          # Expo Router — all screens and navigation
│   ├── _layout.tsx               # ROOT LAYOUT: Auth listener, role-based routing, global notification listener
│   ├── +html.tsx                 # Custom HTML wrapper for web export
│   ├── +not-found.tsx            # 404 fallback screen
│   ├── modal.tsx                 # Generic modal placeholder screen
│   ├── notifications.tsx         # Notifications list screen (currently shows empty state)
│   ├── search.tsx                # Search results screen (⚠️ STILL USES MOCK_DEALS — needs migration)
│   │
│   ├── (auth)/                   # AUTH GROUP — Login/Signup/Forgot Password
│   │   ├── _layout.tsx           # Hides default Expo headers for auth screens
│   │   ├── login.tsx             # Email/Password + Google OAuth sign-in. Reads role from Firestore on login.
│   │   ├── signup.tsx            # Account creation with Buyer/Seller role toggle. Writes to Firestore /users/{uid}.
│   │   └── forgot-password.tsx   # Password reset with silent success (prevents email enumeration)
│   │
│   ├── (tabs)/                   # BUYER TAB GROUP — Bottom tab bar for buyers
│   │   ├── _layout.tsx           # 4-tab layout: Home, Map, Saved, Profile. (Explore tab is commented out)
│   │   ├── index.tsx             # HOME: Dynamic categories + Impact Banner + listings from Firestore onSnapshot
│   │   ├── map.tsx               # Map view with react-native-maps (markers not yet connected to listings)
│   │   ├── saved.tsx             # Wishlist screen synced via Zustand savedItems array
│   │   └── profile.tsx           # Account hub with "Switch to Seller Mode" (writes role to Firestore + redirects)
│   │
│   ├── (seller)/                 # SELLER TAB GROUP — Bottom tab bar for sellers
│   │   ├── _layout.tsx           # 3-tab layout: Dashboard, Inventory, Settings
│   │   ├── index.tsx             # Dashboard with seller performance stats (placeholder data)
│   │   ├── inventory.tsx         # FULL CRUD: Create/Edit listings with animated modal, real-time Firestore sync
│   │   └── settings.tsx          # Seller profile + "Switch to Buyer Mode" (writes role to Firestore + redirects)
│   │
│   ├── item/
│   │   └── [id].tsx              # ITEM DETAIL: Fetches single listing from Firestore. Hero image, pricing, Reserve Now.
│   │
│   └── profile/
│       └── [id].tsx              # Dynamic catch-all for profile sub-pages (currently shows "Under Construction")
│
├── store/                        # Global state management
│   ├── app-store.ts              # Zustand store (see Section 5 for full schema)
│   └── mockData.ts               # Legacy mock data types. MOCK_DEALS is now an empty array [].
│                                 #   ⚠️ Still imported by search.tsx — needs migration to Firestore.
│
├── lib/                          # Shared utilities and configuration
│   ├── firebaseLib.ts            # Firebase initialization with AsyncStorage persistence (try/catch for hot-reload)
│   ├── constants.ts              # CATEGORY_ICONS map: { 'Bakery': '🍞', 'Produce': '🥬', ... }
│   └── utils.ts                  # cn() utility for conditional class merging (clsx + tailwind-merge)
│
├── components/                   # Reusable UI components (mostly Expo scaffold defaults)
│   ├── EditScreenInfo.tsx        # Expo default scaffold component
│   ├── ExternalLink.tsx          # External link wrapper
│   ├── StyledText.tsx            # MonoText component
│   ├── Themed.tsx                # Theme-aware Text/View wrappers
│   ├── useClientOnlyValue.ts     # Platform-specific value hook
│   ├── useClientOnlyValue.web.ts # Web variant
│   ├── useColorScheme.ts         # Native color scheme hook
│   ├── useColorScheme.web.ts     # Web variant
│   └── __tests__/                # Component test directory
│
├── constants/
│   └── Colors.ts                 # Legacy color constants (not actively used — brand colors are in tailwind.config.js)
│
├── assets/
│   ├── fonts/
│   │   └── SpaceMono-Regular.ttf # Loaded in root _layout.tsx
│   └── images/                   # App icons, splash screens, and mascot variants (see Section 3)
│
├── app.json                      # Expo config: scheme "foodapp", SDK 54, portrait lock
├── babel.config.js               # Babel: nativewind/babel preset
├── global.css                    # Tailwind CSS entry point (@tailwind directives)
├── metro.config.js               # Metro bundler config for NativeWind
├── nativewind-env.d.ts           # NativeWind TypeScript declarations
├── expo-env.d.ts                 # Expo TypeScript declarations
├── tailwind.config.js            # Brand color tokens, content paths, nativewind preset
├── tsconfig.json                 # TypeScript config with @/* path alias
├── package.json                  # All dependencies (see Section 2)
├── package-lock.json             # Dependency lockfile
└── personal.md                   # Personal notes (not part of the app)
```

---

## 5. Global State Schema (Zustand)

**File:** `store/app-store.ts`

```typescript
interface AppState {
  role: 'buyer' | 'seller' | null;        // null = waiting for Firestore sync (prevents premature redirect)
  language: string;                         // Default: 'en'
  unreadMessagesCount: number;              // Real-time count from Firestore /notifications collection
  sellerVerificationStatus: 'pending' | 'verified' | 'unverified';
  savedItems: number[];                     // Array of listing IDs for the buyer's wishlist
  user: any | null;                         // Live Firebase Auth User object (null when signed out)
  isAuthInitialized: boolean;               // Prevents UI rendering before Firebase confirms auth state

  setRole: (role: 'buyer' | 'seller' | null) => void;
  setUnreadMessagesCount: (count: number) => void;
  setLanguage: (lang: string) => void;
  toggleSavedItem: (id: number) => void;
  clearSavedItems: () => void;
  setUser: (user: any | null) => void;
  setAuthInitialized: (val: boolean) => void;
}
```

**Key Behaviors:**
- `role` starts as `null`. The root layout waits for Firestore to return the role before redirecting.
- On sign-out, `role` is reset to `null`, `user` to `null`, and `unreadMessagesCount` to `0` to prevent session pollution.
- `unreadMessagesCount` defaults to `0` (no fake badge).

---

## 6. Authentication & Routing Flow

### Firebase Initialization (`lib/firebaseLib.ts`)

Uses a `try/catch` pattern to handle Expo hot-reloads safely:
```typescript
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  auth = getAuth(app); // Already initialized — returns existing instance WITH persistence
}
```

### Auth Flow (`app/_layout.tsx` — `RootLayoutNav`)

1. **`onAuthStateChanged` listener** fires on app launch.
2. If a user exists, it fetches their doc from `Firestore /users/{uid}` and sets their `role`.
3. `isAuthInitialized` is set to `true` only **after** the Firestore sync completes.
4. A separate `useEffect` watches `[user, isAuthInitialized, segments, role]` and redirects:
   - No user + not in `(auth)` group → redirect to `/(auth)/login`
   - User + in `(auth)` group + role is `'seller'` → redirect to `/(seller)`
   - User + in `(auth)` group + role is `'buyer'` → redirect to `/(tabs)`
   - If role is still `null`, no redirect happens (waits for Firestore).

### Global Notification Listener (`app/_layout.tsx`)

A second `useEffect` attaches an `onSnapshot` listener to:
```
collection('notifications') WHERE userId == user.uid AND read == false
```
It updates `unreadMessagesCount` in real-time. On sign-out, the count resets to 0.

### Role Switching

Both the Buyer Profile screen (`(tabs)/profile.tsx`) and the Seller Settings screen (`(seller)/settings.tsx`) support role switching:
- They call `updateDoc(doc(db, 'users', user.uid), { role: newRole })` to persist the change.
- Then update Zustand and call `router.replace()` to navigate to the correct tab group.

---

## 7. Firestore Data Model

### Collection: `users`
```
/users/{uid}
{
  role: 'buyer' | 'seller',
  email: string,
  createdAt: Timestamp
}
```

### Collection: `listings`
```
/listings/{listingId}
{
  title: string,
  description: string,
  category: string,               // Must match a key in CATEGORY_ICONS for icon mapping
  price: string,                  // Formatted: "$3.99"
  oldPrice: string,               // Formatted: "$8.99"
  discount: string,               // Formatted: "55% OFF"
  quantity: number,
  sellerId: string,               // CRITICAL: Must match user.uid for security rules
  status: 'active',
  createdAt: Timestamp,
  image: string,                  // URL (currently a placeholder Unsplash URL)
  store: string,                  // Seller's store name (currently hardcoded "Your Store")
  rating: string,                 // e.g. "4.8"
  distance: string,               // e.g. "0.2 mi"
  time: string,                   // e.g. "Pick up now"
  badges: Array<{ text: string, type: 'green' | 'red' }>
}
```

### Collection: `notifications`
```
/notifications/{notificationId}
{
  userId: string,                 // Target user's UID
  read: boolean,                  // false = unread (counted in badge)
  title: string,
  body: string,
  createdAt: Timestamp
}
```

### Required Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /listings/{listingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.sellerId == request.auth.uid;
    }
    match /notifications/{notificationId} {
      allow read, update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 8. Screen-by-Screen Feature Status

| Screen | File | Data Source | Status |
|---|---|---|---|
| Login | `(auth)/login.tsx` | Firebase Auth + Firestore role sync | ✅ Complete |
| Signup | `(auth)/signup.tsx` | Firebase Auth + Firestore user doc creation | ✅ Complete |
| Forgot Password | `(auth)/forgot-password.tsx` | Firebase Auth `sendPasswordResetEmail` | ✅ Complete |
| Buyer Home | `(tabs)/index.tsx` | Firestore `onSnapshot` on `listings` | ✅ Complete |
| Buyer Map | `(tabs)/map.tsx` | Static map view | ⚠️ Markers not connected to listings |
| Buyer Saved | `(tabs)/saved.tsx` | Zustand `savedItems` | ⚠️ Uses IDs but listings come from empty MOCK_DEALS |
| Buyer Profile | `(tabs)/profile.tsx` | Firestore user doc + role switch | ✅ Complete |
| Item Detail | `item/[id].tsx` | Firestore `getDoc` on single listing | ✅ Complete |
| Search | `search.tsx` | **MOCK_DEALS (EMPTY)** | ❌ Needs migration to Firestore |
| Notifications | `notifications.tsx` | Static empty state | ⚠️ UI only — no Firestore list rendering |
| Seller Dashboard | `(seller)/index.tsx` | Placeholder stats | ⚠️ Stats are hardcoded |
| Seller Inventory | `(seller)/inventory.tsx` | Firestore CRUD with animated modal | ✅ Complete |
| Seller Settings | `(seller)/settings.tsx` | Firestore role switch + sign out | ✅ Complete |

---

## 9. Known Issues & Technical Debt

1. **`search.tsx` still imports `MOCK_DEALS`** — Since `MOCK_DEALS` is now an empty array, search will always return 0 results. Needs to be refactored to query the Firestore `listings` collection.
2. **`saved.tsx` references listing IDs** but has no way to resolve them back to full listing objects from Firestore. It needs a lookup mechanism.
3. **`(tabs)/explore.tsx` was removed** — The Explore tab is commented out in `(tabs)/_layout.tsx`. The file itself no longer exists. If it's needed again, it must be recreated.
4. **Seller Dashboard (`(seller)/index.tsx`)** shows hardcoded performance stats. These should be computed from real listing/order data.
5. **Listing images** use a single hardcoded Unsplash URL. Firebase Storage upload is not yet implemented.
6. **`store` field** in listings is hardcoded to `"Your Store"`. It should pull from the seller's user profile.
7. **Map markers** are not connected to the `listings` collection.
8. **`notifications.tsx`** only shows an empty state. It doesn't fetch or render actual notification documents.
9. **`inventory.tsx`** has ~319 lines of commented-out code at the top (an older version). The active code starts at line 319. This should be cleaned up.

---

## 10. Shared Constants & Utilities

### Category Icons (`lib/constants.ts`)

Used by both the Buyer Home screen and the Seller Inventory form:
```typescript
export const CATEGORY_ICONS: Record<string, string> = {
  'Bakery': '🍞', 'Produce': '🥬', 'Fruits': '🍎', 'Meals': '🍱',
  'Dairy': '🧀', 'Meats': '🥩', 'Seafood': '🐟', 'Free': '💚', 'Other': '🛍️'
};
```
Any new category a seller creates without a matching key will display a generic `🏷️` icon.

### Class Merge Utility (`lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

---

## 11. Next Priority Milestones

If you are taking over development, the recommended order is:

1. **Migrate `search.tsx` to Firestore** — Replace `MOCK_DEALS` with a real-time query on the `listings` collection.
2. **Fix `saved.tsx`** — Add a Firestore lookup to resolve saved listing IDs into full listing objects for display.
3. **Implement image uploads** — Add Firebase Storage integration to the inventory form so sellers can upload real photos.
4. **Connect Map markers** — Fetch listings and plot them as interactive markers on the Map tab.
5. **Build Notifications rendering** — Fetch from the `notifications` collection and render actual notification cards.
6. **Seller Dashboard stats** — Compute real metrics (total listings, views, rescues) from Firestore data.
7. **Clean up `inventory.tsx`** — Remove the 319 lines of commented-out legacy code at the top of the file.

---

> **CRITICAL RULES FOR FUTURE DEVELOPMENT:**
> - Do NOT degrade design quality. Everything must feel highly polished and premium.
> - Use `lucide-react-native` icons exclusively. No generic emoji-as-buttons.
> - Rely on the custom Tailwind tokens (`brandPrimary`, `brandAccent`, `background`, `urgency`). Do not use generic red/blue/green.
> - Always include `sellerId: user.uid` in any Firestore listing writes, or the security rules will reject the operation.
> - Always guard Firestore listeners with `if (!user) return;` to prevent permission-denied errors before auth is ready.
> - Preserve the mascot in empty states. Maintain the `#FAFAF5` background. The app should feel like a luxury brand, not a utility tool.
